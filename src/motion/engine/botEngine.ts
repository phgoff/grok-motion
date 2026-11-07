import { inkFor } from "@/mascot/palettes";
import {
  createBotController,
  normalizeBotShape,
  type BotAppearance,
  type BotHandle,
} from "./bot-engine-bundle";

export type { BotAppearance };

export function appearanceForFill(inkPaint: string, spotPaint: string): BotAppearance {
  return { ink: [0, 0, 0], spot: [0, 0, 0], cutout: false, inkPaint, spotPaint };
}

export interface BotEngine {
  host: HTMLElement;
  handle: BotHandle;
  setShape(shapeId: string): void;
  setFill(fill: string): void;
  setSize(size: number): void;
  setFollowing(following: boolean): void;
  destroy(): void;
}

let instanceCounter = 0;

export function createBotEngine(
  container: HTMLElement,
  {
    shapeId,
    fill,
    seed,
    size = 140,
    isPlaying,
    isFollowingPointer = false,
    maxFrameRate = 60,
    label,
  }: {
    shapeId: string;
    fill: string;
    seed?: number;
    size?: number;
    isPlaying: boolean;
    isFollowingPointer?: boolean;
    maxFrameRate?: number;
    label?: string;
  },
): BotEngine {
  const doc = container.ownerDocument;
  const host = doc.createElement("span");
  host.className = "bot-mark";
  // The 2D path labels its SVG; give the 3D host the same accessible name.
  if (label) {
    host.setAttribute("role", "img");
    host.setAttribute("aria-label", label);
  } else {
    host.setAttribute("aria-hidden", "true");
  }
  const canvas = doc.createElement("span");
  canvas.className = "bot-mark-canvas";
  host.appendChild(canvas);

  // Body spans ~71.5% of the viewBox; 94% of the host puts it at ~68% of the
  // stage box. (The bundle-site default fill multiplier read as oversized and
  // clipped in the editor and gallery.)
  const canvasScale = "94%";
  const applySize = (px: number) => {
    host.style.width = `${px}px`;
    host.style.height = `${px}px`;
    canvas.style.width = canvasScale;
    canvas.style.height = canvasScale;
  };
  applySize(size);
  container.appendChild(host);

  const handle = createBotController({
    id: `bot-engine-${++instanceCounter}`,
    body: normalizeBotShape(shapeId),
    appearance: appearanceForFill(fill, inkFor(fill)),
    size,
    isPlaying,
    isFollowingPointer,
    maxFrameRate,
    ...(seed === undefined ? {} : { seed }),
  });
  const detach = handle.attach({ host, canvas });

  return {
    host,
    handle,
    setShape(nextShape) {
      handle.update({ body: normalizeBotShape(nextShape) });
    },
    setFill(nextFill) {
      handle.update({ appearance: appearanceForFill(nextFill, inkFor(nextFill)) });
    },
    setSize(px) {
      if (!Number.isFinite(px) || px <= 0) return;
      applySize(px);
      handle.update({ size: px });
    },
    setFollowing(following) {
      handle.update({ isFollowingPointer: following });
    },
    destroy() {
      detach();
      host.remove();
    },
  };
}
