import { describe, expect, it } from "vitest";
import { DEFAULT_KEYS, buildKeyGuide, codeLabel, keyToMove } from "./keyboard";

const ev = (code: string, shiftKey = false) => ({ code, shiftKey, ctrlKey: false, altKey: false, metaKey: false });
const held = { wide: false, double: false };

describe("keyToMove with custom bindings", () => {
  it("uses the default map when none is given", () => {
    expect(keyToMove(ev("KeyR"), held)).toBe("R");
    expect(keyToMove(ev("KeyR", true), held)).toBe("R'");
  });

  it("follows a rebound key and ignores the old one", () => {
    const keys = { ...DEFAULT_KEYS, R: "KeyP" };
    expect(keyToMove(ev("KeyP"), held, keys)).toBe("R");
    expect(keyToMove(ev("KeyR"), held, keys)).toBeNull();
  });

  it("keeps wide and double modifiers working on rebound keys", () => {
    const keys = { ...DEFAULT_KEYS, F: "KeyJ" };
    expect(keyToMove(ev("KeyJ"), { wide: true, double: false }, keys)).toBe("Fw");
    expect(keyToMove(ev("KeyJ"), { wide: false, double: true }, keys)).toBe("F2");
  });
});

describe("codeLabel / buildKeyGuide", () => {
  it("shortens common codes", () => {
    expect(codeLabel("KeyR")).toBe("R");
    expect(codeLabel("Digit3")).toBe("3");
    expect(codeLabel("Numpad5")).toBe("Num5");
  });

  it("shows rebound keys in the guide", () => {
    const guide = buildKeyGuide({ ...DEFAULT_KEYS, R: "KeyP" });
    const faces = guide[0]?.[0] ?? "";
    expect(faces).toContain("P");
    expect(faces).not.toContain("R ");
  });
});
