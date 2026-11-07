import { useState } from "react";
import { readBodyShape, writeBodyShape, type BodyShape } from "./geometry";

export function useBodyShape() {
  const [shape, setShapeState] = useState<BodyShape>(readBodyShape);
  const setShape = (next: BodyShape) => {
    setShapeState(next);
    writeBodyShape(next);
  };
  return [shape, setShape] as const;
}
