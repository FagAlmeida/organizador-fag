import "server-only";
import { revalidatePath } from "next/cache";

export function revalidateHome() {
  revalidatePath("/");
}

export function revalidateBoard(boardId: string) {
  revalidatePath(`/boards/${boardId}`);
}
