export type DocumentStatus = "uploaded" | "indexing" | "ready" | "failed";

export type DocumentItem = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  status: DocumentStatus;
  uploadedAt: string;
};

export type Citation = {
  id: string;
  source: string;
  excerpt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
};

export type ChatRequest = {
  message: string;
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
};

export const ACCEPTED_FILE_TYPES = [
  ".md",
  ".txt",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export const ACCEPTED_MIME_TYPES = [
  "text/markdown",
  "text/plain",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
