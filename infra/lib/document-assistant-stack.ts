import * as cdk from "aws-cdk-lib";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

const EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0";
const EMBEDDING_DIMENSIONS = 1024;
// Claude models require inference profiles (on-demand foundation model IDs are rejected).
const GENERATION_MODEL_ID = "us.anthropic.claude-sonnet-4-6";
const DOCUMENTS_PREFIX = "documents/";

export interface DocumentAssistantStackProps extends cdk.StackProps {
  readonly githubOwner: string;
  readonly githubRepo: string;
}

export class DocumentAssistantStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DocumentAssistantStackProps) {
    super(scope, id, props);

    const documentsBucket = new s3.Bucket(this, "DocumentsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const vectorBucketName = `da-vectors-${this.account}-${this.region}`.slice(
      0,
      63,
    );
    const vectorIndexName = "bedrock-kb-index";

    const vectorBucket = new cdk.CfnResource(this, "VectorBucket", {
      type: "AWS::S3Vectors::VectorBucket",
      properties: {
        VectorBucketName: vectorBucketName,
      },
    });

    const vectorIndex = new cdk.CfnResource(this, "VectorIndex", {
      type: "AWS::S3Vectors::Index",
      properties: {
        VectorBucketName: vectorBucketName,
        IndexName: vectorIndexName,
        DataType: "float32",
        Dimension: EMBEDDING_DIMENSIONS,
        DistanceMetric: "cosine",
        MetadataConfiguration: {
          NonFilterableMetadataKeys: [
            "AMAZON_BEDROCK_TEXT",
            "AMAZON_BEDROCK_METADATA",
          ],
        },
      },
    });
    vectorIndex.addResourceDependency(vectorBucket);

    const vectorBucketArn = `arn:aws:s3vectors:${this.region}:${this.account}:bucket/${vectorBucketName}`;
    const vectorIndexArn = `${vectorBucketArn}/index/${vectorIndexName}`;

