import { state } from "./index";

// export function create() {
//   return {
//     x: 0,
//     y: 0,
//     width: 100,
//     height: 100,
//   };
// }

// export function update() {}

// export function draw(ctx: CanvasRenderingContext2D) {}

// export default { create, update, draw };

// we already scale and letterbox, so this just needs to do the translation
export function gamePosToCanvasPos(x: number, y: number) {
  return {
    x: x,
    y: -y,
  };
}
