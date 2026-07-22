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
import type { CardItem, CategorySlug, Playlist, ReorderContext } from "@src/utils/types";
import { CATEGORIES } from "@src/utils/constants";
import { buildCategoryTimelineRows } from "@src/utils/categoryTimeline";
import { searchCards } from "@src/utils/search";
import { getNextIdForCategory, getNextPlaylistId } from "@src/utils/id";
import CardModal, { emptyCard } from "./CardModal";
import CategoryTimelineTable from "./CategoryTimelineTable";
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
  const [reordering, setReordering] = useState(false);
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

  const activeCards = useMemo(
    () => cards.filter((card) => !card.archived),
    [cards],
  );

  const archivedCards = useMemo(
    () => cards.filter((card) => card.archived),
    [cards],
  );

  const reorderContext = useMemo((): ReorderContext | null => {
    if (filter.startsWith("category:")) {
      return {
        type: "category",
        category: filter.replace("category:", "") as CardItem["categories"][number],
      };
    }
    if (filter.startsWith("playlist:")) {
      return {
        type: "playlist",
        playlistId: filter.replace("playlist:", ""),
      };
    }
    return null;
  }, [filter]);

  const categoryTimelineRows = useMemo(() => {
    if (reorderContext?.type !== "category") {
      return [];
    }

    return buildCategoryTimelineRows(
      reorderContext.category,
      activeCards,
      playlists,
    );
  }, [activeCards, playlists, reorderContext]);

  const filteredCategoryTimelineRows = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return categoryTimelineRows;

    return categoryTimelineRows.filter((row) => {
      if (row.kind === "card") {
        return searchCards([row.card], searchQuery).length > 0;
      }
      return (
        row.playlist.title.toLowerCase().includes(trimmed) ||
        row.playlist.id.toLowerCase().includes(trimmed) ||
        row.playlist.slug.toLowerCase().includes(trimmed)
      );
    });
  }, [categoryTimelineRows, searchQuery]);

  const playlistSiblingIndex = useMemo(() => {
    const indexById = new Map<string, { index: number; count: number }>();
    const groups = new Map<string, Playlist[]>();
    for (const playlist of playlists) {
      const key = `${playlist.category}::${playlist.parentPlaylistId ?? ""}`;
      const group = groups.get(key) ?? [];
      group.push(playlist);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      const sorted = [...group].sort(
        (left, right) => left.position - right.position || left.id.localeCompare(right.id),
      );
      sorted.forEach((playlist, index) => {
        indexById.set(playlist.id, { index, count: sorted.length });
      });
    }
    return indexById;
  }, [playlists]);

  const filteredByCategory = useMemo(() => {
    if (filter === "all") return activeCards;
    if (filter.startsWith("category:")) {
      const category = filter.replace("category:", "");
      return activeCards.filter((card) =>
        card.categories.includes(category as CardItem["categories"][number]),
      );
    }
    if (filter.startsWith("playlist:")) {
      const playlistId = filter.replace("playlist:", "");
      return activeCards.filter((card) => card.playlistIds.includes(playlistId));
    }
    return activeCards;
  }, [activeCards, filter]);

  const displayedCards = useMemo(
    () => searchCards(filteredByCategory, searchQuery),
    [filteredByCategory, searchQuery],
  );

  const sortedDisplayedCards = useMemo(() => {
    const nextCards = [...displayedCards];

    if (reorderContext?.type === "category") {
      const category = reorderContext.category;
      nextCards.sort(
        (left, right) =>
          (left.categoryPositions[category] ?? 0) -
          (right.categoryPositions[category] ?? 0),
      );
      return nextCards;
    }

    if (reorderContext?.type === "playlist") {
      const playlistId = reorderContext.playlistId;
      nextCards.sort(
        (left, right) =>
          (left.playlistPositions[playlistId] ?? 0) -
          (right.playlistPositions[playlistId] ?? 0),
      );
      return nextCards;
    }

    if (!idSortOrder) return nextCards;

    nextCards.sort((left, right) => {
      const comparison = left.id.localeCompare(right.id, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return idSortOrder === "asc" ? comparison : -comparison;
    });

    return nextCards;
  }, [displayedCards, idSortOrder, reorderContext]);

  const sortedArchivedCards = useMemo(
    () =>
      [...archivedCards].sort((left, right) =>
        left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
      ),
    [archivedCards],
  );

  const searchOptions = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    return searchCards(activeCards, trimmed).slice(0, 8);
  }, [activeCards, searchQuery]);

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

  const handleArchiveToggle = async (card: CardItem, archived: boolean) => {
    const response = await fetch(`/api/cards/${card.id}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    if (!response.ok) {
      setToast({
        open: true,
        message: archived ? "Failed to archive card." : "Failed to restore card.",
      });
      return;
    }
    setToast({
      open: true,
      message: archived ? "Card archived." : "Card restored.",
    });
    await fetchContent();
  };

  const handleReorderPlaylist = async (
    playlistId: string,
    direction: "up" | "down",
  ) => {
    setReordering(true);
    const response = await fetch("/api/reorder/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, direction }),
    });
    setReordering(false);
    if (!response.ok) {
      setToast({ open: true, message: "Failed to reorder playlist." });
      return;
    }
    await fetchContent();
  };

  const handleCategoryTimelineReorder = async (
    category: CategorySlug,
    order: { kind: "card" | "playlist"; id: string }[],
  ) => {
    setReordering(true);
    const response = await fetch("/api/reorder/category-timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, order }),
    });
    setReordering(false);
    if (!response.ok) {
      setToast({ open: true, message: "Failed to reorder category layout." });
      return;
    }
    await fetchContent();
  };

  const handleReorderCard = async (
    cardId: string,
    direction: "up" | "down",
  ) => {
    if (!reorderContext) return;
    setReordering(true);
    const response = await fetch("/api/reorder/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, direction, context: reorderContext }),
    });
    setReordering(false);
    if (!response.ok) {
      setToast({ open: true, message: "Failed to reorder card." });
      return;
    }
    await fetchContent();
  };

  const canReorderCards = reorderContext?.type === "playlist";
  const showCategoryTimeline = reorderContext?.type === "category";
  const categoryTimelineDragEnabled =
    showCategoryTimeline && searchQuery.trim().length === 0;

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
                <TableCell>Order</TableCell>
                <TableCell>Image</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {playlists.map((playlist) => {
                const sibling = playlistSiblingIndex.get(playlist.id);
                return (
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
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        disabled={
                          reordering ||
                          !sibling ||
                          sibling.index === 0
                        }
                        onClick={() => handleReorderPlaylist(playlist.id, "up")}
                        aria-label="Move playlist up"
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </Button>
                      <Button
                        size="small"
                        disabled={
                          reordering ||
                          !sibling ||
                          sibling.index >= sibling.count - 1
                        }
                        onClick={() => handleReorderPlaylist(playlist.id, "down")}
                        aria-label="Move playlist down"
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </Button>
                    </Stack>
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
              );
              })}
              {playlists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
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
          <Typography variant="h6">Active Cards</Typography>
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

        {showCategoryTimeline && (
          <Typography variant="body2" color="text.secondary">
            This list matches the public category page: root cards and playlist
            sections share one order. Drag rows to reorder. Search temporarily
            disables drag so you can edit matches.
          </Typography>
        )}

        {canReorderCards && (
          <Typography variant="body2" color="text.secondary">
            Reorder cards within this playlist using the arrows in the Order column.
          </Typography>
        )}

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

      {showCategoryTimeline ? (
        <CategoryTimelineTable
          category={reorderContext.category}
          rows={filteredCategoryTimelineRows}
          categoryLabel={categoryLabel}
          playlistMap={playlistMap}
          reordering={reordering}
          dragEnabled={categoryTimelineDragEnabled}
          onReorder={handleCategoryTimelineReorder}
          onEditCard={(row) => openEditModal(row.card)}
          onEditPlaylist={(row) => openEditPlaylistModal(row.playlist)}
          onArchiveCard={(row) => handleArchiveToggle(row.card, true)}
          onDeleteCard={requestDelete}
        />
      ) : (
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
              {canReorderCards && <TableCell>Order</TableCell>}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedDisplayedCards.map((card, index) => (
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
                {canReorderCards && (
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        disabled={reordering || index === 0}
                        onClick={() => handleReorderCard(card.id, "up")}
                        aria-label="Move card up"
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </Button>
                      <Button
                        size="small"
                        disabled={
                          reordering || index === sortedDisplayedCards.length - 1
                        }
                        onClick={() => handleReorderCard(card.id, "down")}
                        aria-label="Move card down"
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </Button>
                    </Stack>
                  </TableCell>
                )}
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
                      onClick={() => handleArchiveToggle(card, true)}
                    >
                      Archive
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
                <TableCell colSpan={canReorderCards ? 7 : 6}>
                  <Typography color="text.secondary">No cards found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      )}

      <Divider />

      <Stack spacing={2}>
        <Typography variant="h6">Archived Cards</Typography>
        <Typography variant="body2" color="text.secondary">
          Archived cards are hidden from public views. Restore them here when needed.
        </Typography>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Categories</TableCell>
                <TableCell>URL</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedArchivedCards.map((card) => (
                <TableRow key={card.id} hover>
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
                  <TableCell sx={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {card.url}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <Button size="small" onClick={() => openEditModal(card)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleArchiveToggle(card, false)}
                      >
                        Restore
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
              {sortedArchivedCards.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary">No archived cards.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Stack>

      <CardModal
        key={`card-${modalKey}`}
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
        key={`playlist-${playlistModalKey}`}
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
