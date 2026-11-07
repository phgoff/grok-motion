import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { MascotDesign } from "@/mascot/design";
import { cn } from "@/lib/utils";
import { createGrokPlayer, type GrokPlayer } from "@/motion/model/player";
import type { BodyShape } from "@/mascot/shapes";
import type { MotionSnapshot, Recipes } from "@/motion/model/types";
import "../motion.css";

export interface MascotRuntimeHandle {
  transitionTo(id: string): void;
  poke(): void;
  blink(): void;
  getSnapshot(): MotionSnapshot | null;
  seek(time: number): void;
  play(): void;
  pause(): void;
}
export interface MascotRuntimeProps {
  design: MascotDesign;
  recipes: Recipes;
  shape?: BodyShape;
  seed?: number;
  initialState?: string;
  follow?: boolean;
  paused?: boolean;
  soloClipId?: string;
  currentTime?: number;
  debug?: boolean;
  label?: string;
  className?: string;
  onSnapshot?: (snapshot: MotionSnapshot) => void;
  onFrame?: (time: number, duration: number) => void;
}

export const MascotRuntime = memo(
  forwardRef<MascotRuntimeHandle, MascotRuntimeProps>(function MascotRuntime(
    {
      design,
      recipes,
      shape = "sphere",
      seed = 1,
      initialState = "idle",
      follow = true,
      paused = false,
      soloClipId,
      currentTime,
      debug = false,
      label,
      className,
      onSnapshot,
      onFrame,
    },
    ref,
  ) {
    const host = useRef<HTMLDivElement>(null);
    const player = useRef<GrokPlayer | null>(null);
    const shapeRef = useRef(shape);
    shapeRef.current = shape;
    const callback = useRef(onSnapshot);
    callback.current = onSnapshot;
    const frameCallback = useRef(onFrame);
    frameCallback.current = onFrame;
    const [snapshot, setSnapshot] = useState<MotionSnapshot | null>(null);
    const debugRef = useRef(debug);
    debugRef.current = debug;
    const initial = useRef({ follow, paused, label });
    initial.current = { follow, paused, label };

    useImperativeHandle(
      ref,
      () => ({
        transitionTo: (id) => player.current?.setState(id),
        poke: () => player.current?.poke(),
        blink: () => player.current?.blink(),
        getSnapshot: () => player.current?.snapshot() ?? null,
        seek: (time) => player.current?.seek(time),
        play: () => player.current?.play(),
        pause: () => player.current?.pause(),
      }),
      [],
    );
    useEffect(() => {
      if (!host.current) return;
      const instance = createGrokPlayer(host.current, {
        recipes,
        fill: design.fill,
        shape: shapeRef.current,
        seed,
        initialState,
        soloClipId,
        ...initial.current,
        onSnapshot(next) {
          callback.current?.(next);
          if (debugRef.current) setSnapshot(next);
        },
        onFrame(time, duration) {
          frameCallback.current?.(time, duration);
        },
      });
      player.current = instance;
      if (currentTime !== undefined) {
        instance.seek(currentTime);
      }
      return () => {
        instance.destroy();
        player.current = null;
      };
    }, [seed, initialState, soloClipId]);

    useEffect(() => {
      player.current?.setShape(shape);
    }, [shape]);

    useEffect(() => {
      player.current?.setFill(design.fill);
    }, [design.fill]);

    useEffect(() => {
      if (soloClipId && player.current) {
        const found = recipes.clips.find((c) => c.name === soloClipId);
        if (found) {
          player.current.updateClip(found);
        }
      }
    }, [recipes, soloClipId]);
    useEffect(() => {
      player.current?.setPaused(paused);
    }, [paused]);
    useEffect(() => {
      player.current?.setFollow(follow);
    }, [follow]);
    useEffect(() => {
      if (currentTime !== undefined) {
        player.current?.seek(currentTime);
      }
    }, [currentTime]);

    return (
      <div className={cn("motion-runtime", className)}>
        <div
          ref={host}
          className="motion-runtime-host w-full h-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{ transformOrigin: "center center" }}
        />
        {debug && snapshot ? (
          <div className="motion-debug" aria-hidden="true">
            <span>
              state <b>{snapshot.state}</b>
            </span>
            <span>
              clip <b>{snapshot.clip}</b>
            </span>
            <span>
              face <b>{snapshot.face}</b>
            </span>
            <span>
              time <b>{snapshot.time.toFixed(2)}s</b>
            </span>
          </div>
        ) : null}
      </div>
    );
  }),
);
