"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select from "@mui/material/Select";
import type { CardItem, CategorySlug, Playlist } from "@src/utils/types";
import {
  buildPlacementOptions,
  fromPlacementKeys,
  toPlacementKeys,
  type PlacementKey,
} from "@src/utils/placements";

interface CardAssignmentFieldsProps {
  categories: CategorySlug[];
  playlistIds: string[];
  playlists: Playlist[];
  onAssignmentsChange: (assignments: {
    categories: CategorySlug[];
    playlistIds: string[];
  }) => void;
}

export default function CardAssignmentFields({
  categories,
  playlistIds,
  playlists,
  onAssignmentsChange,
}: CardAssignmentFieldsProps) {
  const placementOptions = useMemo(
    () => buildPlacementOptions(playlists),
    [playlists],
  );

  const optionMap = useMemo(
    () => new Map(placementOptions.map((option) => [option.key, option])),
    [placementOptions],
  );

  const selectedKeys = useMemo(
    () => toPlacementKeys(categories, playlistIds),
    [categories, playlistIds],
  );

  const handleChange = (keys: PlacementKey[]) => {
    onAssignmentsChange(fromPlacementKeys(keys, playlists));
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="placements-label">Where to show this card</InputLabel>
      <Select
        labelId="placements-label"
        multiple
        value={selectedKeys}
        label="Where to show this card"
        onChange={(event) => {
          const value = event.target.value;
          handleChange(
            typeof value === "string"
              ? (value.split(",") as PlacementKey[])
              : (value as PlacementKey[]),
          );
        }}
        input={<OutlinedInput label="Where to show this card" />}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {(selected as PlacementKey[]).map((key) => {
              const option = optionMap.get(key);
              return (
                <Chip
                  key={key}
                  label={option?.label ?? key}
                  size="small"
                  variant={option?.kind === "category" ? "filled" : "outlined"}
                />
              );
            })}
          </Box>
        )}
      >
        {placementOptions.map((option) => (
          <MenuItem key={option.key} value={option.key} sx={{ pl: 2 + option.depth * 2 }}>
            <Checkbox checked={selectedKeys.includes(option.key)} />
            <ListItemText
              primary={option.label}
              secondary={
                option.kind === "category"
                  ? "Category page"
                  : option.depth > 1
                    ? "Sub-playlist"
                    : "Playlist"
              }
            />
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>
        Pick category pages and/or playlists. First category selected sets the card
        ID prefix (e.g. document-001). Same card can appear in multiple places.
      </FormHelperText>
    </FormControl>
  );
}

export const hasValidAssignments = (
  card: Pick<CardItem, "categories" | "playlistIds">,
) => card.categories.length > 0 || card.playlistIds.length > 0;
