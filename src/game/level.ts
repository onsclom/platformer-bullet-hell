import { levelDimension, state } from "./index";

export function create() {
  return randomLevel();
}

export function randomLevel() {
  return Array.from({ length: levelDimension ** 2 }, (_, i) => {
    const x = i % levelDimension;
    const y = Math.floor(i / levelDimension);
    if (
      x === 0 ||
      y === 0 ||
      x === levelDimension - 1 ||
      y === levelDimension - 1
    ) {
      return "solid";
    }
    return Math.random() > 0.1 ? "empty" : "solid";
  });
}

export function update(dt: number) {}

export function draw(ctx: CanvasRenderingContext2D) {}

export default { create, update, draw };
