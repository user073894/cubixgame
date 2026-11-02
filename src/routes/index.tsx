import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { CubeLabApp } from "@/components/cubelab/CubeLabApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "cubix — Offline 3D Rubik's Cube & Speedcubing Timer" },
      { name: "description", content: "Turn a realistic 3D Rubik's Cube, generate scrambles, solve, and time your solves with Ao5/Ao12 stats — fully offline." },
      { property: "og:title", content: "cubix — Speedcubing Timer & 3D Cube" },
      { property: "og:description", content: "Realistic 3D cube, scrambles, solver, timer and stats. Works offline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

// The app is browser-only (WebGL, local storage). Rendering it after hydration keeps the server page
// and the static-host shell identical to the first browser render, so startup has no mismatch.
function Home() {
  return useHydrated() ? <CubeLabApp /> : null;
}
