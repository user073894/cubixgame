import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CubeEngine, EngineSettings } from "@/lib/cube/engine";
import type { Move } from "@/lib/cube/moves";
import { recoverFromMissingFiles } from "@/lib/boot-recovery";

export interface Cube3DHandle {
  enqueue: (m: Move[]) => Promise<void>;
  reset: () => void;
  recenter: () => void;
  viewMove: (m: Move) => Move;
}

interface Props {
  settings: EngineSettings;
  onUserMove: (m: Move) => void;
  onReady: (ok: boolean) => void;
  onBusy?: (n: number) => void;
}

export const Cube3D = forwardRef<Cube3DHandle, Props>(function Cube3D(props, ref) {
  const el = useRef<HTMLDivElement>(null);
  const engine = useRef<CubeEngine | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useImperativeHandle(ref, () => ({
    enqueue: (m) => engine.current?.enqueue(m) ?? Promise.resolve(),
    reset: () => engine.current?.reset(),
    recenter: () => engine.current?.recenter(),
    viewMove: (m) => engine.current?.viewMove(m) ?? m,
  }));

  useEffect(() => {
    let cancelled = false;
    import("@/lib/cube/engine")
      .then(({ CubeEngine }) => {
        if (cancelled || !el.current) return;
        try {
          engine.current = new CubeEngine(el.current, {
            onUserMove: (m) => latest.current.onUserMove(m),
            onQueueChange: (n) => latest.current.onBusy?.(n),
            getSettings: () => latest.current.settings,
          });
        } catch (err) {
          // e.g. WebGL unavailable: never leave the splash up forever.
          console.error(err);
        }
        const ok = !!engine.current;
        requestAnimationFrame(() => latest.current.onReady(ok));
      })
      .catch((err) => {
        console.error(err);
        recoverFromMissingFiles();
        if (!cancelled) latest.current.onReady(false);
      });
    return () => {
      cancelled = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  return <div ref={el} className="h-full w-full select-none" aria-label="Interactive 3D Rubik's Cube" />;
});
