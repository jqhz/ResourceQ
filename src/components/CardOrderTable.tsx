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
import type { CardItem } from "@src/utils/types";
import { useDeferredReorder } from "@src/hooks/useDeferredReorder";

interface CardOrderTableProps {
  cards: CardItem[];
  categoryLabel: Map<string, string>;
  playlistMap: Map<string, string>;
  dragEnabled: boolean;
  savingOrder: boolean;
  onSaveOrder: (orderedIds: string[]) => Promise<boolean>;
  onEditCard: (card: CardItem) => void;
  onArchiveCard: (card: CardItem) => void;
  onDeleteCard: (card: Pick<CardItem, "id" | "title">) => void;
}

export default function CardOrderTable({
  cards,
  categoryLabel,
  playlistMap,
  dragEnabled,
  savingOrder,
  onSaveOrder,
  onEditCard,
  onArchiveCard,
  onDeleteCard,
}: CardOrderTableProps) {
  const { items: displayCards, dirty, moveItem, reset, commit } =
    useDeferredReorder(cards);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const canDrag = dragEnabled && !savingOrder;
  const showDragColumn = canDrag || dirty;

  const colSpan = useMemo(() => (showDragColumn ? 8 : 7), [showDragColumn]);

  const handleSave = async () => {
    const ok = await onSaveOrder(displayCards.map((card) => card.id));
    if (ok) {
      commit();
    }
  };

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
              {showDragColumn && <TableCell width={48} />}
              <TableCell>Title</TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Recommended</TableCell>
              <TableCell>Categories</TableCell>
              <TableCell>Playlists</TableCell>
              <TableCell>URL</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayCards.map((card, index) => {
              const isDragging = dragIndex === index;
              const isDropTarget = overIndex === index && dragIndex !== index;

              return (
                <TableRow
                  key={card.id}
                  hover
                  onDragOver={(event) => {
                    if (!canDrag || dragIndex === null) return;
                    event.preventDefault();
                    setOverIndex(index);
                  }}
                  onDrop={() => {
                    if (!canDrag || dragIndex === null) return;
                    moveItem(dragIndex, index);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  sx={{
                    cursor: "pointer",
                    opacity: isDragging ? 0.5 : 1,
                    bgcolor: isDropTarget ? "action.hover" : undefined,
                  }}
                  onClick={() => onEditCard(card)}
                >
                  {showDragColumn && (
                    <TableCell
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {canDrag && (
                        <IconButton
                          size="small"
                          draggable
                          onDragStart={() => setDragIndex(index)}
                          onDragEnd={() => {
                            setDragIndex(null);
                            setOverIndex(null);
                          }}
                          aria-label="Drag to reorder"
                          sx={{ cursor: "grab" }}
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  )}
                  <TableCell>{card.title}</TableCell>
                  <TableCell>{card.id}</TableCell>
                  <TableCell>
                    {card.recommended ? (
                      <Chip label="Yes" size="small" color="secondary" />
                    ) : (
                      "—"
                    )}
                  </TableCell>
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
                  <TableCell
                    sx={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {card.url}
                  </TableCell>
                  <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ justifyContent: "flex-end" }}
                    >
                      <Button size="small" onClick={() => onEditCard(card)}>
                        Edit
                      </Button>
                      <Button size="small" onClick={() => onArchiveCard(card)}>
                        Archive
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => onDeleteCard(card)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {displayCards.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan}>
                  <Typography color="text.secondary">No cards found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
