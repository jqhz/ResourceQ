"use client";

import { useCallback, useState } from "react";

export const useDeferredReorder = <T>(sourceItems: T[]) => {
  const [draftItems, setDraftItems] = useState<T[] | null>(null);

  const items = draftItems ?? sourceItems;
  const dirty = draftItems !== null;

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setDraftItems((currentDraft) => {
      const current = currentDraft ?? sourceItems;
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.length ||
        toIndex >= current.length ||
        fromIndex === toIndex
      ) {
        return currentDraft;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [sourceItems]);

  const reset = useCallback(() => {
    setDraftItems(null);
  }, []);

  const commit = useCallback(() => {
    setDraftItems(null);
  }, []);

  return {
    items,
    dirty,
    moveItem,
    reset,
    commit,
  };
};
