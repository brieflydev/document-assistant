export type AppConfig = {
  region: string;
  documentsBucket: string;
  documentsPrefix: string;
  knowledgeBaseId: string;
  dataSourceId: string;
  bedrockModelArn: string;
};

function required(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getAppConfig(): AppConfig | null {
  const documentsBucket = required("DOCUMENTS_BUCKET");
  const knowledgeBaseId = required("KNOWLEDGE_BASE_ID");
  const dataSourceId = required("DATA_SOURCE_ID");
  const bedrockModelArn = required("BEDROCK_MODEL_ARN");

  if (!documentsBucket || !knowledgeBaseId || !dataSourceId || !bedrockModelArn) {
    return null;
  }

  const prefix = required("DOCUMENTS_PREFIX") ?? "documents/";
  const documentsPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;

  return {
    region: required("AWS_REGION") ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1",
    documentsBucket,
    documentsPrefix,
    knowledgeBaseId,
    dataSourceId,
    bedrockModelArn,
  };
}

export function isAwsConfigured(): boolean {
  return getAppConfig() !== null;
}
