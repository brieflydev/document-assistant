import { NextResponse } from "next/server";
import { isAwsConfigured } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "document-assistant",
    mode: isAwsConfigured() ? "aws" : "local",
    timestamp: new Date().toISOString(),
  });
}
