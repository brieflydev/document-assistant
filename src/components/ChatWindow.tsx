"use client";

import SendIcon from "@mui/icons-material/Send";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatResponse } from "@/lib/types";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Chat request failed");
      }

      const data = (await response.json()) as ChatResponse;

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.answer,
        citations: data.citations,
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (chatError) {
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Something went wrong while chatting.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Stack spacing={2} sx={{ height: "100%", minHeight: 420 }}>
      <Typography variant="h2" sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
        Ask about your documents
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          p: 2,
          overflowY: "auto",
          bgcolor: "grey.50",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Upload documents, then ask a question. Answers will include
            citations when available.
          </Typography>
        ) : null}

        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: message.role === "user" ? "primary.main" : "background.paper",
                color: message.role === "user" ? "primary.contrastText" : "text.primary",
                border: message.role === "assistant" ? "1px solid" : "none",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {message.content}
              </Typography>
            </Paper>

            {message.citations && message.citations.length > 0 ? (
              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                sx={{ mt: 1, flexWrap: "wrap" }}
              >
                {message.citations.map((citation) => (
                  <Tooltip key={citation.id} title={citation.excerpt}>
                    <Chip
                      size="small"
                      label={citation.source}
                      variant="outlined"
                    />
                  </Tooltip>
                ))}
              </Stack>
            ) : null}
          </Box>
        ))}

        {sending ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Thinking…
            </Typography>
          </Stack>
        ) : null}

        <div ref={bottomRef} />
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Ask a question about your documents…"
          value={input}
          disabled={sending}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />
        <IconButton
          color="primary"
          aria-label="Send message"
          disabled={sending || !input.trim()}
          onClick={() => void handleSend()}
        >
          <SendIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}
