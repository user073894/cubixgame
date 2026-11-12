import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Crosshair, HelpCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Cube3D, type Cube3DHandle } from "./Cube3D";
import { AppHeader, ScrambleDisplay, SolveHistory, StatisticsPanel } from "./panels";
import { SettingsMenu } from "./SettingsMenu";
import { SolveGraph } from "./SolveGraph";
import { TimerSummary } from "./TimerSummary";
import { PuzzlePlayer, type PuzzlePlayerHandle } from "./PuzzlePlayer";
import { PUZZLES, puzzleInfo, puzzleScramble, type Puzzle } from "@/lib/puzzles";
import { useTimer } from "./useTimer";
import { buildKeyGuide, keyToMove } from "./keyboard";
import { DEFAULT_SETTINGS, loadSettings, loadSolves, saveSettings, saveSolves, type Settings } from "@/lib/storage";
import { INSPECTION_DNF_MS, INSPECTION_PLUS2_MS, bestSingle, formatTime, pbShaved, solvesForMode, type Penalty, type Solve } from "@/lib/stats";
import { initSolver, randomScramble } from "@/lib/cube/solver";
import { CubeState } from "@/lib/cube/state";
import type { Move } from "@/lib/cube/moves";
import { playClick, vibrate } from "@/lib/feedback";
import { registerOffline, type OfflineState } from "@/lib/pwa";
import { markBooted, recoverFromMissingFiles } from "@/lib/boot-recovery";

