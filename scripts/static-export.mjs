// Turns the static build (STATIC_EXPORT=1 vite build) into a folder any web host can serve:
// GitHub Pages, Netlify, Vercel, Cloudflare Pages, Firebase, Surge, Apache, nginx...
// Output: ./static (upload this folder as-is).
import { cpSync, copyFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateSW } from "workbox-build";
import { workboxOptions } from "../pwa-workbox.mjs";

const src = "dist/client";
const out = "static";
const shell = join(src, "_shell.html");

if (!existsSync(shell)) {
  console.error(`[static-export] ${shell} not found. Run with STATIC_EXPORT=1 (npm run build:static).`);
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });
rmSync(join(out, "_shell.html"));

// Every host looks for index.html; 404.html makes deep links / refreshes open the app too.
const page = join(src, "index.html");
if (!existsSync(page)) copyFileSync(shell, join(out, "index.html"));
copyFileSync(shell, join(out, "404.html"));
// GitHub Pages: skip Jekyll so files starting with "_" are served.
writeFileSync(join(out, ".nojekyll"), "");
// Netlify / Cloudflare Pages: send unknown paths to the app.
writeFileSync(join(out, "_redirects"), "/*    /index.html   200\n");

const { count, warnings } = await generateSW({
  ...workboxOptions,
  globDirectory: out,
  globIgnores: ["sw.js", "workbox-*.js"],
  swDest: join(out, "sw.js"),
  mode: "production",
});
for (const w of warnings) console.warn("[static-export]", w);
console.log(`[static-export] ready in ./${out} (${count} files cached for offline)`);
