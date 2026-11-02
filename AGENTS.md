<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- 3D cube is an imperative three.js engine (src/lib/cube/engine.ts) loaded via dynamic import from Cube3D; custom gestures need full control over raycasting vs. view rotation.
- Logical cube state lives in vendored cubejs (src/vendor/cubejs, patched to avoid CJS `this`); every move updates logical state and engine queue together.
- Preserve vendored cubejs initialization scripts, stylesheets, and error-capture registration in package sideEffects; production tree shaking must not remove required import-time setup.
- Solver/scrambler run in a Web Worker (src/lib/cube/solver.worker.ts) because Kociemba table init blocks ~2s.
- All data stays local (idb-keyval); no backend — the app must work offline.
- Service worker via vite-plugin-pwa generateSW, registered only from src/lib/pwa.ts with preview/iframe guards; runtime caches warmed after first control.
- All user turns enter the timer hook before logical/visual move application; inspection penalties are captured at that instant and recorded on stop, so orbit and generated scrambles never start timing.
- Cube appearance reads semantic cube palette tokens from global CSS; layer animations carry frame time through the queue without dropping turns, and the inner core stays inside the center cubie to avoid intersecting moving layers.
- Camera snapping and keyboard face mapping use the 24 proper cube orientations to prevent duplicate axes; rigid snapping uses its own two-face base view and is gated by laptop width and fine hover-capable pointer, never touch-only tablets.
- Records graph data is derived from saved solves through the shared penalty/average functions; never store a second results series that could diverge from history edits.
- Static hosting (GitHub Pages, Netlify, Vercel, any file host) uses `npm run build:static` (STATIC_EXPORT=1 SPA shell + scripts/static-export.mjs → ./static); asset/icon/service-worker paths must use import.meta.env.BASE_URL so sub-folder hosting works. Lovable publishing keeps the default build.
- Service-worker settings live in pwa-workbox.mjs, shared by vite.config.ts and the static export, so both builds cache the same files.
- Startup recovery lives in src/lib/boot-recovery.ts (inline head script): a missing hashed app file after a new deploy clears caches/service worker and reloads once per tab session; the app clears the flag only after the 3D engine and solver load, so it can never reload-loop. Page navigations stay NetworkFirst without a timeout so a stale page is used only offline.