export function CubeLabApp() {
  const [splash, setSplash] = useState(true);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState<OfflineState>("installing");
  const [solverReady, setSolverReady] = useState(false);
  const [scramble, setScramble] = useState<Move[]>([]);
  const [otherScramble, setOtherScramble] = useState("");
  const [puzzleOpen, setPuzzleOpen] = useState(false);
  const puzzleRef = useRef<PuzzlePlayerHandle>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordsView, setRecordsView] = useState<"history" | "graph">("history");
  const [tutorial, setTutorial] = useState(false);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [pb, setPb] = useState<number | null>(null); // ms shaved off the previous best
  const cubeRef = useRef<Cube3DHandle>(null);
  const mountedAt = useRef(Date.now());
  const [engineOk, setEngineOk] = useState(false);
  const onCubeReady = useCallback((ok: boolean) => {
    setEngineOk(ok);
    // Splash stays up for 5 seconds total.
    setTimeout(() => setSplash(false), Math.max(0, 5000 - (Date.now() - mountedAt.current)));
  }, []);
  const logical = useRef(new CubeState());
  const scrambleRef = useRef<Move[]>([]);
  scrambleRef.current = scramble;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const fb = useCallback((freq?: number) => {
    if (settingsRef.current.sound) playClick(freq);
    if (settingsRef.current.haptics) vibrate(8);
  }, []);

  // Everything loaded: allow a future broken deploy to be auto-recovered again.
  useEffect(() => {
    if (engineOk && solverReady) markBooted();
  }, [engineOk, solverReady]);

  useEffect(() => {
    Promise.all([loadSettings(), loadSolves()])
      .then(([s, v]) => {
        setSettings(s);
        setSolves(v);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    registerOffline(setOffline);
    initSolver()
      .then(() => setSolverReady(true))
      .catch(() => {
        recoverFromMissingFiles();
        toast.error("Scrambler failed to load");
      });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", settings.theme === "light");
    if (loaded) saveSettings(settings);
  }, [settings, loaded]);
  useEffect(() => void (loaded && saveSolves(solves)), [solves, loaded]);

  const update = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));

  const mode: "cube" | "timer" = settings.timerOnly ? "timer" : "cube";
  const puzzle = settings.puzzle;
  const is333 = puzzle === "3x3x3";
  const modeSolves = useMemo(() => solvesForMode(solves, mode, puzzle), [solves, mode, puzzle]);
  const modeSolvesRef = useRef(modeSolves);
  modeSolvesRef.current = modeSolves;

  const timer = useTimer({
    inspection: settings.inspection,
    holdToStart: settings.holdToStart,
    onStart: () => fb(1200),
    onFinish: ({ ms, penalty, inspectionMs }) => {
      fb(900);
      const solve: Solve = {
        id: crypto.randomUUID(),
        time: Math.round(ms),
        penalty,
        scramble: settingsRef.current.puzzle === "3x3x3" ? scrambleRef.current.join(" ") : otherScrambleRef.current,
        date: Date.now(),
        inspection: inspectionMs === null ? null : Math.round(inspectionMs),
        inspectionPenalty: inspectionMs === null ? undefined : penalty,
        mode,
        puzzle: settingsRef.current.puzzle,
      };
      const shaved = pbShaved(bestSingle(modeSolvesRef.current), solve);
      if (shaved !== null) setPb(shaved);
      setSolves((s) => [solve, ...s]);
      newScrambleRef.current();
    },
  });
  const timerRef = useRef(timer);
  timerRef.current = timer;

  /** Single entry point for every move source: logical state and 3D queue stay in sync. */
  const apply = useCallback((moves: Move[]) => {
    if (!moves.length) return Promise.resolve();
    logical.current.move(moves);
    return cubeRef.current?.enqueue(moves) ?? Promise.resolve();
  }, []);

  const hardReset = () => {
    cubeRef.current?.reset();
    logical.current = new CubeState();
  };

  const onUserMove = useCallback(
    (m: Move) => {
      timerRef.current.startOnMove();
      fb();
      setLastMove(m);
      apply([m]);
      if (timerRef.current.phase === "running" && logical.current.isSolved()) timerRef.current.stop();
    },
    [apply, fb],
  );

  const scrambling = useRef(false);
  const otherScrambleRef = useRef("");
  otherScrambleRef.current = otherScramble;
  async function newScramble() {
    if (settingsRef.current.puzzle !== "3x3x3") {
      const id = settingsRef.current.puzzle;
      setOtherScramble("");
      try {
        const s = await puzzleScramble(id);
        if (settingsRef.current.puzzle === id) setOtherScramble(s);
      } catch { toast.error("Scramble unavailable offline for this puzzle yet"); }
      return;
    }
    if (!solverReady || scrambling.current) return;
    scrambling.current = true;
    try {
      const s = await randomScramble();
      hardReset();
      setLastMove(null);
      setScramble(s);
      apply(s);
    } finally {
      scrambling.current = false;
    }
  }
  const newScrambleRef = useRef(newScramble);
  newScrambleRef.current = newScramble;

  const didFirst = useRef(false);
  useEffect(() => {
    if (solverReady && !splash && !didFirst.current) {
      didFirst.current = true;
      newScramble();
    }
  });

  function reset() {
    hardReset();
    setScramble([]);
    setLastMove(null);
    setPb(null);
    timer.reset(); // cancels inspection or an unfinished solve without recording it
  }

  // Picking a different puzzle loads its own scramble and records.
  const firstPuzzle = useRef(true);
  useEffect(() => {
    if (firstPuzzle.current) { firstPuzzle.current = false; if (is333) return; }
    timerRef.current.reset();
    setPb(null);
    newScrambleRef.current();
  }, [puzzle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switching interfaces swaps the record set; any celebration belongs to the old one.
  useEffect(() => setPb(null), [mode]);

  // Keyboard: timer (Space) and cube moves
  useEffect(() => {
    const held = { wide: false, double: false };
    const typing = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.("input,textarea,select,[contenteditable=true],[role=dialog]");
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.code === "KeyW") return (held.wide = true), e.preventDefault();
      if (e.code === "Digit2" || e.code === "Numpad2") return (held.double = true), e.preventDefault();
      if (e.code === "Space") {
        e.preventDefault();
        setPb(null); // preparing the next solve clears the celebration
        if (!e.repeat) timerRef.current.press();
        return;
      }
      if (e.key === "?") return e.preventDefault(), setTutorial(true);
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.code)) return e.preventDefault();
      if (settingsRef.current.timerOnly || settingsRef.current.puzzle !== "3x3x3") return;
      const m = keyToMove(e, held, settingsRef.current.keys);
      if (!m) return;
      e.preventDefault();
      if (e.repeat) return;
      onUserMove(cubeRef.current?.viewMove(m) ?? m);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyW") held.wide = false;
      if (e.code === "Digit2" || e.code === "Numpad2") held.double = false;
      if (e.code === "Space") {
        e.preventDefault();
        timerRef.current.release();
      }
    };
    const blur = () => ((held.wide = false), (held.double = false));
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [onUserMove]);

  const engineSettings = useMemo(
    () => ({ speed: settings.speed, sensitivity: settings.sensitivity, easy: settings.controls === "easy", rigidRotation: settings.rigidRotation }),
    [settings.speed, settings.sensitivity, settings.controls, settings.rigidRotation],
  );

  const t = timer;
  const inspecting = t.phase === "inspecting";
  const el = t.display;
  const timerColor =
    t.arm === "ready"
      ? "text-timer-ready"
      : t.arm === "holding"
        ? "text-timer-hold"
        : inspecting
          ? el >= INSPECTION_PLUS2_MS ? "text-destructive" : el >= 12000 ? "text-timer-hold" : el >= 8000 ? "text-timer-inspect" : "text-foreground"
          : "text-foreground";
  const timerText = inspecting
    ? el < INSPECTION_PLUS2_MS ? String(Math.ceil((INSPECTION_PLUS2_MS - el) / 1000)) : el < INSPECTION_DNF_MS ? "+2" : "DNF"
    : formatTime(t.display, settings.timeFormat);
  const timerHint =
    t.phase === "running"
      ? "Tap or press Space to stop"
      : t.arm === "ready"
        ? "Release to start"
        : inspecting
          ? el >= INSPECTION_PLUS2_MS ? "Start now: +2 penalty" : "Inspecting — hold to start"
          : settings.inspection ? "Hold timer or Space to inspect" : "Hold timer or Space to start";

  return (
    <div className={`cubix-app ${settings.focusMode && (t.phase === "running" || inspecting) ? "focus-mode" : ""} fixed inset-0 flex flex-col overflow-hidden overscroll-none ${settings.timerOnly ? "timer-only" : "virtual-cube"}`}>
      {splash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <span className="text-4xl font-bold tracking-tight">
            cub<span className="text-muted-foreground">ix</span>
          </span>
        </div>
      )}
      <div className="mx-auto flex h-full w-full flex-col">
        <AppHeader onSettings={() => setSettingsOpen(true)} timerOnly={settings.timerOnly} onMode={(timerOnly) => { timer.reset(); setPb(null); update({ timerOnly }); }} onRecords={() => { setRecordsView("history"); setRecordsOpen(true); }} onReset={reset} puzzleLabel={puzzleInfo(puzzle).label} onPuzzle={() => setPuzzleOpen(true)} />

        <div className="shrink-0">
          <ScrambleDisplay scramble={is333 ? scramble : otherScramble} loading={is333 ? !solverReady : !otherScramble} onNew={newScramble} />
        </div>

        <Button
          type="button"
          variant="ghost"
          className={`timer-surface ${settings.timerOnly ? "timer-surface-large" : "timer-surface-cube"}`}
          onPointerDown={(e) => (e.preventDefault(), setPb(null), t.press())}
          onPointerUp={() => t.release()}
          onPointerCancel={() => t.release()}
          onKeyDown={(e) => e.code === "Space" && e.preventDefault()}
          aria-label="Timer"
        >
          <span className={`timer-digits tabular transition-colors ${timerColor}`}>{timerText}</span>
          {(t.arm !== "none" || inspecting) && <span className="mt-2 text-xs text-muted-foreground">{timerHint}</span>}
          {pb !== null && (
            <span className="animate-pb-pulse mt-1 rounded-full bg-timer-ready/15 px-3 py-1 text-sm font-semibold text-timer-ready">
              🎉 NEW PB! -{(pb / 1000).toFixed(2)}s
            </span>
          )}
        </Button>

        <div className={`relative min-h-0 flex-1 items-center justify-center ${settings.timerOnly ? "hidden" : "flex"}`} style={{ containerType: "size" }}>
          <div className="aspect-square" style={{ width: "min(100cqw, 100cqh, 640px)" }}>
            <div className={is333 ? "h-full w-full" : "hidden"}>
              <Cube3D ref={cubeRef} settings={engineSettings} onUserMove={onUserMove} onReady={onCubeReady} />
            </div>
            {!is333 && !settings.timerOnly && !otherScramble && <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading puzzle…</div>}
            {!is333 && !settings.timerOnly && otherScramble && (
              <PuzzlePlayer
                ref={puzzleRef}
                puzzle={puzzle}
                scramble={otherScramble}
                onTurn={() => { timerRef.current.startOnMove(); fb(); }}
                onSolved={() => { if (timerRef.current.phase === "running") timerRef.current.stop(); }}
              />
            )}
          </div>
          <span className="pointer-events-none absolute top-1 left-4 font-mono text-xs text-muted-foreground" aria-live="polite">
            {lastMove ?? ""}
          </span>
          <div className="absolute right-3 bottom-2 flex flex-col gap-2">
            <Button variant="pill" size="icon" aria-label="Recenter view" onClick={() => (is333 ? cubeRef.current?.recenter() : puzzleRef.current?.recenter())}>
              <Crosshair className="size-4" />
            </Button>
            <Button variant="pill" size="icon" aria-label="Controls guide" onClick={() => setTutorial(true)}>
              <HelpCircle className="size-4" />
            </Button>
          </div>
        </div>

        {settings.timerOnly && <TimerSummary solves={modeSolves} format={settings.timeFormat} />}
      </div>

      <Sheet open={recordsOpen} onOpenChange={setRecordsOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>Records — {puzzleInfo(puzzle).label}</SheetTitle></SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6">
            <StatisticsPanel solves={modeSolves} format={settings.timeFormat} />
            <div className="flex gap-2" aria-label="Records view">
              <Button variant={recordsView === "history" ? "secondary" : "ghost"} onClick={() => setRecordsView("history")}>History</Button>
              <Button variant={recordsView === "graph" ? "secondary" : "ghost"} onClick={() => setRecordsView("graph")}><BarChart3 /> Graph</Button>
            </div>
            {recordsView === "graph" && <SolveGraph solves={modeSolves} format={settings.timeFormat} />}
            {recordsView === "history" && <>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent solves</h2>
            <SolveHistory
              solves={modeSolves}
              format={settings.timeFormat}
              onPenalty={(id, p: Penalty) => setSolves((s) => s.map((x) => (x.id === id ? { ...x, penalty: p } : x)))}
              onDelete={(id) => setSolves((s) => s.filter((x) => x.id !== id))}
            />
            </>}
          </div>
        </SheetContent>
      </Sheet>

      <SettingsMenu
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        update={update}
        offline={offline}
        onRecenter={() => cubeRef.current?.recenter()}
        onClearHistory={() => (setSolves((s) => s.filter((x) => (x.mode ?? "cube") !== mode)), setPb(null), toast.success("History cleared"))}
        onTutorial={() => (setSettingsOpen(false), setTutorial(true))}
      />

      <Dialog open={puzzleOpen} onOpenChange={setPuzzleOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Choose puzzle</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {PUZZLES.map((p) => (
              <Button key={p.id} variant={p.id === puzzle ? "secondary" : "ghost"} className="justify-start" onClick={() => { update({ puzzle: p.id as Puzzle }); setPuzzleOpen(false); }}>
                {p.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Each puzzle keeps its own records, for both the timer and the virtual puzzle.</p>
        </DialogContent>
      </Dialog>

      <Dialog open={tutorial} onOpenChange={setTutorial}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Controls</DialogTitle></DialogHeader>
          <ul className="space-y-2 text-sm">
            <li><b>Touch:</b> swipe a sticker along its row or column to turn that layer (middle rows turn M, E, S). Drag the empty space to look around — that never changes the cube.</li>
            <li><b>Timer:</b> hold the timer until it turns green, release to start, tap to stop. Solving the cube also stops it.</li>
          </ul>
          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keyboard</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {buildKeyGuide(settings.keys).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-foreground">{k}</dt>
                <dd className="text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
