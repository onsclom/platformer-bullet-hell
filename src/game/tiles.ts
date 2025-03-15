import { loadAnimationLength, state } from "./index";
import { assert } from "./assert";

export const levelDimension = 20;
export const tileSize = 5;
export const topLeftTileOnMap = {
  x: (-levelDimension / 2) * tileSize,
  y: (levelDimension / 2) * tileSize,
};

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

export function draw(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "gray";
  ctx.fillRect(-50, -50, 100, 100);

  state.level.forEach((cell, i) => {
    const x = i % levelDimension;
    const y = Math.floor(i / levelDimension);
    const tileLoadInTime = 500;

    if (state.loadAnimationRemaining > 0) {
      const loadStart =
        (loadAnimationLength - tileLoadInTime) *
        (((x + y) / levelDimension) * 0.5);

      const progress = Math.max(
        0,
        Math.min(
          1,
          (loadAnimationLength - state.loadAnimationRemaining - loadStart) /
            tileLoadInTime,
        ),
      );
      if (cell === "solid") {
        drawTile(ctx, x, y, progress);
      }
    } else {
      if (cell === "solid") {
        drawTile(ctx, x, y);
      }
    }
  });
}

export default { create, update, draw };

function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loadProgress = 1,
) {
  ctx.save();
  ctx.globalAlpha = loadProgress ** 2;
  ctx.translate(
    0,
    -Math.sin(loadProgress ** 2 * Math.PI) * 5 + (1 - loadProgress ** 2) * 5,
  );

  const r1 = state.wobbleEffect.corners[y * (levelDimension + 1) + x];
  const r2 = state.wobbleEffect.corners[y * (levelDimension + 1) + x + 1];
  const r3 = state.wobbleEffect.corners[(y + 1) * (levelDimension + 1) + x + 1];
  const r4 = state.wobbleEffect.corners[(y + 1) * (levelDimension + 1) + x];
  assert(r1);
  assert(r2);
  assert(r3);
  assert(r4);

  const topLeft = topLeftTileOnMap;
  const randStrength = 0.5;
  ctx.fillStyle = "green";

  fillQuad(
    ctx,
    topLeft.x + x * tileSize + r1.x * randStrength,
    topLeft.y - y * tileSize + r1.y * randStrength,
    topLeft.x + (x + 1) * tileSize + r2.x * randStrength,
    topLeft.y - y * tileSize + r2.y * randStrength,
    topLeft.x + (x + 1) * tileSize + r3.x * randStrength,
    topLeft.y - (y + 1) * tileSize + r3.y * randStrength,
    topLeft.x + x * tileSize + r4.x * randStrength,
    topLeft.y - (y + 1) * tileSize + r4.y * randStrength,
  );
  ctx.lineWidth = 0.5;

  ctx.lineCap = "round";
  ctx.strokeStyle = "darkgreen";

  const x1 = topLeft.x + x * tileSize + r1.x * randStrength;
  const y1 = topLeft.y - y * tileSize + r1.y * randStrength;
  const x2 = topLeft.x + (x + 1) * tileSize + r2.x * randStrength;
  const y2 = topLeft.y - y * tileSize + r2.y * randStrength;
  const x3 = topLeft.x + (x + 1) * tileSize + r3.x * randStrength;
  const y3 = topLeft.y - (y + 1) * tileSize + r3.y * randStrength;
  const x4 = topLeft.x + x * tileSize + r4.x * randStrength;
  const y4 = topLeft.y - (y + 1) * tileSize + r4.y * randStrength;

  // ctx.lineCap = "round";
  // top
  {
    const nx = x;
    const ny = y - 1;
    const above = state.level[ny * levelDimension + nx];
    if (
      above === "empty" ||
      nx < 0 ||
      nx >= levelDimension ||
      ny < 0 ||
      ny >= levelDimension
    ) {
      ctx.beginPath();
      ctx.moveTo(x1, -y1);
      ctx.lineTo(x2, -y2);
      ctx.stroke();
    }
  }

  // right
  {
    const nx = x + 1;
    const ny = y;
    const right = state.level[ny * levelDimension + nx];
    if (
      right === "empty" ||
      nx < 0 ||
      nx >= levelDimension ||
      ny < 0 ||
      ny >= levelDimension
    ) {
      ctx.beginPath();
      ctx.moveTo(x2, -y2);
      ctx.lineTo(x3, -y3);
      ctx.stroke();
    }
  }

  // bottom
  {
    const nx = x;
    const ny = y + 1;
    const below = state.level[ny * levelDimension + nx];
    if (
      below === "empty" ||
      nx < 0 ||
      nx >= levelDimension ||
      ny < 0 ||
      ny >= levelDimension
    ) {
      ctx.beginPath();
      ctx.moveTo(x3, -y3);
      ctx.lineTo(x4, -y4);
      ctx.stroke();
    }
  }

  // left
  {
    const nx = x - 1;
    const ny = y;
    const left = state.level[ny * levelDimension + nx];
    if (
      left === "empty" ||
      nx < 0 ||
      nx >= levelDimension ||
      ny < 0 ||
      ny >= levelDimension
    ) {
      ctx.beginPath();
      ctx.moveTo(x4, -y4);
      ctx.lineTo(x1, -y1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function fillQuad(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, -y1);
  ctx.lineTo(x2, -y2);
  ctx.lineTo(x3, -y3);
  ctx.lineTo(x4, -y4);
  ctx.closePath();
  ctx.fill();
}
