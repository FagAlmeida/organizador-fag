"use server";

import { positionAfterLast } from "@/lib/position";
import type { ChecklistItemDTO } from "@/lib/types";
import {
  addChecklistItemSchema,
  deleteChecklistItemSchema,
  updateChecklistItemSchema,
} from "@/lib/validation";
import { requireCard, requireChecklistItem } from "../access";
import { prisma } from "../db";
import { runAction } from "../errors";
import { revalidateBoard } from "../revalidate";
import { getViewer } from "../viewer";

export async function addChecklistItem(input: unknown) {
  return runAction(async (): Promise<ChecklistItemDTO> => {
    const { cardId, text } = addChecklistItemSchema.parse(input);
    const card = await requireCard(await getViewer(), cardId);
    const siblings = await prisma.checklistItem.findMany({
      where: { cardId },
      select: { id: true, position: true },
    });
    const item = await prisma.checklistItem.create({
      data: { cardId, text, position: positionAfterLast(siblings) },
      select: { id: true, text: true, done: true, position: true },
    });
    revalidateBoard(card.boardId);
    return item;
  });
}

export async function updateChecklistItem(input: unknown) {
  return runAction(async () => {
    const { itemId, text, done } = updateChecklistItemSchema.parse(input);
    const item = await requireChecklistItem(await getViewer(), itemId);
    await prisma.checklistItem.update({ where: { id: itemId }, data: { text, done } });
    revalidateBoard(item.boardId);
    return null;
  });
}

export async function deleteChecklistItem(input: unknown) {
  return runAction(async () => {
    const { itemId } = deleteChecklistItemSchema.parse(input);
    const item = await requireChecklistItem(await getViewer(), itemId);
    await prisma.checklistItem.delete({ where: { id: itemId } });
    revalidateBoard(item.boardId);
    return null;
  });
}
