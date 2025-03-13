import { justPressed, clearInputs } from "../input";
import { playSound } from "../audio";
import Player from "./player";
import Coin, { randomizeCoinPosition } from "./coin";

export const levelDimension = 20;
export const initCamera = {
  width: 100,
  height: 100,
  x: 0,
  y: 0,
  shakeFactor: 1, // 0 to 1
};
export const topLeftTileOnMap = {
  x: -initCamera.width / 2,
  y: initCamera.height / 2,
};
export const tileSize = initCamera.width / levelDimension;

const MAX_TRIANGLE_ENEMIES = 100;

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

  current: levelLoadAnimation as typeof levelLoadAnimation | typeof playing,

  camera: initCamera,
  gravity: 250,
  score: 0,

  physicTimeToProcess: 0,

  player: Player.create(),

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
      trail: {
        points: Array.from({ length: 75 }, () => ({
          x: 0,
          y: 0,
        })),
        num: 0,
      },
    })),
    num: 0,
    spawnRateMs: 500,
    speed: 1.5,
    spawnTimer: 0,
  },

  coin: Coin.create(),
  level: randomLevel(),

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

function randomLevel() {
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

export const state = structuredClone(initGameState);
randomizeCoinPosition();

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
    randomizeCoinPosition();
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
    // update particles
    state.coin.particles.forEach((particle) => {
      if (particle.lifetime > 0) {
        particle.lifetime -= dt;
        const dx = Math.cos(particle.angle) * particle.speed * dt;
        const dy = Math.sin(particle.angle) * particle.speed * dt;
        particle.tileX += dx;
        particle.tileY += dy;
      }
    });
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

  // COIN
  //////////////////
  ctx.fillStyle = "yellow";

  const topLeftOfMap = {
    x: -state.camera.width / 2,
    y: state.camera.height / 2,
  };
  ctx.beginPath();
  const coinRadius = 1.5;
  ctx.save();
  ctx.translate(
    topLeftOfMap.x + state.coin.x * state.player.width + state.player.width / 2,
    -topLeftOfMap.y +
      state.coin.y * state.player.height +
      state.player.height / 2,
  );

  ctx.scale(Math.sin(performance.now() * 0.01), 1);
  ctx.arc(0, 0, coinRadius, 0, 2 * Math.PI);
  ctx.restore();
  ctx.fill();

  // draw coin particles
  state.coin.particles.forEach((particle) => {
    if (particle.lifetime > 0) {
      ctx.save();
      const size = particle.lifetime / particle.lifespan;
      ctx.beginPath();

      ctx.translate(particle.tileX, -particle.tileY);
      ctx.scale(size, size);
      ctx.arc(0, 0, 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = particle.color;
      ctx.fill();
      ctx.restore();
    }
  });

  // ENEMIES
  //////////////////
  const rotationAngle = performance.now() / 100;
  state.triangle.enemies.forEach((enemy) => {
    if (enemy.active) {
      if (enemy.shooting) {
        ctx.fillStyle = "#800";
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < enemy.trail.points.length; i++) {
          const point =
            enemy.trail.points[
              (i + enemy.trail.num) % enemy.trail.points.length
            ]!;
          ctx.save();
          ctx.translate(point.x, -point.y);
          ctx.scale(
            i / enemy.trail.points.length,
            i / enemy.trail.points.length,
          );
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
        ctx.globalAlpha = 1;
      }

      // draw head
      ctx.save();
      ctx.translate(enemy.x, -enemy.y);
      ctx.fillStyle = "red";
      if (enemy.countdown > 0) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        const timeRemainingToSpawn = Math.max(enemy.countdown, 0);
        const scale = (1 - timeRemainingToSpawn / 2000) ** 2;
        ctx.scale(scale, scale);
      }
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

  clearInputs();

  // HANDLE TRIANGLE ENEMY STUFF
  //////////////////

  // spawn triangles
  state.triangle.spawnTimer += dt;
  if (state.triangle.spawnTimer > state.triangle.spawnRateMs) {
    state.triangle.spawnTimer -= state.triangle.spawnRateMs;
    state.triangle.num = (state.triangle.num + 1) % MAX_TRIANGLE_ENEMIES;

    const newEnemy = state.triangle.enemies[state.triangle.num]!;
    newEnemy.active = true;
    newEnemy.x = Math.random() * state.camera.width - state.camera.width / 2;
    newEnemy.y = Math.random() * state.camera.height - state.camera.height / 2;
    newEnemy.countdown = 2000;
    newEnemy.shooting = false;

    // trail
    newEnemy.trail.points.forEach((point) => {
      point.x = newEnemy.x;
      point.y = newEnemy.y;
    });
  }

  // update all alive triangles
  state.triangle.enemies.forEach((enemy) => {
    if (enemy.active) {
      enemy.countdown -= dt;
      if (enemy.shooting === false && enemy.countdown <= 0) {
        enemy.shooting = true;
        enemy.angle = Math.atan2(
          state.player.y - enemy.y,
          state.player.x - enemy.x,
        );
        playSound("shoot");
      }

      if (enemy.shooting) {
        // move towards angle
        const speed = 0.05 * state.triangle.speed;
        enemy.x += Math.cos(enemy.angle) * speed * dt;
        enemy.y += Math.sin(enemy.angle) * speed * dt;

        // trail
        enemy.trail.num = (enemy.trail.num + 1) % enemy.trail.points.length;
        enemy.trail.points[enemy.trail.num] = {
          x: enemy.x,
          y: enemy.y,
        };
      }
    }
  });

  // check if triangle touching player
  state.triangle.enemies.forEach((enemy) => {
    if (enemy.shooting) {
      const distToPlayer = Math.hypot(
        state.player.x - enemy.x,
        state.player.y - enemy.y,
      );
      const playerTouchingEnemy =
        distToPlayer <
        state.player.hitboxRadius +
          // be lenient to player
          enemy.radius * 0.5;
      if (playerTouchingEnemy) {
        state.player.alive = false;
        playSound("death");
      }
    }
  });
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
