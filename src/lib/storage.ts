import { get, set } from "idb-keyval";
import type { Solve } from "./stats";
import type { Puzzle } from "./puzzles";
import { DEFAULT_KEYS, type KeyBindings } from "@/components/cubelab/keyboard";

export interface Settings {
  controls: "easy" | "precise";
  rigidRotation: boolean;
  inspection: boolean;
  timerOnly: boolean;
  puzzle: Puzzle;
  holdToStart: boolean;
  timeFormat: "mm" | "ss";
  sound: boolean;
  haptics: boolean;
  theme: "dark" | "light";
  sensitivity: number;
  speed: number;
  keys: KeyBindings;
}

export const DEFAULT_SETTINGS: Settings = {
  controls: "easy",
  rigidRotation: false,
  inspection: false,
  timerOnly: false,
  puzzle: "3x3x3",
  holdToStart: true,
  timeFormat: "mm",
  sound: true,
  haptics: true,
  theme: "dark",
  sensitivity: 1,
  speed: 1,
  keys: DEFAULT_KEYS,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = { ...DEFAULT_SETTINGS, ...((await get("cubelab:settings")) ?? {}) } as Settings & { showMovePanel?: boolean };
    delete raw.showMovePanel;
    if (raw.controls !== "easy" && raw.controls !== "precise") raw.controls = "easy";
    raw.keys = { ...DEFAULT_KEYS, ...(raw.keys ?? {}) };
    return raw;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
export const saveSettings = (s: Settings) => set("cubelab:settings", s).catch(() => {});

export async function loadSolves(): Promise<Solve[]> {
  try {
    return (await get("cubelab:solves")) ?? [];
  } catch {
    return [];
  }
}
export const saveSolves = (s: Solve[]) => set("cubelab:solves", s).catch(() => {});
