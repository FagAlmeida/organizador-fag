"use server";

import type { LabelDTO } from "@/lib/types";
import {
  createLabelSchema,
  deleteLabelSchema,
  setCardLabelSchema,
  updateLabelSchema,
} from "@/lib/validation";
import { requireBoard, requireCard, requireLabel } from "../access";
import { prisma } from "../db";
import { runAction, UserFacingError } from "../errors";
import { revalidateBoard } from "../revalidate";
import { getViewer } from "../viewer";

export async function createLabel(input: unknown) {
  return runAction(async (): Promise<LabelDTO> => {
    const { boardId, name, color } = createLabelSchema.parse(input);
    await requireBoard(await getViewer(), boardId);
    const label = await prisma.label.create({
      data: { boardId, name, color },
      select: { id: true, name: true, color: true },
    });
    revalidateBoard(boardId);
    return label;
  });
}

export async function updateLabel(input: unknown) {
  return runAction(async () => {
    const { labelId, name, color } = updateLabelSchema.parse(input);
    const label = await requireLabel(await getViewer(), labelId);
    await prisma.label.update({ where: { id: labelId }, data: { name, color } });
    revalidateBoard(label.boardId);
    return null;
  });
}

export async function deleteLabel(input: unknown) {
  return runAction(async () => {
    const { labelId } = deleteLabelSchema.parse(input);
    const label = await requireLabel(await getViewer(), labelId);
    await prisma.label.delete({ where: { id: labelId } });
    revalidateBoard(label.boardId);
    return null;
  });
}

export async function setCardLabel(input: unknown) {
  return runAction(async () => {
    const { cardId, labelId, active } = setCardLabelSchema.parse(input);
    const viewer = await getViewer();
    const card = await requireCard(viewer, cardId);
    const label = await requireLabel(viewer, labelId);
    if (label.boardId !== card.boardId) {
      throw new UserFacingError("Essa etiqueta pertence a outro quadro.");
    }

    if (active) {
      await prisma.cardLabel.upsert({
        where: { cardId_labelId: { cardId, labelId } },
        create: { cardId, labelId },
        update: {},
      });
    } else {
      await prisma.cardLabel.deleteMany({ where: { cardId, labelId } });
    }
    revalidateBoard(card.boardId);
    return null;
  });
}
