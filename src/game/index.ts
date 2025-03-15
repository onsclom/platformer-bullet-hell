import { justPressed, clearInputs } from "../input";
import { playSound } from "../audio";
import Player from "./player";
import Coin, { randomizeCoins } from "./coin";
import Triangle from "./triangle";
import Level, { randomLevel } from "./level";
import Camera from "./camera";
import WobbleEffect from "./wobble-effect";
import wobbleEffect from "./wobble-effect";

export const levelDimension = 20;

export const tileSize = 5;
export const topLeftTileOnMap = {
  x: (-levelDimension / 2) * tileSize,
  y: (levelDimension / 2) * tileSize,
};

const levelLoadAnimation = {
  type: "loading" as const,
  time: 0,
  loadAnimationLength: 1500,
};

const playing = {
  type: "playing" as const,
};

const waveTimeLength = 60;
const initGameState = {
  ctx: null as CanvasRenderingContext2D | null,
  physicTimeToProcess: 0,

  // TODO: move current into run?
  current: levelLoadAnimation as typeof levelLoadAnimation | typeof playing,

  run: {
    state: "playing" as "playing" | "waveRecap" | "shopping" | "gameOver",

    lives: 3,
    wave: 1, // of 10
    cash: 0,

    playing: {
      waveTimeRemaining: waveTimeLength,
    },
  },

  camera: Camera.create(),

  player: Player.create(),
  triangle: Triangle.create(),
  coins: Coin.create(),
  level: Level.create(),
  wobbleEffect: WobbleEffect.create(),
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
    state.level = randomLevel();
    randomizeCoins();
  }

  WobbleEffect.update(dt);
  Camera.update(dt);

  // remove this if possible?
  // switch (state.current.type) {
  //   case "loading": {
  //     if (state.current.time === 0) {
  //       playSound("levelLoad");
  //     }
  //     state.current.time += dt;

  //     if (state.current.time > state.current.loadAnimationLength) {
  //       state.current = playing;
  //     }
  //     break;
  //   }
  //   case "playing": {
  //     playingPhysicTick(dt);
  //     break;
  //   }
  // }
  playingPhysicTick(dt);

  clearInputs();
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

  // LETTERBOX SPACE
  //////////////////
  ctx.save();
  ctx.translate(letterBoxed.x, letterBoxed.y);

  ctx.globalAlpha = 1;
  {
    // camera space
    ctx.save();
    ctx.translate(minSide / 2, minSide / 2);
    ctx.scale(minSide / state.camera.width, minSide / state.camera.height);
    ctx.translate(-state.camera.x, state.camera.y);

    // CAMERA SHAKE
    //////////////////
    const strength = 0.5;
    const xShake =
      Math.cos(performance.now() * 0.05) * state.camera.shakeFactor * strength;
    const yShake =
      Math.sin(performance.now() * 0.0503) *
      state.camera.shakeFactor *
      strength;
    ctx.translate(xShake, yShake);

    // rotate from center
    ctx.translate(state.camera.x, -state.camera.y);
    ctx.rotate(state.camera.angle);
    ctx.translate(-state.camera.x, state.camera.y);

    ctx.save();
    ctx.fillStyle = "gray";
    ctx.fillRect(-50, -50, 100, 100);
    ctx.restore();

    state.level.forEach((cell, i) => {
      const x = i % levelDimension;
      const y = Math.floor(i / levelDimension);
      const tileLoadInTime = 500;

      if (state.current.type === "loading") {
        const loadStart =
          (state.current.loadAnimationLength - tileLoadInTime) *
          (((x + y) / levelDimension) * 0.5);

        const progress = Math.max(
          0,
          Math.min(1, (state.current.time - loadStart) / tileLoadInTime),
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
    ctx.fillStyle = "#99f";

    Player.draw(ctx);
    Coin.draw(ctx);
    Triangle.draw(ctx);
    ctx.restore();
  }

  // UI SPACE
  //////////////////

  ctx.restore();
  // canvas bounding rect with normal canvas behavior
  const uiRect = ctx.canvas.getBoundingClientRect();

  const fontSize = minSide * 0.05;

  // ui background rect
  ctx.fillStyle = "black";
  // ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 0, uiRect.width, fontSize);
  ctx.globalAlpha = 1;

  // MONEY
  ctx.fillStyle = "green";
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(`$${state.run.cash}`, uiRect.width, 0);

  // LIVES
  ctx.fillStyle = "red";
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`♥${state.run.lives} `, 0, 0);

  // RUN TIME % REMAINING
  ctx.fillStyle = "white";
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const percentRemaining = Math.floor(
    100 - (state.run.playing.waveTimeRemaining / waveTimeLength) * 100,
  );
  ctx.fillText(`${percentRemaining}%`, uiRect.width / 2, 0);
}

function playingPhysicTick(dt: number) {
  if (state.current.type === "loading") {
    state.current.time += dt;
    if (state.current.time > state.current.loadAnimationLength) {
      state.current = playing;
    }
  }

  if (state.player.alive && state.current.type === "playing") {
    state.run.playing.waveTimeRemaining -= dt / 1000;
  }

  Player.update(dt);
  Coin.update(dt);
  // TODO: move player/coin collision here
  Triangle.update(dt);
  // TODO: move player/tri collision here

  // CAMERA
  //////////////////
  if (state.player.alive === false) {
    state.player.timeDead += dt;
    // animate camera to player and zoom in
    state.camera.x = animate(state.camera.x, state.player.x, dt * 0.01);
    state.camera.y = animate(state.camera.y, state.player.y, dt * 0.01);
    state.camera.width = animate(state.camera.width, 50, dt * 0.01);
    state.camera.height = animate(state.camera.height, 50, dt * 0.01);

    const wobbleBuildUpTime = 1000;
    const wobbleFactor =
      (Math.min(wobbleBuildUpTime, state.player.timeDead) /
        wobbleBuildUpTime) **
      2;
    state.camera.angle =
      Math.sin(performance.now() * 0.005) * wobbleFactor * 0.1;
  }
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

function assert<T>(value: T): asserts value {
  if (!value) {
    throw new Error("assertion failed");
  }
}

export function animate(from: number, to: number, ratio: number) {
  return from * (1 - ratio) + ratio * to;
}
