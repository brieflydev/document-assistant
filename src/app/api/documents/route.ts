import { NextResponse } from "next/server";
import { isAwsConfigured } from "@/lib/config";
import { addDocument, listDocuments } from "@/lib/document-store";
import {
  listDocumentsFromS3,
  uploadDocumentToS3,
} from "@/lib/documents";
import { ACCEPTED_FILE_TYPES } from "@/lib/types";

export const runtime = "nodejs";

function isAcceptedFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return ACCEPTED_FILE_TYPES.some((extension) => lowerName.endsWith(extension));
}

export async function GET() {
  try {
    if (isAwsConfigured()) {
      const documents = await listDocumentsFromS3();
      return NextResponse.json({ documents, mode: "aws" });
    }

    return NextResponse.json({ documents: listDocuments(), mode: "local" });
  } catch (error) {
    console.error("Failed to list documents", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list documents",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
    }

    if (!isAcceptedFile(file)) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Accepted: ${ACCEPTED_FILE_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (isAwsConfigured()) {
      const document = await uploadDocumentToS3(file);
      return NextResponse.json({ document, mode: "aws" }, { status: 201 });
    }

    const document = addDocument({
      id: crypto.randomUUID(),
      name: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      status: "uploaded",
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({ document, mode: "local" }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload document", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload document",
      },
      { status: 500 },
    );
  }
}
