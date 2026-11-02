"use server";

import { dateKeyToDate } from "@/lib/dates";
import { computeMove, positionAfterLast } from "@/lib/position";
import type { CardDTO } from "@/lib/types";
import {
  createCardSchema,
  deleteCardSchema,
  moveCardSchema,
  updateCardSchema,
} from "@/lib/validation";
import { requireCard, requireList } from "../access";
import { prisma } from "../db";
import { runAction, UserFacingError } from "../errors";
import { revalidateBoard } from "../revalidate";
import { getViewer } from "../viewer";

export async function createCard(input: unknown) {
  return runAction(async (): Promise<CardDTO> => {
    const { listId, title } = createCardSchema.parse(input);
    const list = await requireList(await getViewer(), listId);
    const siblings = await prisma.card.findMany({
      where: { listId },
      select: { id: true, position: true },
    });
    const card = await prisma.card.create({
      data: { listId, title, position: positionAfterLast(siblings) },
      select: { id: true, listId: true, title: true, description: true, position: true },
    });
    revalidateBoard(list.boardId);
    return {
      ...card,
      dueDate: null,
      dueTime: null,
      assigneeEmail: null,
      done: false,
      labelIds: [],
      checklist: [],
    };
  });
}

export async function updateCard(input: unknown) {
  return runAction(async () => {
    const { cardId, title, description, dueDate, dueTime, assigneeEmail, done } =
      updateCardSchema.parse(input);
    const card = await requireCard(await getViewer(), cardId);
    if (assigneeEmail) await requireAssignable(card.boardId, assigneeEmail);
    await prisma.card.update({
      where: { id: cardId },
      data: {
        title,
        description,
        dueDate: dueDate === undefined ? undefined : dueDate && dateKeyToDate(dueDate),
        // Sem data não há horário.
        dueTime: dueDate === null ? null : dueTime,
        assigneeEmail,
        done,
      },
    });
    revalidateBoard(card.boardId);
    return null;
  });
}

/** O responsável precisa ser membro do quadro ou ter um convite pendente nele. */
async function requireAssignable(boardId: string, email: string) {
  const [member, invite] = await Promise.all([
    prisma.boardMember.findFirst({ where: { boardId, user: { email } }, select: { userId: true } }),
    prisma.boardInvite.findUnique({ where: { boardId_email: { boardId, email } }, select: { email: true } }),
  ]);
  if (!member && !invite) {
    throw new UserFacingError("O responsável precisa ser membro do quadro ou ter um convite.");
  }
}

export async function deleteCard(input: unknown) {
  return runAction(async () => {
    const { cardId } = deleteCardSchema.parse(input);
    const card = await requireCard(await getViewer(), cardId);
    await prisma.card.delete({ where: { id: cardId } });
    revalidateBoard(card.boardId);
    return null;
  });
}

export async function moveCard(input: unknown) {
  return runAction(async () => {
    const { cardId, toListId, toIndex } = moveCardSchema.parse(input);
    const viewer = await getViewer();
    const card = await requireCard(viewer, cardId);
    const target = await requireList(viewer, toListId);
    if (target.boardId !== card.boardId) {
      throw new UserFacingError("O cartão só pode ser movido para listas do mesmo quadro.");
    }

    const siblings = await prisma.card.findMany({
      where: { listId: toListId, id: { not: cardId } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    const updates = computeMove(siblings, cardId, toIndex);
    await prisma.$transaction(
      updates.map((u) =>
        prisma.card.update({
          where: { id: u.id },
          data: u.id === cardId ? { position: u.position, listId: toListId } : { position: u.position },
        }),
      ),
    );
    revalidateBoard(card.boardId);
    return null;
  });
}
