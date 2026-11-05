import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Settings } from "@/lib/storage";
import type { OfflineState } from "@/lib/pwa";
import { DEFAULT_KEYS, RESERVED_CODES, codeLabel, type KeyBindings } from "./keyboard";
import { useEffect, useState, type ReactNode } from "react";

export const APP_VERSION = "1.0.26";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-2">
      <h3 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="divide-y divide-border px-1">{children}</div>
    </section>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full bg-surface-raised p-1">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`rounded-full px-3 py-1 text-xs ${value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

const BINDABLE_MOVES = ["R", "L", "U", "D", "F", "B", "M", "E", "S", "x", "y", "z"];

function KeyBindingsEditor({ keys, update }: { keys: KeyBindings; update: (keys: KeyBindings) => void }) {
  const [capturing, setCapturing] = useState<string | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") return setCapturing(null);
      if (RESERVED_CODES.has(e.code)) {
        toast.error("That key is reserved for the timer and modifiers");
        return;
      }
      const next = { ...keys };
      const other = Object.keys(next).find((m) => m !== capturing && next[m] === e.code);
      if (other) next[other] = keys[capturing] ?? ""; // swap so no move loses its key
      next[capturing] = e.code;
      update(next);
      setCapturing(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing, keys, update]);

  return (
    <div className="py-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Custom keys</div>
          <div className="text-xs text-muted-foreground">Click a key, then press the new one. Shift = prime, W = wide, 2 = double.</div>
        </div>
        <Button variant="pill" className="h-8 text-xs" onClick={() => update({ ...DEFAULT_KEYS })}>
          Reset keys
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {BINDABLE_MOVES.map((m) => (
          <button
            key={m}
            onClick={() => setCapturing(capturing === m ? null : m)}
            className={`flex items-center justify-between rounded-xl px-3 py-2 font-mono text-sm ${
              capturing === m ? "bg-primary text-primary-foreground" : "bg-surface-raised"
            }`}
          >
            <span>{m}</span>
            <span className={capturing === m ? "text-primary-foreground" : "text-muted-foreground"}>
              {capturing === m ? "press…" : codeLabel(keys[m] ?? "")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  offline: OfflineState;
  onRecenter: () => void;
  onClearHistory: () => void;
  onTutorial: () => void;
}

export function SettingsMenu({ open, onOpenChange, settings: s, update, offline, onRecenter, onClearHistory, onTutorial }: Props) {
  const [laptopControls, setLaptopControls] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (hover: hover)");
    const sync = () => setLaptopControls(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>

        <Group title="Timer">
          <Row label="Timer only" hint="For a real cube: clock only, Space to start/stop">
            <Switch checked={s.timerOnly} onCheckedChange={(v) => update({ timerOnly: v })} />
          </Row>
          <Row label="15s inspection" hint="WCA: +2 from 15s, DNF from 17s">
            <Switch checked={s.inspection} onCheckedChange={(v) => update({ inspection: v })} />
          </Row>
          <Row label="Hold to start" hint="Hold 0.3s until the timer turns green">
            <Switch checked={s.holdToStart} onCheckedChange={(v) => update({ holdToStart: v })} />
          </Row>
          <Row label="Time format">
            <Seg value={s.timeFormat} options={[["mm", "MM:SS.hh"], ["ss", "SS.hh"]]} onChange={(v) => update({ timeFormat: v })} />
          </Row>
        </Group>

        <Group title="Controls">
          <Row label="Swipe style" hint={s.controls === "easy" ? "Forgiving swipes" : "Shorter, stricter swipes"}>
            <Seg value={s.controls} options={[["easy", "Easy"], ["precise", "Precise"]]} onChange={(v) => update({ controls: v })} />
          </Row>
          {laptopControls && (
            <Row label="Rigid rotation" hint="Camera snaps to fixed angles">
              <Switch aria-label="Rigid rotation" checked={s.rigidRotation} onCheckedChange={(v) => update({ rigidRotation: v })} />
            </Row>
          )}
          {laptopControls && <KeyBindingsEditor keys={s.keys} update={(keys) => update({ keys })} />}
          <div className="py-3">
            <div className="mb-3 flex justify-between text-sm"><span className="font-medium">Rotation sensitivity</span><span className="text-muted-foreground">{s.sensitivity.toFixed(1)}×</span></div>
            <Slider min={0.4} max={2} step={0.1} value={[s.sensitivity]} onValueChange={([v]) => update({ sensitivity: v ?? 1 })} />
          </div>
          <div className="py-3">
            <div className="mb-3 flex justify-between text-sm"><span className="font-medium">Animation speed</span><span className="text-muted-foreground">{s.speed.toFixed(1)}×</span></div>
            <Slider min={0.5} max={3} step={0.1} value={[s.speed]} onValueChange={([v]) => update({ speed: v ?? 1 })} />
          </div>
        </Group>

        <Group title="Feedback">
          <Row label="Sound effects">
            <Switch checked={s.sound} onCheckedChange={(v) => update({ sound: v })} />
          </Row>
          <Row label="Haptic feedback" hint="On supported phones">
            <Switch checked={s.haptics} onCheckedChange={(v) => update({ haptics: v })} />
          </Row>
        </Group>

        <Group title="Appearance">
          <Row label="Theme">
            <Seg value={s.theme} options={[["dark", "Dark"], ["light", "Light"]]} onChange={(v) => update({ theme: v })} />
          </Row>
        </Group>

        <Group title="Data">
          <div className="py-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full rounded-full">Clear {s.timerOnly ? "timer" : "cube"} history</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear {s.timerOnly ? "timer-only" : "virtual-cube"} solves?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the {s.timerOnly ? "timer-only" : "virtual-cube"} solves on this device. The other mode's records are kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearHistory}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Group>

        <Group title="About">
          <div className="flex flex-wrap gap-2 py-3">
            <Button variant="pill" onClick={onRecenter}>Recenter camera</Button>
            <Button variant="pill" onClick={onTutorial}>Controls tutorial</Button>
          </div>
          <Row label="Version"><span className="font-mono text-sm text-muted-foreground">cubix {APP_VERSION}</span></Row>
          {void offline}
        </Group>
      </SheetContent>
    </Sheet>
  );
}
