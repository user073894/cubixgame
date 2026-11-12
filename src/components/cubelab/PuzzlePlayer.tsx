import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { TwistyPlayer } from "cubing/twisty";
import type { KPattern } from "cubing/kpuzzle";
import type { Puzzle } from "@/lib/puzzles";

export interface PuzzlePlayerHandle { move: (move: string) => void; recenter: () => void }
export const PuzzlePlayer = forwardRef<PuzzlePlayerHandle, {
  puzzle: Puzzle; scramble: string; onTurn: () => void; onSolved: () => void;
}>(function PuzzlePlayer({ puzzle, scramble, onTurn, onSolved }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<TwistyPlayer | null>(null);
  const latest = useRef({ onTurn, onSolved });
  latest.current = { onTurn, onSolved };
  useImperativeHandle(ref, () => ({
    move: (m) => player.current?.experimentalAddMove(m),
    recenter: () => { if (player.current) { player.current.cameraLatitude = 30; player.current.cameraLongitude = 30; } },
  }));
  useEffect(() => {
    let cancelled = false;
    let current: TwistyPlayer | null = null;
    Promise.all([import("cubing/twisty"), import("cubing/puzzles")]).then(async ([{ TwistyPlayer }, { puzzles }]) => {
      const loader = puzzles[puzzle]; if (!loader) throw new Error("unknown puzzle");
      const kpuzzle = await loader.kpuzzle();
      let pattern: KPattern = kpuzzle.defaultPattern().applyAlg(scramble);
      if (cancelled || !host.current) return;
      current = new TwistyPlayer({ puzzle, experimentalSetupAlg: scramble, background: "none", controlPanel: "none", viewerLink: "none", hintFacelets: "none", experimentalMovePressInput: "basic", tempoScale: 3 });
      // Intercept all library input before the logical and visual turn, just like the 3×3 engine.
      const model = (current as unknown as { experimentalModel: { experimentalAddMove: (move: string | { toString(): string }, options?: unknown) => void } }).experimentalModel;
      const add = model.experimentalAddMove.bind(model);
      model.experimentalAddMove = (move, options) => {
        try {
          const next = pattern.applyMove(move.toString());
          latest.current.onTurn();
          pattern = next;
          add(move, options);
          let solved = pattern.isIdentical(kpuzzle.defaultPattern());
          try { solved = pattern.experimentalIsSolved({ ignorePuzzleOrientation: true, ignoreCenterOrientation: true }); } catch { /* Other puzzles use their exact solved pattern. */ }
          if (solved) latest.current.onSolved();
        } catch { /* Ignore unsupported notation for this puzzle. */ }
      };
      player.current = current;
      host.current.replaceChildren(current);
    }).catch(() => { if (!cancelled && host.current) host.current.textContent = "Puzzle unavailable"; });
    return () => { cancelled = true; current?.remove(); player.current = null; };
  }, [puzzle, scramble]);
  return <div ref={host} className="puzzle-player text-sm text-muted-foreground" aria-label="Interactive puzzle">Loading puzzle…</div>;
});