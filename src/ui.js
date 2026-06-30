export function createUi() {
  return {
    canvas: document.querySelector("#game-canvas"),
    healthText: document.querySelector("#health-text"),
    healthFill: document.querySelector("#health-fill"),
    xpText: document.querySelector("#xp-text"),
    xpFill: document.querySelector("#xp-fill"),
    timeText: document.querySelector("#time-text"),
    bossPhaseText: document.querySelector("#boss-phase-text"),
    bossFill: document.querySelector("#boss-fill"),
    ultimatePill: document.querySelector("#ultimate-pill"),
    ultimateText: document.querySelector("#ultimate-text"),
    stageBanner: document.querySelector("#stage-banner"),
    startPanel: document.querySelector("#start-panel"),
    startButton: document.querySelector("#start-button"),
    startVideo: document.querySelector("#start-video"),
    characterPanel: document.querySelector("#character-panel"),
    characterCards: document.querySelectorAll(".character-card"),
    levelUpTitle: document.querySelector("#level-up-title"),
    levelUpPanel: document.querySelector("#level-up-panel"),
    upgradeOptions: document.querySelector("#upgrade-options"),
    resultPanel: document.querySelector("#result-panel"),
    resultCard: document.querySelector("#result-card"),
    resultImage: document.querySelector("#result-image"),
    resultCaption: document.querySelector("#result-caption"),
    resultKicker: document.querySelector("#result-kicker"),
    resultTitle: document.querySelector("#result-title"),
    resultLevel: document.querySelector("#result-level"),
    resultKills: document.querySelector("#result-kills"),
    resultTime: document.querySelector("#result-time"),
    restartButton: document.querySelector("#restart-button"),
    mobileControls: document.querySelector("#mobile-controls"),
    moveJoystick: document.querySelector("#move-joystick"),
    joystickKnob: document.querySelector("#joystick-knob"),
    ultimateTouchButton: document.querySelector("#ultimate-touch-button"),
  };
}

export function hideStartVideo(ui) {
  if (!ui.startVideo) return;
  ui.startVideo.pause();
  ui.startVideo.querySelectorAll("source").forEach((source) => source.removeAttribute("src"));
  ui.startVideo.removeAttribute("src");
  ui.startVideo.load();
  ui.startVideo.classList.add("is-stopped");
}

export function updateTouchUltimateButton(ui, game) {
  if (ui.mobileControls) {
    ui.mobileControls.classList.toggle("active", game.state === "playing");
  }
  if (!ui.ultimateTouchButton) return;
  const ready = game.state === "playing" && game.player.ultimate.charges > 0;
  ui.ultimateTouchButton.classList.toggle("ready", ready);
  ui.ultimateTouchButton.disabled = !ready;
  ui.ultimateTouchButton.setAttribute("aria-disabled", ready ? "false" : "true");
  ui.ultimateTouchButton.querySelector("strong").textContent = `x${game.player.ultimate.charges}`;
}
