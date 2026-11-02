// Formatos de dados enviados do servidor para os componentes de cliente.

export type BoardSummary = {
  id: string;
  title: string;
  background: string | null;
  listCount: number;
  cardCount: number;
  updatedAt: string;
  isOwner: boolean;
};

export type LabelDTO = {
  id: string;
  name: string;
  color: string;
};

export type ChecklistItemDTO = {
  id: string;
  text: string;
  done: boolean;
  position: number;
};

export type CardDTO = {
  id: string;
  listId: string;
  title: string;
  description: string;
  /** "AAAA-MM-DD" ou null */
  dueDate: string | null;
  /** "HH:MM" ou null; só existe junto com dueDate */
  dueTime: string | null;
  /** E-mail do responsável (membro ou convite pendente) ou null */
  assigneeEmail: string | null;
  position: number;
  labelIds: string[];
  checklist: ChecklistItemDTO[];
};

export type ListDTO = {
  id: string;
  title: string;
  position: number;
  cards: CardDTO[];
};

export type MemberDTO = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "member";
};

export type BoardDTO = {
  id: string;
  title: string;
  /** Chave da foto de fundo (src/lib/backgrounds.ts) ou null */
  background: string | null;
  labels: LabelDTO[];
  lists: ListDTO[];
  members: MemberDTO[];
  /** E-mails convidados que ainda não entraram no Organizador. */
  invites: string[];
  viewerId: string;
};

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };
