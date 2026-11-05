import { describe, it, expect } from "vitest";
import { averageOf, bestSingle, formatTime, pbShaved, solvesForMode, type Solve } from "./stats";
import { invertAlg, moveToTurn, turnToMove } from "./cube/moves";

const mk = (time: number, penalty: Solve["penalty"] = "none"): Solve => ({
  id: String(Math.random()), time, penalty, scramble: "", date: 0,
});

describe("averages", () => {
  it("ao5 drops best and worst", () => {
    expect(averageOf([10, 20, 30, 40, 100].map((t) => mk(t * 1000)), 5)).toBe(30000);
  });
  it("ao5 with one DNF counts it as worst", () => {
    expect(averageOf([mk(10000), mk(20000), mk(30000), mk(40000), mk(1, "dnf")], 5)).toBe(30000);
  });
  it("ao5 with two DNFs is DNF", () => {
    expect(averageOf([mk(1, "dnf"), mk(1, "dnf"), mk(1000), mk(2000), mk(3000)], 5)).toBe(Infinity);
  });
  it("+2 adds two seconds", () => {
    expect(bestSingle([mk(5000, "+2")])).toBe(7000);
  });
  it("needs n solves", () => {
    expect(averageOf([mk(1000)], 5)).toBeNull();
  });
  it("formats MM:SS.hh", () => {
    expect(formatTime(65432)).toBe("01:05.43");
  });
});

describe("personal bests", () => {
  it("reports the time shaved off the old best", () => {
    expect(pbShaved(10000, mk(8760))).toBe(1240);
  });
  it("a slower solve is not a PB", () => {
    expect(pbShaved(10000, mk(10000))).toBeNull();
    expect(pbShaved(10000, mk(11000))).toBeNull();
  });
  it("DNF never counts as a PB", () => {
    expect(pbShaved(10000, mk(1, "dnf"))).toBeNull();
  });
  it("+2 compares with the penalty included", () => {
    expect(pbShaved(10000, mk(9000, "+2"))).toBeNull(); // 11s effective
    expect(pbShaved(10000, mk(7000, "+2"))).toBe(1000); // 9s effective
  });
  it("no previous best means no celebration", () => {
    expect(pbShaved(null, mk(5000))).toBeNull();
  });
});

describe("per-mode records", () => {
  it("keeps virtual-cube and timer-only solves apart", () => {
    const cube: Solve = { ...mk(1000), mode: "cube" };
    const timer: Solve = { ...mk(2000), mode: "timer" };
    const legacy = mk(3000); // no mode = virtual cube
    expect(solvesForMode([cube, timer, legacy], "cube")).toEqual([cube, legacy]);
    expect(solvesForMode([cube, timer, legacy], "timer")).toEqual([timer]);
  });
});

describe("moves", () => {
  it("R is negative quarter about +x", () => {
    expect(moveToTurn("R")).toEqual({ axis: 0, layers: [1], quarters: -1 });
  });
  it("gesture mapping round-trips", () => {
    expect(turnToMove(0, 1, -1)).toBe("R");
    expect(turnToMove(1, -1, 1)).toBe("D");
    expect(turnToMove(2, 1, 1)).toBe("F'");
  });
  it("inverts algs", () => {
    expect(invertAlg(["R", "U'", "F2"])).toEqual(["F2", "U", "R'"]);
  });
});
