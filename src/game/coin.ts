import { playSound } from "../audio";
import { state } from "./index";
import { randomizeCoinPos } from "./randomize-coin-pos";
import { tileSize, topLeftTileOnMap } from "./tiles";

const coinAmount = 2;

export function create() {
  return {
    positions: Array.from({ length: coinAmount }, () => ({
      x: 0,
      y: 0,
    })),
    particles: Array.from({ length: 1000 }, () => ({
      lifetime: 0,
      lifespan: 400,
      tileX: 0,
      tileY: 0,
      angle: 0,
      speed: 0,
      color: "",
    })),
    particleNum: 0,
  };
}

export function update(dt: number) {
  if (state.loadAnimationRemaining > 0) return;
  for (let i = 0; i < state.coins.positions.length; i++) {
    const coin = state.coins.positions[i]!;
    const coinInWorldPos = {
      x: coin.x * tileSize + topLeftTileOnMap.x,
      y: -coin.y * tileSize + topLeftTileOnMap.y,
    };

    // consider the coin to be the whole tile the coin is in
    const touchingCoinX =
      state.player.x - state.player.width / 2 < coinInWorldPos.x + tileSize &&
      state.player.x + state.player.width / 2 > coinInWorldPos.x;
    const touchingCoinY =
      state.player.y + state.player.height / 2 > coinInWorldPos.y - tileSize &&
      state.player.y - state.player.height / 2 < coinInWorldPos.y;
    const playerTouchingCoin = touchingCoinX && touchingCoinY;
    if (playerTouchingCoin) {
      state.run.cash += 1;
      state.camera.shakeFactor += 0.4;
      playSound("coin");
      {
        // spawn coin particles
        const particlesToSpawn = 50;
        for (let i = 0; i < particlesToSpawn; i++) {
          const particle = state.coins.particles[state.coins.particleNum]!;
          particle.tileX =
            coin.x * tileSize + tileSize / 2 + topLeftTileOnMap.x;
          particle.tileY =
            -coin.y * tileSize - tileSize / 2 + topLeftTileOnMap.y;
          particle.lifetime = particle.lifespan;
          particle.angle = Math.random() * Math.PI * 2;
          particle.speed = Math.random() * 0.05;
          particle.color = `hsl(${Math.random() * 360}, 100%, 65%)`;
          state.coins.particleNum = (state.coins.particleNum + 1) % 1000;
        }
      }
      randomizeCoinPos(coin);
    }
  }

  {
    // update particles
    state.coins.particles.forEach((particle) => {
      if (particle.lifetime > 0) {
        particle.lifetime -= dt;
        const dx = Math.cos(particle.angle) * particle.speed * dt;
        const dy = Math.sin(particle.angle) * particle.speed * dt;
        particle.tileX += dx;
        particle.tileY += dy;
      }
    });
  }
}

export function draw(ctx: CanvasRenderingContext2D) {
  for (const coin of state.coins.positions) {
    ctx.fillStyle = "yellow";

    ctx.beginPath();
    const coinRadius = 1.5;
    ctx.save();
    ctx.translate(
      topLeftTileOnMap.x + coin.x * tileSize + tileSize / 2,
      -topLeftTileOnMap.y + coin.y * tileSize + tileSize / 2,
    );

    ctx.scale(Math.sin(performance.now() * 0.01), 1);
    ctx.arc(0, 0, coinRadius, 0, 2 * Math.PI);
    ctx.restore();
    ctx.fill();

    // draw coin particles
    state.coins.particles.forEach((particle) => {
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
  }
}

export default { create, update, draw };

export function randomizeCoins() {
  for (const coin of state.coins.positions) {
    randomizeCoinPos(coin);
  }
}
