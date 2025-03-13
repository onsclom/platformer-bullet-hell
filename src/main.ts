import { update, draw, state } from "./game";

export const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.position = "fixed";
canvas.style.top = "0";
canvas.style.left = "0";
document.body.appendChild(canvas);
state.ctx = canvas.getContext("2d")!;

const LOG_FRAME_TIMES = false;

let previousTime = performance.now();
function raf() {
  if (LOG_FRAME_TIMES) console.time("frame");
  {
    requestAnimationFrame(raf);

    const now = performance.now();
    const dt = now - previousTime;
    previousTime = now;

    const canvasRect = canvas.getBoundingClientRect();
    canvas.width = canvasRect.width * devicePixelRatio;
    canvas.height = canvasRect.height * devicePixelRatio;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    update(dt);
    draw(ctx);
  }
  if (LOG_FRAME_TIMES) console.timeEnd("frame");
}

// f to fullscreen
document.addEventListener("keydown", (e) => {
  if (e.key === "f") {
    canvas.requestFullscreen();
  }
});

raf();
