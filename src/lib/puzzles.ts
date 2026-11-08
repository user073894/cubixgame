export const PUZZLES = [
  { id: "3x3x3", label: "3 × 3 × 3", event: "333" },
  { id: "2x2x2", label: "2 × 2 × 2", event: "222" },
  { id: "4x4x4", label: "4 × 4 × 4", event: "444" },
  { id: "5x5x5", label: "5 × 5 × 5", event: "555" },
  { id: "6x6x6", label: "6 × 6 × 6", event: "666" },
  { id: "7x7x7", label: "7 × 7 × 7", event: "777" },
  { id: "pyraminx", label: "Pyraminx", event: "pyram" },
  { id: "megaminx", label: "Megaminx", event: "minx" },
  { id: "skewb", label: "Skewb", event: "skewb" },
  { id: "square1", label: "Square-1", event: "sq1" },
  { id: "clock", label: "Clock", event: "clock" },
] as const;
export type Puzzle = typeof PUZZLES[number]["id"];
export function puzzleInfo(id: Puzzle) { return PUZZLES.find((p) => p.id === id) ?? PUZZLES[0]; }
export async function puzzleScramble(id: Puzzle): Promise<string> {
  const { randomScrambleForEvent } = await import("cubing/scramble");
  return (await randomScrambleForEvent(puzzleInfo(id).event)).toString();
}