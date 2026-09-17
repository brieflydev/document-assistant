import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getAppConfig } from "@/lib/config";

let runtimeClient: BedrockRuntimeClient | undefined;

function getRuntimeClient() {
  const region =
    getAppConfig()?.region ?? process.env.AWS_REGION ?? "us-east-1";
  runtimeClient ??= new BedrockRuntimeClient({ region });
  return runtimeClient;
}

function visionModelId() {
  return (
    process.env.VISION_MODEL_ID?.trim() ||
    `us.anthropic.claude-haiku-4-5-20251001-v1:0`
  );
}

export type ImageFormat = "png" | "jpeg" | "gif" | "webp";

export function imageFormatFromContentType(
  contentType: string,
  fileName: string,
): ImageFormat | null {
  const lower = fileName.toLowerCase();
  if (contentType === "image/png" || lower.endsWith(".png")) return "png";
  if (
    contentType === "image/jpeg" ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg")
  ) {
    return "jpeg";
  }
  if (contentType === "image/webp" || lower.endsWith(".webp")) return "webp";
  if (contentType === "image/gif" || lower.endsWith(".gif")) return "gif";
  return null;
}

export function isImageContentType(contentType: string, fileName: string) {
  return imageFormatFromContentType(contentType, fileName) !== null;
}

/**
 * Extract visible text from an uploaded image so Bedrock KB (default text
 * parsing) can index it. Native multimodal KB parsing needs supplemental
 * storage configured at KB creation time, which this workshop stack does not.
 */
export async function extractTextFromImage(params: {
  bytes: Buffer;
  format: ImageFormat;
  fileName: string;
}): Promise<string> {
  const response = await getRuntimeClient().send(
    new ConverseCommand({
      modelId: visionModelId(),
      messages: [
        {
          role: "user",
          content: [
            {
              image: {
                format: params.format,
                source: { bytes: params.bytes },
              },
            },
            {
              text: [
                "Extract all readable text from this image.",
                "Preserve labels and values (for example SKU, shelf, warehouse).",
                "Return plain text only. Do not add commentary.",
              ].join(" "),
            },
          ],
        },
      ],
    }),
  );

  const text = response.output?.message?.content
    ?.map((block) => ("text" in block && block.text ? block.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error(`Could not extract text from image ${params.fileName}`);
  }

  return [
    `Source image: ${params.fileName}`,
    "",
    "Extracted text:",
    text,
  ].join("\n");
}
