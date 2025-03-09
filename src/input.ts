export const keysDown = new Set<string>();
export const justReleased = new Set<string>();

document.addEventListener("keydown", (event) => {
  keysDown.add(event.key);
});

document.addEventListener("keyup", (event) => {
  keysDown.delete(event.key);
  justReleased.add(event.key);
});
