import { z } from "zod";
import { BOARD_BACKGROUNDS } from "./backgrounds";
import { LABEL_COLORS } from "./labels";

const id = z.string({ error: "Identificador inválido." }).min(1, "Identificador inválido.").max(64);

const title = (field: string, max = 120) =>
  z
    .string({ error: `Informe ${field}.` })
    .trim()
    .min(1, `Informe ${field}.`)
    .max(max, `Use no máximo ${max} caracteres.`);

const index = z.number().int().min(0);

const dateKey = z.iso.date({ error: "Data inválida." });
const timeKey = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");
const email = z
  .string({ error: "Informe um e-mail válido." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Informe um e-mail válido." }).max(254));

// Quadros
export const createBoardSchema = z.object({ title: title("o nome do quadro", 80) });
export const renameBoardSchema = z.object({ boardId: id, title: title("o nome do quadro", 80) });
export const deleteBoardSchema = z.object({ boardId: id });
export const setBoardBackgroundSchema = z.object({
  boardId: id,
  background: z.enum(BOARD_BACKGROUNDS, { error: "Fundo inválido." }).nullable(),
});

// Membros
export const inviteMemberSchema = z.object({ boardId: id, email });
export const removeMemberSchema = z.object({ boardId: id, userId: id });
export const cancelInviteSchema = z.object({ boardId: id, email });

// Acesso ao Organizador (só o administrador)
export const accessEmailSchema = z.object({ email });

// Listas
export const createListSchema = z.object({ boardId: id, title: title("o nome da lista", 80) });
export const renameListSchema = z.object({ listId: id, title: title("o nome da lista", 80) });
export const deleteListSchema = z.object({ listId: id });
export const moveListSchema = z.object({ listId: id, toIndex: index });

// Cartões
export const createCardSchema = z.object({ listId: id, title: title("o título do cartão", 200) });
export const updateCardSchema = z
  .object({
    cardId: id,
    title: title("o título do cartão", 200).optional(),
    description: z.string().max(5000, "A descrição pode ter até 5000 caracteres.").optional(),
    dueDate: dateKey.nullable().optional(),
    dueTime: timeKey.nullable().optional(),
    assigneeEmail: email.nullable().optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).some((k) => k !== "cardId" && v[k as keyof typeof v] !== undefined), {
    message: "Nada para atualizar.",
  });
export const deleteCardSchema = z.object({ cardId: id });
export const moveCardSchema = z.object({ cardId: id, toListId: id, toIndex: index });

// Etiquetas
const labelName = z.string().trim().max(30, "Use no máximo 30 caracteres.");
const labelColor = z.enum(LABEL_COLORS, { error: "Cor inválida." });
export const createLabelSchema = z.object({ boardId: id, name: labelName, color: labelColor });
export const updateLabelSchema = z.object({ labelId: id, name: labelName, color: labelColor });
export const deleteLabelSchema = z.object({ labelId: id });
export const setCardLabelSchema = z.object({ cardId: id, labelId: id, active: z.boolean() });

// Checklist
export const addChecklistItemSchema = z.object({ cardId: id, text: title("o texto do item", 200) });
export const updateChecklistItemSchema = z
  .object({
    itemId: id,
    text: title("o texto do item", 200).optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => v.text !== undefined || v.done !== undefined, { message: "Nada para atualizar." });
export const deleteChecklistItemSchema = z.object({ itemId: id });
