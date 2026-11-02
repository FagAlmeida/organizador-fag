"use server";

import { cancelInviteSchema, inviteMemberSchema, removeMemberSchema } from "@/lib/validation";
import { requireBoard, requireBoardOwner } from "../access";
import { prisma } from "../db";
import { runAction, UserFacingError } from "../errors";
import { revalidateBoard, revalidateHome } from "../revalidate";
import { getViewer } from "../viewer";

/**
 * Qualquer membro pode convidar. Se a pessoa já tem conta, entra no quadro na
 * hora; senão, o convite fica guardado até ela entrar com esse e-mail.
 */
export async function inviteMember(input: unknown) {
  return runAction(async (): Promise<"added" | "invited"> => {
    const { boardId, email } = inviteMemberSchema.parse(input);
    await requireBoard(await getViewer(), boardId);

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const existing = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId: user.id } },
        select: { role: true },
      });
      if (existing) throw new UserFacingError("Essa pessoa já é membro do quadro.");
      await prisma.boardMember.create({ data: { boardId, userId: user.id } });
      revalidateBoard(boardId);
      return "added";
    }

    await prisma.boardInvite.upsert({
      where: { boardId_email: { boardId, email } },
      create: { boardId, email },
      update: {},
    });
    revalidateBoard(boardId);
    return "invited";
  });
}

/** Remove outro membro (só o dono) ou sai do quadro (quando `userId` é você). */
export async function removeMember(input: unknown) {
  return runAction(async () => {
    const { boardId, userId } = removeMemberSchema.parse(input);
    const viewer = await getViewer();

    if (userId === viewer.userId) {
      await requireBoard(viewer, boardId);
      const me = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId } },
        select: { role: true },
      });
      if (me?.role === "owner") {
        throw new UserFacingError("O dono não pode sair do quadro. Se quiser, exclua o quadro.");
      }
      await prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
      // Sem revalidar o quadro: quem saiu perderia o acesso antes de voltar à página inicial.
      revalidateHome();
      return null;
    }

    await requireBoardOwner(viewer, boardId);
    await prisma.boardMember.deleteMany({ where: { boardId, userId } });
    revalidateBoard(boardId);
    return null;
  });
}

export async function cancelInvite(input: unknown) {
  return runAction(async () => {
    const { boardId, email } = cancelInviteSchema.parse(input);
    await requireBoard(await getViewer(), boardId);
    await prisma.boardInvite.deleteMany({ where: { boardId, email } });
    revalidateBoard(boardId);
    return null;
  });
}
