import { justPressed, clearInputs } from "../input";
import Player from "./player";
import Coin, { randomizeCoins } from "./coin";
import Triangle from "./triangle";
import Tiles, { randomLevel } from "./tiles";
import Camera from "./camera";
import WobbleEffect from "./wobble-effect";
import Portal from "./portal";
import UI from "./ui";

export const loadAnimationLength = 1500;
export const waveTimeLength = 60;

const initGameState = {
  ctx: null as CanvasRenderingContext2D | null,

  loadAnimationRemaining: loadAnimationLength,
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
  level: Tiles.create(),
  wobbleEffect: WobbleEffect.create(),
  portal: Portal.create(),
};

export const state = structuredClone(initGameState);
randomizeCoins();

export function update(dt: number) {
  if (justPressed.has("r")) {
    Object.assign(state, structuredClone(initGameState));
    state.level = randomLevel();
    randomizeCoins();
  }
  if (state.loadAnimationRemaining > 0) {
    state.loadAnimationRemaining -= dt;
  }
  if (state.player.alive && state.loadAnimationRemaining <= 0) {
    state.run.playing.waveTimeRemaining -= dt / 1000;
  }

  WobbleEffect.update(dt);
  Camera.update(dt);
  Player.update(dt);
  Coin.update(dt);
  Portal.update(dt);
  Triangle.update(dt);
  Camera.update(dt);

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
  ctx.fillStyle = "black";
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

    Tiles.draw(ctx);
    Player.draw(ctx);
    Portal.draw(ctx);
    Coin.draw(ctx);
    Triangle.draw(ctx);
    ctx.restore();
  }

  // UI SPACE
  //////////////////

  ctx.restore();
  UI.draw(ctx);
}
