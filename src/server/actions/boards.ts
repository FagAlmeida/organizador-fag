"use server";

import { createBoardSchema, deleteBoardSchema, renameBoardSchema } from "@/lib/validation";
import { requireBoard, requireBoardOwner } from "../access";
import { prisma } from "../db";
import { runAction } from "../errors";
import { revalidateBoard, revalidateHome } from "../revalidate";
import { getViewer } from "../viewer";

export async function createBoard(input: unknown) {
  return runAction(async () => {
    const { title } = createBoardSchema.parse(input);
    const viewer = await getViewer();
    const board = await prisma.board.create({
      data: { title, members: { create: { userId: viewer.userId, role: "owner" } } },
      select: { id: true },
    });
    revalidateHome();
    return board;
  });
}

export async function renameBoard(input: unknown) {
  return runAction(async () => {
    const { boardId, title } = renameBoardSchema.parse(input);
    await requireBoard(await getViewer(), boardId);
    await prisma.board.update({ where: { id: boardId }, data: { title } });
    revalidateHome();
    revalidateBoard(boardId);
    return null;
  });
}

export async function deleteBoard(input: unknown) {
  return runAction(async () => {
    const { boardId } = deleteBoardSchema.parse(input);
    await requireBoardOwner(await getViewer(), boardId);
    // Listas, cartões, etiquetas e checklists são removidos em cascata.
    await prisma.board.delete({ where: { id: boardId } });
    revalidateHome();
    return null;
  });
}
