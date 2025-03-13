import { playSound } from "../audio";
import { levelDimension, state, tileSize } from "./index";

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
  for (let i = 0; i < state.coins.positions.length; i++) {
    const coin = state.coins.positions[i]!;
    const coinInWorldPos = {
      x: coin.x * tileSize - state.camera.width / 2,
      y: -coin.y * tileSize + state.camera.height / 2,
    };

    // consider the coin to be the whole tile the coin is in
    const touchingCoinX =
      state.player.x < coinInWorldPos.x + tileSize &&
      state.player.x + state.player.width > coinInWorldPos.x;
    const touchingCoinY =
      state.player.y > coinInWorldPos.y - tileSize &&
      state.player.y - state.player.height < coinInWorldPos.y;
    const playerTouchingCoin = touchingCoinX && touchingCoinY;
    if (playerTouchingCoin) {
      state.score += 1;
      state.camera.shakeFactor += 0.4;
      playSound("coin");
      {
        // spawn coin particles
        const particlesToSpawn = 50;
        for (let i = 0; i < particlesToSpawn; i++) {
          const particle = state.coins.particles[state.coins.particleNum]!;
          particle.tileX =
            coin.x * tileSize + tileSize / 2 - state.camera.width / 2;
          particle.tileY =
            -coin.y * tileSize - tileSize / 2 + state.camera.height / 2;
          particle.lifetime = particle.lifespan;
          particle.angle = Math.random() * Math.PI * 2;
          particle.speed = Math.random() * 0.05;
          particle.color = `hsl(${Math.random() * 360}, 100%, 80%)`;
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

    const topLeftOfMap = {
      x: -state.camera.width / 2,
      y: state.camera.height / 2,
    };
    ctx.beginPath();
    const coinRadius = 1.5;
    ctx.save();
    ctx.translate(
      topLeftOfMap.x + coin.x * state.player.width + state.player.width / 2,
      -topLeftOfMap.y + coin.y * state.player.height + state.player.height / 2,
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

function randomizeCoinPos(coinPos: { x: number; y: number }) {
  while (true) {
    coinPos.x = Math.floor(Math.random() * levelDimension);
    coinPos.y = Math.floor(Math.random() * levelDimension);
    const tileAtXY = state.level[coinPos.y * levelDimension + coinPos.x];
    if (tileAtXY === "empty") break;
  }
}

export function randomizeCoins() {
  for (const coin of state.coins.positions) {
    randomizeCoinPos(coin);
  }
}
