import { state } from "./index";

export function create() {
  return {
    width: 100 * 1.1,
    height: 100 * 1.1,
    x: 0,
    y: 3,
    shakeFactor: 1, // 0 to 1
    angle: 0, // fun juice
  };
}

export function update(dt: number) {
  // screen shake
  const shakeLength = 0.1;
  state.camera.shakeFactor *= (0.9 * shakeLength) ** (dt / 1000);
}

export function draw(ctx: CanvasRenderingContext2D) {}

export default { create, update, draw };

// we already scale and letterbox, so this just needs to do the translation
export function gamePosToCanvasPos(x: number, y: number) {
  return {
    x: x,
    y: -y,
  };
}
