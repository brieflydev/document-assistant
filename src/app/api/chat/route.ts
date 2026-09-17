import { NextResponse } from "next/server";
import { askKnowledgeBase } from "@/lib/chat";
import { isAwsConfigured } from "@/lib/config";
import { listDocuments } from "@/lib/document-store";
import type { ChatRequest, ChatResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    if (isAwsConfigured()) {
      const response = await askKnowledgeBase(message);
      return NextResponse.json({ ...response, mode: "aws" });
    }

    const documents = listDocuments();
    const sources = documents.slice(0, 2);

    const response: ChatResponse = {
      answer:
        sources.length === 0
          ? "I don't have any indexed documents yet. Upload a file first, then ask again."
          : `Local stub response for: "${message}". Set DOCUMENTS_BUCKET, KNOWLEDGE_BASE_ID, DATA_SOURCE_ID, and BEDROCK_MODEL_ARN to use Bedrock.`,
      citations: sources.map((document, index) => ({
        id: `citation-${index + 1}`,
        source: document.name,
        excerpt: `Stub citation excerpt from ${document.name}.`,
      })),
    };

    return NextResponse.json({ ...response, mode: "local" });
  } catch (error) {
    console.error("Chat request failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Chat request failed",
      },
      { status: 500 },
    );
  }
}
