// Paleta de cores das etiquetas. A chave é gravada no banco; as classes ficam
// escritas por extenso para que o Tailwind as encontre no build.
export const LABEL_COLORS = [
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "gray",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export const LABEL_COLOR_INFO: Record<
  LabelColor,
  { name: string; className: string; swatch: string }
> = {
  green: { name: "Verde", className: "bg-green-600 text-white", swatch: "bg-green-600" },
  yellow: { name: "Amarelo", className: "bg-yellow-400 text-yellow-950", swatch: "bg-yellow-400" },
  orange: { name: "Laranja", className: "bg-orange-500 text-white", swatch: "bg-orange-500" },
  red: { name: "Vermelho", className: "bg-red-600 text-white", swatch: "bg-red-600" },
  purple: { name: "Roxo", className: "bg-purple-600 text-white", swatch: "bg-purple-600" },
  blue: { name: "Azul", className: "bg-blue-600 text-white", swatch: "bg-blue-600" },
  sky: { name: "Céu", className: "bg-sky-400 text-sky-950", swatch: "bg-sky-400" },
  gray: { name: "Cinza", className: "bg-slate-500 text-white", swatch: "bg-slate-500" },
};

export function labelClass(color: string): string {
  return (LABEL_COLOR_INFO[color as LabelColor] ?? LABEL_COLOR_INFO.gray).className;
}
