/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { CardItem, Playlist } from "@src/utils/types";
import CardAssignmentFields, { hasValidAssignments } from "./CardAssignmentFields";
import ConfirmDialog from "./ConfirmDialog";

export default function QueueTab() {
  const [queue, setQueue] = useState<CardItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<CardItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [acceptAllConfirmOpen, setAcceptAllConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const [queueRes, cardsRes] = await Promise.all([
      fetch("/api/queue", { cache: "no-store" }),
      fetch("/api/cards", { cache: "no-store" }),
    ]);
    setLoading(false);

    if (!queueRes.ok) {
      setToast({ open: true, message: "Failed to load queue." });
      return;
    }

    const queueData = (await queueRes.json()) as { cards: CardItem[] };
    const cardsData = cardsRes.ok
      ? ((await cardsRes.json()) as { playlists: Playlist[] })
      : { playlists: [] };

    const cards = queueData.cards ?? [];
    setQueue(cards);
    setPlaylists(cardsData.playlists ?? []);
    setIndex(0);
    setDraft(cards[0] ?? null);
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const current = queue[index] ?? null;

  useEffect(() => {
    if (current) {
      setDraft({
        ...current,
        description: current.description ?? "",
        image: current.image ?? "",
        date: current.date ?? "",
      });
    } else {
      setDraft(null);
    }
  }, [current]);

  const setField = <K extends keyof CardItem>(key: K, value: CardItem[K]) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  };

  const handleAssignmentsChange = (assignments: {
    categories: CardItem["categories"];
    playlistIds: string[];
  }) => {
    if (!draft) return;
    setDraft({ ...draft, ...assignments });
  };

  const normalizeDraft = () => {
    if (!draft) return null;
    return {
      card: {
        ...draft,
        description: draft.description?.trim() || undefined,
        image: draft.image?.trim() || undefined,
        date: draft.date?.trim() || undefined,
        url: draft.url.trim(),
      },
    };
  };

  const saveDraft = async () => {
    if (!draft) return false;
    const payload = normalizeDraft();
    if (!payload) return false;
    const response = await fetch(`/api/queue/${draft.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast({ open: true, message: data.error ?? "Failed to save changes." });
      return false;
    }
    return true;
  };

  const handleAccept = async () => {
    if (!draft) return;
    setActing(true);
    const saved = await saveDraft();
    if (!saved) {
      setActing(false);
      return;
    }
    const payload = normalizeDraft();
    const response = await fetch(`/api/queue/${draft.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActing(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast({ open: true, message: data.error ?? "Failed to accept card." });
      return;
    }
    const data = (await response.json()) as {
      mergedIntoExisting?: boolean;
      targetId?: string;
    };
    setToast({
      open: true,
      message: data.mergedIntoExisting
        ? `Duplicate URL — merged into existing card (${data.targetId ?? "unknown"}).`
        : "Card accepted and added to database.",
    });
    await fetchQueue();
  };

  const handleRejectConfirm = async () => {
    if (!draft) return;
    setActing(true);
    const response = await fetch(`/api/queue/${draft.id}`, { method: "DELETE" });
    setActing(false);
    if (!response.ok) {
      setToast({ open: true, message: "Failed to reject card." });
      return;
    }
    setRejectConfirmOpen(false);
    setToast({ open: true, message: "Card rejected." });
    await fetchQueue();
  };

  const handleAcceptAllConfirm = async () => {
    setActing(true);
    const response = await fetch("/api/queue/accept-all", { method: "POST" });
    setActing(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast({
        open: true,
        message: data.error ?? "Failed to accept queued cards.",
      });
      return;
    }
    const data = (await response.json()) as {
      accepted?: number;
      merged?: number;
      skipped?: number;
      failed?: number;
    };
    setAcceptAllConfirmOpen(false);
    const parts = [
      `${data.accepted ?? 0} accepted`,
      `${data.merged ?? 0} merged`,
    ];
    if ((data.skipped ?? 0) > 0) {
      parts.push(`${data.skipped} skipped`);
    }
    if ((data.failed ?? 0) > 0) {
      parts.push(`${data.failed} failed`);
    }
    setToast({
      open: true,
      message: `Bulk accept complete: ${parts.join(", ")}.`,
    });
    await fetchQueue();
  };

  const handleSkip = () => {
    if (index < queue.length - 1) {
      setIndex(index + 1);
    }
  };

  if (loading) {
    return <Typography>Loading queue...</Typography>;
  }

  if (!draft) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6">Queue is empty</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Add new cards from the Manage tab to review them here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h5">Queue</Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography color="text.secondary">
            {index + 1} of {queue.length}
          </Typography>
          {queue.length > 1 && (
            <Button
              variant="contained"
              color="success"
              onClick={() => setAcceptAllConfirmOpen(true)}
              disabled={acting}
            >
              Accept All
            </Button>
          )}
        </Stack>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField label="ID" value={draft.id} disabled fullWidth />
          <TextField
            label="Title"
            value={draft.title}
            onChange={(event) => setField("title", event.target.value)}
            fullWidth
          />
          <CardAssignmentFields
            categories={draft.categories}
            playlistIds={draft.playlistIds}
            playlists={playlists}
            onAssignmentsChange={handleAssignmentsChange}
          />
          <TextField
            label="Description"
            value={draft.description ?? ""}
            onChange={(event) => setField("description", event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label="URL"
            value={draft.url}
            onChange={(event) => setField("url", event.target.value)}
            fullWidth
          />
          <TextField
            label="Image"
            value={draft.image ?? ""}
            onChange={(event) => setField("image", event.target.value)}
            fullWidth
          />
          <TextField
            label="Date"
            value={draft.date ?? ""}
            onChange={(event) => setField("date", event.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(draft.recommended)}
                onChange={(event) => setField("recommended", event.target.checked)}
              />
            }
            label="Recommended card"
          />
        </Stack>
      </Paper>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleAccept}
          disabled={acting || !draft.title || !draft.url || !hasValidAssignments(draft)}
        >
          Accept
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setRejectConfirmOpen(true)}
          disabled={acting}
        >
          Reject
        </Button>
        <Button
          variant="outlined"
          onClick={handleSkip}
          disabled={acting || index >= queue.length - 1}
        >
          Skip
        </Button>
      </Box>

      <ConfirmDialog
        open={acceptAllConfirmOpen}
        title="Accept all queued cards?"
        message={`Accept all ${queue.length} cards in the queue using their saved details? Unsaved edits on the current card are not included. Cards missing a title, URL, or placement will be skipped.`}
        confirmLabel="Accept All"
        confirmColor="success"
        onConfirm={handleAcceptAllConfirm}
        onCancel={() => setAcceptAllConfirmOpen(false)}
        loading={acting}
      />

      <ConfirmDialog
        open={rejectConfirmOpen}
        title="Reject card?"
        message={
          draft
            ? `Reject "${draft.title}" (${draft.id})? It will be removed from the queue.`
            : ""
        }
        confirmLabel="Reject"
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectConfirmOpen(false)}
        loading={acting}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ open: false, message: "" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast({ open: false, message: "" })}
          severity={toast.message.includes("Failed") ? "error" : "success"}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
