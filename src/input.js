import { clamp } from "./utils.js";

export function createInputController(ui, actions) {
  const keys = new Set();
  const input = {
    moveX: 0,
    moveY: 0,
    joystickX: 0,
    joystickY: 0,
    ultimatePressed: false,
    activePointerId: null,
    getMovementVector() {
      let keyboardX = 0;
      let keyboardY = 0;
      if (keys.has("w") || keys.has("arrowup")) keyboardY -= 1;
      if (keys.has("s") || keys.has("arrowdown")) keyboardY += 1;
      if (keys.has("a") || keys.has("arrowleft")) keyboardX -= 1;
      if (keys.has("d") || keys.has("arrowright")) keyboardX += 1;

      const x = keyboardX + this.joystickX;
      const y = keyboardY + this.joystickY;
      const length = Math.hypot(x, y);
      if (length <= 0.001) {
        this.moveX = 0;
        this.moveY = 0;
      } else {
        const scale = Math.min(1, length);
        this.moveX = (x / length) * scale;
        this.moveY = (y / length) * scale;
      }
      return { x: this.moveX, y: this.moveY };
    },
    consumeUltimatePressed() {
      const pressed = this.ultimatePressed;
      this.ultimatePressed = false;
      return pressed;
    },
    resetMovement() {
      this.joystickX = 0;
      this.joystickY = 0;
      this.moveX = 0;
      this.moveY = 0;
      if (ui.joystickKnob) {
        ui.joystickKnob.style.transform = "translate3d(-50%, -50%, 0)";
      }
    },
  };

  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }

    const key = event.key.toLowerCase();
    keys.add(key);
    const state = actions.getState();

    if (state === "levelUpPaused") {
      const index = Number.parseInt(event.key, 10) - 1;
      if (index >= 0 && index < actions.getUpgradeCount()) {
        actions.chooseUpgrade(index);
      }
    }

    if (state === "characterSelect") {
      if (key === "1") actions.selectCharacter("storm");
      if (key === "2") actions.selectCharacter("windman");
    }

    if (state === "playing" && key === "r" && !event.repeat) {
      input.ultimatePressed = true;
    }

    if ((state === "victory" || state === "defeat") && key === "r" && !event.repeat) {
      actions.resetGame();
    }
  });

  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

  if (ui.moveJoystick && ui.joystickKnob) {
    ui.moveJoystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      input.activePointerId = event.pointerId;
      ui.moveJoystick.setPointerCapture(event.pointerId);
      updateJoystick(input, ui, event);
    });
    ui.moveJoystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== input.activePointerId) return;
      event.preventDefault();
      updateJoystick(input, ui, event);
    });
    const releaseJoystick = (event) => {
      if (event.pointerId !== input.activePointerId) return;
      input.activePointerId = null;
      input.resetMovement();
    };
    ui.moveJoystick.addEventListener("pointerup", releaseJoystick);
    ui.moveJoystick.addEventListener("pointercancel", releaseJoystick);
    ui.moveJoystick.addEventListener("lostpointercapture", () => input.resetMovement());
  }

  if (ui.ultimateTouchButton) {
    ui.ultimateTouchButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (actions.getState() === "playing") {
        input.ultimatePressed = true;
      }
    });
  }

  return input;
}

function updateJoystick(input, ui, event) {
  const rect = ui.moveJoystick.getBoundingClientRect();
  const radius = Math.min(rect.width, rect.height) * 0.43;
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const length = Math.hypot(rawX, rawY);
  const limited = length > radius ? radius / length : 1;
  const x = rawX * limited;
  const y = rawY * limited;

  input.joystickX = clamp(x / radius, -1, 1);
  input.joystickY = clamp(y / radius, -1, 1);
  ui.joystickKnob.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`;
}
