/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import SearchIcon from "@mui/icons-material/Search";
import type { CardItem, Playlist } from "@src/utils/types";
import { CATEGORIES } from "@src/utils/constants";
import { searchCards } from "@src/utils/search";
import { getNextIdForCategory, getNextPlaylistId } from "@src/utils/id";
import CardModal, { emptyCard } from "./CardModal";
import ConfirmDialog from "./ConfirmDialog";
import PlaylistModal, { emptyPlaylist } from "./PlaylistModal";

export default function ManageTab() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [idSortOrder, setIdSortOrder] = useState<"asc" | "desc" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalInitialCard, setModalInitialCard] = useState<CardItem>(emptyCard());
  const [modalKey, setModalKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistModalMode, setPlaylistModalMode] = useState<"add" | "edit">("add");
  const [playlistInitial, setPlaylistInitial] = useState<Playlist>(emptyPlaylist());
  const [playlistModalKey, setPlaylistModalKey] = useState(0);
  const [playlistSaving, setPlaylistSaving] = useState(false);
  const [playlistDeleting, setPlaylistDeleting] = useState(false);
  const [deletePlaylistTarget, setDeletePlaylistTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const fetchContent = useCallback(async () => {
    const response = await fetch("/api/cards", { cache: "no-store" });
    if (!response.ok) {
      setToast({ open: true, message: "Failed to load cards." });
      return;
    }
    const data = (await response.json()) as {
      cards: CardItem[];
      playlists: Playlist[];
    };
    setCards(data.cards ?? []);
    setPlaylists(data.playlists ?? []);
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const playlistMap = useMemo(
    () =>
      new Map(
        playlists.map((playlist) => [
          playlist.id,
          `${playlist.category} > ${playlist.title}`,
        ]),
      ),
    [playlists],
  );

  const categoryLabel = useMemo(
    () => new Map(CATEGORIES.map((category) => [category.slug, category.label])),
    [],
  );

  const filteredByCategory = useMemo(() => {
    if (filter === "all") return cards;
    if (filter.startsWith("category:")) {
      const category = filter.replace("category:", "");
      return cards.filter((card) => card.categories.includes(category as CardItem["categories"][number]));
    }
    if (filter.startsWith("playlist:")) {
      const playlistId = filter.replace("playlist:", "");
      return cards.filter((card) => card.playlistIds.includes(playlistId));
    }
    return cards;
  }, [cards, filter]);

  const displayedCards = useMemo(
    () => searchCards(filteredByCategory, searchQuery),
    [filteredByCategory, searchQuery],
  );

  const sortedDisplayedCards = useMemo(() => {
    const nextCards = [...displayedCards];
    if (!idSortOrder) return nextCards;

    nextCards.sort((left, right) => {
      const comparison = left.id.localeCompare(right.id, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return idSortOrder === "asc" ? comparison : -comparison;
    });

    return nextCards;
  }, [displayedCards, idSortOrder]);

  const searchOptions = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    return searchCards(cards, trimmed).slice(0, 8);
  }, [cards, searchQuery]);

  const filterOptions = useMemo(() => {
    const options: React.ReactNode[] = [
      <MenuItem key="all" value="all">
        All cards
      </MenuItem>,
    ];

    CATEGORIES.forEach((category) => {
      options.push(
        <ListSubheader key={`header-${category.slug}`}>
          {category.label}
        </ListSubheader>,
      );
      options.push(
        <MenuItem key={`category-${category.slug}`} value={`category:${category.slug}`}>
          {category.label} (All)
        </MenuItem>,
      );
      playlists
        .filter((playlist) => playlist.category === category.slug)
        .forEach((playlist) => {
          options.push(
            <MenuItem
              key={`playlist-${playlist.id}`}
              value={`playlist:${playlist.id}`}
            >
              {category.label} &gt; {playlist.title}
            </MenuItem>,
          );
        });
    });

    return options;
  }, [playlists]);

  const existingIds = useMemo(
    () => cards.map((card) => card.id),
    [cards],
  );

  const existingPlaylistIds = useMemo(
    () => playlists.map((playlist) => playlist.id),
    [playlists],
  );

  const handleToggleIdSort = () => {
    setIdSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  };

  const openAddModal = () => {
    const card = emptyCard();
    card.id = getNextIdForCategory(card.categories[0], existingIds);
    setModalMode("add");
    setModalInitialCard(card);
    setModalKey((key) => key + 1);
    setModalOpen(true);
  };

  const openAddPlaylistModal = () => {
    const playlist = emptyPlaylist();
    playlist.id = getNextPlaylistId(playlist.category, existingPlaylistIds);
    setPlaylistModalMode("add");
    setPlaylistInitial(playlist);
    setPlaylistModalKey((key) => key + 1);
    setPlaylistModalOpen(true);
  };

  const openEditPlaylistModal = (playlist: Playlist) => {
    setPlaylistModalMode("edit");
    setPlaylistInitial({
      ...playlist,
      description: playlist.description ?? "",
    });
    setPlaylistModalKey((key) => key + 1);
    setPlaylistModalOpen(true);
  };

  const handlePlaylistSave = async (playlistDraft: Playlist) => {
    setPlaylistSaving(true);
    const payload = {
      playlist: {
        ...playlistDraft,
        description: playlistDraft.description?.trim() || undefined,
        parentPlaylistId: playlistDraft.parentPlaylistId || undefined,
        title: playlistDraft.title.trim(),
        slug: playlistDraft.slug.trim(),
        image: playlistDraft.image.trim(),
      },
    };
    const response = await fetch(
      playlistModalMode === "add"
        ? "/api/playlists"
        : `/api/playlists/${playlistDraft.id}`,
      {
        method: playlistModalMode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setPlaylistSaving(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast({
        open: true,
        message: data.error ?? "Unable to save playlist.",
      });
      return;
    }
    setPlaylistModalOpen(false);
    setToast({
      open: true,
      message:
        playlistModalMode === "add" ? "Playlist added." : "Playlist updated.",
    });
    await fetchContent();
  };

  const handlePlaylistDeleteConfirm = async () => {
    if (!deletePlaylistTarget) return;
    setPlaylistDeleting(true);
    const response = await fetch(`/api/playlists/${deletePlaylistTarget.id}`, {
      method: "DELETE",
    });
    setPlaylistDeleting(false);
    if (!response.ok) {
      setToast({ open: true, message: "Failed to delete playlist." });
      return;
    }
    setDeletePlaylistTarget(null);
    setPlaylistModalOpen(false);
    setToast({ open: true, message: "Playlist deleted." });
    await fetchContent();
  };

  const openEditModal = (card: CardItem) => {
    setModalMode("edit");
    setModalInitialCard({
      ...card,
      description: card.description ?? "",
      image: card.image ?? "",
      date: card.date ?? "",
    });
    setModalKey((key) => key + 1);
    setModalOpen(true);
  };

  const handleSave = async (draft: CardItem) => {
    setSaving(true);
    const payload = {
      card: {
        ...draft,
        description: draft.description?.trim() || undefined,
        image: draft.image?.trim() || undefined,
        date: draft.date?.trim() || undefined,
        url: draft.url.trim(),
      },
    };

    const response = await fetch(
      modalMode === "add" ? "/api/queue" : `/api/cards/${draft.id}`,
      {
        method: modalMode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSaving(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast({
        open: true,
        message: data.error ?? "Unable to save card.",
      });
      return;
    }

    setModalOpen(false);
    setToast({
      open: true,
      message:
        modalMode === "add"
          ? "Card added to queue for approval."
          : "Card updated.",
    });
    await fetchContent();
  };

  const requestDelete = (card: Pick<CardItem, "id" | "title">) => {
    setDeleteTarget({ id: card.id, title: card.title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const response = await fetch(`/api/cards/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!response.ok) {
      setToast({ open: true, message: "Failed to delete card." });
      return;
    }
    setDeleteTarget(null);
    setModalOpen(false);
    setToast({ open: true, message: "Card deleted." });
    await fetchContent();
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography variant="h5">Manage</Typography>
        <Button variant="contained" onClick={openAddModal}>
          Add Card
        </Button>
      </Stack>

      <Stack spacing={2}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <Typography variant="h6">Playlists</Typography>
          <Button variant="outlined" onClick={openAddPlaylistModal}>
            Add Playlist
          </Button>
        </Stack>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Image</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {playlists.map((playlist) => (
                <TableRow
                  key={playlist.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => openEditPlaylistModal(playlist)}
                >
                  <TableCell>{playlist.title}</TableCell>
                  <TableCell>{playlist.slug}</TableCell>
                  <TableCell>{playlist.id}</TableCell>
                  <TableCell>
                    {categoryLabel.get(playlist.category) ?? playlist.category}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {playlist.image}
                  </TableCell>
                  <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <Button size="small" onClick={() => openEditPlaylistModal(playlist)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          setDeletePlaylistTarget({
                            id: playlist.id,
                            title: playlist.title,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {playlists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No playlists found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Stack>

      <Divider />

      <Stack spacing={2}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}
        >
          <Typography variant="h6">Cards</Typography>
          <TextField
            select
            size="small"
            label="Filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            sx={{ minWidth: 260 }}
          >
            {filterOptions}
          </TextField>
        </Stack>

        <Stack spacing={1}>
          <TextField
            label="Search cards"
            placeholder="Title, id, url, category..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {searchQuery.trim().length > 0 && (
            <Paper
              variant="outlined"
              sx={{
                maxHeight: 240,
                overflow: "auto",
              }}
            >
              {searchOptions.length > 0 ? (
                <List dense disablePadding>
                  {searchOptions.map((card) => (
                    <ListItemButton
                      key={card.id}
                      onClick={() => {
                        openEditModal(card);
                        setSearchQuery("");
                      }}
                    >
                      <Stack>
                        <Typography variant="body2">{card.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {card.id} •{" "}
                          {card.categories
                            .map((slug) => categoryLabel.get(slug) ?? slug)
                            .join(", ")}
                        </Typography>
                      </Stack>
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Typography sx={{ p: 2 }} color="text.secondary" variant="body2">
                  No matches found.
                </Typography>
              )}
            </Paper>
          )}
        </Stack>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={handleToggleIdSort}
                  sx={{
                    minWidth: 0,
                    px: 0,
                    color: "inherit",
                    justifyContent: "flex-start",
                    textTransform: "none",
                  }}
                  endIcon={
                    idSortOrder === "desc" ? (
                      <ArrowDownwardIcon fontSize="small" />
                    ) : idSortOrder === "asc" ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : null
                  }
                >
                  ID
                </Button>
              </TableCell>
              <TableCell>Categories</TableCell>
              <TableCell>Playlists</TableCell>
              <TableCell>URL</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedDisplayedCards.map((card) => (
              <TableRow
                key={card.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => openEditModal(card)}
              >
                <TableCell>{card.title}</TableCell>
                <TableCell>{card.id}</TableCell>
                <TableCell>
                  <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                    {card.categories.map((slug) => (
                      <Chip
                        key={slug}
                        label={categoryLabel.get(slug) ?? slug}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  {card.playlistIds.length === 0 ? (
                    "—"
                  ) : (
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                      {card.playlistIds.map((playlistId) => (
                        <Chip
                          key={playlistId}
                          label={playlistMap.get(playlistId) ?? playlistId}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {card.url}
                </TableCell>
                <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "flex-end" }}
                  >
                    <Button size="small" onClick={() => openEditModal(card)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => requestDelete(card)}
                    >
                      Delete
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {sortedDisplayedCards.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">No cards found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <CardModal
        key={modalKey}
        open={modalOpen}
        mode={modalMode}
        initialCard={modalInitialCard}
        playlists={playlists}
        existingIds={existingIds}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={
          modalMode === "edit"
            ? () => requestDelete(modalInitialCard)
            : undefined
        }
        saving={saving}
        deleting={deleting}
      />

      <PlaylistModal
        key={playlistModalKey}
        open={playlistModalOpen}
        mode={playlistModalMode}
        initialPlaylist={playlistInitial}
        playlists={playlists}
        existingPlaylistIds={existingPlaylistIds}
        onClose={() => setPlaylistModalOpen(false)}
        onSave={handlePlaylistSave}
        onDelete={
          playlistModalMode === "edit"
            ? () =>
                setDeletePlaylistTarget({
                  id: playlistInitial.id,
                  title: playlistInitial.title,
                })
            : undefined
        }
        saving={playlistSaving}
        deleting={playlistDeleting}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete card?"
        message={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}" (${deleteTarget.id})? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={deletePlaylistTarget !== null}
        title="Delete playlist?"
        message={
          deletePlaylistTarget
            ? `Permanently delete "${deletePlaylistTarget.title}" (${deletePlaylistTarget.id})? Cards in this playlist will be unlinked.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handlePlaylistDeleteConfirm}
        onCancel={() => setDeletePlaylistTarget(null)}
        loading={playlistDeleting}
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
