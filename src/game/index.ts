import { justPressed, clearInputs } from "../input";
import { playSound } from "../audio";
import Player from "./player";
import Coin, { randomizeCoins } from "./coin";
import Triangle from "./triangle";
import Level, { randomLevel } from "./level";

export const levelDimension = 20;
export const initCamera = {
  width: 100 * 1.1,
  height: 100 * 1.1,
  x: 0,
  y: 0,
  shakeFactor: 1, // 0 to 1
};

export const tileSize = 5;
export const topLeftTileOnMap = {
  x: (-levelDimension / 2) * tileSize,
  y: (levelDimension / 2) * tileSize,
};

const levelLoadAnimation = {
  type: "loading" as const,
  time: 0,
  loadAnimationLength: 1000,
};

const playing = {
  type: "playing" as const,
};

const initGameState = {
  ctx: null as CanvasRenderingContext2D | null,
  physicTimeToProcess: 0,

  current: levelLoadAnimation as typeof levelLoadAnimation | typeof playing,

  camera: initCamera,
  gravity: 250,
  score: 0,

  player: Player.create(),
  triangle: Triangle.create(),
  coins: Coin.create(),

  level: Level.create(),

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

export const state = structuredClone(initGameState);
randomizeCoins();

export function update(dt: number) {
  state.physicTimeToProcess += dt;
  const physicHz = 500;
  const physicTickMs = 1000 / physicHz;
  while (state.physicTimeToProcess > physicTickMs) {
    state.physicTimeToProcess -= physicTickMs;
    const dt = physicTickMs;
    physicTick(dt);
    clearInputs();
  }
}

function physicTick(dt: number) {
  if (justPressed.has("r")) {
    Object.assign(state, structuredClone(initGameState));
    clearInputs();
    state.level = randomLevel();
    randomizeCoins();
  }

  {
    // random wobble effect on tiles
    state.randomEffect.timeSinceLastChange += dt;
    const timePerChange = 1000 / state.randomEffect.changesPerSecond;
    if (state.randomEffect.timeSinceLastChange > timePerChange) {
      state.randomEffect.timeSinceLastChange -= timePerChange;
      state.randomEffect.corners.forEach((corner) => {
        corner.x = Math.random() - 0.5;
        corner.y = Math.random() - 0.5;
      });
    }
  }

  {
    // screen shake
    const shakeLength = 0.1;
    state.camera.shakeFactor *= (0.9 * shakeLength) ** (dt / 1000);
  }

  if (!state.player.alive) {
    return; // freeze when dead
  }

  switch (state.current.type) {
    case "loading": {
      if (state.current.time === 0) {
        playSound("levelLoad");
      }
      state.current.time += dt;

      if (state.current.time > state.current.loadAnimationLength) {
        state.current = playing;
      }
      break;
    }
    case "playing": {
      playingPhysicTick(dt);
      break;
    }
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

  // CAMERA SHAKE
  //////////////////
  const strength = 0.5;
  const xShake =
    Math.cos(performance.now() * 0.05) * state.camera.shakeFactor * strength;
  const yShake =
    Math.sin(performance.now() * 0.0503) * state.camera.shakeFactor * strength;
  ctx.translate(xShake, yShake);

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "black";
  fillRect(ctx, -50, 50, 50, -50);

  ctx.restore();

  if (state.current.type === "loading") {
    const tileLoadInTime = 100;

    for (let i = 0; i < state.level.length; i++) {
      const cell = state.level[i];
      const x = i % levelDimension;
      const y = Math.floor(i / levelDimension);
      const loadStart =
        (state.current.loadAnimationLength - tileLoadInTime) *
        (i / levelDimension ** 2);

      const progress = Math.max(
        0,
        Math.min(1, (state.current.time - loadStart) / tileLoadInTime),
      );

      if (cell === "solid") {
        // TODO: fix to draw stroke lines on top after all tiles
        drawTile(ctx, x, y, progress);
      }
    }
    ctx.fillStyle = "#99f";

    return;
  }

  state.level.forEach((cell, i) => {
    const x = i % levelDimension;
    const y = Math.floor(i / levelDimension);
    if (cell === "solid") {
      drawTile(ctx, x, y);
    }
  });
  ctx.fillStyle = "#99f";

  Player.draw(ctx);
  Coin.draw(ctx);
  Triangle.draw(ctx);

  // SCORE
  ctx.fillStyle = "white";
  ctx.font = "5px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(`${state.score}`, 0, -40);
}

function playingPhysicTick(dt: number) {
  Player.update(dt);
  Coin.update(dt);
  Triangle.update(dt);
  clearInputs();
}

export function fillRect(
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

function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loadProgress = 1,
) {
  ctx.save();
  ctx.scale(loadProgress, loadProgress);

  const r1 = state.randomEffect.corners[y * (levelDimension + 1) + x];
  const r2 = state.randomEffect.corners[y * (levelDimension + 1) + x + 1];
  const r3 = state.randomEffect.corners[(y + 1) * (levelDimension + 1) + x + 1];
  const r4 = state.randomEffect.corners[(y + 1) * (levelDimension + 1) + x];
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

function assert<T>(value: T): asserts value {
  if (!value) {
    throw new Error("assertion failed");
  }
}
