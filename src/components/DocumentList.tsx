"use client";

import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { DocumentItem, DocumentStatus } from "@/lib/types";

type DocumentListProps = {
  documents: DocumentItem[];
  loading: boolean;
  error: string | null;
};

function statusColor(
  status: DocumentStatus,
): "default" | "warning" | "success" | "error" {
  switch (status) {
    case "indexing":
      return "warning";
    case "ready":
      return "success";
    case "failed":
      return "error";
    default:
      return "default";
  }
}

function fileIcon(contentType: string, name: string) {
  if (contentType.includes("pdf") || name.endsWith(".pdf")) {
    return <PictureAsPdfIcon color="action" />;
  }
  if (contentType.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name)) {
    return <ImageIcon color="action" />;
  }
  return <DescriptionIcon color="action" />;
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents, loading, error }: DocumentListProps) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h2" sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
        Documents
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && documents.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No documents uploaded yet.
        </Typography>
      ) : null}

      <List dense disablePadding>
        {documents.map((document) => (
          <ListItem
            key={document.id}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1,
              mb: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
            secondaryAction={
              <Chip
                size="small"
                label={document.status}
                color={statusColor(document.status)}
              />
            }
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {fileIcon(document.contentType, document.name)}
            </ListItemIcon>
            <ListItemText
              primary={document.name}
              secondary={`${formatBytes(document.size)} · ${new Date(document.uploadedAt).toLocaleString()}`}
            />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
