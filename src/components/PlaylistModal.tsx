"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import type { CategorySlug, Playlist } from "@src/utils/types";
import { CATEGORIES } from "@src/utils/constants";
import { getNextPlaylistId } from "@src/utils/id";
import { SLUG_PATTERN, slugify } from "@src/utils/slug";

export const emptyPlaylist = (): Playlist => ({
  id: "",
  category: "tutorials",
  title: "",
  slug: "",
  position: 0,
  image: "",
  description: "",
});

interface PlaylistModalProps {
  open: boolean;
  mode: "add" | "edit";
  initialPlaylist: Playlist;
  playlists: Playlist[];
  existingPlaylistIds: string[];
  onClose: () => void;
  onSave: (playlist: Playlist) => void;
  onDelete?: () => void;
  saving?: boolean;
  deleting?: boolean;
}

function validatePlaylist(playlist: Playlist): string | null {
  if (!playlist.id.trim()) return "ID is required.";
  if (!playlist.title.trim()) return "Title is required.";
  if (!playlist.slug.trim()) return "Slug is required.";
  if (!SLUG_PATTERN.test(playlist.slug.trim())) {
    return "Slug must use lowercase letters, numbers, and dashes only.";
  }
  if (!playlist.image.trim()) return "Image is required.";
  return null;
}

export default function PlaylistModal({
  open,
  mode,
  initialPlaylist,
  playlists,
  existingPlaylistIds,
  onClose,
  onSave,
  onDelete,
  saving = false,
  deleting = false,
}: PlaylistModalProps) {
  const [draft, setDraft] = useState(initialPlaylist);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === "edit");
  const [validationError, setValidationError] = useState<string | null>(null);

  const parentOptions = useMemo(
    () =>
      playlists.filter(
        (playlist) =>
          playlist.category === draft.category && playlist.id !== draft.id,
      ),
    [playlists, draft.category, draft.id],
  );

  const setField = <K extends keyof Playlist>(key: K, value: Playlist[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const handleSave = () => {
    const error = validatePlaylist(draft);
    if (error) {
      setValidationError(error);
      return;
    }
    onSave(draft);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "add" ? "Add Playlist" : "Edit Playlist"}</DialogTitle>
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
            helperText="e.g. tutorial-p-001"
            disabled={mode === "edit"}
            fullWidth
          />
          <TextField
            label="Title"
            value={draft.title}
            onChange={(event) => {
              const title = event.target.value;
              setDraft((current) => {
                if (mode === "add" && !slugManuallyEdited) {
                  return { ...current, title, slug: slugify(title) };
                }
                return { ...current, title };
              });
              setValidationError(null);
            }}
            fullWidth
          />
          <TextField
            label="Slug"
            value={draft.slug}
            onChange={(event) => {
              setSlugManuallyEdited(true);
              setField("slug", event.target.value);
            }}
            helperText="Used in public URLs for this playlist within its category."
            fullWidth
          />
          <TextField
            select
            label="Category"
            value={draft.category}
            onChange={(event) => {
              const category = event.target.value as CategorySlug;
              setDraft((current) => {
                const next: Playlist = {
                  ...current,
                  category,
                  parentPlaylistId: undefined,
                };
                if (mode === "add") {
                  next.id = getNextPlaylistId(category, existingPlaylistIds);
                }
                return next;
              });
              setValidationError(null);
            }}
            fullWidth
          >
            {CATEGORIES.map((category) => (
              <MenuItem key={category.slug} value={category.slug}>
                {category.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Parent playlist"
            value={draft.parentPlaylistId ?? ""}
            onChange={(event) =>
              setField("parentPlaylistId", event.target.value || undefined)
            }
            fullWidth
          >
            <MenuItem value="">None (top-level)</MenuItem>
            {parentOptions.map((playlist) => (
              <MenuItem key={playlist.id} value={playlist.id}>
                {playlist.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Image"
            value={draft.image}
            onChange={(event) => setField("image", event.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={draft.description ?? ""}
            onChange={(event) => setField("description", event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
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
            {mode === "add" ? "Add Playlist" : "Save Changes"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
