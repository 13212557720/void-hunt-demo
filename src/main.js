import { createVoidHuntGame } from "./game.js?v=20260630-chests";
import { createInputController } from "./input.js";
import { createPerformanceMonitor } from "./performance.js";
import { createSpriteSheets } from "./resources.js?v=20260630-chests";
import { createUi } from "./ui.js";

const ui = createUi();
const ctx = ui.canvas.getContext("2d");
const sprites = createSpriteSheets();
const perf = createPerformanceMonitor();

let gameRuntime;
const input = createInputController(ui, {
  getState: () => gameRuntime?.getState() ?? "ready",
  getUpgradeCount: () => gameRuntime?.getUpgradeCount() ?? 0,
  chooseUpgrade: (index) => gameRuntime?.chooseUpgrade(index),
  selectCharacter: (characterId) => gameRuntime?.selectCharacter(characterId),
  castUltimate: () => gameRuntime?.castUltimate(),
  resetGame: () => gameRuntime?.resetGame(),
});

gameRuntime = createVoidHuntGame({
  canvas: ui.canvas,
  ctx,
  input,
  perf,
  sprites,
  ui,
});

ui.restartButton.addEventListener("click", () => gameRuntime.resetGame());
ui.startButton.addEventListener("click", () => gameRuntime.startGame());
ui.characterCards.forEach((card) => {
  card.addEventListener("click", () => gameRuntime.selectCharacter(card.dataset.character));
});

window.addEventListener("resize", () => gameRuntime.resizeCanvas());

gameRuntime.resizeCanvas();
requestAnimationFrame(frame);

let lastFrame = performance.now();

function frame(now) {
  const rawDt = (now - lastFrame) / 1000;
  const dt = Math.min(0.05, Math.max(0, rawDt));
  lastFrame = now;

  const frameStart = performance.now();
  gameRuntime.tick(dt);
  perf.update(performance.now() - frameStart);

  requestAnimationFrame(frame);
}
