import level from "./level.txt?raw";
import { keysDown, justReleased } from "./input";

const levelDimension = 20;
const initCamera = {
  width: 100,
  height: 100,
  x: 0,
  y: 0,
};
const topLeftTileOnMap = { x: -initCamera.width / 2, y: initCamera.height / 2 };

const state = {
  camera: initCamera,
  gravity: 250,

  physicTimeToProcess: 0,

  player: {
    x: 0,
    y: 0,
    width: initCamera.width / levelDimension,
    height: initCamera.height / levelDimension,

    jumpStrength: 120,

    dy: 0,
    speed: 50,
  },

  level: level
    .split("\n")
    .flatMap((row) =>
      row.split("").map((cell) => (cell === " " ? "empty" : "solid")),
    ),

  // tile fun visual random effect
  randomEffect: {
    changesPerSecond: 3,
    timeSinceLastChange: 0,
    corners: Array.from({
      length: (levelDimension + 1) ** 2,
    }).map(() => ({
      x: Math.random() - 0.5,
      y: Math.random() - 0.5,
    })),
  },
};

export function update(dt: number) {
  state.physicTimeToProcess += dt;
  const physicHz = 500;
  const physicTick = 1000 / physicHz;

  // PROCESS INPUTS
  //////////////////
  {
    if (justReleased.has(" ")) {
      if (state.player.dy > 0) {
        state.player.dy /= 2;
      }
    }
    justReleased.clear();
  }

  // PHYSICS
  //////////////////
  while (state.physicTimeToProcess > physicTick) {
    state.physicTimeToProcess -= physicTick;
    const dt = physicTick;
    state.randomEffect.timeSinceLastChange += dt;
    const timePerChange = 1000 / state.randomEffect.changesPerSecond;
    if (state.randomEffect.timeSinceLastChange > timePerChange) {
      state.randomEffect.timeSinceLastChange -= timePerChange;
      state.randomEffect.corners.forEach((corner) => {
        corner.x = Math.random() - 0.5;
        corner.y = Math.random() - 0.5;
      });
    }

    function moveAndSlidePlayer() {
      // handle X-axis
      let dx = 0;
      if (keysDown.has("a")) dx -= 1;
      if (keysDown.has("d")) dx += 1;
      {
        state.player.x += dx * (dt / 1000) * state.player.speed;
        const tileIndexesThePlayerIsPossiblyTouching =
          tilesIndexesAroundPlayer();
        for (const tileIndex of tileIndexesThePlayerIsPossiblyTouching) {
          const tile = state.level[tileIndex];
          if (tile === "solid") {
            // collision
            const tileX = tileIndex % levelDimension;
            const tileY = Math.floor(tileIndex / levelDimension);
            const tileTopLeft = {
              x: topLeftTileOnMap.x + tileX * state.player.width,
              y: topLeftTileOnMap.y - tileY * state.player.height,
            };
            const tileBottomRight = {
              x: tileTopLeft.x + state.player.width,
              y: tileTopLeft.y - state.player.height,
            };
            const playerBottomRight = {
              x: state.player.x + state.player.width,
              y: state.player.y - state.player.height,
            };
            const playerTopLeft = {
              x: state.player.x,
              y: state.player.y,
            };
            if (
              playerBottomRight.x > tileTopLeft.x &&
              playerBottomRight.y < tileTopLeft.y &&
              playerTopLeft.x < tileBottomRight.x &&
              playerTopLeft.y > tileBottomRight.y
            ) {
              // resolve against x
              if (dx > 0) {
                state.player.x = tileTopLeft.x - state.player.width;
              } else {
                state.player.x = tileBottomRight.x;
              }
            }
          }
        }
      }

      state.player.dy -= state.gravity * (dt / 1000);
      state.player.y += state.player.dy * (dt / 1000);
      {
        const tileIndexesThePlayerIsPossiblyTouching =
          tilesIndexesAroundPlayer();
        for (const tileIndex of tileIndexesThePlayerIsPossiblyTouching) {
          const tile = state.level[tileIndex];
          if (tile === "solid") {
            // collision
            const tileX = tileIndex % levelDimension;
            const tileY = Math.floor(tileIndex / levelDimension);
            const tileTopLeft = {
              x: topLeftTileOnMap.x + tileX * state.player.width,
              y: topLeftTileOnMap.y - tileY * state.player.height,
            };
            const tileBottomRight = {
              x: tileTopLeft.x + state.player.width,
              y: tileTopLeft.y - state.player.height,
            };
            const playerBottomRight = {
              x: state.player.x + state.player.width,
              y: state.player.y - state.player.height,
            };
            const playerTopLeft = {
              x: state.player.x,
              y: state.player.y,
            };
            if (
              playerBottomRight.x > tileTopLeft.x &&
              playerBottomRight.y < tileTopLeft.y &&
              playerTopLeft.x < tileBottomRight.x &&
              playerTopLeft.y > tileBottomRight.y
            ) {
              // resolve against y
              if (state.player.dy <= 0) {
                state.player.y = tileTopLeft.y + state.player.height;
                state.player.dy = 0;

                if (keysDown.has(" ")) {
                  state.player.dy = state.player.jumpStrength;
                }
              } else {
                state.player.y = tileBottomRight.y;
                state.player.dy = 0;
              }
            }
          }
        }
      }
    }
    moveAndSlidePlayer();
  }
}

