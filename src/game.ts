import level from "./level.txt?raw";
import { keysDown, justReleased, justPressed, clearInputs } from "./input";

const levelDimension = 20;
const initCamera = {
  width: 100,
  height: 100,
  x: 0,
  y: 0,
};
const topLeftTileOnMap = { x: -initCamera.width / 2, y: initCamera.height / 2 };

const MAX_TRIANGLE_ENEMIES = 1000;

const initJumpBufferTime = 150;
const state = {
  camera: initCamera,
  gravity: 250,
  score: 0,

  physicTimeToProcess: 0,

  player: {
    x: 0,
    y: 0,
    width: initCamera.width / levelDimension,
    height: initCamera.height / levelDimension,

    jumpStrength: 120,

    dy: 0,
    speed: 50,

    hitboxRadius: 0.5,

    alive: true,

    coyoteTime: 50,
    timeSinceGrounded: 0,

    jumpBufferTime: initJumpBufferTime,
    timeSinceJumpBuffered: initJumpBufferTime,

    cornerCorrection: 1.5,
  },

  triangle: {
    enemies: Array.from({
      length: MAX_TRIANGLE_ENEMIES,
    }).map(() => ({
      active: false,
      shooting: false,
      x: 0,
      y: 0,
      countdown: 0,
      angle: 0,
      radius: 2,
    })),
    num: 0,
    spawnRateMs: 500,
    speed: 1.5,
    spawnTimer: 0,
  },

  level:
    // Array.from({ length: levelDimension ** 2 }, (_, i) => {
    //   const x = i % levelDimension;
    //   const y = Math.floor(i / levelDimension);
    //   if (
    //     x === 0 ||
    //     y === 0 ||
    //     x === levelDimension - 1 ||
    //     y === levelDimension - 1
    //   ) {
    //     return "solid";
    //   }
    //   return Math.random() > 0.1 ? "empty" : "solid";
    // }),
    level
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
  if (state.player.alive) {
    state.score += dt;
  }
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
    moveAndSlidePlayer(dt);
    clearInputs();
  }

  // HANDLE TRIANGLE ENEMY STUFF
  //////////////////

  // spawn triangles
  state.triangle.spawnTimer += dt;
  if (state.triangle.spawnTimer > state.triangle.spawnRateMs) {
    state.triangle.spawnTimer -= state.triangle.spawnRateMs;
    state.triangle.num = (state.triangle.num + 1) % MAX_TRIANGLE_ENEMIES;

    state.triangle.enemies[state.triangle.num]!.active = true;
    state.triangle.enemies[state.triangle.num]!.x =
      Math.random() * state.camera.width - state.camera.width / 2;
    state.triangle.enemies[state.triangle.num]!.y =
      Math.random() * state.camera.height - state.camera.height / 2;
    state.triangle.enemies[state.triangle.num]!.countdown = 2000;
  }

  // update all alive triangles
  state.triangle.enemies.forEach((enemy) => {
    if (enemy.active) {
      enemy.countdown -= dt;
      if (enemy.shooting === false && enemy.countdown <= 0) {
        // LOCK ONTO PLAYER SHOOT AT THEM
        enemy.shooting = true;
        enemy.angle = Math.atan2(
          state.player.y - state.player.height / 2 - enemy.y,
          state.player.x + state.player.width / 2 - enemy.x,
        );
      }

      if (enemy.shooting) {
        // move towards angle
        const speed = 0.05 * state.triangle.speed;
        enemy.x += Math.cos(enemy.angle) * speed * dt;
        enemy.y += Math.sin(enemy.angle) * speed * dt;
      }

      const distToPlayer = Math.hypot(
        state.player.x + state.player.width / 2 - enemy.x,
        state.player.y - state.player.width / 2 - enemy.y,
      );

      if (enemy.shooting) {
        const touchingPlayer =
          distToPlayer < state.player.hitboxRadius + enemy.radius;
        if (touchingPlayer) {
          state.player.alive = false;
        }
      }
    }
  });
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

  // PLAYER
  //////////////////
  fillRect(
    ctx,
    state.player.x,
    state.player.y,
    state.player.x + state.player.width,
    state.player.y - state.player.height,
  );
  // draw player hitbox
  ctx.beginPath();
  ctx.fillStyle = "#808"; //rgb
  ctx.arc(
    state.player.x + state.player.width / 2,
    -state.player.y + state.player.height / 2,
    state.player.hitboxRadius,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  // ENEMIES
  //////////////////
  state.triangle.enemies.forEach((enemy) => {
    if (enemy.active) {
      const rotationAngle = performance.now() / 100;

      ctx.save();
      ctx.translate(enemy.x, -enemy.y);

      if (enemy.countdown > 0) {
        ctx.globalAlpha = 0.5;
        // 2000
        const timeRemainingToSpawn = Math.max(enemy.countdown, 0);
        const scale = 1 - timeRemainingToSpawn / 2000;
        ctx.scale(scale, scale);
      }

      // 2 * PI
      ctx.fillStyle = "red";
      ctx.rotate(rotationAngle);
      const point1 = 0;
      const point2 = (2 * Math.PI) / 3;
      const point3 = (4 * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(point1) * enemy.radius,
        Math.sin(point1) * enemy.radius,
      );
      ctx.lineTo(
        Math.cos(point2) * enemy.radius,
        Math.sin(point2) * enemy.radius,
      );
      ctx.lineTo(
        Math.cos(point3) * enemy.radius,
        Math.sin(point3) * enemy.radius,
      );
      ctx.lineTo(
        Math.cos(point1) * enemy.radius,
        Math.sin(point1) * enemy.radius,
      );

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });

  if (state.player.alive === false) {
    ctx.fillStyle = "red";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  }

  // SCORE
  ctx.fillStyle = "white";
  ctx.font = "5px Arial";

  ctx.fillText(`${Math.floor(state.score / 1000)}`, 0, -40);
}

function moveAndSlidePlayer(dt: number) {
  /*
    TODO:
    https://x.com/MaddyThorson/status/1238338574220546049
    - ground corner correction
  */
  state.player.timeSinceGrounded += dt;
  state.player.timeSinceJumpBuffered += dt;

  // handle X-axis
  let dx = 0;
  if (keysDown.has("a")) dx -= 1;
  if (keysDown.has("d")) dx += 1;
  {
    state.player.x += dx * (dt / 1000) * state.player.speed;
    for (let i = 0; i < levelDimension ** 2; i++) {
      const tx = i % levelDimension;
      const ty = Math.floor(i / levelDimension);
      const tile = state.level[ty * levelDimension + tx];
      if (tile === "solid") {
        // collision
        const tileTopLeft = {
          x: topLeftTileOnMap.x + tx * state.player.width,
          y: topLeftTileOnMap.y - ty * state.player.height,
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
    for (let i = 0; i < levelDimension ** 2; i++) {
      const tx = i % levelDimension;
      const ty = Math.floor(i / levelDimension);
      const tile = state.level[ty * levelDimension + tx];
      if (tile === "solid") {
        // collision
        const tileTopLeft = {
          x: topLeftTileOnMap.x + tx * state.player.width,
          y: topLeftTileOnMap.y - ty * state.player.height,
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
          const xOverlapAmount = Math.min(
            playerBottomRight.x - tileTopLeft.x,
            tileBottomRight.x - playerTopLeft.x,
          );
          // if x overlap is small, lets just resolve that

          let corrected = false;
          if (state.player.dy > 0) {
            if (xOverlapAmount < state.player.cornerCorrection) {
              if (playerTopLeft.x < tileTopLeft.x) {
                const tileToLeft = state.level[ty * levelDimension + tx - 1];
                if (tileToLeft !== "solid") {
                  state.player.x = tileTopLeft.x - state.player.width;
                  corrected = true;
                }
              } else {
                const tileToRight = state.level[ty * levelDimension + tx + 1];
                if (tileToRight !== "solid") {
                  state.player.x = tileBottomRight.x;
                  corrected = true;
                }
              }
            }
          }

          //

          if (!corrected) {
            // resolve against y
            if (state.player.dy <= 0) {
              state.player.y = tileTopLeft.y + state.player.height;
              state.player.dy = 0;
              state.player.timeSinceGrounded = 0;
            } else {
              state.player.y = tileBottomRight.y;
              state.player.dy = 0;
            }
          }
        }
      }
    }
  }

  console.log(state.player.timeSinceJumpBuffered);

  // allow jumping when grounded
  if (
    justPressed.has(" ") ||
    state.player.timeSinceJumpBuffered < state.player.jumpBufferTime
  ) {
    if (state.player.timeSinceGrounded < state.player.coyoteTime) {
      state.player.dy = state.player.jumpStrength;
      state.player.timeSinceJumpBuffered = initJumpBufferTime;
    } else {
      if (justPressed.has(" ")) {
        state.player.timeSinceJumpBuffered = 0;
      }
    }
  }
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
