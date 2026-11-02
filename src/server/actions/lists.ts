"use server";

import { computeMove, positionAfterLast } from "@/lib/position";
import {
  createListSchema,
  deleteListSchema,
  moveListSchema,
  renameListSchema,
} from "@/lib/validation";
import { requireBoard, requireList } from "../access";
import { prisma } from "../db";
import { runAction } from "../errors";
import { revalidateBoard } from "../revalidate";
import { getViewer } from "../viewer";

export async function createList(input: unknown) {
  return runAction(async () => {
    const { boardId, title } = createListSchema.parse(input);
    await requireBoard(await getViewer(), boardId);
    const siblings = await prisma.list.findMany({
      where: { boardId },
      select: { id: true, position: true },
    });
    const list = await prisma.list.create({
      data: { boardId, title, position: positionAfterLast(siblings) },
      select: { id: true, title: true, position: true },
    });
    revalidateBoard(boardId);
    return list;
  });
}

export async function renameList(input: unknown) {
  return runAction(async () => {
    const { listId, title } = renameListSchema.parse(input);
    const list = await requireList(await getViewer(), listId);
    await prisma.list.update({ where: { id: listId }, data: { title } });
    revalidateBoard(list.boardId);
    return null;
  });
}

export async function deleteList(input: unknown) {
  return runAction(async () => {
    const { listId } = deleteListSchema.parse(input);
    const list = await requireList(await getViewer(), listId);
    await prisma.list.delete({ where: { id: listId } });
    revalidateBoard(list.boardId);
    return null;
  });
}

export async function moveList(input: unknown) {
  return runAction(async () => {
    const { listId, toIndex } = moveListSchema.parse(input);
    const list = await requireList(await getViewer(), listId);
    const siblings = await prisma.list.findMany({
      where: { boardId: list.boardId, id: { not: listId } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    const updates = computeMove(siblings, listId, toIndex);
    await prisma.$transaction(
      updates.map((u) =>
        prisma.list.update({ where: { id: u.id }, data: { position: u.position } }),
      ),
    );
    revalidateBoard(list.boardId);
    return null;
  });
}
