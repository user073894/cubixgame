// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { workboxOptions } from "./pwa-workbox.mjs";

// Static export for any plain file host (GitHub Pages, Netlify, Vercel, Cloudflare Pages,
// Apache, nginx...). Enabled with STATIC_EXPORT=1 (see `npm run build:static`).
// STATIC_BASE is the sub-folder the site lives in, e.g. "/my-repo/" on GitHub Pages.
const staticExport = process.env.STATIC_EXPORT === "1";
const rawBase = process.env.STATIC_BASE || "/";
const base = staticExport ? `/${rawBase.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/") : "/";

export default defineConfig({
  ...(staticExport
    ? {
        nitro: false as const,
        tanstackStart: {
          // Full page for "/" (no flash, no hydration mismatch) plus an app shell for every other path.
          prerender: { enabled: true, crawlLinks: false },
          spa: { enabled: true, prerender: { outputPath: "/_shell", crawlLinks: false } },
        },
      }
    : {}),
  vite: {
    base,
    worker: { format: "es" },
    plugins: [
      VitePWA({
        strategies: "generateSW",
        filename: "sw.js",
        outDir: "dist/client",
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false,
        devOptions: { enabled: false },
        workbox: workboxOptions,
      }),
    ],
  },
});
