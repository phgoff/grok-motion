import type { MascotDesign } from "@/mascot/design";
import license from "../../../LICENSE?raw";
import engineSource from "@/motion/reference/grok-player.js?raw";
import palettesSource from "@/mascot/palettes.ts?motion-source";
import sessionSource from "./session.ts?motion-source";
import type { Recipes } from "./types";
import { scopeRecipes } from "./scope";

function inlineModule(source: string): string {
  return source
    .replace(/^import\s[\s\S]*?from\s+["'][^"']*["'];\s*/gm, "")
    .replace(/^export\s*\{[^}]*\};?\s*/gm, "")
    .replace(/^export\s+/gm, "");
}

/** The self-contained React component source for one motion state. */
export function createMotionReactComponent(
  design: MascotDesign,
  recipes: Recipes,
  stateId: string,
): string {
  const scope = scopeRecipes(recipes, stateId);
  return `/*\n${license}\n*/
// Self-contained Grok mascot. Requires only React 18+.
import { useEffect, useRef } from "react";

${inlineModule(engineSource)}
${inlineModule(palettesSource)}
${inlineModule(sessionSource)}
const recipes = ${JSON.stringify(scope.recipes)};
const fill = ${JSON.stringify(design.fill)};

export default function GrokMascot({
  size = 280,
  seed = 1,
  state = ${JSON.stringify(scope.stateId)},
  paused = false,
}) {
  const host = useRef(null);
  useEffect(() => {
    const doc = host.current.ownerDocument;
    const session = createGrokSession({ recipes, fill, seed, initialState: state });
    const renderer = createRenderer(
      doc,
      "grok-mascot-" + Math.random().toString(36).slice(2),
      size,
      session.config,
    );
    const svg = renderer.svg;
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.overflow = "visible";
    host.current.appendChild(svg);
    let frameId = 0;
    let last = 0;
    const frame = (now) => {
      if (last) session.advance(Math.min(0.05, (now - last) / 1000));
      last = now;
      renderer.render(session.model(size));
      frameId = requestAnimationFrame(frame);
    };
    if (paused) renderer.render(session.model(size));
    else frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      svg.remove();
    };
  }, [size, seed, state, paused]);
  return <div ref={host} style={{ width: size, height: size }} />;
}
`;
}

export function downloadMotionReactComponent(
  design: MascotDesign,
  recipes: Recipes,
  stateId: string,
): void {
  const blob = new Blob([createMotionReactComponent(design, recipes, stateId)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `GrokMascot-${stateId}.jsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
