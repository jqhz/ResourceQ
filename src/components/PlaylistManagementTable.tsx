"use client";

import { useCallback, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import type { CategorySlug, Playlist } from "@src/utils/types";
import { CATEGORIES } from "@src/utils/constants";
import { playlistSiblingGroupKey, reorderList } from "@src/utils/reorderList";

type SiblingGroup = {
  key: string;
  category: CategorySlug;
  parentPlaylistId?: string;
  playlists: Playlist[];
};

interface PlaylistManagementTableProps {
  playlists: Playlist[];
  savingOrder: boolean;
  onSaveGroupOrder: (
    category: CategorySlug,
    parentPlaylistId: string | undefined,
    order: string[],
  ) => Promise<boolean>;
  onEditPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlist: Pick<Playlist, "id" | "title">) => void;
}

const sortPlaylistsByPosition = (items: Playlist[]) =>
  [...items].sort(
    (left, right) =>
      left.position - right.position || left.id.localeCompare(right.id),
  );

export default function PlaylistManagementTable({
  playlists,
  savingOrder,
  onSaveGroupOrder,
  onEditPlaylist,
  onDeletePlaylist,
}: PlaylistManagementTableProps) {
  const [orderOverrides, setOrderOverrides] = useState<Record<string, string[]>>({});
  const [dragState, setDragState] = useState<{
    groupKey: string;
    index: number;
  } | null>(null);
  const [overState, setOverState] = useState<{
    groupKey: string;
    index: number;
  } | null>(null);

  const siblingGroupsByCategory = useMemo(() => {
    const groups = new Map<string, SiblingGroup>();

    for (const playlist of playlists) {
      const key = playlistSiblingGroupKey(playlist.category, playlist.parentPlaylistId);
      const existing = groups.get(key);
      if (existing) {
        existing.playlists.push(playlist);
      } else {
        groups.set(key, {
          key,
          category: playlist.category,
          parentPlaylistId: playlist.parentPlaylistId,
          playlists: [playlist],
        });
      }
    }

    const byCategory = new Map<CategorySlug, SiblingGroup[]>();
    for (const group of groups.values()) {
      group.playlists = sortPlaylistsByPosition(group.playlists);
      const list = byCategory.get(group.category) ?? [];
      list.push(group);
      byCategory.set(group.category, list);
    }

    for (const list of byCategory.values()) {
      list.sort((left, right) => {
        const leftPos = left.playlists[0]?.position ?? 0;
        const rightPos = right.playlists[0]?.position ?? 0;
        return leftPos - rightPos || left.key.localeCompare(right.key);
      });
    }

    return byCategory;
  }, [playlists]);

  const getOrderedPlaylists = useCallback(
    (group: SiblingGroup) => {
      const override = orderOverrides[group.key];
      if (!override) {
        return group.playlists;
      }
      const byId = new Map(group.playlists.map((playlist) => [playlist.id, playlist]));
      return override
        .map((id) => byId.get(id))
        .filter((playlist): playlist is Playlist => playlist !== undefined);
    },
    [orderOverrides],
  );

  const dirty = Object.keys(orderOverrides).length > 0;

  const resetOrder = () => {
    setOrderOverrides({});
    setDragState(null);
    setOverState(null);
  };

  const handleSaveAll = async () => {
    for (const [key, order] of Object.entries(orderOverrides)) {
      const group = [...siblingGroupsByCategory.values()]
        .flat()
        .find((item) => item.key === key);
      if (!group) continue;
      const ok = await onSaveGroupOrder(group.category, group.parentPlaylistId, order);
      if (!ok) {
        return;
      }
    }
    resetOrder();
  };

  const handleDrop = (group: SiblingGroup, toIndex: number) => {
    if (!dragState || dragState.groupKey !== group.key) {
      setDragState(null);
      setOverState(null);
      return;
    }

    const current = getOrderedPlaylists(group).map((playlist) => playlist.id);
    const nextOrder = reorderList(current, dragState.index, toIndex);
    setOrderOverrides((currentOverrides) => ({
      ...currentOverrides,
      [group.key]: nextOrder,
    }));
    setDragState(null);
    setOverState(null);
  };

  const categoriesWithPlaylists = CATEGORIES.filter(
    (category) => (siblingGroupsByCategory.get(category.slug)?.length ?? 0) > 0,
  );

  return (
    <Stack spacing={2}>
      {dirty && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="body2" color="warning.main">
            Unsaved playlist order changes
          </Typography>
          <Button
            size="small"
            variant="contained"
            disabled={savingOrder}
            onClick={() => {
              void handleSaveAll();
            }}
          >
            Save order
          </Button>
          <Button size="small" disabled={savingOrder} onClick={resetOrder}>
            Discard
          </Button>
        </Stack>
      )}

      {categoriesWithPlaylists.length === 0 ? (
        <Typography color="text.secondary">No playlists found.</Typography>
      ) : (
        categoriesWithPlaylists.map((category, categoryIndex) => {
          const groups = siblingGroupsByCategory.get(category.slug) ?? [];

          return (
            <Box key={category.slug}>
              {categoryIndex > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}
              >
                {category.label}
              </Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={48} />
                      <TableCell>Title</TableCell>
                      <TableCell>Slug</TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell>Parent</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groups.flatMap((group) => {
                      const ordered = getOrderedPlaylists(group);
                      return ordered.map((playlist, index) => {
                        const isDragging =
                          dragState?.groupKey === group.key &&
                          dragState.index === index;
                        const isDropTarget =
                          overState?.groupKey === group.key &&
                          overState.index === index &&
                          dragState?.groupKey === group.key &&
                          dragState?.index !== index;

                        const parentTitle = playlist.parentPlaylistId
                          ? playlists.find((item) => item.id === playlist.parentPlaylistId)
                              ?.title ?? playlist.parentPlaylistId
                          : "—";

                        return (
                          <TableRow
                            key={playlist.id}
                            hover
                            onDragOver={(event) => {
                              if (
                                !dragState ||
                                dragState.groupKey !== group.key ||
                                savingOrder
                              ) {
                                return;
                              }
                              event.preventDefault();
                              setOverState({ groupKey: group.key, index });
                            }}
                            onDrop={() => handleDrop(group, index)}
                            sx={{
                              cursor: "pointer",
                              opacity: isDragging ? 0.5 : 1,
                              bgcolor: isDropTarget ? "action.hover" : undefined,
                            }}
                            onClick={() => onEditPlaylist(playlist)}
                          >
                            <TableCell
                              onClick={(event) => event.stopPropagation()}
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <IconButton
                                size="small"
                                draggable={!savingOrder}
                                onDragStart={() =>
                                  setDragState({ groupKey: group.key, index })
                                }
                                onDragEnd={() => {
                                  setDragState(null);
                                  setOverState(null);
                                }}
                                aria-label="Drag to reorder"
                                sx={{ cursor: savingOrder ? "not-allowed" : "grab" }}
                                disabled={savingOrder}
                              >
                                <DragIndicatorIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                            <TableCell>{playlist.title}</TableCell>
                            <TableCell>{playlist.slug}</TableCell>
                            <TableCell>{playlist.id}</TableCell>
                            <TableCell>{parentTitle}</TableCell>
                            <TableCell
                              sx={{
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {playlist.image}
                            </TableCell>
                            <TableCell
                              align="right"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ justifyContent: "flex-end" }}
                              >
                                <Button
                                  size="small"
                                  onClick={() => onEditPlaylist(playlist)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    onDeletePlaylist({
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
                      });
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          );
        })
      )}
    </Stack>
  );
}