    const knowledgeBaseRole = new iam.Role(this, "KnowledgeBaseRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      description: "Role used by Bedrock Knowledge Base",
    });

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:GetInferenceProfile"],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/${EMBEDDING_MODEL_ID}`,
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-*",
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`,
          `arn:aws:bedrock:*:${this.account}:inference-profile/*`,
        ],
      }),
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3vectors:QueryVectors",
          "s3vectors:GetVectors",
          "s3vectors:PutVectors",
          "s3vectors:DeleteVectors",
          "s3vectors:ListVectors",
          "s3vectors:GetIndex",
          "s3vectors:ListIndexes",
        ],
        resources: [vectorBucketArn, vectorIndexArn],
      }),
    );

    documentsBucket.grantRead(knowledgeBaseRole);

    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, "KnowledgeBase", {
      name: `document-assistant-kb`,
      description: "Managed knowledge base for Document Assistant workshop",
      roleArn: knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: "VECTOR",
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/${EMBEDDING_MODEL_ID}`,
        },
      },
      storageConfiguration: {
        type: "S3_VECTORS",
        s3VectorsConfiguration: {
          vectorBucketArn,
          indexArn: vectorIndexArn,
        },
      },
    });
    knowledgeBase.node.addDependency(vectorIndex);
    knowledgeBase.node.addDependency(
      knowledgeBaseRole.node.findChild("DefaultPolicy"),
    );

    const dataSource = new bedrock.CfnDataSource(this, "DocumentsDataSourceV2", {
      name: "documents-s3-v2",
      description: "S3 documents for Document Assistant",
      knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
      dataSourceConfiguration: {
        type: "S3",
        s3Configuration: {
          bucketArn: documentsBucket.bucketArn,
          inclusionPrefixes: [DOCUMENTS_PREFIX],
        },
      },
    });
    dataSource.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const repository = new ecr.Repository(this, "AppRepository", {
      repositoryName: "document-assistant",
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: "Keep only the 10 most recent images",
        },
      ],
    });

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      containerInsightsV2: ecs.ContainerInsights.DISABLED,
    });

    const taskRole = new iam.Role(this, "EcsTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Application permissions for Document Assistant",
    });

    documentsBucket.grantReadWrite(taskRole);

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:Retrieve",
          "bedrock:RetrieveAndGenerate",
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:GetInferenceProfile",
        ],
        resources: ["*"],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:StartIngestionJob",
          "bedrock:GetIngestionJob",
          "bedrock:ListIngestionJobs",
          "bedrock:GetKnowledgeBase",
          "bedrock:GetDataSource",
        ],
        resources: [
          knowledgeBase.attrKnowledgeBaseArn,
          `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${knowledgeBase.attrKnowledgeBaseId}/*`,
        ],
      }),
    );

    const generationModelArn = `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${GENERATION_MODEL_ID}`;

    // First-time bootstrap: `cdk deploy -c usePlaceholderImage=true` so the stack
    // can create ECR/ECS before the real app image exists. Normal deploys omit this.
    const usePlaceholderImage =
      this.node.tryGetContext("usePlaceholderImage") === true ||
      this.node.tryGetContext("usePlaceholderImage") === "true";

    const containerImage = usePlaceholderImage
      ? ecs.ContainerImage.fromRegistry(
          "public.ecr.aws/nginx/nginx:stable-alpine",
        )
      : ecs.ContainerImage.fromEcrRepository(repository, "latest");

    const containerPort = usePlaceholderImage ? 80 : 3000;
    const healthCheckPath = usePlaceholderImage ? "/" : "/api/health";

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "WebService",
      {
        cluster,
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
        minHealthyPercent: 50,
        circuitBreaker: { rollback: true },
        publicLoadBalancer: true,
        assignPublicIp: true,
        taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        listenerPort: 80,
        healthCheckGracePeriod: cdk.Duration.seconds(60),
        taskImageOptions: {
          image: containerImage,
          containerName: "document-assistant",
          containerPort,
          taskRole,
          family: "document-assistant",
          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: "document-assistant",
            logRetention: logs.RetentionDays.ONE_WEEK,
          }),
          environment: {
            DOCUMENTS_BUCKET: documentsBucket.bucketName,
            DOCUMENTS_PREFIX,
            KNOWLEDGE_BASE_ID: knowledgeBase.attrKnowledgeBaseId,
            DATA_SOURCE_ID: dataSource.attrDataSourceId,
            AWS_REGION: this.region,
            BEDROCK_MODEL_ARN: generationModelArn,
            VISION_MODEL_ID: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
            PORT: "3000",
            HOSTNAME: "0.0.0.0",
            NODE_ENV: "production",
            NEXT_TELEMETRY_DISABLED: "1",
          },
        },
      },
    );

    service.targetGroup.configureHealthCheck({
      path: healthCheckPath,
      healthyHttpCodes: "200",
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    service.targetGroup.setAttribute("deregistration_delay.timeout_seconds", "30");

    const githubProvider = new iam.OpenIdConnectProvider(this, "GitHubOidc", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const githubOwner = props.githubOwner;
    const githubRepo = props.githubRepo;
    // GitHub may send either classic or unique-ID subject claims.
    const githubOwnerId = this.node.tryGetContext("githubOwnerId") as
      | string
      | undefined;
    const githubRepoId = this.node.tryGetContext("githubRepoId") as
      | string
      | undefined;
    const subjectClaims = [`repo:${githubOwner}/${githubRepo}:*`];
    if (githubOwnerId && githubRepoId) {
      subjectClaims.push(
        `repo:${githubOwner}@${githubOwnerId}/${githubRepo}@${githubRepoId}:*`,
      );
    }

    const deployRole = new iam.Role(this, "GitHubDeployRole", {
      roleName: "document-assistant-github-deploy",
      description: "Assumed by GitHub Actions via OIDC",
      assumedBy: new iam.WebIdentityPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": subjectClaims,
          },
        },
      ),
    });

    // configure-aws-credentials tags the session; trust policy must allow TagSession.
    const cfnDeployRole = deployRole.node.defaultChild as iam.CfnRole;
    cfnDeployRole.addPropertyOverride(
      "AssumeRolePolicyDocument.Statement.0.Action",
      ["sts:AssumeRoleWithWebIdentity", "sts:TagSession"],
    );

    repository.grantPullPush(deployRole);

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:TagResource",
        ],
        resources: ["*"],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [
          taskRole.roleArn,
          service.taskDefinition.executionRole!.roleArn,
        ],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:CreateStack",
          "cloudformation:UpdateStack",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResources",
          "cloudformation:GetTemplate",
          "cloudformation:CreateChangeSet",
          "cloudformation:DescribeChangeSet",
          "cloudformation:ExecuteChangeSet",
          "cloudformation:DeleteChangeSet",
        ],
        resources: [
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/DocumentAssistantStack/*`,
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/CDKToolkit/*`,
        ],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/cdk-bootstrap/*`,
        ],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
        ],
        resources: [
          `arn:aws:s3:::cdk-*-assets-${this.account}-${this.region}`,
          `arn:aws:s3:::cdk-*-assets-${this.account}-${this.region}/*`,
        ],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:Describe*",
          "ecs:Describe*",
          "ecs:List*",
          "elasticloadbalancing:Describe*",
          "logs:Describe*",
          "logs:CreateLogGroup",
          "logs:TagResource",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:TagRole",
          "iam:PassRole",
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:PutBucket*",
          "s3:GetBucket*",
          "s3:DeleteObject*",
          "s3:GetObject*",
          "s3:PutObject*",
          "s3vectors:*",
          "bedrock:*",
          "ecr:*",
          "ecs:*",
          "elasticloadbalancing:*",
          "logs:*",
          "application-autoscaling:*",
        ],
        resources: ["*"],
      }),
    );

    new cdk.CfnOutput(this, "LoadBalancerDns", {
      value: service.loadBalancer.loadBalancerDnsName,
      description: "Application Load Balancer DNS name",
    });

    new cdk.CfnOutput(this, "DocumentsBucketName", {
      value: documentsBucket.bucketName,
      description: "S3 bucket for uploaded documents",
    });

    new cdk.CfnOutput(this, "KnowledgeBaseId", {
      value: knowledgeBase.attrKnowledgeBaseId,
      description: "Bedrock Knowledge Base ID",
    });

    new cdk.CfnOutput(this, "DataSourceId", {
      value: dataSource.attrDataSourceId,
      description: "Bedrock Knowledge Base data source ID",
    });

    new cdk.CfnOutput(this, "EcrRepositoryUri", {
      value: repository.repositoryUri,
      description: "ECR repository URI for the app image",
    });

    new cdk.CfnOutput(this, "EcsClusterName", {
      value: cluster.clusterName,
    });

    new cdk.CfnOutput(this, "EcsServiceName", {
      value: service.service.serviceName,
    });

    new cdk.CfnOutput(this, "GitHubDeployRoleArn", {
      value: deployRole.roleArn,
      description: "IAM role ARN for GitHub Actions OIDC deployments",
    });

    new cdk.CfnOutput(this, "BedrockModelArn", {
      value: generationModelArn,
      description: "Foundation model ARN used for RetrieveAndGenerate",
    });
  }
}
