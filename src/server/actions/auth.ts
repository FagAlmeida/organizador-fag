"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "../auth";

export async function signOut() {
  await deleteSession();
  redirect("/login");
}
