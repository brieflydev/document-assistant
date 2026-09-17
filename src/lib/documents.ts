import {
  ListIngestionJobsCommand,
  StartIngestionJobCommand,
} from "@aws-sdk/client-bedrock-agent";
import {
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getBedrockAgentClient, getS3Client } from "@/lib/aws";
import { getAppConfig } from "@/lib/config";
import type { DocumentItem, DocumentStatus } from "@/lib/types";

function guessContentType(fileName: string, fallback: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return fallback || "application/octet-stream";
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function objectKeyToDocument(
  key: string,
  prefix: string,
  size: number,
  lastModified: Date | undefined,
  status: DocumentStatus,
): DocumentItem {
  const name = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  return {
    id: key,
    name,
    contentType: guessContentType(name, "application/octet-stream"),
    size,
    status,
    uploadedAt: (lastModified ?? new Date()).toISOString(),
  };
}

async function getKnowledgeBaseStatus(): Promise<DocumentStatus> {
  const config = getAppConfig();
  if (!config) {
    return "uploaded";
  }

  const client = getBedrockAgentClient();
  const listed = await client.send(
    new ListIngestionJobsCommand({
      knowledgeBaseId: config.knowledgeBaseId,
      dataSourceId: config.dataSourceId,
      maxResults: 1,
      sortBy: {
        attribute: "STARTED_AT",
        order: "DESCENDING",
      },
    }),
  );

  const latest = listed.ingestionJobSummaries?.[0];
  if (!latest?.status) {
    return "uploaded";
  }

  switch (latest.status) {
    case "COMPLETE":
      return "ready";
    case "STARTING":
    case "IN_PROGRESS":
      return "indexing";
    case "FAILED":
      return "failed";
    default:
      return "uploaded";
  }
}

export async function listDocumentsFromS3(): Promise<DocumentItem[]> {
  const config = getAppConfig();
  if (!config) {
    throw new Error("AWS is not configured");
  }

  const status = await getKnowledgeBaseStatus();
  const client = getS3Client();
  const documents: DocumentItem[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.documentsBucket,
        Prefix: config.documentsPrefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (!object.Key || object.Key.endsWith("/")) {
        continue;
      }

      documents.push(
        objectKeyToDocument(
          object.Key,
          config.documentsPrefix,
          object.Size ?? 0,
          object.LastModified,
          status,
        ),
      );
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function uploadDocumentToS3(file: File): Promise<DocumentItem> {
  const config = getAppConfig();
  if (!config) {
    throw new Error("AWS is not configured");
  }

  const safeName = sanitizeFileName(file.name);
  const key = `${config.documentsPrefix}${Date.now()}-${safeName}`;
  const contentType = guessContentType(file.name, file.type);
  const body = Buffer.from(await file.arrayBuffer());

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.documentsBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        originalname: encodeURIComponent(file.name),
      },
    }),
  );

  await startKnowledgeBaseIngestion();

  return {
    id: key,
    name: file.name,
    contentType,
    size: file.size,
    status: "indexing",
    uploadedAt: new Date().toISOString(),
  };
}

export async function startKnowledgeBaseIngestion(): Promise<string | undefined> {
  const config = getAppConfig();
  if (!config) {
    throw new Error("AWS is not configured");
  }

  try {
    const response = await getBedrockAgentClient().send(
      new StartIngestionJobCommand({
        knowledgeBaseId: config.knowledgeBaseId,
        dataSourceId: config.dataSourceId,
        description: `Ingestion triggered at ${new Date().toISOString()}`,
      }),
    );

    return response.ingestionJob?.ingestionJobId;
  } catch (error) {
    const name =
      error && typeof error === "object" && "name" in error
        ? String((error as { name: unknown }).name)
        : "";

    // Another ingestion may already be running after a previous upload.
    if (name === "ConflictException") {
      return undefined;
    }

    throw error;
  }
}
