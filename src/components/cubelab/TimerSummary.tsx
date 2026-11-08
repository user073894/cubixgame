import { averageOf, bestSingle, effective, formatTime, type Solve } from "@/lib/stats";

export function TimerSummary({ solves, format }: { solves: Solve[]; format: "mm" | "ss" }) {
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
    </footer>
  );
}