export interface BotCharacterPaletteEntry {
  id: string;
  label: string;
  ink: string;
}

export const BOT_CHARACTER_PALETTE: readonly BotCharacterPaletteEntry[] = [
  { id: "black", label: "Black", ink: "light-dark(#000000, #FFFFFF)" },
  { id: "brown", label: "Brown", ink: "#a06b39" },
  { id: "red", label: "Red", ink: "#fb2b3e" },
  { id: "orange", label: "Orange", ink: "#fd690f" },
  { id: "yellow", label: "Yellow", ink: "#f59312" },
  { id: "green", label: "Green", ink: "#14c16f" },
  { id: "cyan", label: "Cyan", ink: "#13b7a2" },
  { id: "blue", label: "Blue", ink: "#1e86fc" },
  { id: "violet", label: "Violet", ink: "#8f59f9" },
  { id: "magenta", label: "Magenta", ink: "#f93498" },
  { id: "gray", label: "Gray", ink: "light-dark(#959595, #777777)" },
] as const;

const paletteInk = (entry: BotCharacterPaletteEntry): string => {
  if (!entry.ink.includes("light-dark")) return entry.ink;
  return entry.id === "black" ? "#000000" : "#777777";
};

/** The mascot's own fill decides whether eyes read better dark or light. */
export function inkFor(hex: string): string {
  const channels = hex
    .replace("#", "")
    .match(/\w\w/g)
    ?.map((pair) => Number.parseInt(pair, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  if (!channels || channels.length < 3) return "#202322";
  const luminance = channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
  return luminance > 0.18 ? "#202322" : "#fffefa";
}

/** Human label for the character palette a design's fill matches, or "Custom". */
export function paletteLabelFor(design: { fill: string }): string {
  for (const entry of BOT_CHARACTER_PALETTE) {
    if (paletteInk(entry).toLowerCase() === design.fill.toLowerCase()) return entry.label;
  }
  return "Custom";
}
