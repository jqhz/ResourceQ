"use client";

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

export const emptyPlaylist = (): Playlist => ({
  id: "",
  category: "tutorials",
  title: "",
  image: "",
  description: "",
});

interface PlaylistModalProps {
  open: boolean;
  mode: "add" | "edit";
  draft: Playlist;
  playlists: Playlist[];
  onClose: () => void;
  onChange: (draft: Playlist) => void;
  onSave: () => void;
  onDelete?: () => void;
  saving?: boolean;
  deleting?: boolean;
}

export default function PlaylistModal({
  open,
  mode,
  draft,
  playlists,
  onClose,
  onChange,
  onSave,
  onDelete,
  saving = false,
  deleting = false,
}: PlaylistModalProps) {
  const parentOptions = playlists.filter(
    (playlist) =>
      playlist.category === draft.category && playlist.id !== draft.id,
  );

  const setField = <K extends keyof Playlist>(key: K, value: Playlist[K]) => {
    onChange({ ...draft, [key]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "add" ? "Add Playlist" : "Edit Playlist"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
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
            onChange={(event) => setField("title", event.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Category"
            value={draft.category}
            onChange={(event) => {
              const category = event.target.value as CategorySlug;
              onChange({
                ...draft,
                category,
                parentPlaylistId: undefined,
              });
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
            onClick={onSave}
            disabled={saving || deleting || !draft.id || !draft.title || !draft.image}
          >
            {mode === "add" ? "Add Playlist" : "Save Changes"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
