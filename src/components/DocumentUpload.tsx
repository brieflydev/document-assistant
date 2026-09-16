"use client";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { ACCEPTED_FILE_TYPES } from "@/lib/types";

type DocumentUploadProps = {
  onUploaded: () => void;
};

export function DocumentUpload({ onUploaded }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? `Failed to upload ${file.name}`);
        }
      }

      setSuccess(
        files.length === 1
          ? `Uploaded ${files[0].name}`
          : `Uploaded ${files.length} files`,
      );
      onUploaded();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h2" sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
        Upload documents
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Supported: {ACCEPTED_FILE_TYPES.join(", ")}
      </Typography>

      <Box
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFiles(event.dataTransfer.files);
        }}
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
          p: 3,
          textAlign: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CloudUploadIcon color="primary" sx={{ fontSize: 36 }} />
          <Typography variant="body2">
            Drag and drop files here, or choose files to upload
          </Typography>
          <Button
            variant="contained"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            Choose files
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept={ACCEPTED_FILE_TYPES.join(",")}
            onChange={(event) => void handleFiles(event.target.files)}
          />
        </Stack>
      </Box>

      {uploading ? <LinearProgress /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
    </Stack>
  );
}
