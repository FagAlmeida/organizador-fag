import { addDays } from "@/lib/dates";
import type { BoardDTO, CardDTO } from "@/lib/types";

// Funções puras para manipular o estado do quadro no cliente.

export function findCardLocation(board: BoardDTO, cardId: string) {
  for (let listIndex = 0; listIndex < board.lists.length; listIndex++) {
    const cardIndex = board.lists[listIndex].cards.findIndex((c) => c.id === cardId);
    if (cardIndex !== -1) return { listIndex, cardIndex };
  }
  return null;
}

export function findCard(board: BoardDTO, cardId: string): CardDTO | null {
  const loc = findCardLocation(board, cardId);
  return loc ? board.lists[loc.listIndex].cards[loc.cardIndex] : null;
}

export function updateCardIn(
  board: BoardDTO,
  cardId: string,
  update: (card: CardDTO) => CardDTO,
): BoardDTO {
  return {
    ...board,
    lists: board.lists.map((list) =>
      list.cards.some((c) => c.id === cardId)
        ? { ...list, cards: list.cards.map((c) => (c.id === cardId ? update(c) : c)) }
        : list,
    ),
  };
}

/** Move um cartão para `toListId` na posição `toIndex` (sem ele mesmo na contagem). */
export function moveCardIn(
  board: BoardDTO,
  cardId: string,
  toListId: string,
  toIndex: number,
): BoardDTO {
  const card = findCard(board, cardId);
  if (!card) return board;
  const lists = board.lists.map((list) => ({
    ...list,
    cards: list.cards.filter((c) => c.id !== cardId),
  }));
  const target = lists.find((l) => l.id === toListId);
  if (!target) return board;
  target.cards.splice(toIndex, 0, { ...card, listId: toListId });
  return { ...board, lists };
}

export type DueFilter = "all" | "overdue" | "today" | "week" | "none";

export type CardFilters = {
  text: string;
  labelIds: string[];
  due: DueFilter;
};

export const EMPTY_FILTERS: CardFilters = { text: "", labelIds: [], due: "all" };

export function hasActiveFilters(filters: CardFilters) {
  return filters.text.trim() !== "" || filters.labelIds.length > 0 || filters.due !== "all";
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function cardMatches(card: CardDTO, filters: CardFilters, today: string | null) {
  const text = normalize(filters.text.trim());
  if (text && !normalize(`${card.title} ${card.description}`).includes(text)) return false;

  if (filters.labelIds.length && !filters.labelIds.some((id) => card.labelIds.includes(id))) {
    return false;
  }

  switch (filters.due) {
    case "all":
      return true;
    case "none":
      return card.dueDate === null;
    default: {
      if (!card.dueDate || !today) return false;
      if (filters.due === "overdue") return card.dueDate < today;
      if (filters.due === "today") return card.dueDate === today;
      return card.dueDate >= today && card.dueDate <= addDays(today, 7);
    }
  }
}
