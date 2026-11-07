import type { BotEngine } from "./botEngine";
import type { BotTransport } from "./botBridge";

export function createBotTransport(engine: BotEngine): BotTransport {
  const update = engine.handle.update.bind(engine.handle);
  return {
    loadClip(clip, time) {
      update({ clip });
      engine.handle.seek(time);
    },
    setMorph(name) {
      update({ morph: name });
    },
    holdFace(face) {
      if (face === null) engine.handle.releaseExpression();
      else engine.handle.setExpression(face);
    },
    seek(time) {
      engine.handle.seek(time);
    },
    setPlaying(playing) {
      engine.handle.setPlaying(playing);
    },
    blink() {
      engine.handle.blink();
    },
    poke(name) {
      engine.handle.poke(name);
    },
  };
}
