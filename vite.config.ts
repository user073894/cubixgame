// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

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
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ["**/*.{js,css,png,svg,ico,woff,woff2,webmanifest}"],
          navigateFallback: null,
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                (request.mode === "navigate" || url.pathname === base) && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: { cacheName: "cubelab-pages", networkTimeoutSeconds: 3 },
            },
            {
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes("/assets/"),
              handler: "CacheFirst",
              options: { cacheName: "cubelab-assets" },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(png|ico|svg|webmanifest|woff2?)$/.test(url.pathname),
              handler: "StaleWhileRevalidate",
              options: { cacheName: "cubelab-static" },
            },
          ],
        },
      }),
    ],
  },
});
