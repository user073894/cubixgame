import type { Move } from "@/lib/cube/moves";

/** Move base → KeyboardEvent.code. Users on PC can rebind these in Settings. */
export type KeyBindings = Record<string, string>;

export const DEFAULT_KEYS: KeyBindings = {
  R: "KeyR", L: "KeyL", U: "KeyU", D: "KeyD", F: "KeyF", B: "KeyB",
  M: "KeyM", E: "KeyE", S: "KeyS",
  x: "KeyX", y: "KeyY", z: "KeyZ",
};

/** Keys reserved for modifiers and the timer; moves cannot be bound to them. */
export const RESERVED_CODES = new Set(["KeyW", "Digit2", "Numpad2", "Space", "Slash"]);

const WIDEABLE = new Set(["R", "L", "U", "D", "F", "B"]);

/** Short display label for a KeyboardEvent.code, e.g. "KeyR" → "R", "Digit3" → "3". */
export function codeLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num" + code.slice(6);
  if (code === "Space") return "Space";
  return code;
}

/**
 * Keyboard → move. Shift = prime, hold 2 = double, hold W = wide.
 * Returns null for keys that aren't cube controls or that include Ctrl/Alt/Meta (browser shortcuts).
 */
export function keyToMove(
  e: { code: string; shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean },
  held: { wide: boolean; double: boolean },
  keys: KeyBindings = DEFAULT_KEYS,
): Move | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null;
  const base = Object.keys(keys).find((k) => keys[k] === e.code);
  if (!base) return null;
  const name = held.wide && WIDEABLE.has(base) ? base + "w" : base;
  if (held.double) return name + "2";
  return e.shiftKey ? name + "'" : name;
}

export function buildKeyGuide(keys: KeyBindings = DEFAULT_KEYS): [string, string][] {
  const l = (m: string) => codeLabel(keys[m] ?? "");
  return [
    [`${l("R")} ${l("L")} ${l("U")} ${l("D")} ${l("F")} ${l("B")}`, "Face turns"],
    ["Shift + key", "Prime (counter-clockwise), e.g. Shift+R = R'"],
    ["Hold 2 + key", "Double turn, e.g. 2+R = R2"],
    ["Hold W + key", "Wide turn, e.g. W+R = Rw (Shift for Rw')"],
    [`${l("M")} ${l("E")} ${l("S")}`, "Slice turns (Shift = prime)"],
    [`${l("x")} ${l("y")} ${l("z")}`, "Whole-cube rotations x y z (Shift = prime)"],
    ["Space", "Timer: hold, release to start, press to stop"],
    ["?", "Show this guide"],
  ];
}

export const KEY_GUIDE: [string, string][] = buildKeyGuide();
