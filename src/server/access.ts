import "server-only";
import { prisma } from "./db";
import { NotFoundError, UserFacingError } from "./errors";
import { boardScope, type Viewer } from "./viewer";

// Cada função confirma que o registro pertence a um quadro que o usuário
// atual pode acessar e devolve o id do quadro para revalidação.

export async function requireBoard(viewer: Viewer, boardId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, ...boardScope(viewer) },
    select: { id: true },
  });
  if (!board) throw new NotFoundError("Quadro");
  return board;
}

/** Como requireBoard, mas só para o dono (excluir o quadro, remover membros). */
export async function requireBoardOwner(viewer: Viewer, boardId: string) {
  const member = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: viewer.userId } },
    select: { role: true },
  });
  if (!member) throw new NotFoundError("Quadro");
  if (member.role !== "owner") throw new UserFacingError("Só o dono do quadro pode fazer isso.");
}

export async function requireList(viewer: Viewer, listId: string) {
  const list = await prisma.list.findFirst({
    where: { id: listId, board: boardScope(viewer) },
    select: { id: true, boardId: true },
  });
  if (!list) throw new NotFoundError("Lista");
  return list;
}

export async function requireCard(viewer: Viewer, cardId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, list: { board: boardScope(viewer) } },
    select: { id: true, listId: true, list: { select: { boardId: true } } },
  });
  if (!card) throw new NotFoundError("Cartão");
  return { id: card.id, listId: card.listId, boardId: card.list.boardId };
}

export async function requireLabel(viewer: Viewer, labelId: string) {
  const label = await prisma.label.findFirst({
    where: { id: labelId, board: boardScope(viewer) },
    select: { id: true, boardId: true },
  });
  if (!label) throw new NotFoundError("Etiqueta");
  return label;
}

export async function requireChecklistItem(viewer: Viewer, itemId: string) {
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, card: { list: { board: boardScope(viewer) } } },
    select: { id: true, card: { select: { list: { select: { boardId: true } } } } },
  });
  if (!item) throw new NotFoundError("Item do checklist");
  return { id: item.id, boardId: item.card.list.boardId };
}
