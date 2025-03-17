import { justPressed, keysDown } from "../input";
import { State } from "./index";

export function create() {
  return {
    items: [
      { name: "+jump", price: 5 },
      { name: "+health", price: 5 },
      { name: "+speed", price: 5 },
    ],
    cursor: {
      index: 0,
      animated: 0,
    },
  };
}

export function update(state: State, dt: number) {
  if (justPressed.has("a")) state.shop.cursor.index -= 1;
  if (justPressed.has("d")) state.shop.cursor.index += 1;

  state.shop.cursor.index += state.shop.items.length;
  state.shop.cursor.index %= state.shop.items.length;
}

export function draw(state: State, ctx: CanvasRenderingContext2D) {
  const rect = ctx.canvas.getBoundingClientRect();
  const minSide = Math.min(rect.width, rect.height);
  const letterBoxed = {
    x: (rect.width - minSide) / 2,
    y: (rect.height - minSide) / 2,
    width: minSide,
    height: minSide,
  };

  ctx.save();

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "black";
  ctx.lineWidth = minSide * 0.01;
  ctx.fillRect(
    letterBoxed.x,
    letterBoxed.y,
    letterBoxed.width,
    letterBoxed.height,
  );
  ctx.globalAlpha = 1;

  // say SHOP at top
  ctx.fillStyle = "white";
  ctx.font = `${minSide * 0.1}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    "SHOP",
    letterBoxed.x + letterBoxed.width / 2,
    letterBoxed.y + minSide * 0.05,
  );

  const shop = state.shop;
  const itemSpacing = 0.01 * minSide;
  const itemAmount = shop.items.length;
  const itemWidth = (minSide - (itemAmount - 1) * itemSpacing) / itemAmount;
  const itemHeight = itemWidth;

  for (let i = 0; i < itemAmount; i++) {
    const item = shop.items[i]!;
    const x = letterBoxed.x + i * (itemWidth + itemSpacing);
    const y = letterBoxed.y + letterBoxed.height * 0.5 - itemHeight * 0.5;

    ctx.fillStyle = "#626";
    ctx.fillRect(x, y, itemWidth, itemHeight);

    {
      ctx.fillStyle = "white";
      const fontSize = itemWidth * 0.2;
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        item.name,
        x + itemWidth / 2,
        y + itemHeight / 2 - itemWidth * 0.1,
      );
    }

    {
      ctx.fillStyle = "green";
      const fontSize = itemWidth * 0.15;
      ctx.font = `${fontSize}px Arial`;
      ctx.fillText(
        `$${item.price}`,
        x + itemWidth / 2,
        y + itemHeight / 2 + itemWidth * 0.1,
      );
    }

    if (i === shop.cursor.index) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = itemWidth * 0.025;
      ctx.strokeRect(x, y, itemWidth, itemHeight);
    }
  }

  ctx.restore();
}

export default { create, update, draw };
