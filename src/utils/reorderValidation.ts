type OrderedMember = {
  cardId: string;
  position: number;
  archived: boolean;
};

export const buildActiveOrderWithArchivedTail = (
  orderedActiveIds: string[],
  members: OrderedMember[],
  scopeLabel: string,
):
  | { ok: true; finalOrder: string[]; archivedCardIds: string[] }
  | { error: string } => {
  if (members.length === 0) {
    return { error: `No cards are linked to ${scopeLabel}.` };
  }

  const activeMembers = members.filter((member) => !member.archived);
  const archivedMembers = [...members.filter((member) => member.archived)].sort(
    (left, right) =>
      left.position - right.position || left.cardId.localeCompare(right.cardId),
  );
  const archivedCardIds = archivedMembers.map((member) => member.cardId);

  const activeIdSet = new Set(activeMembers.map((member) => member.cardId));
  const submittedIds = orderedActiveIds.filter(Boolean);

  if (new Set(submittedIds).size !== submittedIds.length) {
    return { error: "Order contains duplicate card ids." };
  }

  const unknownIds = submittedIds.filter((id) => !activeIdSet.has(id));
  if (unknownIds.length > 0) {
    const archivedOnly = unknownIds.filter((id) => archivedCardIds.includes(id));
    if (archivedOnly.length === unknownIds.length) {
      return {
        error: `Archived cards cannot be reordered in this view (${archivedOnly.join(", ")}). Restore them from Archived Cards, or they will stay at the end of the playlist order automatically when you save active cards.`,
      };
    }
    return {
      error: `These cards are not active in ${scopeLabel}: ${unknownIds.join(", ")}.`,
    };
  }

  const submittedSet = new Set(submittedIds);
  const missingActive = activeMembers
    .map((member) => member.cardId)
    .filter((id) => !submittedSet.has(id));
  if (missingActive.length > 0) {
    return {
      error: `Order is missing active cards in ${scopeLabel}: ${missingActive.join(", ")}. Refresh and try again.`,
    };
  }

  if (submittedIds.length !== activeMembers.length) {
    return {
      error: `Expected ${activeMembers.length} active cards for ${scopeLabel} but received ${submittedIds.length}. Refresh and try again.`,
    };
  }

  return {
    ok: true,
    finalOrder: [...submittedIds, ...archivedCardIds],
    archivedCardIds,
  };
};
