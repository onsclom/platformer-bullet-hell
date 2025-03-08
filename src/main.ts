const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.position = "fixed";
canvas.style.top = "0";
canvas.style.left = "0";
document.body.appendChild(canvas);

/*
TODO:
- draw battlefield
- player
- make solid land
*/

const levelDimension = 20;

const state = {
  camera: {
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  },

  level: Array.from({
    length: levelDimension ** 2,
  }).map(() => (Math.random() > 0.3 ? "solid" : "empty")),

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

let previousTime = performance.now();
function raf() {
  const now = performance.now();
  const dt = now - previousTime;
  previousTime = now;

  const canvasRect = canvas.getBoundingClientRect();
  canvas.width = canvasRect.width * devicePixelRatio;
  canvas.height = canvasRect.height * devicePixelRatio;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const aspectRatio = 1;
  const minSide = Math.min(canvasRect.width, canvasRect.height);
  const letterBoxed = {
    x: (canvasRect.width - minSide * aspectRatio) / 2,
    y: (canvasRect.height - minSide) / 2,
    width: minSide,
    height: minSide,
  };

  // update
  state.randomEffect.timeSinceLastChange += dt;
  const timePerChange = 1000 / state.randomEffect.changesPerSecond;
  if (state.randomEffect.timeSinceLastChange > timePerChange) {
    state.randomEffect.timeSinceLastChange -= timePerChange;

    state.randomEffect.corners.forEach((corner) => {
      corner.x = Math.random() - 0.5;
      corner.y = Math.random() - 0.5;
    });
  }

  // draw

  // DRAW BASED ON CAMERA
  // go to center of letterBox
  ctx.translate(letterBoxed.x + minSide / 2, letterBoxed.y + minSide / 2);
  // scale to fit camera
  ctx.scale(minSide / state.camera.width, minSide / state.camera.height);
  // translate to camera
  ctx.translate(-state.camera.x, -state.camera.y);

  // ctx.fillStyle = "black";
  // ctx.fillRect(letterBoxed.x, letterBoxed.y, minSide * aspectRatio, minSide);

  ctx.fillStyle = "green";
  fillRect(ctx, -50, 50, 50, -50);

  const tileSize = state.camera.width / levelDimension;
  state.level.forEach((cell, i) => {
    const topLeft = {
      x: -state.camera.width / 2,
      y: state.camera.height / 2,
    };
    const x = i % levelDimension;
    const y = Math.floor(i / levelDimension);
    if (cell === "solid") {
      ctx.fillStyle = "black";

      // get the correct random corners
      const r1 = state.randomEffect.corners[y * (levelDimension + 1) + x];
      const r2 = state.randomEffect.corners[y * (levelDimension + 1) + x + 1];
      const r3 =
        state.randomEffect.corners[(y + 1) * (levelDimension + 1) + x + 1];
      const r4 = state.randomEffect.corners[(y + 1) * (levelDimension + 1) + x];

      const randStrength = 0.5;

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
    }
  });

  requestAnimationFrame(raf);
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

raf();
