import "server-only";
import { dateToDateKey } from "@/lib/dates";
import type { BoardDTO, BoardSummary } from "@/lib/types";
import { prisma } from "./db";
import { boardScope, getViewer } from "./viewer";

export async function listBoards(): Promise<BoardSummary[]> {
  const viewer = await getViewer();
  const boards = await prisma.board.findMany({
    where: boardScope(viewer),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { lists: true } },
      lists: { select: { _count: { select: { cards: true } } } },
      members: { where: { userId: viewer.userId }, select: { role: true } },
    },
  });

  return boards.map((b) => ({
    id: b.id,
    title: b.title,
    listCount: b._count.lists,
    cardCount: b.lists.reduce((sum, l) => sum + l._count.cards, 0),
    updatedAt: b.updatedAt.toISOString(),
    isOwner: b.members[0]?.role === "owner",
  }));
}

export async function getBoard(boardId: string): Promise<BoardDTO | null> {
  const viewer = await getViewer();
  const board = await prisma.board.findFirst({
    where: { id: boardId, ...boardScope(viewer) },
    select: {
      id: true,
      title: true,
      labels: { orderBy: { name: "asc" }, select: { id: true, name: true, color: true } },
      members: {
        orderBy: { createdAt: "asc" },
        select: { role: true, user: { select: { id: true, name: true, email: true } } },
      },
      invites: { orderBy: { createdAt: "asc" }, select: { email: true } },
      lists: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          cards: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              listId: true,
              title: true,
              description: true,
              dueDate: true,
              position: true,
              labels: { select: { labelId: true } },
              checklist: {
                orderBy: { position: "asc" },
                select: { id: true, text: true, done: true, position: true },
              },
            },
          },
        },
      },
    },
  });
  if (!board) return null;

  return {
    id: board.id,
    title: board.title,
    labels: board.labels,
    members: board.members.map(({ role, user }) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: role === "owner" ? "owner" : "member",
    })),
    invites: board.invites.map((i) => i.email),
    viewerId: viewer.userId,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map(({ labels, dueDate, ...card }) => ({
        ...card,
        dueDate: dueDate ? dateToDateKey(dueDate) : null,
        labelIds: labels.map((l) => l.labelId),
      })),
    })),
  };
}
