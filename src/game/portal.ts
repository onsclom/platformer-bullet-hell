import { State } from "./index";
import { levelDimension, tileSize, topLeftTileOnMap } from "./tiles";

const MAX_PARTICLES = 10000;
const particleLifetime = 1000;
const particleSpawnInterval = 1;
const portalRadius = 1.5; // factor of tile size

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

export function update(state: State, dt: number) {
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
  while (state.portal.particle.particleTime > particleSpawnInterval) {
    state.portal.particle.particleTime -= particleSpawnInterval;
    const particle =
      state.portal.particle.instances[state.portal.particle.num]!;
    particle.angle = Math.random() * Math.PI * 2;
    particle.lifeTime = particleLifetime;
    particle.color = `hsl(${Math.random() * 50 + 60}, 100%, 50%)`;
    state.portal.particle.num = (state.portal.particle.num + 1) % MAX_PARTICLES;
  }

  for (let i = 0; i < MAX_PARTICLES; i++) {
    const particle =
      state.portal.particle.instances[
        (state.portal.particle.num + (MAX_PARTICLES - i)) % MAX_PARTICLES
      ]!;
    if (particle.lifeTime > 0) {
      particle.lifeTime -= dt;
      const rotationSpeed = 0.003;
      particle.angle += dt * rotationSpeed;
    }
  }
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  // const portalActive = state.run.playing.waveTimeRemaining <= 0;
  // if (!portalActive) return;

  ctx.save();
  const tileX = state.portal.tileX;
  const tileY = state.portal.tileY;
  const worldPos = {
    x: topLeftTileOnMap.x + tileX * 5,
    y: topLeftTileOnMap.y - tileY * 5,
  };

  ctx.translate(worldPos.x + tileSize * 0.5, -(worldPos.y - tileSize * 0.5));
  const scaleAmt = Math.sin(performance.now() * 0.002) * 0.1 + portalRadius;
  ctx.scale(scaleAmt, scaleAmt);

  // green
  ctx.fillStyle = "hsl(120, 100%, 25%)";
  ctx.beginPath();
  ctx.arc(0, 0, tileSize * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // draw particles
  state.portal.particle.instances.forEach((particle) => {
    const fadeInTime = 50;
    const timeAlive = particleLifetime - particle.lifeTime;
    ctx.globalAlpha = Math.min(1, timeAlive / fadeInTime);

    if (particle.lifeTime > 0) {
      const size = (particle.lifeTime / particleLifetime) * (tileSize * 0.03);
      const distFromCenter =
        (particle.lifeTime / particleLifetime) * (tileSize * 0.5);
      const xOff = Math.cos(particle.angle) * distFromCenter;
      const yOff = Math.sin(particle.angle) * distFromCenter;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(xOff, yOff, size, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.fillStyle = "black";
  ctx.lineWidth = 0.25;
  ctx.beginPath();
  ctx.arc(0, 0, tileSize * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export default { create, update, draw };
