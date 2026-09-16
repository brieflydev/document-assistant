import { NextResponse } from "next/server";
import type { ChatRequest, ChatResponse } from "@/lib/types";
import { listDocuments } from "@/lib/document-store";

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

  const documents = listDocuments();
  const sources = documents.slice(0, 2);

  // Stub: real Bedrock RetrieveAndGenerate comes in a later todo.
  const response: ChatResponse = {
    answer:
      sources.length === 0
        ? "I don't have any indexed documents yet. Upload a file first, then ask again."
        : `This is a scaffolded response for: "${message}". Once AWS Bedrock is wired up, answers will be grounded in your uploaded documents.`,
    citations: sources.map((document, index) => ({
      id: `citation-${index + 1}`,
      source: document.name,
      excerpt: `Stub citation excerpt from ${document.name}.`,
    })),
  };

  return NextResponse.json(response);
}
