// TODO: remove need for everything but state?
import { playSound } from "../audio";
import { justPressed, justReleased, keysDown } from "../input";
import { gamePosToCanvasPos } from "./camera";
import {
  state,
  levelDimension,
  initJumpBufferTime,
  topLeftTileOnMap,
} from "./index";

function create() {
  return {
    x: 0,
    y: 0,
    width: 5,
    height: 5,

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
  };
}

function update(dt: number) {
  moveAndSlidePlayer(dt);
}

function draw(ctx: CanvasRenderingContext2D) {
  // PLAYER
  //////////////////
  {
    const { x, y } = gamePosToCanvasPos(state.player.x, state.player.y);
    ctx.fillRect(x, y, state.player.width, state.player.height);
  }

  // hitbox circle
  // TODO: make this a heart
  ctx.beginPath();
  ctx.fillStyle = "#808";
  {
    const { x, y } = gamePosToCanvasPos(
      state.player.x + state.player.width / 2,
      state.player.y - state.player.height / 2,
    );
    ctx.arc(x, y, state.player.hitboxRadius, 0, 2 * Math.PI);
  }
  ctx.fill();
}

export default { create, update, draw };

function moveAndSlidePlayer(dt: number) {
  if (justReleased.has(" ") || justReleased.has("w")) {
    if (state.player.dy > 0) {
      state.player.dy /= 2;
    }
  }

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
              const landSoundThreshold = -5;
              if (state.player.dy < landSoundThreshold) {
                playSound("land");
              }

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

  // allow jumping when grounded
  if (
    justPressed.has(" ") ||
    justPressed.has("w") ||
    state.player.timeSinceJumpBuffered < state.player.jumpBufferTime
  ) {
    if (state.player.timeSinceGrounded < state.player.coyoteTime) {
      state.player.dy = state.player.jumpStrength;
      state.player.timeSinceJumpBuffered = initJumpBufferTime;
      playSound("jump");
    } else {
      if (justPressed.has(" ")) {
        state.player.timeSinceJumpBuffered = 0;
      }
    }
  }
}
