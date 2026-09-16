"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { DocumentList } from "@/components/DocumentList";
import { DocumentUpload } from "@/components/DocumentUpload";
import type { DocumentItem } from "@/lib/types";

export function HomePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents");
        if (!response.ok) {
          throw new Error("Failed to load documents");
        }

        const data = (await response.json()) as { documents: DocumentItem[] };
        if (cancelled) {
          return;
        }

        setDocuments(data.documents);
        setError(null);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load documents",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h1" gutterBottom>
              Document Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Upload documents and ask questions with cited answers.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={3}>
                <Paper sx={{ p: 2.5 }}>
                  <DocumentUpload
                    onUploaded={() => {
                      setLoading(true);
                      setReloadToken((token) => token + 1);
                    }}
                  />
                </Paper>
                <Paper sx={{ p: 2.5 }}>
                  <DocumentList
                    documents={documents}
                    loading={loading}
                    error={error}
                  />
                </Paper>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: 2.5, height: "100%" }}>
                <ChatWindow />
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
