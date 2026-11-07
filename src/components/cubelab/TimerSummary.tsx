import { useMemo } from "react";
import { CubeState } from "@/lib/cube/state";
import type { Move } from "@/lib/cube/moves";
import { averageOf, bestSingle, effective, formatTime, type Solve } from "@/lib/stats";

type V = [number, number, number];
const faces: { name: string; normal: V; position: (row: number, col: number) => V }[] = [
  { name: "U", normal: [0, 1, 0], position: (r, c) => [c - 1, 1, r - 1] },
  { name: "L", normal: [-1, 0, 0], position: (r, c) => [-1, 1 - r, c - 1] },
  { name: "F", normal: [0, 0, 1], position: (r, c) => [c - 1, 1 - r, 1] },
  { name: "R", normal: [1, 0, 0], position: (r, c) => [1, 1 - r, 1 - c] },
  { name: "B", normal: [0, 0, -1], position: (r, c) => [1 - c, 1 - r, -1] },
  { name: "D", normal: [0, -1, 0], position: (r, c) => [c - 1, -1, 1 - r] },
];

export function TimerSummary({ solves, scramble, format }: { solves: Solve[]; scramble: Move[]; format: "mm" | "ss" }) {
  const cube = useMemo(() => new CubeState().move(scramble), [scramble]);
  const valid = solves.map(effective).filter(Number.isFinite);
  const rows = [
    ["Ao5", averageOf(solves, 5), "Mean", valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null],
    ["Ao12", averageOf(solves, 12), "Best", bestSingle(solves)],
    ["Ao50", averageOf(solves, 50), "Worst", valid.length ? Math.max(...valid) : null],
    ["Ao100", averageOf(solves, 100), "Count", solves.length],
  ] as const;
  return (
    <footer className="timer-summary">
      <dl className="timer-summary-stats">
        {rows.map(([label, value, other, otherValue]) => (
          <div key={label} className="contents">
            <dt>{label}</dt><dd>{formatTime(value, format)}</dd>
            <dt>{other}</dt><dd>{other === "Count" ? otherValue : formatTime(otherValue, format)}</dd>
          </div>
        ))}
      </dl>
      <div className="scramble-net" role="img" aria-label="Scrambled cube net">
        {faces.map((face) => (
          <div key={face.name} className={`net-face net-face-${face.name}`}>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={`net-sticker net-color-${cube.colorAt(face.position(Math.floor(i / 3), i % 3), face.normal) ?? "U"}`} />
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}