import {
  RetrieveAndGenerateCommand,
  type Citation as BedrockCitation,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { getBedrockAgentRuntimeClient } from "@/lib/aws";
import { getAppConfig } from "@/lib/config";
import type { ChatResponse, Citation } from "@/lib/types";

function sourceFromS3Uri(uri: string | undefined) {
  if (!uri) {
    return "unknown-source";
  }

  const withoutScheme = uri.replace(/^s3:\/\//, "");
  const path = withoutScheme.split("/").slice(1).join("/");
  const fileName = path.split("/").pop();
  return fileName || path || uri;
}

function mapCitations(bedrockCitations: BedrockCitation[] | undefined): Citation[] {
  const citations: Citation[] = [];

  for (const [citationIndex, citation] of (bedrockCitations ?? []).entries()) {
    for (const [
      referenceIndex,
      reference,
    ] of (citation.retrievedReferences ?? []).entries()) {
      const source = sourceFromS3Uri(reference.location?.s3Location?.uri);
      const excerpt =
        reference.content?.text?.trim() ||
        citation.generatedResponsePart?.textResponsePart?.text?.trim() ||
        "No excerpt available";

      citations.push({
        id: `citation-${citationIndex + 1}-${referenceIndex + 1}`,
        source,
        excerpt: excerpt.slice(0, 500),
      });
    }
  }

  // Deduplicate identical source+excerpt pairs
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.source}::${citation.excerpt}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function askKnowledgeBase(message: string): Promise<ChatResponse> {
  const config = getAppConfig();
  if (!config) {
    throw new Error("AWS is not configured");
  }

  const response = await getBedrockAgentRuntimeClient().send(
    new RetrieveAndGenerateCommand({
      input: { text: message },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: config.knowledgeBaseId,
          modelArn: config.bedrockModelArn,
        },
      },
    }),
  );

  const answer =
    response.output?.text?.trim() ||
    "I could not generate an answer from the knowledge base.";

  return {
    answer,
    citations: mapCitations(response.citations),
  };
}
