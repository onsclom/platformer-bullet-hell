import level from "./level.txt?raw";

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
const initCamera = {
  width: 100,
  height: 100,
  x: 0,
  y: 0,
};

const physicHz = 500;

const state = {
  camera: initCamera,
  gravity: 100,

  physicTimeToProcess: 0,

  player: {
    x: 0,
    y: 0,
    width: initCamera.width / levelDimension,
    height: initCamera.height / levelDimension,

    jumpStrength: 50,
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

const keysDown = new Set<string>();

//Make controls using wasd
document.addEventListener("keydown", (event) => {
  keysDown.add(event.key);
});

document.addEventListener("keyup", (event) => {
  keysDown.delete(event.key);
});

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

  // UPDATE
  //////////////////
  state.physicTimeToProcess += dt;
  const physicTick = 1000 / physicHz;
  // PHYSICS LOOP
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

    if (keysDown.has(" ")) {
      state.player.dy = state.player.jumpStrength;
    }

    // keep prev player position
    const prevX = state.player.x;
    const prevY = state.player.y;
    // attempt movement in X axis
    let dx = 0;
    if (keysDown.has("a")) dx -= 1;
    if (keysDown.has("d")) dx += 1;
    const goalX = state.player.x + dx * (dt / 1000) * state.player.speed;
    // if movements collides, resolve against that collision
    {
      const playerGoalPos = {
        x: goalX,
        y: state.player.y,
      };
      const topLeftTileOnMap = { x: -50, y: 50 };
      const playerTopLeftTile = {
        x: Math.floor(
          (playerGoalPos.x - topLeftTileOnMap.x) / state.player.width,
        ),
        y: Math.floor(
          (topLeftTileOnMap.y - playerGoalPos.y) / state.player.height,
        ),
      };
      const playerTopLeftTileIndex =
        playerTopLeftTile.y * levelDimension + playerTopLeftTile.x;
      const tileIndexesThePlayerIsPossiblyTouching = [
        playerTopLeftTileIndex,
        playerTopLeftTileIndex + 1,
        playerTopLeftTileIndex + levelDimension,
        playerTopLeftTileIndex + levelDimension + 1,
      ];
      let collided = false;
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
            x: playerGoalPos.x + state.player.width,
            y: playerGoalPos.y - state.player.height,
          };
          const playerTopLeft = {
            x: playerGoalPos.x,
            y: playerGoalPos.y,
          };
          if (
            playerBottomRight.x > tileTopLeft.x &&
            playerBottomRight.y < tileTopLeft.y &&
            playerTopLeft.x < tileBottomRight.x &&
            playerTopLeft.y > tileBottomRight.y
          ) {
            collided = true;
            // collision
            const xOverlap = Math.min(
              playerBottomRight.x - tileTopLeft.x,
              tileBottomRight.x - playerTopLeft.x,
            );
            const yOverlap = Math.min(
              tileTopLeft.y - playerBottomRight.y,
              playerTopLeft.y - tileBottomRight.y,
            );
            if (xOverlap < yOverlap) {
              // resolve against x
              if (dx > 0) {
                state.player.x = tileTopLeft.x - state.player.width;
              } else {
                state.player.x = tileBottomRight.x;
              }
            } else {
              // resolve against y
              state.player.y = tileTopLeft.y;
              state.player.dy = 0;
            }
          }
        }
      }
      if (!collided) {
        state.player.x = goalX;
      }
    }

    // attempt movement in Y axis
    // if movements collides, resolve against that collision AND set dy to 0

    // state.player.dy -= (state.gravity * dt) / 1000;
    // state.player.y += (state.player.dy * dt) / 1000;

    //   state.player.dy -= (state.gravity * dt) / 1000;
    //   {
    //     const topLeftTileOnMap = { x: -50, y: 50 };

    //     const playerPrevX = state.player.x;

    //     // apply to position
    //     state.player.y += (state.player.dy * dt) / 1000;

    //     // get the tiles we are possibly touching
    //     const playerTopLeft = {
    //       x: state.player.x,
    //       y: state.player.y,
    //     };

    //     const playerTopLeftTile = {
    //       x: Math.floor(
    //         (playerTopLeft.x - topLeftTileOnMap.x) / state.player.width,
    //       ),
    //       y: Math.floor(
    //         (topLeftTileOnMap.y - playerTopLeft.y) / state.player.height,
    //       ),
    //     };
    //     const playerTopLeftTileIndex =
    //       playerTopLeftTile.y * levelDimension + playerTopLeftTile.x;

    //     const tileIndexesThePlayerIsPossiblyTouching = [
    //       playerTopLeftTileIndex,
    //       playerTopLeftTileIndex + 1,
    //       playerTopLeftTileIndex + levelDimension,
    //       playerTopLeftTileIndex + levelDimension + 1,
    //     ];

    //     for (const tileIndex of tileIndexesThePlayerIsPossiblyTouching) {
    //       const tile = state.level[tileIndex];
    //       if (tile === "solid") {
    //         // collision
    //         const tileX = tileIndex % levelDimension;
    //         const tileY = Math.floor(tileIndex / levelDimension);

    //         console.log("TOUCHING");
    //       } else {
    //         console.log("NOT TOUCHING");
    //       }
    //     }
    //   }
  }

  // DRAW
  //////////////////

  ctx.translate(letterBoxed.x + minSide / 2, letterBoxed.y + minSide / 2);
  ctx.scale(minSide / state.camera.width, minSide / state.camera.height);
  ctx.translate(-state.camera.x, -state.camera.y);

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
      assert(r1);
      assert(r2);
      assert(r3);
      assert(r4);

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
  ctx.fillStyle = "red";
  fillRect(
    ctx,
    state.player.x,
    state.player.y,
    state.player.x + state.player.width,
    state.player.y - state.player.height,
  );
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

function assert<T>(value: T): asserts value {
  if (!value) {
    throw new Error("assertion failed");
  }
}