export function draw(ctx: CanvasRenderingContext2D) {
  const canvasRect = ctx.canvas.getBoundingClientRect();

  const aspectRatio = 1;
  const minSide = Math.min(canvasRect.width, canvasRect.height);
  const letterBoxed = {
    x: (canvasRect.width - minSide * aspectRatio) / 2,
    y: (canvasRect.height - minSide) / 2,
    width: minSide,
    height: minSide,
  };

  const gradient = ctx.createLinearGradient(0, 0, 0, canvasRect.height);
  gradient.addColorStop(0, "red");
  gradient.addColorStop(0.5, "orange");
  gradient.addColorStop(1, "yellow");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);

  ctx.translate(letterBoxed.x + minSide / 2, letterBoxed.y + minSide / 2);
  ctx.scale(minSide / state.camera.width, minSide / state.camera.height);
  ctx.translate(-state.camera.x, -state.camera.y);

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "black";
  fillRect(ctx, -50, 50, 50, -50);

  ctx.restore();

  state.level.forEach((cell, i) => {
    const x = i % levelDimension;
    const y = Math.floor(i / levelDimension);
    if (cell === "solid") {
      drawTile(ctx, x, y);
    }
  });
  ctx.fillStyle = "#99f";
  fillRect(
    ctx,
    state.player.x,
    state.player.y,
    state.player.x + state.player.width,
    state.player.y - state.player.height,
  );
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.fillRect(x1, -y1, x2 - x1, -y2 + y1);
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

function strokeQuad(
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
  ctx.stroke();
}

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const r1 = state.randomEffect.corners[y * (levelDimension + 1) + x];
  const r2 = state.randomEffect.corners[y * (levelDimension + 1) + x + 1];
  const r3 = state.randomEffect.corners[(y + 1) * (levelDimension + 1) + x + 1];
  const r4 = state.randomEffect.corners[(y + 1) * (levelDimension + 1) + x];
  assert(r1);
  assert(r2);
  assert(r3);
  assert(r4);

  const topLeft = topLeftTileOnMap;
  const tileSize = state.camera.width / levelDimension;
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
  ctx.strokeStyle = "darkgreen";
  strokeQuad(
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
}

function assert<T>(value: T): asserts value {
  if (!value) {
    throw new Error("assertion failed");
  }
}

function tilesIndexesAroundPlayer() {
  const playerTopLeftTile = {
    x: Math.floor((state.player.x - topLeftTileOnMap.x) / state.player.width),
    y: Math.floor((topLeftTileOnMap.y - state.player.y) / state.player.height),
  };
  const playerTopLeftTileIndex =
    playerTopLeftTile.y * levelDimension + playerTopLeftTile.x;
  return [
    playerTopLeftTileIndex,
    playerTopLeftTileIndex + 1,
    playerTopLeftTileIndex + levelDimension,
    playerTopLeftTileIndex + levelDimension + 1,
  ];
}
