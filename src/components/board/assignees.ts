import type { BoardDTO } from "@/lib/types";

export type AssigneeOption = {
  email: string;
  /** Nome da conta Google; para convites pendentes, o próprio e-mail. */
  name: string;
  pending: boolean;
  isViewer: boolean;
};

/** Quem pode ser responsável por um cartão: membros e convites pendentes. */
export function assigneeOptions(board: BoardDTO): AssigneeOption[] {
  return [
    ...board.members.map((m) => ({
      email: m.email,
      name: m.name,
      pending: false,
      isViewer: m.userId === board.viewerId,
    })),
    ...board.invites.map((email) => ({ email, name: email, pending: true, isViewer: false })),
  ];
}

/** Nome para exibir; se a pessoa saiu do quadro, mostra o e-mail. */
export function assigneeName(board: BoardDTO, email: string): string {
  return board.members.find((m) => m.email === email)?.name ?? email;
}
