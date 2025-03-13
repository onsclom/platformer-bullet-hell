import { playSound } from "../audio";
import { levelDimension, state, tileSize } from "./index";

export function create() {
  return {
    x: 0,
    y: 0,
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
  const coinInWorldPos = {
    x: state.coin.x * tileSize - state.camera.width / 2,
    y: -state.coin.y * tileSize + state.camera.height / 2,
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
        const particle = state.coin.particles[state.coin.particleNum]!;
        particle.tileX =
          state.coin.x * tileSize + tileSize / 2 - state.camera.width / 2;
        particle.tileY =
          -state.coin.y * tileSize - tileSize / 2 + state.camera.height / 2;
        particle.lifetime = particle.lifespan;
        particle.angle = Math.random() * Math.PI * 2;
        particle.speed = Math.random() * 0.05;
        particle.color = `hsl(${Math.random() * 360}, 100%, 80%)`;
        state.coin.particleNum = (state.coin.particleNum + 1) % 1000;
      }
    }
    randomizeCoinPosition();
  }
}

export function draw(ctx: CanvasRenderingContext2D) {}

export default { create, update, draw };

export function randomizeCoinPosition() {
  while (true) {
    state.coin.x = Math.floor(Math.random() * levelDimension);
    state.coin.y = Math.floor(Math.random() * levelDimension);
    const tileAtXY = state.level[state.coin.y * levelDimension + state.coin.x];
    if (tileAtXY === "empty") break;
  }
}
