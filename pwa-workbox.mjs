// Shared offline (service worker) settings used by vite.config.ts and scripts/static-export.mjs.
// Route matchers are serialized into sw.js, so they must not reference outside variables.
export const workboxOptions = {
  globPatterns: ["**/*.{js,css,png,svg,ico,woff,woff2,webmanifest}"],
  navigateFallback: null,
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  runtimeCaching: [
    {
      urlPattern: ({ request, url }) =>
        (request.mode === "navigate" || url.pathname.endsWith("/")) && !url.pathname.startsWith("/~oauth"),
      // Always the live page when online; the saved copy is only used offline. A timeout fallback
      // would serve an outdated page whose files were replaced by a newer deploy (blank screen).
      handler: "NetworkFirst",
      options: { cacheName: "cubelab-pages" },
    },
    {
      urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes("/assets/"),
      handler: "CacheFirst",
      options: { cacheName: "cubelab-assets" },
    },
    {
      urlPattern: ({ url, sameOrigin }) => sameOrigin && /\.(png|ico|svg|webmanifest|woff2?)$/.test(url.pathname),
      handler: "StaleWhileRevalidate",
      options: { cacheName: "cubelab-static" },
    },
  ],
};
