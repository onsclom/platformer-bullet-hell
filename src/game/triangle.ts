import { playSound } from "../audio";
import { gamePosToCanvasPos } from "./camera";
import { levelDimension, state, tileSize } from "./index";

const MAX_TRIANGLE_ENEMIES = 100;

export function create() {
  return {
    enemies: Array.from({
      length: MAX_TRIANGLE_ENEMIES,
    }).map(() => ({
      active: false,
      shooting: false,
      spawnX: 0,
      spawnY: 0,
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
    spawnRateMs: 750,
    speed: 1.5,
    spawnTimer: 0,
  };
}

const enemySpawnTime = 5000;

export function update(dt: number) {
  if (state.current.type === "loading") return;
  if (!state.player.alive) return;
  // HANDLE TRIANGLE ENEMY STUFF
  //////////////////

  // spawn triangles
  state.triangle.spawnTimer += dt;
  if (state.triangle.spawnTimer > state.triangle.spawnRateMs) {
    state.triangle.spawnTimer -= state.triangle.spawnRateMs;
    state.triangle.num = (state.triangle.num + 1) % MAX_TRIANGLE_ENEMIES;

    const newEnemy = state.triangle.enemies[state.triangle.num]!;
    newEnemy.active = true;

    newEnemy.x =
      (-(levelDimension - 2) * 0.5 + Math.random() * (levelDimension - 2)) *
      tileSize;
    newEnemy.spawnX = newEnemy.x;
    newEnemy.y =
      (-(levelDimension - 2) * 0.5 + Math.random() * (levelDimension - 2)) *
      tileSize;
    newEnemy.spawnY = newEnemy.y;

    newEnemy.countdown = enemySpawnTime;
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
      if (enemy.shooting === false) {
        enemy.angle = Math.atan2(
          state.player.y - enemy.y,
          state.player.x - enemy.x,
        );
        if (enemy.countdown <= 0) {
          enemy.shooting = true;
          playSound("shoot");
        }
      }

      if (enemy.shooting) {
        // move towards angle
        const speed = 0.03 * state.triangle.speed;
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
      if (playerTouchingEnemy && state.player.invincibleTime <= 0) {
        playSound("death");
        state.run.lives -= 1;
        // add screenshake
        state.camera.shakeFactor = 1;
        if (state.run.lives === 0) {
          state.player.alive = false;
        } else {
          state.player.invincibleTime = 1000;
        }
      }
    }
  });
}

export function draw(ctx: CanvasRenderingContext2D) {
  const rotationAngle = performance.now() / 75;
  state.triangle.enemies.forEach((enemy) => {
    if (enemy.active) {
      // laser aim
      // TODO: decay this somehow on shoot?
      if (!enemy.shooting) {
        ctx.strokeStyle = "red";
        ctx.globalAlpha = (1 - enemy.countdown / enemySpawnTime) ** 4;
        ctx.lineWidth = 0.1;
        // ctx.beginPath();
        // {
        //   const { x, y } = gamePosToCanvasPos(enemy.spawnX, enemy.spawnY);
        //   ctx.moveTo(x, y);
        // }
        // {
        //   const { x, y } = gamePosToCanvasPos(state.player.x, state.player.y);
        //   ctx.lineTo(x, y);
        // }
        // ctx.stroke();
      }

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
      ctx.rotate(rotationAngle);

      const timeRemainingToSpawn = Math.max(enemy.countdown, 0);
      const scale = Math.min(
        (1 - timeRemainingToSpawn / enemySpawnTime) ** 2,
        1,
      );

      ctx.scale(scale, scale);
      const point1 = 0;
      const point2 = (2 * Math.PI) / 3;
      const point3 = (4 * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(
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
      if (enemy.countdown > 0) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 0.2;
        ctx.globalAlpha = 1;
        ctx.stroke();
      } else {
        ctx.fill();
      }
      ctx.restore();
    }
  });
  ctx.globalAlpha = 1;
}

export default { create, update, draw };
