import type { DocumentItem } from "@/lib/types";

const globalStore = globalThis as typeof globalThis & {
  __documentAssistantStore?: DocumentItem[];
};

function getStore(): DocumentItem[] {
  if (!globalStore.__documentAssistantStore) {
    globalStore.__documentAssistantStore = [
      {
        id: "demo-1",
        name: "workshop-notes.md",
        contentType: "text/markdown",
        size: 2048,
        status: "ready",
        uploadedAt: new Date().toISOString(),
      },
    ];
  }
  return globalStore.__documentAssistantStore;
}

export function listDocuments(): DocumentItem[] {
  return [...getStore()].sort((a, b) =>
    b.uploadedAt.localeCompare(a.uploadedAt),
  );
}

export function addDocument(document: DocumentItem): DocumentItem {
  getStore().unshift(document);
  return document;
}
