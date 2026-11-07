import type { Clip, MotionSnapshot, Recipes } from "@/motion/model/types";

export interface BotTransport {
  loadClip(clip: Clip, time: number): void;
  setMorph(name: string | null): void;
  holdFace(face: string | null): void;
  seek(time: number): void;
  setPlaying(playing: boolean): void;
  blink(): void;
  poke(name: string): void;
}

export interface BotBridge {
  sync(snapshot: MotionSnapshot, recipes: Recipes): void;
  loadEditedClip(clip: Clip, snapshot: MotionSnapshot): void;
  seek(time: number): void;
  setPlaying(playing: boolean): void;
  blink(): void;
  poke(name?: string): void;
}

export function createBotBridge(transport: BotTransport): BotBridge {
  // Signature of what the 3D runtime is currently playing. Reloading on every
  // state change (even for a repeated clip name) mirrors the 2D bridge, which
  // re-enters the picked clip with a fresh phase on each state switch.
  let loadedSignature = "";
  let lastMorph: string | null | undefined;
  let lastFace: string | null | undefined;

  const findClip = (recipes: Recipes, name: string | null): Clip | undefined =>
    name == null ? undefined : recipes.clips.find((clip) => clip.name === name);

  const loadSignature = (snapshot: MotionSnapshot, clipName: string) =>
    `${snapshot.state}|${clipName}`;

  return {
    sync(snapshot, recipes) {
      const clip = findClip(recipes, snapshot.clip);
      const signature = loadSignature(snapshot, snapshot.clip ?? "");
      if (clip && signature !== loadedSignature) {
        transport.loadClip(clip, snapshot.time);
        loadedSignature = signature;
      }
      const morph = snapshot.morph?.kind ?? null;
      if (morph !== lastMorph) {
        transport.setMorph(morph);
        lastMorph = morph;
      }
      const face = recipes.states[snapshot.state]?.face ?? null;
      if (face !== lastFace) {
        transport.holdFace(face);
        lastFace = face;
      }
    },
    loadEditedClip(clip, snapshot) {
      transport.loadClip(clip, snapshot.time);
      loadedSignature = loadSignature(snapshot, clip.name);
    },
    seek(time) {
      transport.seek(time);
    },
    setPlaying(playing) {
      transport.setPlaying(playing);
    },
    blink() {
      transport.blink();
    },
    poke(name = "bounce") {
      transport.poke(name);
    },
  };
}
