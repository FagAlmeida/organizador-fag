"use client";

import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useMemo, useRef, useState } from "react";
import { InlineEdit } from "@/components/ui/inline-edit";
import type { BoardDTO, CardDTO, ListDTO } from "@/lib/types";
import { renameBoard } from "@/server/actions/boards";
import { moveCard } from "@/server/actions/cards";
import { moveList } from "@/server/actions/lists";
import { AddListForm } from "./add-forms";
import { assigneeOptions } from "./assignees";
import { BoardFilters } from "./board-filters";
import { BoardProvider, useBoard } from "./board-context";
import {
  cardMatches,
  EMPTY_FILTERS,
  findCard,
  findCardLocation,
  hasActiveFilters,
  moveCardIn,
  type CardFilters,
} from "./board-utils";
import { CardItemView } from "./card-item";
import { CardModal } from "./card-modal";
import { ListColumn, ListColumnView } from "./list-column";
import { MembersButton } from "./members-button";
import { useNowTime, useToday } from "./use-today";

export function BoardView({ board }: { board: BoardDTO }) {
  return (
    <BoardProvider serverBoard={board}>
      <BoardContent />
    </BoardProvider>
  );
}

type ActiveDrag = { type: "list"; list: ListDTO } | { type: "card"; card: CardDTO } | null;

// Ao arrastar uma lista, só outras listas são alvos válidos. Ao arrastar um
// cartão, priorizamos o cartão sob o ponteiro e, sem ele, a lista sob o ponteiro.
const collisionDetection: CollisionDetection = (args) => {
  const type = args.active.data.current?.type;
  if (type === "list") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.type === "list",
      ),
    });
  }
  const hits = pointerWithin(args);
  if (hits.length > 0) {
    const cardHits = hits.filter(
      (h) => args.droppableContainers.find((c) => c.id === h.id)?.data.current?.type === "card",
    );
    return cardHits.length > 0 ? cardHits : hits;
  }
  return closestCorners(args);
};

function BoardContent() {
  const { board, setBoard, mutate, setDragging } = useBoard();
  const today = useToday();
  const nowTime = useNowTime();
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveDrag>(null);
  const snapshot = useRef<BoardDTO | null>(null);

  const filtering = hasActiveFilters(filters);
  const visibleCards = useMemo(() => {
    if (!filtering) return null;
    const ids = new Set<string>();
    for (const list of board.lists)
      for (const card of list.cards) if (cardMatches(card, filters, today, nowTime)) ids.add(card.id);
    return ids;
  }, [board, filters, filtering, today, nowTime]);

  const totalCards = board.lists.reduce((n, l) => n + l.cards.length, 0);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter fica livre para abrir o cartão; Espaço inicia o arrasto.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  function onDragStart({ active }: DragStartEvent) {
    snapshot.current = board;
    setDragging(true);
    const type = active.data.current?.type;
    if (type === "list") {
      const list = board.lists.find((l) => l.id === active.id);
      if (list) setActive({ type: "list", list });
    } else if (type === "card") {
      const card = findCard(board, String(active.id));
      if (card) setActive({ type: "card", card });
    }
  }

  // Move o cartão para outra lista enquanto ele é arrastado, para que a lista
  // de destino abra espaço. A reordenação final acontece em onDragEnd.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.data.current?.type !== "card") return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const overIsList = over.data.current?.type === "list";

    setBoard((prev) => {
      const from = findCardLocation(prev, activeId);
      if (!from) return prev;
      const toListIndex = overIsList
        ? prev.lists.findIndex((l) => l.id === overId)
        : (findCardLocation(prev, overId)?.listIndex ?? -1);
      if (toListIndex === -1 || toListIndex === from.listIndex) return prev;

      const toList = prev.lists[toListIndex];
      let index = toList.cards.length;
      if (!overIsList) {
        const overIndex = toList.cards.findIndex((c) => c.id === overId);
        const translated = active.rect.current.translated;
        const below = translated && translated.top > over.rect.top + over.rect.height / 2;
        index = overIndex + (below ? 1 : 0);
      }
      return moveCardIn(prev, activeId, toList.id, index);
    });
  }

  function finishDrag() {
    setActive(null);
    setDragging(false);
  }

  function onDragCancel() {
    if (snapshot.current) setBoard(snapshot.current);
    finishDrag();
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const before = snapshot.current;
    finishDrag();
    if (!before) return;
    if (!over) {
      setBoard(before);
      return;
    }

    if (active.data.current?.type === "list") {
      const from = board.lists.findIndex((l) => l.id === active.id);
      const to = board.lists.findIndex((l) => l.id === over.id);
      if (from === -1 || to === -1 || from === to) return;
      const listId = String(active.id);
      mutate(
        (prev) => ({ ...prev, lists: arrayMove(prev.lists, from, to) }),
        () => moveList({ listId, toIndex: to }),
        before,
      );
      return;
    }

    const cardId = String(active.id);
    let next = board;
    const loc = findCardLocation(next, cardId);
    if (!loc) return;
    const list = next.lists[loc.listIndex];
    const overIndex = list.cards.findIndex((c) => c.id === over.id);
    if (overIndex !== -1 && overIndex !== loc.cardIndex) {
      next = moveCardIn(next, cardId, list.id, overIndex);
    }

    const finalLoc = findCardLocation(next, cardId)!;
    const origin = findCardLocation(before, cardId);
    const toListId = next.lists[finalLoc.listIndex].id;
    if (
      origin &&
      before.lists[origin.listIndex].id === toListId &&
      origin.cardIndex === finalLoc.cardIndex
    ) {
      setBoard(before);
      return;
    }
    mutate(
      () => next,
      () => moveCard({ cardId, toListId, toIndex: finalLoc.cardIndex }),
      before,
    );
  }

  const openCard = openCardId ? findCard(board, openCardId) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-blue-700 to-indigo-800">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-3 pb-2">
        <h1 className="min-w-0 text-lg font-bold text-white">
          <InlineEdit
            value={board.title}
            label="Nome do quadro"
            maxLength={80}
            className="block max-w-[70vw] px-2 py-1"
            onSave={(title) =>
              mutate(
                (prev) => ({ ...prev, title }),
                () => renameBoard({ boardId: board.id, title }),
              )
            }
          />
        </h1>
        <BoardFilters
          labels={board.labels}
          people={assigneeOptions(board)}
          filters={filters}
          onChange={setFilters}
          resultCount={visibleCards?.size ?? null}
          totalCount={totalCards}
        />
        <MembersButton />
      </div>
      {filtering && (
        <p className="px-4 pb-2 text-xs text-white/80">
          Filtros ativos: arrastar cartões fica desativado até você limpar os filtros.
        </p>
      )}

      <DndContext
        id="board-dnd"
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto px-4 pb-4">
          <SortableContext
            items={board.lists.map((l) => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {board.lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                labels={board.labels}
                today={today}
                visibleCards={visibleCards}
                onOpenCard={setOpenCardId}
              />
            ))}
          </SortableContext>
          <AddListForm boardId={board.id} isFirst={board.lists.length === 0} />
        </div>

        <DragOverlay>
          {active?.type === "list" && (
            <ListColumnView list={active.list} labels={board.labels} today={today} overlay />
          )}
          {active?.type === "card" && (
            <CardItemView card={active.card} labels={board.labels} today={today} overlay />
          )}
        </DragOverlay>
      </DndContext>

      {openCard && (
        <CardModal
          key={openCard.id}
          card={openCard}
          board={board}
          today={today}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </div>
  );
}
