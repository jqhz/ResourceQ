"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import type { CardItem, Playlist } from "@src/utils/types";
import { getCategoryPrefix, getNextIdForCategory } from "@src/utils/id";
import { derivePrimaryCategory, toPlacementKeys } from "@src/utils/placements";
import CardAssignmentFields, { hasValidAssignments } from "./CardAssignmentFields";

export const emptyCard = (): CardItem => ({
  id: "",
  categories: ["tutorials"],
  playlistIds: [],
  categoryPositions: {},
  playlistPositions: {},
  title: "",
  description: "",
  image: "",
  date: "",
  url: "",
  recommended: false,
  archived: false,
});

interface CardModalProps {
  open: boolean;
  mode: "add" | "edit";
  initialCard: CardItem;
  playlists: Playlist[];
  existingIds: string[];
  onClose: () => void;
  onSave: (card: CardItem) => void;
  onDelete?: () => void;
  saving?: boolean;
  deleting?: boolean;
}

function validateCard(card: CardItem): string | null {
  if (!card.id.trim()) return "ID is required.";
  if (!card.title.trim()) return "Title is required.";
  if (!card.url.trim()) return "URL is required.";
  if (!hasValidAssignments(card)) {
    return "Select at least one category or playlist.";
  }
  return null;
}

export default function CardModal({
  open,
  mode,
  initialCard,
  playlists,
  existingIds,
  onClose,
  onSave,
  onDelete,
  saving = false,
  deleting = false,
}: CardModalProps) {
  const [draft, setDraft] = useState(initialCard);
  const [validationError, setValidationError] = useState<string | null>(null);

  const primaryCategory = derivePrimaryCategory(
    toPlacementKeys(draft.categories, draft.playlistIds),
    playlists,
  );

  const handleAssignmentsChange = (assignments: {
    categories: CardItem["categories"];
    playlistIds: string[];
  }) => {
    const next: CardItem = { ...draft, ...assignments };
    if (mode === "add") {
      const keys = toPlacementKeys(
        assignments.categories,
        assignments.playlistIds,
      );
      const primary = derivePrimaryCategory(keys, playlists);
      next.id = getNextIdForCategory(primary, existingIds);
    }
    setDraft(next);
    setValidationError(null);
  };

  const setField = <K extends keyof CardItem>(key: K, value: CardItem[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const handleSave = () => {
    const error = validateCard(draft);
    if (error) {
      setValidationError(error);
      return;
    }
    onSave(draft);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "add" ? "Add Card to Queue" : "Edit Card"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {validationError && (
            <Alert severity="error" onClose={() => setValidationError(null)}>
              {validationError}
            </Alert>
          )}
          <TextField
            label="ID"
            value={draft.id}
            onChange={(event) => setField("id", event.target.value)}
            helperText={`Based on primary category (e.g. ${getCategoryPrefix(primaryCategory)}-001)`}
            disabled={mode === "edit"}
            fullWidth
          />
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
            minRows={2}
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
          {mode === "edit" && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(draft.archived)}
                  onChange={(event) => setField("archived", event.target.checked)}
                />
              }
              label="Archived (hidden from public views)"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
        {mode === "edit" && onDelete ? (
          <Button color="error" onClick={onDelete} disabled={saving || deleting}>
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={saving || deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || deleting}
          >
            {mode === "add" ? "Add to Queue" : "Save Changes"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
