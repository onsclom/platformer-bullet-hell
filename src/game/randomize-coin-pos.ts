import { State } from ".";
import { levelDimension } from "./tiles";

export function randomizeCoinPos(
  state: State,
  coinPos: { x: number; y: number },
) {
  while (true) {
    coinPos.x = Math.floor(Math.random() * levelDimension);
    coinPos.y = Math.floor(Math.random() * levelDimension);
    const tileAtXY = state.level[coinPos.y * levelDimension + coinPos.x];
    if (tileAtXY === "empty") break;
  }
}
