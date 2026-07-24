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
import { toCategoryTimelineEntries } from "@src/utils/categoryTimeline";
import { useDeferredReorder } from "@src/hooks/useDeferredReorder";

interface CategoryTimelineTableProps {
  category: CategorySlug;
  rows: CategoryTimelineRow[];
  categoryLabel: Map<CategorySlug, string>;
  playlistMap: Map<string, string>;
  savingOrder: boolean;
  dragEnabled: boolean;
  onSaveOrder: (
    category: CategorySlug,
    order: ReturnType<typeof toCategoryTimelineEntries>,
  ) => Promise<boolean>;
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
  savingOrder,
  dragEnabled,
  onSaveOrder,
  onEditCard,
  onEditPlaylist,
  onArchiveCard,
  onDeleteCard,
}: CategoryTimelineTableProps) {
  const { items: displayRows, dirty, moveItem, reset, commit } =
    useDeferredReorder(rows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const canDrag = dragEnabled && !savingOrder;

  const handleSave = async () => {
    const ok = await onSaveOrder(category, toCategoryTimelineEntries(displayRows));
    if (ok) {
      commit();
    }
  };

  const handleDragStart = (index: number) => {
    if (!canDrag) return;
    setDragIndex(index);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLTableRowElement>,
    index: number,
  ) => {
    if (!canDrag || dragIndex === null) return;
    event.preventDefault();
    setOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (!canDrag || dragIndex === null) return;
    moveItem(dragIndex, index);
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const colSpan = useMemo(() => (canDrag || dirty ? 8 : 7), [canDrag, dirty]);

  return (
    <Stack spacing={1}>
      {dirty && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="body2" color="warning.main">
            Unsaved order changes
          </Typography>
          <Button
            size="small"
            variant="contained"
            disabled={savingOrder}
            onClick={() => {
              void handleSave();
            }}
          >
            Save order
          </Button>
          <Button size="small" disabled={savingOrder} onClick={reset}>
            Discard
          </Button>
        </Stack>
      )}
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {(canDrag || dirty) && <TableCell width={48} />}
              <TableCell>Type</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Recommended</TableCell>
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
                  onDrop={() => handleDrop(index)}
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
                  {(canDrag || dirty) && (
                    <TableCell
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {canDrag && (
                        <IconButton
                          size="small"
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragEnd={handleDragEnd}
                          aria-label="Drag to reorder"
                          sx={{ cursor: "grab" }}
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                  <Chip
                    label={isCard ? "Root card" : "Playlist"}
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
                      row.card.recommended ? (
                        <Chip label="Yes" size="small" color="secondary" />
                      ) : (
                        "—"
                      )
                    ) : (
                      "—"
                    )}
                  </TableCell>
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
                          <Button size="small" onClick={() => onArchiveCard(row)}>
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
                <TableCell colSpan={colSpan}>
                  <Typography color="text.secondary">
                    No cards or playlists found for this category.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
