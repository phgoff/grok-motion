import { createGrokSession, type SessionOptions } from "./session";
import { createBotBridge, type BotBridge } from "@/motion/engine/botBridge";
import { createBotEngine, type BotEngine } from "@/motion/engine/botEngine";
import { createBotTransport } from "@/motion/engine/botTransport";
import type { BodyShape } from "@/mascot/shapes";
import type { MotionSnapshot } from "./types";

export interface GrokPlayerOptions extends SessionOptions {
  shape: BodyShape;
  paused?: boolean;
  follow?: boolean;
  label?: string;
  onSnapshot?: (snapshot: MotionSnapshot) => void;
  onFrame?: (time: number, duration: number) => void;
}

export function createGrokPlayer(container: HTMLElement, options: GrokPlayerOptions) {
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  if (!win) throw new Error("The motion player needs a browser window");
  const media = win.matchMedia("(prefers-reduced-motion: reduce)");
  let follow = options.follow ?? false;
  let paused = options.paused ?? false;
  const session = createGrokSession({ ...options, reducedMotion: media.matches });
  const isSmallScreen = win.matchMedia("(max-width: 900px)").matches;
  const bot: BotEngine = createBotEngine(container, {
    shapeId: options.shape,
    fill: options.fill,
    seed: options.seed,
    size: Math.max(1, Math.round(container.clientWidth || 140)),
    isPlaying: !media.matches && !paused,
    isFollowingPointer: follow,
    maxFrameRate: isSmallScreen ? 30 : 60,
    label: options.label,
  });
  const bridge: BotBridge = createBotBridge(createBotTransport(bot));

  let visible = true;
  let destroyed = false;
  let handle = 0;
  let last = 0;
  let reportedAt = 0;
  let reportedState = "";
  const render = (force = false) => {
    const snapshot = session.snapshot();
    bridge.sync(snapshot, options.recipes);
    container.dataset.state = snapshot.state;
    container.dataset.clip = snapshot.clip ?? "";
    container.dataset.face = snapshot.face;
    if (force || snapshot.state !== reportedState || win.performance.now() - reportedAt > 100) {
      reportedAt = win.performance.now();
      reportedState = snapshot.state;
      options.onSnapshot?.(snapshot);
    }
  };
  const stop = () => {
    if (handle) win.cancelAnimationFrame(handle);
    handle = 0;
    last = 0;
  };
  const canPlay = () => !destroyed && !paused && visible && !doc.hidden && !media.matches;
  const frame = (now: number) => {
    handle = 0;
    if (!canPlay()) {
      last = 0;
      return;
    }
    if (last) session.advance(Math.max(0, (now - last) / 1000));
    last = now;
    render();
    const snap = session.snapshot();
    options.onFrame?.(snap.time, snap.duration);
    handle = win.requestAnimationFrame(frame);
  };
  const wake = () => {
    if (!handle && canPlay()) handle = win.requestAnimationFrame(frame);
  };
  const visibility = () => {
    if (doc.hidden) stop();
    else wake();
  };
  const reduced = () => {
    stop();
    session.setReducedMotion(media.matches);
    bot.handle.setPlaying(!media.matches && !paused);
    if (media.matches) bot.handle.seek(0);
    render(true);
    wake();
  };
  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          visible = entries.at(-1)?.isIntersecting ?? true;
          if (visible) wake();
          else stop();
        });
  observer?.observe(container);
  const resize =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((entries) => {
          const width = entries[0]?.contentRect.width;
          if (width !== undefined) {
            session.setCompact(width < 48);
            bot.setSize(Math.round(width));
          }
        });
  resize?.observe(container);
  doc.addEventListener("visibilitychange", visibility);
  media.addEventListener("change", reduced);
  render(true);
  wake();
  return {
    snapshot: session.snapshot,
    setShape(shape: BodyShape) {
      bot.setShape(shape);
    },
    setFill(newFill: string) {
      session.setFill(newFill);
      bot.setFill(newFill);
      render(true);
    },
    setState(id: string) {
      session.setState(id);
      render(true);
      wake();
    },
    setPaused(value: boolean) {
      paused = value;
      bot.handle.setPlaying(!value && !media.matches);
      if (value) stop();
      else wake();
    },
    seek(time: number) {
      session.seek(time);
      bridge.seek(time);
      render(true);
    },
    updateClip(clip: import("./types").Clip) {
      session.updateClip(clip);
      bridge.loadEditedClip(clip, session.snapshot());
      render(true);
    },
    play() {
      paused = false;
      session.play();
      bot.handle.setPlaying(!media.matches);
      wake();
    },
    pause() {
      paused = true;
      session.pause();
      bot.handle.setPlaying(false);
      stop();
    },
    setFollow(value: boolean) {
      follow = value;
      bot.setFollowing(value);
      render(true);
      wake();
    },
    poke() {
      if (!paused) bridge.poke();
      render(true);
      wake();
    },
    blink() {
      if (!paused) bridge.blink();
      render(true);
      wake();
    },
    destroy() {
      destroyed = true;
      stop();
      observer?.disconnect();
      resize?.disconnect();
      doc.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", reduced);
      bot.destroy();
    },
  };
}
export type GrokPlayer = ReturnType<typeof createGrokPlayer>;
