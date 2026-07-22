"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import type { CategorySlug, CategoryTimelineRow } from "@src/utils/types";
import {
  reorderTimelineRows,
  toCategoryTimelineEntries,
} from "@src/utils/categoryTimeline";

interface CategoryTimelineTableProps {
  category: CategorySlug;
  rows: CategoryTimelineRow[];
  categoryLabel: Map<CategorySlug, string>;
  playlistMap: Map<string, string>;
  reordering: boolean;
  dragEnabled: boolean;
  onReorder: (
    category: CategorySlug,
    order: ReturnType<typeof toCategoryTimelineEntries>,
  ) => Promise<void>;
  onEditCard: (row: Extract<CategoryTimelineRow, { kind: "card" }>) => void;
  onEditPlaylist: (row: Extract<CategoryTimelineRow, { kind: "playlist" }>) => void;
  onArchiveCard: (row: Extract<CategoryTimelineRow, { kind: "card" }>) => void;
  onDeleteCard: (card: Pick<Extract<CategoryTimelineRow, { kind: "card" }>["card"], "id" | "title">) => void;
}

export default function CategoryTimelineTable({
  category,
  rows,
  categoryLabel,
  playlistMap,
  reordering,
  dragEnabled,
  onReorder,
  onEditCard,
  onEditPlaylist,
  onArchiveCard,
  onDeleteCard,
}: CategoryTimelineTableProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const displayRows = useMemo(() => rows, [rows]);

  const persistReorder = async (fromIndex: number, toIndex: number) => {
    const nextRows = reorderTimelineRows(displayRows, fromIndex, toIndex);
    await onReorder(category, toCategoryTimelineEntries(nextRows));
  };

  const handleDragStart = (index: number) => {
    if (!dragEnabled || reordering) return;
    setDragIndex(index);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLTableRowElement>,
    index: number,
  ) => {
    if (!dragEnabled || reordering || dragIndex === null) return;
    event.preventDefault();
    setOverIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (!dragEnabled || reordering || dragIndex === null) return;
    const fromIndex = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    await persistReorder(fromIndex, index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {dragEnabled && <TableCell width={48} />}
            <TableCell>Type</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>ID</TableCell>
            <TableCell>Playlists</TableCell>
            <TableCell>URL</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayRows.map((row, index) => {
            const isCard = row.kind === "card";
            const isDragging = dragIndex === index;
            const isDropTarget = overIndex === index && dragIndex !== index;

            return (
              <TableRow
                key={`${row.kind}:${row.id}`}
                hover
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={() => {
                  void handleDrop(index);
                }}
                sx={{
                  cursor: "pointer",
                  opacity: isDragging ? 0.5 : 1,
                  bgcolor: isDropTarget ? "action.hover" : undefined,
                }}
                onClick={() => {
                  if (isCard) {
                    onEditCard(row);
                  } else {
                    onEditPlaylist(row);
                  }
                }}
              >
                {dragEnabled && (
                  <TableCell
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <IconButton
                      size="small"
                      draggable={!reordering}
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      aria-label="Drag to reorder"
                      sx={{ cursor: reordering ? "not-allowed" : "grab" }}
                      disabled={reordering}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
                <TableCell>
                  <Chip
                    label={isCard ? "Card" : "Playlist"}
                    size="small"
                    color={isCard ? "default" : "primary"}
                    variant={isCard ? "outlined" : "filled"}
                  />
                </TableCell>
                <TableCell>
                  {isCard ? row.card.title : row.playlist.title}
                </TableCell>
                <TableCell>{row.id}</TableCell>
                <TableCell>
                  {isCard ? (
                    row.card.playlistIds.length === 0 ? (
                      "—"
                    ) : (
                      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                        {row.card.playlistIds.map((playlistId) => (
                          <Chip
                            key={playlistId}
                            label={playlistMap.get(playlistId) ?? playlistId}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    )
                  ) : (
                    categoryLabel.get(row.playlist.category) ??
                    row.playlist.category
                  )}
                </TableCell>
                <TableCell
                  sx={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {isCard ? row.card.url : row.playlist.slug}
                </TableCell>
                <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "flex-end" }}
                  >
                    <Button
                      size="small"
                      onClick={() =>
                        isCard ? onEditCard(row) : onEditPlaylist(row)
                      }
                    >
                      Edit
                    </Button>
                    {isCard && (
                      <>
                        <Button
                          size="small"
                          onClick={() => onArchiveCard(row)}
                        >
                          Archive
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() =>
                            onDeleteCard({
                              id: row.card.id,
                              title: row.card.title,
                            })
                          }
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {displayRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={dragEnabled ? 7 : 6}>
                <Typography color="text.secondary">
                  No cards or playlists found for this category.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
