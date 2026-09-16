import { NextResponse } from "next/server";
import { addDocument, listDocuments } from "@/lib/document-store";
import { ACCEPTED_FILE_TYPES } from "@/lib/types";

export const runtime = "nodejs";

function isAcceptedFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return ACCEPTED_FILE_TYPES.some((extension) => lowerName.endsWith(extension));
}

export async function GET() {
  return NextResponse.json({ documents: listDocuments() });
}

export async function POST(request: Request) {
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

  const document = addDocument({
    id: crypto.randomUUID(),
    name: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    status: "uploaded",
    uploadedAt: new Date().toISOString(),
  });

  // Stub: real S3 upload + KB ingestion comes in a later todo.
  return NextResponse.json({ document }, { status: 201 });
}
