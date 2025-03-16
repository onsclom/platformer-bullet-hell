import { State, waveTimeLength } from "./index";

export function create() {
  return {};
}

export function update(state: State, dt: number) {}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  // canvas bounding rect with normal canvas behavior
  const uiRect = ctx.canvas.getBoundingClientRect();

  const minSide = Math.min(uiRect.width, uiRect.height);
  const fontSize = minSide * 0.05;

  // ui background rect
  ctx.fillStyle = "black";
  ctx.globalAlpha = 0.75;
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

export default { create, update, draw };
