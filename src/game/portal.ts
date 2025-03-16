import { state } from "./index";
import { levelDimension, tileSize, topLeftTileOnMap } from "./tiles";

const MAX_PARTICLES = 100000;
const particleLifetime = 1000;
const particleSpawnInterval = 3;

export function create() {
  return {
    foundPos: false,
    tileX: 0,
    tileY: 0,

    particle: {
      instances: Array.from({ length: MAX_PARTICLES }, () => ({
        angle: 0,
        lifeTime: 0,
        color: "green",
      })),
      num: 0,

      particleTime: 0,
    },
  };
}

export function update(dt: number) {
  if (state.portal.foundPos === false) {
    while (true) {
      state.portal.tileX = Math.floor(Math.random() * levelDimension);
      state.portal.tileY = Math.floor(Math.random() * levelDimension);
      if (
        state.level[
          state.portal.tileY * levelDimension + state.portal.tileX
        ] === "empty"
      ) {
        break;
      }
    }
    state.portal.foundPos = true;
  }

  // spawn particles
  state.portal.particle.particleTime += dt;
  if (state.portal.particle.particleTime > particleSpawnInterval) {
    state.portal.particle.particleTime -= particleSpawnInterval;
    const particle =
      state.portal.particle.instances[state.portal.particle.num]!;
    particle.angle = Math.random() * Math.PI * 2;
    particle.lifeTime = particleLifetime;
    particle.color = `hsl(${Math.random() * 50 + 150}, 100%, 50%)`;
    state.portal.particle.num = (state.portal.particle.num + 1) % MAX_PARTICLES;
  }

  state.portal.particle.instances.forEach((particle) => {
    if (particle.lifeTime > 0) {
      particle.lifeTime -= dt;
      const rotationSpeed = 0.002;
      particle.angle += dt * rotationSpeed;
    }
  });
}

export function draw(ctx: CanvasRenderingContext2D) {
  const portalActive = state.run.playing.waveTimeRemaining <= 0;

  if (!portalActive) return;

  ctx.save();
  const tileX = state.portal.tileX;
  const tileY = state.portal.tileY;
  const worldPos = {
    x: topLeftTileOnMap.x + tileX * 5,
    y: topLeftTileOnMap.y - tileY * 5,
  };

  ctx.translate(worldPos.x + tileSize * 0.5, -(worldPos.y + tileSize * 0.5));
  const scaleAmt = Math.sin(performance.now() * 0.004) * 0.1 + 1;
  ctx.scale(scaleAmt, scaleAmt);
  const rotAmt = Math.sin(performance.now() * 0.002) * 0.2;
  ctx.rotate(rotAmt);

  ctx.fillStyle = "blue";
  ctx.beginPath();
  ctx.arc(0, 0, tileSize * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // draw particles
  state.portal.particle.instances.forEach((particle) => {
    if (particle.lifeTime > 0) {
      const size = (particle.lifeTime / particleLifetime) * (tileSize * 0.05);
      const radius = (particle.lifeTime / particleLifetime) * (tileSize * 0.5);
      const xOff = Math.cos(particle.angle) * radius;
      const yOff = Math.sin(particle.angle) * radius;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(xOff, yOff, size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

export default { create, update, draw };
