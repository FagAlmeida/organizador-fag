"use server";

import { redirect } from "next/navigation";
import { accessEmailSchema } from "@/lib/validation";
import { isAdminEmail } from "../admission";
import { getSessionUser } from "../auth";
import { prisma } from "../db";
import { runAction, UserFacingError } from "../errors";
import { revalidateAdmin } from "../revalidate";

/** Confere que quem chama é administrador e devolve o e-mail-alvo validado. */
async function adminTarget(input: unknown) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) throw new UserFacingError("Só o administrador pode liberar acessos.");
  const { email } = accessEmailSchema.parse(input);
  if (isAdminEmail(email)) throw new UserFacingError("O administrador sempre tem acesso.");
  return email;
}

/** Libera um e-mail: aprova um pedido ou adiciona alguém antes de tentar entrar. */
export async function grantAccess(input: unknown) {
  return runAction(async () => {
    const email = await adminTarget(input);
    await prisma.accessEntry.upsert({
      where: { email },
      create: { email, status: "approved" },
      update: { status: "approved" },
    });
    revalidateAdmin();
    return null;
  });
}

/** Recusa um pedido ou remove o acesso de quem já estava liberado. */
export async function denyAccess(input: unknown) {
  return runAction(async () => {
    const email = await adminTarget(input);
    await prisma.accessEntry.upsert({
      where: { email },
      create: { email, status: "denied" },
      update: { status: "denied" },
    });
    await prisma.session.deleteMany({ where: { user: { email } } });
    revalidateAdmin();
    return null;
  });
}

/** Apaga o registro: a pessoa pode pedir acesso de novo na próxima tentativa. */
export async function deleteAccess(input: unknown) {
  return runAction(async () => {
    const email = await adminTarget(input);
    await prisma.accessEntry.deleteMany({ where: { email } });
    await prisma.session.deleteMany({ where: { user: { email } } });
    revalidateAdmin();
    return null;
  });
}
