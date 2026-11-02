// Ordenação fracionária: cada item tem uma `position` numérica e um item movido
// recebe um valor entre os vizinhos. Só reescrevemos a lista inteira quando o
// intervalo entre dois vizinhos fica pequeno demais.

export const POSITION_STEP = 1024;
const MIN_GAP = 1e-6;

type Positioned = { id: string; position: number };

/** Posição para um item adicionado ao final da lista. */
export function positionAfterLast(items: Positioned[]): number {
  const last = items.reduce((max, item) => Math.max(max, item.position), 0);
  return last + POSITION_STEP;
}

/**
 * Calcula as atualizações de posição para colocar `movedId` no índice `toIndex`
 * de `siblings` (já ordenados e sem o item movido). Devolve apenas o item movido
 * ou, se for preciso reequilibrar, todos os itens.
 */
export function computeMove(
  siblings: Positioned[],
  movedId: string,
  toIndex: number,
): Positioned[] {
  const index = Math.max(0, Math.min(toIndex, siblings.length));
  const before = siblings[index - 1]?.position ?? null;
  const after = siblings[index]?.position ?? null;

  let position: number;
  if (before === null && after === null) position = POSITION_STEP;
  else if (before === null) position = after! - POSITION_STEP;
  else if (after === null) position = before + POSITION_STEP;
  else position = (before + after) / 2;

  const tooTight =
    (before !== null && position - before < MIN_GAP) ||
    (after !== null && after - position < MIN_GAP);

  if (!tooTight) return [{ id: movedId, position }];

  const ordered = [...siblings.map((s) => s.id)];
  ordered.splice(index, 0, movedId);
  return ordered.map((id, i) => ({ id, position: (i + 1) * POSITION_STEP }));
}
