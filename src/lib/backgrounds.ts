// Fotos de fundo dos quadros (Unsplash, via picsum.photos), em public/backgrounds.
// A chave é gravada no banco; sem fundo (null) o quadro usa o gradiente azul.
export const BOARD_BACKGROUNDS = [
  "fiorde",
  "colinas",
  "cachoeira",
  "vale",
  "rio",
  "litoral",
  "mar",
  "cidade",
] as const;

export type BoardBackground = (typeof BOARD_BACKGROUNDS)[number];

export const BOARD_BACKGROUND_NAMES: Record<BoardBackground, string> = {
  fiorde: "Fiorde",
  colinas: "Colinas",
  cachoeira: "Cachoeira",
  vale: "Vale",
  rio: "Rio",
  litoral: "Litoral",
  mar: "Mar",
  cidade: "Cidade",
};

export function backgroundUrl(key: string, thumb = false): string {
  return `/backgrounds/${key}${thumb ? "-thumb" : ""}.jpg`;
}

export function isBoardBackground(key: string | null): key is BoardBackground {
  return BOARD_BACKGROUNDS.includes(key as BoardBackground);
}
