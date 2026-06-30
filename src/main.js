const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

const ui = {
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
  characterPanel: document.querySelector("#character-panel"),
  characterCards: document.querySelectorAll(".character-card"),
  levelUpTitle: document.querySelector("#level-up-title"),
  levelUpPanel: document.querySelector("#level-up-panel"),
  upgradeOptions: document.querySelector("#upgrade-options"),
  resultPanel: document.querySelector("#result-panel"),
  resultKicker: document.querySelector("#result-kicker"),
  resultTitle: document.querySelector("#result-title"),
  resultLevel: document.querySelector("#result-level"),
  resultKills: document.querySelector("#result-kills"),
  resultTime: document.querySelector("#result-time"),
  restartButton: document.querySelector("#restart-button"),
};

const WORLD = { width: 3600, height: 2600 };
const GAME_DURATION = 180;
const WEAK_START = 160;
const PLAYER_BASE_SPEED = 260;
const MAX_ENEMIES = 190;
const RENDER_MARGIN = 250;
const MAX_PARTICLES = 220;
const MAX_RINGS = 64;
const MAX_BOLTS = 80;
const MAX_FLOATING_TEXTS = 90;

const SPRITE_SHEETS = createSpriteSheets();

const CHARACTERS = {
  storm: {
    id: "storm",
    name: "风暴之怒",
    openingTitle: "选择开局风暴",
    levelTitle: "风暴力量觉醒",
    victoryReason: "风暴撕裂了虚空",
    maxHp: 100,
    speedMultiplier: 1,
    initialSkills: {
      lightning: 1,
    },
  },
  windman: {
    id: "windman",
    name: "快乐风男",
    openingTitle: "选择开局疾风",
    levelTitle: "疾风剑意觉醒",
    victoryReason: "疾风斩碎了虚空",
    maxHp: 115,
    speedMultiplier: 1.08,
    initialSkills: {
      dash: 1,
      tornado: 1,
    },
  },
};

const COMMON_SKILL_IDS = ["frost", "wind", "orbs", "shield", "storm"];
const CHARACTER_SKILL_IDS = {
  storm: ["lightning"],
  windman: ["dash", "tornado"],
};

const PHASES = {
  phase1: {
    key: "phase1",
    label: "虚空术士正在逼近",
    banner: "虚空术士正在逼近",
    bossSpeed: 86,
    orbCooldown: 3.35,
    orbSpeed: 260,
    orbCount: 1,
    hazardCooldown: Infinity,
    summonCooldown: Infinity,
    spawnCooldown: 0.82,
  },
  phase2: {
    key: "phase2",
    label: "虚空能量开始爆发",
    banner: "虚空能量开始爆发",
    bossSpeed: 92,
    orbCooldown: 2.55,
    orbSpeed: 285,
    orbCount: 1,
    hazardCooldown: 4.5,
    summonCooldown: 9,
    spawnCooldown: 0.52,
  },
  phase3: {
    key: "phase3",
    label: "虚空领域扩散",
    banner: "虚空领域扩散",
    bossSpeed: 112,
    orbCooldown: 1.75,
    orbSpeed: 318,
    orbCount: 3,
    hazardCooldown: 2.75,
    summonCooldown: 6,
    spawnCooldown: 0.32,
  },
  weak: {
    key: "weak",
    label: "虚空术士进入虚弱状态！反击！",
    banner: "虚空术士进入虚弱状态！反击！",
    bossSpeed: 54,
    orbCooldown: 4.1,
    orbSpeed: 220,
    orbCount: 1,
    hazardCooldown: Infinity,
    summonCooldown: 11,
    spawnCooldown: 0.78,
  },
};

const ENEMY_TYPES = {
  claw: {
    name: "虚空爪兵",
    hp: 32,
    speed: 94,
    radius: 13,
    damage: 8,
    xp: 1,
    color: "#e4577f",
  },
  archer: {
    name: "虚空射手",
    hp: 46,
    speed: 70,
    radius: 14,
    damage: 8,
    xp: 2,
    color: "#ffb35f",
    stopDistance: 265,
    shootCooldown: 2.7,
  },
  brute: {
    name: "虚空胖子",
    hp: 150,
    speed: 52,
    radius: 22,
    damage: 17,
    xp: 5,
    color: "#7bd66f",
  },
  bat: {
    name: "虚空蝠群",
    hp: 22,
    speed: 150,
    radius: 11,
    damage: 7,
    xp: 1,
    color: "#d65cff",
  },
  guard: {
    name: "虚空护卫",
    hp: 205,
    speed: 62,
    radius: 24,
    damage: 20,
    xp: 6,
    color: "#6b7dff",
  },
  bomber: {
    name: "爆裂虫",
    hp: 38,
    speed: 112,
    radius: 14,
    damage: 22,
    xp: 2,
    color: "#ffdf63",
    blastRadius: 72,
  },
};

const SKILLS = {
  lightning: {
    name: "闪电链",
    type: "技能",
    owner: "storm",
    desc: "自动打击附近目标，升级后伤害、弹射数量和冷却都会提升。",
  },
  dash: {
    name: "踏前斩",
    type: "技能",
    owner: "windman",
    desc: "靠近敌人后自动冲刺穿身，同一目标 4 秒内不会重复命中。",
  },
  tornado: {
    name: "疾风龙卷",
    type: "技能",
    owner: "windman",
    desc: "每 3 次踏前斩后，朝 Boss 方向释放一道穿透龙卷风。",
  },
  frost: {
    name: "冰霜环",
    type: "技能",
    desc: "以自身为中心爆发冰环，对附近敌人造成伤害并减速。",
  },
  wind: {
    name: "风刃",
    type: "技能",
    desc: "发射穿透风刃，清理直线上的小怪并切割 Boss。",
  },
  orbs: {
    name: "雷球护体",
    type: "技能",
    desc: "雷球围绕自身旋转，持续保护近身区域。",
  },
  shield: {
    name: "魔法护盾",
    type: "技能",
    desc: "周期性生成护盾，抵挡一次伤害。",
  },
  storm: {
    name: "风暴领域",
    type: "技能",
    desc: "在身边形成持续伤害区域，后期清场更稳定。",
  },
};

const ULTIMATE_UPGRADE = {
  id: "ultimate",
  kind: "ultimate",
  type: "大招",
  name: "天穹雷罚",
  desc: "获得 1 次 R 键大招充能。释放后召唤大范围雷暴，清场并重创 Boss。",
  apply(player) {
    player.ultimate.level = Math.min(6, player.ultimate.level + 1);
    player.ultimate.charges += 1;
  },
};

const STAT_UPGRADES = [
  {
    id: "maxHp",
    name: "最大生命值 +20",
    type: "属性",
    desc: "提高生命上限，并立即恢复 20 点生命。",
    apply(player) {
      player.maxHp += 20;
      player.hp = Math.min(player.maxHp, player.hp + 20);
    },
  },
  {
    id: "speed",
    name: "移动速度 +10%",
    type: "属性",
    desc: "风暴女法师移动更快，更容易拉开 Boss 和小怪。",
    apply(player) {
      player.speedMultiplier = Math.min(1.9, player.speedMultiplier * 1.1);
    },
  },
  {
    id: "lifeSteal",
    name(player) {
      return player.lifeSteal > 0 ? `生命偷取 +4%（当前 ${Math.round(player.lifeSteal * 100)}%）` : "解锁 生命偷取";
    },
    type: "属性",
    desc: "造成伤害时按比例回复生命，最多叠加到 20%。",
    isAvailable(player) {
      return player.lifeSteal < 0.2;
    },
    apply(player) {
      player.lifeSteal = Math.min(0.2, player.lifeSteal + 0.04);
    },
  },
  {
    id: "pickup",
    name: "经验拾取范围 +20%",
    type: "属性",
    desc: "经验球更早被吸附，逃跑路线更顺滑。",
    apply(player) {
      player.pickupRadius = Math.min(260, player.pickupRadius * 1.2);
    },
  },
  {
    id: "cooldown",
    name: "技能冷却 -10%",
    type: "属性",
    desc: "所有自动技能释放更频繁。",
    apply(player) {
      player.cooldownMultiplier = Math.max(0.52, player.cooldownMultiplier * 0.9);
    },
  },
];

const keys = new Set();
let game = createGame();
let lastFrame = performance.now();
let enemyId = 1;

function createGame() {
  return {
    state: "ready",
    elapsed: 0,
    phase: "phase1",
    phaseEnteredAt: 0,
    bannerTimer: 2.8,
    weakStarted: false,
    kills: 0,
    player: {
      characterId: "storm",
      x: WORLD.width * 0.5,
      y: WORLD.height * 0.5,
      radius: 16,
      hp: 100,
      maxHp: 100,
      lifeSteal: 0,
      speedMultiplier: 1,
      pickupRadius: 95,
      level: 1,
      xp: 0,
      xpToNext: 8,
      cooldownMultiplier: 1,
      invulnerable: 0,
      shield: 0,
      shieldTimer: 0,
      velocityX: 0,
      velocityY: 0,
      facingAngle: 0,
      facingSign: 1,
      dash: {
        cooldown: 1,
        hitCount: 0,
        targetCooldowns: new Map(),
        active: null,
        slashTimer: 0,
      },
      ultimate: {
        level: 0,
        charges: 0,
        castTimer: 0,
      },
      skills: createSkillLevels(CHARACTERS.storm.initialSkills),
      cooldowns: {
        lightning: 0.45,
        frost: 3.2,
        wind: 1.6,
      },
    },
    boss: {
      x: WORLD.width * 0.5 + 420,
      y: WORLD.height * 0.5 - 180,
      radius: 38,
      hp: 3000,
      maxHp: 3000,
      contactCooldown: 0,
      orbTimer: 1.6,
      hazardTimer: 5.2,
      summonTimer: 8,
      weakPulse: 0,
    },
    camera: { x: 0, y: 0 },
    view: { width: window.innerWidth, height: window.innerHeight, dpr: 1 },
    enemies: [],
    expOrbs: [],
    hostileProjectiles: [],
    playerProjectiles: [],
    hazards: [],
    particles: [],
    rings: [],
    bolts: [],
    floatingTexts: [],
    decorations: createDecorations(),
    spawnTimer: 0.2,
    upgrades: [],
    upgradeMode: "level",
    shake: 0,
    resultReason: "",
  };
}

function resetGame() {
  enemyId = 1;
  game = createGame();
  ui.resultPanel.classList.add("hidden");
  ui.levelUpPanel.classList.add("hidden");
  ui.characterPanel.classList.add("hidden");
  ui.startPanel.classList.add("hidden");
  startGame();
}

function startGame() {
  if (game.state !== "ready") return;
  game.state = "characterSelect";
  ui.startPanel.classList.add("hidden");
  ui.characterPanel.classList.remove("hidden");
}

function selectCharacter(characterId) {
  const character = CHARACTERS[characterId];
  if (!character || game.state !== "characterSelect") return;

  const player = game.player;
  player.characterId = character.id;
  player.maxHp = character.maxHp;
  player.hp = character.maxHp;
  player.lifeSteal = 0;
  player.speedMultiplier = character.speedMultiplier;
  player.skills = createSkillLevels(character.initialSkills);
  player.cooldowns = {
    lightning: 0.45,
    frost: 3.2,
    wind: 1.6,
  };
  player.dash = {
    cooldown: 0.45,
    hitCount: 0,
    targetCooldowns: new Map(),
    active: null,
    slashTimer: 0,
  };
  player.shield = 0;
  player.shieldTimer = 0;

  ui.characterPanel.classList.add("hidden");
  openLevelUp("opening");
}

function createSkillLevels(initialSkills = {}) {
  const skills = {};
  for (const id of Object.keys(SKILLS)) {
    skills[id] = initialSkills[id] || 0;
  }
  return skills;
}

function getCharacter() {
  return CHARACTERS[game.player.characterId] || CHARACTERS.storm;
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.view = { width, height, dpr };
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }

  const key = event.key.toLowerCase();
  keys.add(key);

  if (game.state === "levelUpPaused") {
    const index = Number.parseInt(event.key, 10) - 1;
    if (index >= 0 && index < game.upgrades.length) {
      chooseUpgrade(index);
    }
  }

  if (game.state === "characterSelect") {
    if (key === "1") selectCharacter("storm");
    if (key === "2") selectCharacter("windman");
  }

  if (game.state === "playing" && key === "r") {
    castUltimate();
  }

  if ((game.state === "victory" || game.state === "defeat") && key === "r") {
    resetGame();
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
ui.restartButton.addEventListener("click", resetGame);
ui.startButton.addEventListener("click", startGame);
ui.characterCards.forEach((card) => {
  card.addEventListener("click", () => selectCharacter(card.dataset.character));
});

resizeCanvas();
requestAnimationFrame(frame);

function frame(now) {
  const rawDt = (now - lastFrame) / 1000;
  const dt = Math.min(0.05, Math.max(0, rawDt));
  lastFrame = now;

  if (game.state === "playing") {
    updateGame(dt);
  } else {
    updateEffects(dt);
    updateCamera();
  }

  drawGame();
  updateUI();
  requestAnimationFrame(frame);
}

function updateGame(dt) {
  game.elapsed += dt;
  game.bannerTimer = Math.max(0, game.bannerTimer - dt);
  game.shake = Math.max(0, game.shake - dt * 18);
  game.player.ultimate.castTimer = Math.max(0, game.player.ultimate.castTimer - dt);
  game.player.dash.slashTimer = Math.max(0, game.player.dash.slashTimer - dt);

  updatePhase();
  updatePlayer(dt);
  updateBoss(dt);
  updateEnemySpawner(dt);
  updateEnemies(dt);
  updateHostileProjectiles(dt);
  updateHazards(dt);
  updateSkills(dt);
  updatePlayerProjectiles(dt);
  updateExpOrbs(dt);
  updateEffects(dt);
  updateCamera();

  if (game.elapsed >= GAME_DURATION && game.state === "playing") {
    finishGame("defeat", "虚空术士恢复了力量");
  }
}

function updatePhase() {
  let nextPhase = "phase1";
  if (game.elapsed >= WEAK_START) {
    nextPhase = "weak";
  } else if (game.elapsed >= 120) {
    nextPhase = "phase3";
  } else if (game.elapsed >= 60) {
    nextPhase = "phase2";
  }

  if (nextPhase !== game.phase) {
    game.phase = nextPhase;
    game.phaseEnteredAt = game.elapsed;
    showBanner(PHASES[nextPhase].banner, nextPhase === "weak" ? 4 : 2.6);

    if (nextPhase === "weak" && !game.weakStarted) {
      game.weakStarted = true;
      game.boss.hp = Math.min(game.boss.hp, 1450);
      game.boss.weakPulse = 3;
      createRing(game.boss.x, game.boss.y, 260, "#ffd36b", 1.1, 7);
      burst(game.boss.x, game.boss.y, 52, "#ffd36b", 360, 1.1);
    }
  }
}

function updatePlayer(dt) {
  const player = game.player;

  if (player.dash.active) {
    updateActiveDash(dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    updatePlayerShield(dt);
    return;
  }

  let dx = 0;
  let dy = 0;

  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;

  const length = Math.hypot(dx, dy) || 1;
  const speed = PLAYER_BASE_SPEED * player.speedMultiplier;
  player.velocityX = (dx / length) * speed;
  player.velocityY = (dy / length) * speed;

  if (dx === 0 && dy === 0) {
    player.velocityX = 0;
    player.velocityY = 0;
  } else {
    player.facingAngle = Math.atan2(player.velocityY, player.velocityX);
    if (dx !== 0) {
      player.facingSign = dx < 0 ? -1 : 1;
    }
  }

  player.x = clamp(player.x + player.velocityX * dt, player.radius, WORLD.width - player.radius);
  player.y = clamp(player.y + player.velocityY * dt, player.radius, WORLD.height - player.radius);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  updatePlayerShield(dt);
}

function updatePlayerShield(dt) {
  const player = game.player;
  const shieldLevel = player.skills.shield;
  if (shieldLevel > 0) {
    if (player.shield <= 0) {
      player.shieldTimer -= dt;
      if (player.shieldTimer <= 0) {
        player.shield = 1;
        player.shieldTimer = getShieldCooldown(shieldLevel);
        createRing(player.x, player.y, 90, "#55f7ff", 0.45, 3);
      }
    } else {
      player.shieldTimer = Math.min(player.shieldTimer, getShieldCooldown(shieldLevel));
    }
  }
}

function updateActiveDash(dt) {
  const player = game.player;
  const dash = player.dash.active;
  if (!dash) return;

  dash.life -= dt;
  const progress = 1 - clamp(dash.life / dash.maxLife, 0, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  player.x = lerp(dash.startX, dash.endX, eased);
  player.y = lerp(dash.startY, dash.endY, eased);
  player.velocityX = Math.cos(dash.angle) * 760;
  player.velocityY = Math.sin(dash.angle) * 760;
  player.facingAngle = dash.angle;
  player.facingSign = Math.cos(dash.angle) < 0 ? -1 : 1;

  if (dash.life <= 0) {
    player.x = dash.endX;
    player.y = dash.endY;
    player.velocityX = 0;
    player.velocityY = 0;
    player.dash.active = null;
  }
}

function updateBoss(dt) {
  const boss = game.boss;
  const player = game.player;
  const phase = PHASES[game.phase];
  const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
  const distance = distanceBetween(boss, player);

  if (distance > boss.radius + player.radius + 28) {
    boss.x += Math.cos(angle) * phase.bossSpeed * dt;
    boss.y += Math.sin(angle) * phase.bossSpeed * dt;
  }

  boss.x = clamp(boss.x, boss.radius, WORLD.width - boss.radius);
  boss.y = clamp(boss.y, boss.radius, WORLD.height - boss.radius);
  boss.contactCooldown = Math.max(0, boss.contactCooldown - dt);
  boss.weakPulse = Math.max(0, boss.weakPulse - dt);

  if (distance < boss.radius + player.radius + 2 && boss.contactCooldown <= 0) {
    damagePlayer(game.phase === "weak" ? 12 : 24);
    boss.contactCooldown = game.phase === "weak" ? 1.4 : 0.85;
  }

  boss.orbTimer -= dt;
  if (boss.orbTimer <= 0) {
    fireBossOrbs(phase.orbCount, phase.orbSpeed);
    boss.orbTimer = phase.orbCooldown;
  }

  boss.hazardTimer -= dt;
  if (boss.hazardTimer <= 0) {
    createBossHazard();
    boss.hazardTimer = phase.hazardCooldown;
  }

  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0) {
    summonBossMinions();
    boss.summonTimer = phase.summonCooldown;
  }
}

function updateEnemySpawner(dt) {
  if (game.enemies.length >= MAX_ENEMIES) return;

  const phase = PHASES[game.phase];
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;

  const count = game.phase === "phase3" ? 4 : game.phase === "phase2" ? 3 : game.phase === "weak" ? 2 : 1;
  for (let i = 0; i < count && game.enemies.length < MAX_ENEMIES; i += 1) {
    spawnEnemy(pickEnemyTypeForPhase(), getSpawnPointAroundPlayer());
  }

  game.spawnTimer = phase.spawnCooldown * randomRange(0.72, 1.18);
}

function updateEnemies(dt) {
  const player = game.player;

  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);
    enemy.shootTimer = Math.max(0, enemy.shootTimer - dt);
    enemy.slow = Math.max(0, enemy.slow - dt);
    enemy.orbHitCooldown = Math.max(0, enemy.orbHitCooldown - dt);
    enemy.stormTick = Math.max(0, enemy.stormTick - dt);

    const type = ENEMY_TYPES[enemy.type];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const slowMultiplier = enemy.slow > 0 ? 0.48 : 1;
    const batWiggle = enemy.type === "bat" ? Math.sin(game.elapsed * 8 + enemy.seed) * 0.42 : 0;
    let shouldMove = true;

    if (enemy.type === "archer") {
      shouldMove = distance > type.stopDistance;
      if (distance <= type.stopDistance + 40 && enemy.shootTimer <= 0) {
        fireArcherShot(enemy);
        enemy.shootTimer = type.shootCooldown * randomRange(0.86, 1.18);
      }
    }

    if (enemy.type === "bomber" && distance < type.blastRadius && enemy.touchCooldown <= 0) {
      explodeBomber(enemy, true);
      continue;
    }

    if (shouldMove) {
      const moveAngle = Math.atan2(dy, dx) + batWiggle;
      enemy.x += Math.cos(moveAngle) * type.speed * slowMultiplier * dt;
      enemy.y += Math.sin(moveAngle) * type.speed * slowMultiplier * dt;
    }

    enemy.x = clamp(enemy.x, enemy.radius, WORLD.width - enemy.radius);
    enemy.y = clamp(enemy.y, enemy.radius, WORLD.height - enemy.radius);

    if (distance < enemy.radius + player.radius && enemy.touchCooldown <= 0) {
      damagePlayer(type.damage);
      enemy.touchCooldown = 0.82;
    }
  }

  game.enemies = game.enemies.filter((enemy) => !enemy.remove);
}

function updateHostileProjectiles(dt) {
  const player = game.player;

  for (const projectile of game.hostileProjectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;

    if (
      projectile.life <= 0 ||
      projectile.x < -80 ||
      projectile.x > WORLD.width + 80 ||
      projectile.y < -80 ||
      projectile.y > WORLD.height + 80
    ) {
      projectile.remove = true;
      continue;
    }

    if (distanceBetween(projectile, player) < projectile.radius + player.radius) {
      damagePlayer(projectile.damage);
      projectile.remove = true;
      burst(projectile.x, projectile.y, 12, projectile.color, 150, 0.35);
    }
  }

  game.hostileProjectiles = game.hostileProjectiles.filter((projectile) => !projectile.remove);
}

function updateHazards(dt) {
  const player = game.player;

  for (const hazard of game.hazards) {
    hazard.delay -= dt;
    hazard.life -= dt;

    if (!hazard.exploded && hazard.delay <= 0) {
      hazard.exploded = true;
      hazard.life = 0.42;
      createRing(hazard.x, hazard.y, hazard.radius + 32, "#b767ff", 0.36, 7);
      burst(hazard.x, hazard.y, 34, "#b767ff", 260, 0.55);

      if (distanceBetween(hazard, player) < hazard.radius + player.radius * 0.25) {
        damagePlayer(hazard.damage);
      }
    }

    if (hazard.exploded && hazard.life <= 0) {
      hazard.remove = true;
    }
  }

  game.hazards = game.hazards.filter((hazard) => !hazard.remove);
}

function updateSkills(dt) {
  const player = game.player;
  for (const key of Object.keys(player.cooldowns)) {
    player.cooldowns[key] = Math.max(0, player.cooldowns[key] - dt);
  }

  updateDashCooldowns(dt);

  if (player.skills.lightning > 0 && player.cooldowns.lightning <= 0) {
    castLightning();
  }

  if (player.skills.dash > 0) {
    tryCastSweepingDash();
  }

  if (player.skills.frost > 0 && player.cooldowns.frost <= 0) {
    castFrostRing();
  }

  if (player.skills.wind > 0 && player.cooldowns.wind <= 0) {
    castWindBlades();
  }

  updateOrbitingOrbs(dt);
  updateStormField(dt);
}

function updatePlayerProjectiles(dt) {
  const boss = game.boss;

  for (const projectile of game.playerProjectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    projectile.spin += dt * 10;

    if (
      projectile.life <= 0 ||
      projectile.x < -120 ||
      projectile.x > WORLD.width + 120 ||
      projectile.y < -120 ||
      projectile.y > WORLD.height + 120
    ) {
      projectile.remove = true;
      continue;
    }

    for (const enemy of game.enemies) {
      if (enemy.dead || projectile.hitIds.has(enemy.id)) continue;
      if (distanceBetween(projectile, enemy) < projectile.radius + enemy.radius) {
        projectile.hitIds.add(enemy.id);
        damageEnemy(enemy, projectile.damage, projectile.kind || "wind");
        burst(enemy.x, enemy.y, projectile.kind === "tornado" ? 12 : 7, "#9ffff4", projectile.kind === "tornado" ? 170 : 110, 0.3);
        if (projectile.kind !== "tornado") {
          projectile.pierce -= 1;
        }
        if (projectile.pierce <= 0 && projectile.kind !== "tornado") {
          projectile.remove = true;
          break;
        }
      }
    }

    if (!projectile.remove && !projectile.hitBoss && distanceBetween(projectile, boss) < projectile.radius + boss.radius) {
      projectile.hitBoss = true;
      damageBoss(projectile.kind === "tornado" ? projectile.bossDamage : projectile.damage * 1.25, projectile.kind || "wind");
      createBolt(projectile.x, projectile.y, boss.x, boss.y, "#9ffff4", projectile.kind === "tornado" ? 0.16 : 0.1);
      if (projectile.kind !== "tornado") {
        projectile.pierce -= 2;
      }
      if (projectile.pierce <= 0 && projectile.kind !== "tornado") {
        projectile.remove = true;
      }
    }
  }

  game.playerProjectiles = game.playerProjectiles.filter((projectile) => !projectile.remove);
}

function updateExpOrbs(dt) {
  const player = game.player;

  for (const orb of game.expOrbs) {
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const distance = Math.hypot(dx, dy) || 1;

    if (distance < player.pickupRadius) {
      const pull = 155 + (1 - distance / player.pickupRadius) * 520;
      orb.x += (dx / distance) * pull * dt;
      orb.y += (dy / distance) * pull * dt;
      orb.active = true;
    }

    orb.pulse += dt * 5;

    if (distance < player.radius + orb.radius + 4) {
      addExperience(orb.value);
      orb.remove = true;
      burst(player.x, player.y, 8, "#35d5c8", 90, 0.28);
    }
  }

  game.expOrbs = game.expOrbs.filter((orb) => !orb.remove);
}

function updateEffects(dt) {
  for (const particle of game.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - dt * 1.8;
    particle.vy *= 1 - dt * 1.8;
    particle.life -= dt;
  }

  for (const ring of game.rings) {
    ring.life -= dt;
    ring.radius += ring.grow * dt;
  }

  for (const bolt of game.bolts) {
    bolt.life -= dt;
  }

  for (const text of game.floatingTexts) {
    text.y += text.vy * dt;
    text.life -= dt;
  }

  game.particles = game.particles.filter((particle) => particle.life > 0);
  game.rings = game.rings.filter((ring) => ring.life > 0);
  game.bolts = game.bolts.filter((bolt) => bolt.life > 0);
  game.floatingTexts = game.floatingTexts.filter((text) => text.life > 0);
}

function updateCamera() {
  const view = game.view;
  const targetX = game.player.x - view.width / 2;
  const targetY = game.player.y - view.height / 2;
  game.camera.x = clamp(lerp(game.camera.x, targetX, 0.14), 0, Math.max(0, WORLD.width - view.width));
  game.camera.y = clamp(lerp(game.camera.y, targetY, 0.14), 0, Math.max(0, WORLD.height - view.height));
}

function castLightning() {
  const player = game.player;
  const level = player.skills.lightning;
  const range = game.phase === "weak" ? 650 : 390 + level * 12;
  const damage = 28 + level * 10;
  const maxHits = 2 + Math.floor(level * 0.8);
  const hitTargets = [];
  let origin = { x: player.x, y: player.y };

  for (let i = 0; i < maxHits; i += 1) {
    const target = findLightningTarget(origin, range, hitTargets);
    if (!target) break;

    hitTargets.push(target);
    createBolt(origin.x, origin.y, target.x, target.y, "#b9fbff", 0.16);

    if (target.kind === "boss") {
      damageBoss(damage * 1.28, "lightning");
    } else {
      damageEnemy(target, damage, "lightning");
    }

    origin = target;
  }

  if (hitTargets.length === 0 && game.phase === "weak") {
    createBolt(player.x, player.y, game.boss.x, game.boss.y, "#b9fbff", 0.12);
    damageBoss(damage * 0.86, "lightning");
  }

  player.cooldowns.lightning = Math.max(0.38, (1.02 - level * 0.055) * player.cooldownMultiplier);
}

function castFrostRing() {
  const player = game.player;
  const level = player.skills.frost;
  const radius = 142 + level * 18;
  const damage = 25 + level * 9;

  createRing(player.x, player.y, radius, "#89dfff", 0.42, 5);
  burst(player.x, player.y, 24, "#89dfff", 210, 0.55);

  for (const enemy of game.enemies) {
    if (!enemy.dead && distanceBetween(player, enemy) < radius + enemy.radius) {
      enemy.slow = 2.25 + level * 0.16;
      damageEnemy(enemy, damage, "frost");
    }
  }

  if (distanceBetween(player, game.boss) < radius + game.boss.radius) {
    damageBoss(damage * 1.05, "frost");
  }

  player.cooldowns.frost = Math.max(2.6, (5.8 - level * 0.34) * player.cooldownMultiplier);
}

function castWindBlades() {
  const player = game.player;
  const level = player.skills.wind;
  const count = 1 + Math.floor(level / 3);
  const baseAngle = Math.atan2(game.boss.y - player.y, game.boss.x - player.x);

  for (let i = 0; i < count; i += 1) {
    const angle = game.phase === "weak"
      ? baseAngle + (i - (count - 1) / 2) * 0.28
      : randomRange(0, Math.PI * 2);
    const speed = 520 + level * 12;
    game.playerProjectiles.push({
      x: player.x + Math.cos(angle) * 28,
      y: player.y + Math.sin(angle) * 28,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      kind: "wind",
      radius: 15,
      damage: 23 + level * 8,
      pierce: 4 + level,
      life: 1.7,
      spin: randomRange(0, Math.PI * 2),
      hitIds: new Set(),
      hitBoss: false,
    });
  }

  player.cooldowns.wind = Math.max(0.8, (1.85 - level * 0.09) * player.cooldownMultiplier);
}

function updateDashCooldowns(dt) {
  const dash = game.player.dash;
  dash.cooldown = Math.max(0, dash.cooldown - dt);

  for (const [key, cooldown] of dash.targetCooldowns.entries()) {
    const nextCooldown = cooldown - dt;
    if (nextCooldown <= 0) {
      dash.targetCooldowns.delete(key);
    } else {
      dash.targetCooldowns.set(key, nextCooldown);
    }
  }
}

function tryCastSweepingDash() {
  const player = game.player;
  const dashLevel = player.skills.dash;
  const dashState = player.dash;
  if (dashLevel <= 0 || dashState.cooldown > 0 || dashState.active) return;

  const target = findSweepingDashTarget();
  if (!target) return;

  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const exitDistance = (target.radius + player.radius + 34) * 2;
  const endX = clamp(target.x + Math.cos(angle) * exitDistance, player.radius, WORLD.width - player.radius);
  const endY = clamp(target.y + Math.sin(angle) * exitDistance, player.radius, WORLD.height - player.radius);
  const targetKey = target.kind === "boss" ? "boss" : target.enemy.id;
  const enemyDamage = 48 + (dashLevel - 1) * 16;
  const bossDamage = 58 + (dashLevel - 1) * 18;

  dashState.cooldown = 1;
  dashState.targetCooldowns.set(targetKey, 4);
  dashState.active = {
    startX: player.x,
    startY: player.y,
    endX,
    endY,
    angle,
    maxLife: 0.16,
    life: 0.16,
  };
  dashState.slashTimer = 0.28;
  dashState.hitCount += 1;
  player.invulnerable = Math.max(player.invulnerable, 0.24);
  player.facingAngle = angle;
  player.facingSign = Math.cos(angle) < 0 ? -1 : 1;

  createRing(target.x, target.y, 68, "#7eebff", 0.22, 3);
  createBolt(player.x, player.y, target.x, target.y, "#7eebff", 0.1);
  burst(target.x, target.y, 12, "#7eebff", 180, 0.32);

  if (target.kind === "boss") {
    damageBoss(bossDamage, "dash");
  } else {
    damageEnemy(target.enemy, enemyDamage, "dash");
  }

  if (dashState.hitCount >= 3) {
    dashState.hitCount = 0;
    castGaleTornado();
  }
}

function findSweepingDashTarget() {
  const player = game.player;
  const range = 145 + player.skills.dash * 8;
  let best = null;
  let bestDistance = Infinity;

  for (const enemy of game.enemies) {
    if (enemy.dead || player.dash.targetCooldowns.has(enemy.id)) continue;
    const distance = distanceBetween(player, enemy);
    if (distance <= range + enemy.radius && distance < bestDistance) {
      best = {
        kind: "enemy",
        enemy,
        x: enemy.x,
        y: enemy.y,
        radius: enemy.radius,
      };
      bestDistance = distance;
    }
  }

  const bossDistance = distanceBetween(player, game.boss);
  if (!player.dash.targetCooldowns.has("boss") && bossDistance <= range + game.boss.radius && bossDistance < bestDistance) {
    best = {
      kind: "boss",
      x: game.boss.x,
      y: game.boss.y,
      radius: game.boss.radius,
    };
  }

  return best;
}

function castGaleTornado() {
  const player = game.player;
  const dashLevel = player.skills.dash;
  const tornadoLevel = player.skills.tornado;
  const angle = Math.atan2(game.boss.y - player.y, game.boss.x - player.x);
  const speed = 560;
  const damage = 70 + tornadoLevel * 18 + dashLevel * 8;
  const bossDamage = 95 + tornadoLevel * 26 + dashLevel * 8;

  game.playerProjectiles.push({
    kind: "tornado",
    x: player.x + Math.cos(angle) * 34,
    y: player.y + Math.sin(angle) * 34,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    radius: 34 + tornadoLevel * 2,
    damage,
    bossDamage,
    pierce: Infinity,
    life: 1.8,
    spin: randomRange(0, Math.PI * 2),
    hitIds: new Set(),
    hitBoss: false,
  });

  game.shake = Math.max(game.shake, 0.75);
  createRing(player.x, player.y, 120, "#7eebff", 0.32, 4);
  addFloatingText(player.x, player.y - 44, "疾风龙卷", "#9ffff4");
}

function castUltimate() {
  const player = game.player;
  const ultimate = player.ultimate;
  if (ultimate.charges <= 0 || ultimate.level <= 0) return;

  ultimate.charges -= 1;
  ultimate.castTimer = 0.82;
  game.shake = Math.max(game.shake, 2.4);

  const radius = 460 + ultimate.level * 72;
  const enemyDamage = 210 + ultimate.level * 95;
  const bossDamage = 430 + ultimate.level * 185;
  createRing(player.x, player.y, radius, "#ffe27a", 0.72, 8);
  createRing(player.x, player.y, radius * 0.58, "#9ffff4", 0.55, 5);
  burst(player.x, player.y, 70, "#ffe27a", 520, 0.82);
  addFloatingText(player.x, player.y - 46, "天穹雷罚", "#ffe27a");

  for (const enemy of game.enemies) {
    if (enemy.dead || distanceBetween(player, enemy) > radius + enemy.radius) continue;
    createBolt(player.x, player.y, enemy.x, enemy.y, "#ffe27a", 0.18);
    damageEnemy(enemy, enemyDamage, "ultimate");
  }

  if (distanceBetween(player, game.boss) < radius + game.boss.radius) {
    createBolt(player.x, player.y, game.boss.x, game.boss.y, "#ffe27a", 0.24);
    damageBoss(bossDamage, "ultimate");
  }
}

function updateOrbitingOrbs(dt) {
  const player = game.player;
  const level = player.skills.orbs;
  if (level <= 0) return;

  const orbCount = Math.min(6, 2 + Math.floor(level / 2));
  const orbitRadius = 56 + level * 2.8;
  const damage = 11 + level * 5;
  const time = game.elapsed * (2.25 + level * 0.06);

  for (let i = 0; i < orbCount; i += 1) {
    const angle = time + (Math.PI * 2 * i) / orbCount;
    const orb = {
      x: player.x + Math.cos(angle) * orbitRadius,
      y: player.y + Math.sin(angle) * orbitRadius,
      radius: 11,
    };

    for (const enemy of game.enemies) {
      if (!enemy.dead && enemy.orbHitCooldown <= 0 && distanceBetween(orb, enemy) < orb.radius + enemy.radius) {
        damageEnemy(enemy, damage, "orbs");
        enemy.orbHitCooldown = 0.38;
        burst(enemy.x, enemy.y, 5, "#ffe27a", 80, 0.25);
      }
    }

    if (distanceBetween(orb, game.boss) < orb.radius + game.boss.radius) {
      damageBoss(damage * dt * 3.1, "orbs");
    }
  }
}

function updateStormField(dt) {
  const player = game.player;
  const level = player.skills.storm;
  if (level <= 0) return;

  const radius = 105 + level * 15;
  const damagePerSecond = 14 + level * 7;

  for (const enemy of game.enemies) {
    if (enemy.dead || distanceBetween(player, enemy) > radius + enemy.radius) continue;
    enemy.stormTick -= dt;
    damageEnemy(enemy, damagePerSecond * dt, "storm", false);
    if (enemy.stormTick <= 0) {
      enemy.stormTick = 0.45;
      burst(enemy.x, enemy.y, 3, "#62f4cd", 55, 0.24);
    }
  }

  if (distanceBetween(player, game.boss) < radius + game.boss.radius) {
    damageBoss(damagePerSecond * dt * 1.25, "storm");
  }
}

function findLightningTarget(origin, range, hitTargets) {
  let best = null;
  let bestDistance = Infinity;
  const hitIds = new Set(hitTargets.filter((target) => target.kind !== "boss").map((target) => target.id));
  const bossAlreadyHit = hitTargets.some((target) => target.kind === "boss");

  if (!bossAlreadyHit) {
    const bossDistance = distanceBetween(origin, game.boss);
    const weakBonus = game.phase === "weak" ? 0.42 : 1;
    if (bossDistance < range * (game.phase === "weak" ? 1.35 : 0.7)) {
      best = { ...game.boss, kind: "boss" };
      bestDistance = bossDistance * weakBonus;
    }
  }

  for (const enemy of game.enemies) {
    if (enemy.dead || hitIds.has(enemy.id)) continue;
    const distance = distanceBetween(origin, enemy);
    if (distance < range && distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }

  return best;
}

function spawnEnemy(type, point) {
  const config = ENEMY_TYPES[type];
  game.enemies.push({
    id: enemyId,
    type,
    x: point.x,
    y: point.y,
    radius: config.radius,
    hp: config.hp,
    maxHp: config.hp,
    slow: 0,
    touchCooldown: randomRange(0.1, 0.6),
    shootTimer: randomRange(0.6, 2.2),
    orbHitCooldown: 0,
    stormTick: 0,
    seed: randomRange(0, 1000),
    dead: false,
    remove: false,
  });
  enemyId += 1;
}

function getSpawnPointAroundPlayer() {
  const player = game.player;
  const view = game.view;
  const minDistance = Math.max(view.width, view.height) * 0.55;
  const distance = randomRange(minDistance, minDistance + 420);
  const angle = randomRange(0, Math.PI * 2);
  return {
    x: clamp(player.x + Math.cos(angle) * distance, 40, WORLD.width - 40),
    y: clamp(player.y + Math.sin(angle) * distance, 40, WORLD.height - 40),
  };
}

function pickEnemyTypeForPhase() {
  const roll = Math.random();
  if (game.phase === "phase1") {
    if (game.elapsed > 35 && roll > 0.9) return "bat";
    if (game.elapsed > 22 && roll > 0.76) return "archer";
    return "claw";
  }
  if (game.phase === "phase2") {
    if (roll > 0.9) return "guard";
    if (roll > 0.78) return "brute";
    if (roll > 0.62) return "bomber";
    if (roll > 0.38) return "archer";
    if (roll > 0.2) return "bat";
    return "claw";
  }
  if (game.phase === "phase3") {
    if (roll > 0.88) return "guard";
    if (roll > 0.75) return "brute";
    if (roll > 0.56) return "bomber";
    if (roll > 0.34) return "archer";
    if (roll > 0.15) return "bat";
    return "claw";
  }
  if (roll > 0.84) return "guard";
  if (roll > 0.62) return "bomber";
  if (roll > 0.4) return "bat";
  return "claw";
}

function fireBossOrbs(count, speed) {
  const boss = game.boss;
  const player = game.player;
  const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
  const spread = count === 1 ? 0 : 0.32;

  for (let i = 0; i < count; i += 1) {
    const angle = baseAngle + (i - (count - 1) / 2) * spread + randomRange(-0.06, 0.06);
    game.hostileProjectiles.push({
      x: boss.x + Math.cos(angle) * (boss.radius + 10),
      y: boss.y + Math.sin(angle) * (boss.radius + 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: game.phase === "phase3" ? 12 : 10,
      damage: game.phase === "weak" ? 10 : game.phase === "phase3" ? 18 : 14,
      life: 4.2,
      color: "#b767ff",
      kind: "boss",
    });
  }
}

function fireArcherShot(enemy) {
  const player = game.player;
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const speed = 205;
  game.hostileProjectiles.push({
    x: enemy.x + Math.cos(angle) * (enemy.radius + 6),
    y: enemy.y + Math.sin(angle) * (enemy.radius + 6),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 7,
    damage: ENEMY_TYPES.archer.damage,
    life: 3.8,
    color: "#ffb35f",
    kind: "archer",
  });
}

function createBossHazard() {
  if (!Number.isFinite(PHASES[game.phase].hazardCooldown)) return;
  const player = game.player;
  const lead = game.phase === "phase3" ? 0.6 : 0.42;
  game.hazards.push({
    x: clamp(player.x + player.velocityX * lead + randomRange(-38, 38), 70, WORLD.width - 70),
    y: clamp(player.y + player.velocityY * lead + randomRange(-38, 38), 70, WORLD.height - 70),
    radius: game.phase === "phase3" ? 78 : 66,
    delay: game.phase === "phase3" ? 0.88 : 1.1,
    life: 1.4,
    damage: game.phase === "phase3" ? 24 : 18,
    exploded: false,
  });
}

function summonBossMinions() {
  if (!Number.isFinite(PHASES[game.phase].summonCooldown)) return;
  const boss = game.boss;
  const count = game.phase === "phase3" ? 7 : game.phase === "weak" ? 3 : 4;
  for (let i = 0; i < count && game.enemies.length < MAX_ENEMIES; i += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const distance = randomRange(120, 230);
    const roll = Math.random();
    const type = game.phase === "phase3"
      ? roll > 0.82 ? "guard" : roll > 0.64 ? "brute" : roll > 0.42 ? "bomber" : roll > 0.22 ? "bat" : "claw"
      : game.phase === "weak"
        ? roll > 0.62 ? "bomber" : roll > 0.35 ? "bat" : "claw"
        : roll > 0.76 ? "brute" : roll > 0.52 ? "archer" : roll > 0.3 ? "bomber" : "claw";
    spawnEnemy(type, {
      x: clamp(boss.x + Math.cos(angle) * distance, 40, WORLD.width - 40),
      y: clamp(boss.y + Math.sin(angle) * distance, 40, WORLD.height - 40),
    });
  }
  createRing(boss.x, boss.y, 180, "#b767ff", 0.58, 4);
}

function damageEnemy(enemy, amount, source, showText = true) {
  if (enemy.dead) return;
  const actualDamage = Math.min(enemy.hp, amount);
  enemy.hp -= amount;
  healPlayerFromDamage(actualDamage);

  if (showText && amount >= 8) {
    addFloatingText(enemy.x, enemy.y - enemy.radius, Math.round(amount).toString(), "#dffcff");
  }

  if (enemy.hp <= 0) {
    enemy.dead = true;
    enemy.remove = true;
    game.kills += 1;
    dropExperience(enemy);
    if (enemy.type === "bomber") {
      createBombBlast(enemy, true);
    }
    burst(enemy.x, enemy.y, enemy.type === "brute" ? 18 : 10, ENEMY_TYPES[enemy.type].color, 160, 0.55);
  }
}

function explodeBomber(enemy, hitPlayer) {
  if (enemy.dead) return;
  enemy.dead = true;
  enemy.remove = true;
  createBombBlast(enemy, hitPlayer);
  burst(enemy.x, enemy.y, 18, ENEMY_TYPES.bomber.color, 210, 0.48);
}

function createBombBlast(enemy, hitPlayer) {
  const radius = ENEMY_TYPES.bomber.blastRadius;
  createRing(enemy.x, enemy.y, radius + 38, ENEMY_TYPES.bomber.color, 0.42, 5);
  if (hitPlayer && distanceBetween(enemy, game.player) < radius + game.player.radius) {
    damagePlayer(ENEMY_TYPES.bomber.damage);
  }
}

function damageBoss(amount, source) {
  const boss = game.boss;
  if (boss.hp <= 0) return;

  const multiplier = game.phase === "weak" ? 2.05 : 0.1;
  const finalDamage = amount * multiplier;
  const previousHp = boss.hp;
  boss.hp -= finalDamage;

  if (Math.random() < 0.18 || finalDamage > 35) {
    addFloatingText(boss.x + randomRange(-18, 18), boss.y - boss.radius, Math.round(finalDamage).toString(), game.phase === "weak" ? "#ffd36b" : "#bda6df");
  }

  if (game.phase !== "weak" && boss.hp < 360) {
    boss.hp = 360;
  }

  healPlayerFromDamage(Math.max(0, previousHp - boss.hp));

  if (boss.hp <= 0 && game.phase === "weak") {
    boss.hp = 0;
    finishGame("victory", getCharacter().victoryReason);
  }
}

function healPlayerFromDamage(amount) {
  const player = game.player;
  if (game.state !== "playing" || player.lifeSteal <= 0 || amount <= 0 || player.hp <= 0) return;

  const heal = Math.min(8, amount * player.lifeSteal);
  if (heal <= 0.05) return;

  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  const gained = player.hp - before;
  if (gained >= 2) {
    addFloatingText(player.x, player.y - 36, `+${Math.round(gained)}`, "#8bffd8");
  }
}

function damagePlayer(amount) {
  const player = game.player;
  if (player.invulnerable > 0 || game.state !== "playing") return;

  if (player.shield > 0) {
    player.shield = 0;
    player.invulnerable = 0.34;
    createRing(player.x, player.y, 92, "#55f7ff", 0.34, 4);
    burst(player.x, player.y, 18, "#55f7ff", 160, 0.4);
    return;
  }

  player.hp = Math.max(0, player.hp - amount);
  player.invulnerable = 0.52;
  game.shake = 1;
  addFloatingText(player.x, player.y - 28, `-${Math.round(amount)}`, "#ff7783");
  burst(player.x, player.y, 14, "#ff5e7d", 150, 0.42);

  if (player.hp <= 0) {
    finishGame("defeat", "你被虚空吞噬了");
  }
}

function dropExperience(enemy) {
  const value = ENEMY_TYPES[enemy.type].xp;
  game.expOrbs.push({
    x: enemy.x + randomRange(-8, 8),
    y: enemy.y + randomRange(-8, 8),
    radius: enemy.type === "brute" ? 9 : 7,
    value,
    pulse: randomRange(0, Math.PI * 2),
    active: false,
  });
}

function addExperience(value) {
  const player = game.player;
  player.xp += value;
  tryLevelUp();
}

function tryLevelUp() {
  const player = game.player;
  if (game.state !== "playing" || player.xp < player.xpToNext) return;

  player.xp -= player.xpToNext;
  player.level += 1;
  player.xpToNext = Math.round(8 + player.level * 4.5 + Math.pow(player.level, 1.32));
  openLevelUp();
}

function openLevelUp(mode = "level") {
  game.upgradeMode = mode;
  game.state = "levelUpPaused";
  const character = getCharacter();
  ui.levelUpTitle.textContent = mode === "opening" ? character.openingTitle : character.levelTitle;
  game.upgrades = pickUpgradeOptions(mode);
  ui.upgradeOptions.innerHTML = "";

  game.upgrades.forEach((upgrade, index) => {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    button.innerHTML = `
      <small>${mode === "opening" ? "开局" : upgrade.type}</small>
      <h2>${upgrade.name}</h2>
      <p>${upgrade.desc}</p>
    `;
    button.addEventListener("click", () => chooseUpgrade(index));
    ui.upgradeOptions.appendChild(button);
  });

  ui.levelUpPanel.classList.remove("hidden");
}

function pickUpgradeOptions(mode = "level") {
  const player = game.player;
  const characterSkillIds = CHARACTER_SKILL_IDS[player.characterId] || CHARACTER_SKILL_IDS.storm;
  const allowedSkillIds = [...characterSkillIds, ...COMMON_SKILL_IDS];
  const skillUpgrades = allowedSkillIds.map((id) => createSkillUpgrade(id)).filter(Boolean);

  if (mode === "opening") {
    const required = characterSkillIds.map((id) => createSkillUpgrade(id)).filter(Boolean);
    const common = COMMON_SKILL_IDS.map((id) => createSkillUpgrade(id)).filter(Boolean);
    shuffle(common);
    return [...required, ...common].slice(0, 3);
  }

  const pool = [...skillUpgrades];
  if (player.ultimate.level < 6) {
    pool.push({
      ...ULTIMATE_UPGRADE,
      name: player.ultimate.level > 0 ? `${ULTIMATE_UPGRADE.name} +1` : `解锁 ${ULTIMATE_UPGRADE.name}`,
    });
  }

  for (const upgrade of STAT_UPGRADES) {
    if (upgrade.isAvailable && !upgrade.isAvailable(player)) continue;
    pool.push({
      ...upgrade,
      kind: "stat",
      name: typeof upgrade.name === "function" ? upgrade.name(player) : upgrade.name,
    });
  }

  shuffle(pool);
  return pool.slice(0, 3);
}

function createSkillUpgrade(id) {
  const player = game.player;
  const meta = SKILLS[id];
  if (!meta || player.skills[id] >= 8) return null;
  const currentLevel = player.skills[id];
  return {
    id,
    kind: "skill",
    type: meta.type,
    name: currentLevel > 0 ? `${meta.name} +1` : `解锁 ${meta.name}`,
    desc: meta.desc,
    apply(target) {
      target.skills[id] += 1;
      if (id === "shield") {
        target.shield = 1;
        target.shieldTimer = getShieldCooldown(target.skills.shield);
      }
    },
  };
}

function chooseUpgrade(index) {
  const upgrade = game.upgrades[index];
  if (!upgrade) return;

  upgrade.apply(game.player);
  ui.levelUpPanel.classList.add("hidden");
  showBanner(upgrade.name, 1.45);
  game.state = "playing";

  if (game.upgradeMode === "opening") {
    showBanner(PHASES.phase1.banner, 2.8);
  } else {
    tryLevelUp();
  }
}

function finishGame(state, reason) {
  if (game.state === "victory" || game.state === "defeat") return;
  game.state = state;
  game.resultReason = reason;
  ui.resultKicker.textContent = state === "victory" ? "胜利" : "失败";
  ui.resultTitle.textContent = reason;
  ui.resultLevel.textContent = game.player.level.toString();
  ui.resultKills.textContent = game.kills.toString();
  ui.resultTime.textContent = formatTime(Math.min(game.elapsed, GAME_DURATION));
  ui.resultPanel.classList.remove("hidden");
}

function showBanner(text, duration = 2) {
  ui.stageBanner.textContent = text;
  ui.stageBanner.classList.add("visible");
  game.bannerTimer = duration;
}

function updateUI() {
  const player = game.player;
  const boss = game.boss;
  const healthRatio = clamp(player.hp / player.maxHp, 0, 1);
  const xpRatio = clamp(player.xp / player.xpToNext, 0, 1);
  const bossRatio = clamp(boss.hp / boss.maxHp, 0, 1);
  const remaining = Math.max(0, GAME_DURATION - game.elapsed);

  ui.healthText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}${player.shield > 0 ? "  护盾" : ""}`;
  ui.healthFill.style.transform = `scaleX(${healthRatio})`;
  ui.xpText.textContent = `Lv.${player.level}`;
  ui.xpFill.style.transform = `scaleX(${xpRatio})`;
  ui.timeText.textContent = formatTime(remaining);
  ui.ultimateText.textContent = player.ultimate.charges > 0 ? `R x${player.ultimate.charges}` : "未充能";
  ui.ultimatePill.classList.toggle("ready", player.ultimate.charges > 0 && game.state === "playing");
  ui.ultimatePill.classList.toggle("disabled", player.ultimate.charges <= 0 || game.state !== "playing");
  ui.bossPhaseText.textContent = PHASES[game.phase].label;
  ui.bossFill.style.transform = `scaleX(${bossRatio})`;

  if (game.bannerTimer <= 0) {
    ui.stageBanner.classList.remove("visible");
  }
}

function drawGame() {
  const { width, height } = game.view;
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  if (game.shake > 0) {
    ctx.translate(randomRange(-game.shake * 7, game.shake * 7), randomRange(-game.shake * 7, game.shake * 7));
  }

  ctx.translate(-game.camera.x, -game.camera.y);
  drawBackground();
  drawExpOrbs();
  drawHazards();
  drawUltimateEffect();
  drawProjectiles();
  drawEnemies();
  if (isVisible(game.boss.x, game.boss.y, game.boss.radius + RENDER_MARGIN)) {
    drawBoss();
  }
  drawPlayer();
  drawEffects();

  ctx.restore();
}

function drawBackground() {
  const cam = game.camera;
  const view = game.view;
  ctx.fillStyle = "#110b1b";
  ctx.fillRect(cam.x, cam.y, view.width, view.height);

  const grid = 160;
  const startX = Math.floor(cam.x / grid) * grid;
  const startY = Math.floor(cam.y / grid) * grid;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.beginPath();
  for (let x = startX; x < cam.x + view.width + grid; x += grid) {
    ctx.moveTo(x, cam.y);
    ctx.lineTo(x, cam.y + view.height);
  }
  for (let y = startY; y < cam.y + view.height + grid; y += grid) {
    ctx.moveTo(cam.x, y);
    ctx.lineTo(cam.x + view.width, y);
  }
  ctx.stroke();

  for (const decor of game.decorations) {
    if (!isVisible(decor.x, decor.y, decor.size + RENDER_MARGIN)) continue;
    if (decor.kind === "rift") drawRift(decor);
    if (decor.kind === "circle") drawMagicCircle(decor);
    if (decor.kind === "ember") drawEmber(decor);
    if (decor.kind === "banner") drawBrokenBanner(decor);
  }

  const vignette = ctx.createRadialGradient(
    game.player.x,
    game.player.y,
    80,
    game.player.x,
    game.player.y,
    Math.max(game.view.width, game.view.height) * 0.72,
  );
  vignette.addColorStop(0, "rgba(53, 213, 200, 0.045)");
  vignette.addColorStop(0.7, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.32)");
  ctx.fillStyle = vignette;
  ctx.fillRect(game.camera.x, game.camera.y, game.view.width, game.view.height);
}

function drawRift(decor) {
  ctx.save();
  ctx.translate(decor.x, decor.y);
  ctx.rotate(decor.rotation);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(168, 92, 255, 0.26)";
  ctx.shadowColor = "rgba(168, 92, 255, 0.42)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(-decor.size * 0.6, 0);
  for (let i = 0; i < 6; i += 1) {
    const x = -decor.size * 0.45 + (decor.size * 0.9 * i) / 5;
    const y = (i % 2 === 0 ? -1 : 1) * randomLike(decor.seed + i) * decor.size * 0.24;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(decor.size * 0.6, 0);
  ctx.stroke();
  ctx.restore();
}

function drawMagicCircle(decor) {
  ctx.save();
  ctx.translate(decor.x, decor.y);
  ctx.rotate(decor.rotation + game.elapsed * 0.02);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(53, 213, 200, 0.16)";
  ctx.beginPath();
  ctx.arc(0, 0, decor.size, 0, Math.PI * 2);
  ctx.moveTo(-decor.size, 0);
  ctx.lineTo(decor.size, 0);
  ctx.moveTo(0, -decor.size);
  ctx.lineTo(0, decor.size);
  ctx.stroke();
  ctx.restore();
}

function drawEmber(decor) {
  const pulse = 0.55 + Math.sin(game.elapsed * 2 + decor.seed) * 0.25;
  ctx.fillStyle = `rgba(255, 180, 96, ${0.12 + pulse * 0.12})`;
  ctx.beginPath();
  ctx.arc(decor.x, decor.y, decor.size * pulse, 0, Math.PI * 2);
  ctx.fill();
}

function drawBrokenBanner(decor) {
  ctx.save();
  ctx.translate(decor.x, decor.y);
  ctx.rotate(decor.rotation);
  ctx.strokeStyle = "rgba(180, 170, 150, 0.18)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -decor.size);
  ctx.lineTo(0, decor.size * 0.5);
  ctx.stroke();
  ctx.fillStyle = "rgba(200, 68, 104, 0.18)";
  ctx.beginPath();
  ctx.moveTo(0, -decor.size);
  ctx.lineTo(decor.size * 0.58, -decor.size * 0.75);
  ctx.lineTo(decor.size * 0.18, -decor.size * 0.34);
  ctx.lineTo(decor.size * 0.58, -decor.size * 0.05);
  ctx.lineTo(0, -decor.size * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawExpOrbs() {
  for (const orb of game.expOrbs) {
    if (!isVisible(orb.x, orb.y, orb.radius + RENDER_MARGIN)) continue;
    const pulse = 0.82 + Math.sin(orb.pulse) * 0.18;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "#35d5c8";
    ctx.shadowBlur = orb.active ? 18 : 10;
    ctx.fillStyle = orb.value >= 5 ? "#ffd36b" : "#35d5c8";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHazards() {
  for (const hazard of game.hazards) {
    if (!isVisible(hazard.x, hazard.y, hazard.radius + RENDER_MARGIN)) continue;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    if (!hazard.exploded) {
      const progress = clamp(1 - hazard.delay / 1.1, 0, 1);
      ctx.strokeStyle = `rgba(184, 103, 255, ${0.35 + progress * 0.45})`;
      ctx.fillStyle = `rgba(184, 103, 255, ${0.05 + progress * 0.12})`;
      ctx.lineWidth = 3 + progress * 3;
      ctx.beginPath();
      ctx.arc(0, 0, hazard.radius * (0.85 + progress * 0.15), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-hazard.radius * 0.75, 0);
      ctx.lineTo(hazard.radius * 0.75, 0);
      ctx.moveTo(0, -hazard.radius * 0.75);
      ctx.lineTo(0, hazard.radius * 0.75);
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(184, 103, 255, 0.22)";
      ctx.beginPath();
      ctx.arc(0, 0, hazard.radius + 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawUltimateEffect() {
  const player = game.player;
  const timer = player.ultimate.castTimer;
  if (timer <= 0) return;

  const alpha = clamp(timer / 0.82, 0, 1);
  const radius = 460 + player.ultimate.level * 72;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const field = ctx.createRadialGradient(player.x, player.y, 30, player.x, player.y, radius);
  field.addColorStop(0, `rgba(255, 226, 122, ${0.24 * alpha})`);
  field.addColorStop(0.42, `rgba(120, 244, 255, ${0.1 * alpha})`);
  field.addColorStop(1, "rgba(255, 226, 122, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 226, 122, ${0.62 * alpha})`;
  ctx.lineWidth = 5;
  for (let i = 0; i < 8; i += 1) {
    const angle = game.elapsed * 2 + (Math.PI * 2 * i) / 8;
    ctx.beginPath();
    ctx.moveTo(player.x + Math.cos(angle) * 34, player.y + Math.sin(angle) * 34);
    ctx.lineTo(player.x + Math.cos(angle + 0.16) * radius * 0.92, player.y + Math.sin(angle + 0.16) * radius * 0.92);
    ctx.stroke();
  }
  ctx.restore();
}

function drawProjectiles() {
  for (const projectile of game.hostileProjectiles) {
    if (!isVisible(projectile.x, projectile.y, projectile.radius + RENDER_MARGIN)) continue;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = projectile.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const projectile of game.playerProjectiles) {
    if (!isVisible(projectile.x, projectile.y, projectile.radius + RENDER_MARGIN)) continue;
    if (projectile.kind === "tornado") {
      drawTornadoProjectile(projectile);
      continue;
    }

    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.spin);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "#9ffff4";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#9ffff4";
    ctx.beginPath();
    ctx.ellipse(0, 0, projectile.radius * 1.7, projectile.radius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawTornadoProjectile(projectile) {
  const sheet = SPRITE_SHEETS.windman;
  const frame = sheet.frames.tornado[Math.floor(game.elapsed * 10) % sheet.frames.tornado.length];
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(projectile.angle || Math.atan2(projectile.vy, projectile.vx));
  ctx.globalCompositeOperation = "lighter";

  if (sheet.loaded && sheet.source) {
    const height = 92;
    const width = (frame.w / frame.h) * height;
    ctx.globalAlpha = 0.86;
    ctx.drawImage(sheet.source, frame.x, frame.y, frame.w, frame.h, -width * 0.5, -height * 0.5, width, height);
  } else {
    ctx.strokeStyle = "rgba(126, 235, 255, 0.88)";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#7eebff";
    ctx.shadowBlur = 18;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 42 - i * 8, 12 + i * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    if (!isVisible(enemy.x, enemy.y, enemy.radius + RENDER_MARGIN)) continue;
    const type = ENEMY_TYPES[enemy.type];
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius * 0.72, enemy.radius * 1.1, enemy.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.type === "claw") {
      drawClawEnemy(enemy, type);
    } else if (enemy.type === "archer") {
      drawArcherEnemy(enemy, type);
    } else if (enemy.type === "brute") {
      drawBruteEnemy(enemy, type);
    } else if (enemy.type === "bat") {
      drawBatEnemy(enemy, type);
    } else if (enemy.type === "guard") {
      drawGuardEnemy(enemy, type);
    } else {
      drawBomberEnemy(enemy, type);
    }

    if (enemy.slow > 0) {
      ctx.strokeStyle = "rgba(137, 223, 255, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
    if (ratio < 1) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
      ctx.fillRect(-enemy.radius, -enemy.radius - 12, enemy.radius * 2, 4);
      ctx.fillStyle = type.color;
      ctx.fillRect(-enemy.radius, -enemy.radius - 12, enemy.radius * 2 * ratio, 4);
    }

    ctx.restore();
  }
}

function drawClawEnemy(enemy, type) {
  ctx.fillStyle = type.color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 2, enemy.radius * 0.68, enemy.radius * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffccdf";
  ctx.beginPath();
  ctx.arc(0, -enemy.radius * 0.72, enemy.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 235, 245, 0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-enemy.radius * 0.42, 0);
  ctx.lineTo(-enemy.radius * 1.12, enemy.radius * 0.34);
  ctx.moveTo(enemy.radius * 0.42, 0);
  ctx.lineTo(enemy.radius * 1.12, enemy.radius * 0.34);
  ctx.stroke();
}

function drawArcherEnemy(enemy, type) {
  ctx.fillStyle = type.color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.radius * 1.08);
  ctx.lineTo(enemy.radius * 0.72, -enemy.radius * 0.18);
  ctx.lineTo(enemy.radius * 0.4, enemy.radius * 0.9);
  ctx.lineTo(-enemy.radius * 0.4, enemy.radius * 0.9);
  ctx.lineTo(-enemy.radius * 0.72, -enemy.radius * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 240, 190, 0.86)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(enemy.radius * 0.24, -enemy.radius * 0.1, enemy.radius * 0.86, -1.15, 1.15);
  ctx.moveTo(enemy.radius * 0.24, -enemy.radius * 0.92);
  ctx.lineTo(enemy.radius * 0.24, enemy.radius * 0.72);
  ctx.stroke();
}

function drawBruteEnemy(enemy, type) {
  ctx.fillStyle = type.color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(20, 12, 26, 0.48)";
  ctx.beginPath();
  ctx.arc(-enemy.radius * 0.25, -enemy.radius * 0.15, enemy.radius * 0.25, 0, Math.PI * 2);
  ctx.arc(enemy.radius * 0.25, -enemy.radius * 0.15, enemy.radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function drawBatEnemy(enemy, type) {
  const flap = Math.sin(game.elapsed * 12 + enemy.seed) * enemy.radius * 0.24;
  ctx.fillStyle = type.color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.radius * 0.35);
  ctx.lineTo(-enemy.radius * 1.65, -enemy.radius * 0.65 + flap);
  ctx.lineTo(-enemy.radius * 0.65, enemy.radius * 0.6);
  ctx.lineTo(0, enemy.radius * 0.35);
  ctx.lineTo(enemy.radius * 0.65, enemy.radius * 0.6);
  ctx.lineTo(enemy.radius * 1.65, -enemy.radius * 0.65 - flap);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f6d7ff";
  ctx.beginPath();
  ctx.arc(0, -enemy.radius * 0.45, enemy.radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

function drawGuardEnemy(enemy, type) {
  ctx.fillStyle = "#23264a";
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.radius * 1.08);
  ctx.lineTo(enemy.radius * 0.72, -enemy.radius * 0.62);
  ctx.lineTo(enemy.radius * 0.58, enemy.radius * 0.86);
  ctx.lineTo(0, enemy.radius * 1.12);
  ctx.lineTo(-enemy.radius * 0.58, enemy.radius * 0.86);
  ctx.lineTo(-enemy.radius * 0.72, -enemy.radius * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = type.color;
  ctx.beginPath();
  ctx.arc(0, -enemy.radius * 0.98, enemy.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(180, 194, 255, 0.82)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-enemy.radius * 0.92, -enemy.radius * 0.1);
  ctx.lineTo(-enemy.radius * 1.34, enemy.radius * 0.76);
  ctx.moveTo(enemy.radius * 0.92, -enemy.radius * 0.1);
  ctx.lineTo(enemy.radius * 1.34, enemy.radius * 0.76);
  ctx.stroke();
}

function drawBomberEnemy(enemy, type) {
  const pulse = 0.82 + Math.sin(game.elapsed * 8 + enemy.seed) * 0.18;
  ctx.fillStyle = "#3f2b21";
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = type.color;
  ctx.shadowColor = type.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius * 0.42 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 236, 160, 0.72)";
  ctx.beginPath();
  ctx.moveTo(-enemy.radius * 0.88, enemy.radius * 0.54);
  ctx.lineTo(-enemy.radius * 1.32, enemy.radius * 0.92);
  ctx.moveTo(enemy.radius * 0.88, enemy.radius * 0.54);
  ctx.lineTo(enemy.radius * 1.32, enemy.radius * 0.92);
  ctx.stroke();
}

function drawBoss() {
  const boss = game.boss;
  const weak = game.phase === "weak";
  ctx.save();
  ctx.translate(boss.x, boss.y);

  const auraRadius = boss.radius * (2.1 + Math.sin(game.elapsed * 4) * 0.08 + boss.weakPulse * 0.12);
  const aura = ctx.createRadialGradient(0, 0, boss.radius * 0.5, 0, 0, auraRadius);
  aura.addColorStop(0, weak ? "rgba(255, 211, 107, 0.22)" : "rgba(168, 92, 255, 0.32)");
  aura.addColorStop(1, "rgba(168, 92, 255, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.beginPath();
  ctx.ellipse(0, boss.radius * 0.8, boss.radius * 1.25, boss.radius * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.9)" : "rgba(188, 113, 255, 0.82)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(boss.radius * 0.78, -boss.radius * 1.28);
  ctx.lineTo(boss.radius * 1.24, boss.radius * 1.18);
  ctx.stroke();
  ctx.fillStyle = weak ? "#ffd36b" : "#b767ff";
  ctx.shadowColor = weak ? "#ffd36b" : "#b767ff";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(boss.radius * 0.74, -boss.radius * 1.34, boss.radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = weak ? "#5f4560" : "#4a2070";
  ctx.strokeStyle = weak ? "#ffd36b" : "#b767ff";
  ctx.lineWidth = weak ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(0, -boss.radius * 1.05);
  ctx.bezierCurveTo(boss.radius * 0.9, -boss.radius * 0.6, boss.radius * 0.95, boss.radius * 0.75, 0, boss.radius);
  ctx.bezierCurveTo(-boss.radius * 0.95, boss.radius * 0.75, -boss.radius * 0.9, -boss.radius * 0.6, 0, -boss.radius * 1.05);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.6)" : "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-boss.radius * 0.18, -boss.radius * 0.82);
  ctx.lineTo(-boss.radius * 0.5, boss.radius * 0.75);
  ctx.moveTo(boss.radius * 0.18, -boss.radius * 0.82);
  ctx.lineTo(boss.radius * 0.5, boss.radius * 0.75);
  ctx.stroke();

  ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.85)" : "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-boss.radius * 0.38, -boss.radius * 1.03);
  ctx.lineTo(-boss.radius * 0.88, -boss.radius * 1.55);
  ctx.moveTo(boss.radius * 0.38, -boss.radius * 1.03);
  ctx.lineTo(boss.radius * 0.88, -boss.radius * 1.55);
  ctx.stroke();

  ctx.fillStyle = weak ? "#ffd36b" : "#f5d9ff";
  ctx.shadowColor = weak ? "#ffd36b" : "#b767ff";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(-boss.radius * 0.26, -boss.radius * 0.25, 5, 0, Math.PI * 2);
  ctx.arc(boss.radius * 0.26, -boss.radius * 0.25, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.92)" : "rgba(255, 94, 170, 0.7)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-boss.radius * 0.54, boss.radius * 0.22);
  ctx.quadraticCurveTo(0, boss.radius * 0.48, boss.radius * 0.54, boss.radius * 0.22);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const player = game.player;
  const shieldLevel = player.skills.shield;

  if (player.skills.storm > 0) {
    const radius = 105 + player.skills.storm * 15;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(53, 213, 200, 0.23)";
    ctx.fillStyle = "rgba(53, 213, 200, 0.045)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius + Math.sin(game.elapsed * 3) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (player.skills.orbs > 0) {
    const count = Math.min(6, 2 + Math.floor(player.skills.orbs / 2));
    const orbitRadius = 56 + player.skills.orbs * 2.8;
    const time = game.elapsed * (2.25 + player.skills.orbs * 0.06);
    for (let i = 0; i < count; i += 1) {
      const angle = time + (Math.PI * 2 * i) / count;
      const x = player.x + Math.cos(angle) * orbitRadius;
      const y = player.y + Math.sin(angle) * orbitRadius;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "#ffe27a";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  if (!drawCharacterSprite(player)) {
    drawFallbackPlayerBody(player);
  }

  if (player.shield > 0 || shieldLevel > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = player.shield > 0 ? "rgba(85, 247, 255, 0.72)" : "rgba(85, 247, 255, 0.18)";
    ctx.lineWidth = player.shield > 0 ? 3 : 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 12 + Math.sin(game.elapsed * 5) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCharacterSprite(player) {
  if (player.characterId === "windman") {
    return drawWindmanSprite(player);
  }
  return drawStormSprite(player);
}

function drawStormSprite(player) {
  const sprite = SPRITE_SHEETS.storm;
  if (!sprite.loaded || !sprite.source) return false;

  const moving = Math.hypot(player.velocityX, player.velocityY) > 12;
  const frames = moving ? sprite.frames.move : sprite.frames.idle;
  const frameRate = moving ? 8.5 : 2.2;
  const frame = frames[Math.floor(game.elapsed * frameRate) % frames.length];
  const blink = player.invulnerable > 0 && Math.sin(game.elapsed * 38) > 0.2;
  const speedRatio = clamp(Math.hypot(player.velocityX, player.velocityY) / (PLAYER_BASE_SPEED * player.speedMultiplier || 1), 0, 1);
  const bob = Math.sin(game.elapsed * (moving ? 10 : 3.2)) * (moving ? 2.6 : 1.2);
  const lean = clamp(player.velocityX / (PLAYER_BASE_SPEED * player.speedMultiplier || 1), -1, 1) * 0.13;
  const breathe = 1 + Math.sin(game.elapsed * 3.2) * 0.018;
  const visualHeight = 74 + speedRatio * 3;
  const scale = visualHeight / frame.h;
  const drawWidth = frame.w * scale;
  const drawHeight = frame.h * scale * breathe;
  const footY = player.radius * 1.08;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.beginPath();
  ctx.ellipse(0, player.radius * 0.9, player.radius * 1.38, player.radius * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bob);
  ctx.rotate(lean);
  ctx.scale(player.facingSign, 1);
  ctx.globalAlpha = blink ? 0.46 : 1;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    sprite.source,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -drawWidth * frame.anchorX,
    footY - drawHeight * frame.anchorY,
    drawWidth,
    drawHeight,
  );

  const staffPulse = 0.72 + Math.sin(game.elapsed * 8) * 0.18;
  ctx.globalAlpha = blink ? 0.34 : 1;
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(185, 251, 255, ${0.36 + staffPulse * 0.24})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(23, -24, 12 + staffPulse * 2, -0.5, Math.PI * 1.25);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 226, 122, ${0.5 + staffPulse * 0.28})`;
  ctx.shadowColor = "#ffe27a";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(26, -26, 4.2 + staffPulse * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return true;
}

function drawWindmanSprite(player) {
  const sprite = SPRITE_SHEETS.windman;
  if (!sprite.loaded || !sprite.source) return false;

  const moving = Math.hypot(player.velocityX, player.velocityY) > 12;
  const dashing = Boolean(player.dash.active) || player.dash.slashTimer > 0;
  const frames = dashing ? sprite.frames.slash : moving ? sprite.frames.move : sprite.frames.idle;
  const frameRate = dashing ? 16 : moving ? 8.5 : 2.4;
  const frame = frames[Math.floor(game.elapsed * frameRate) % frames.length];
  const blink = player.invulnerable > 0 && Math.sin(game.elapsed * 38) > 0.2 && !dashing;
  const speedRatio = clamp(Math.hypot(player.velocityX, player.velocityY) / (PLAYER_BASE_SPEED * player.speedMultiplier || 1), 0, 1);
  const bob = Math.sin(game.elapsed * (moving ? 10 : 3.2)) * (moving ? 2.2 : 1.1);
  const lean = clamp(player.velocityX / (PLAYER_BASE_SPEED * player.speedMultiplier || 1), -1, 1) * 0.16;
  const visualWidth = dashing ? 96 : 82;
  const scale = visualWidth / frame.w;
  const drawWidth = frame.w * scale;
  const drawHeight = frame.h * scale;
  const footY = player.radius * 1.24;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.beginPath();
  ctx.ellipse(0, player.radius * 0.96, player.radius * 1.45, player.radius * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  if (dashing) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(126, 235, 255, 0.58)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-player.facingSign * 42, -18);
    ctx.quadraticCurveTo(-player.facingSign * 6, -3, player.facingSign * 42, 16);
    ctx.stroke();
    ctx.restore();
  }

  for (let i = dashing ? 2 : 0; i > 0; i -= 1) {
    ctx.save();
    ctx.translate(-Math.cos(player.facingAngle) * i * 16, -Math.sin(player.facingAngle) * i * 16);
    ctx.globalAlpha = 0.18 * i;
    ctx.scale(player.facingSign, 1);
    ctx.drawImage(sprite.source, frame.x, frame.y, frame.w, frame.h, -drawWidth * frame.anchorX, footY - drawHeight * frame.anchorY, drawWidth, drawHeight);
    ctx.restore();
  }

  ctx.translate(0, bob);
  ctx.rotate(lean);
  ctx.scale(player.facingSign, 1);
  ctx.globalAlpha = blink ? 0.46 : 1;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    sprite.source,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -drawWidth * frame.anchorX,
    footY - drawHeight * frame.anchorY,
    drawWidth,
    drawHeight,
  );

  const pulse = 0.65 + Math.sin(game.elapsed * 9) * 0.2;
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(126, 235, 255, ${0.34 + pulse * 0.3})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(14, -10, 22 + pulse * 3, -0.5, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();

  return true;
}

function drawFallbackPlayerBody(player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facingAngle * 0.08);
  const blink = player.invulnerable > 0 && Math.sin(game.elapsed * 38) > 0.2;
  ctx.globalAlpha = blink ? 0.46 : 1;

  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.beginPath();
  ctx.ellipse(0, player.radius * 0.78, player.radius * 1.15, player.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#173f56";
  ctx.strokeStyle = "#7ff7ff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -player.radius * 0.65);
  ctx.lineTo(player.radius * 0.86, player.radius * 0.88);
  ctx.quadraticCurveTo(0, player.radius * 1.26, -player.radius * 0.86, player.radius * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2bd4c9";
  ctx.beginPath();
  ctx.ellipse(0, -player.radius * 0.02, player.radius * 0.55, player.radius * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f7f0ff";
  ctx.beginPath();
  ctx.arc(0, -player.radius * 0.72, player.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(185, 251, 255, 0.9)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(player.radius * 0.64, -player.radius * 0.62);
  ctx.lineTo(player.radius * 1.18, player.radius * 0.82);
  ctx.stroke();

  ctx.fillStyle = "#ffe27a";
  ctx.shadowColor = "#ffe27a";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(player.radius * 1.22, player.radius * 0.88, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#ffd36b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-player.radius * 0.78, player.radius * 0.2);
  ctx.quadraticCurveTo(0, player.radius * 0.82, player.radius * 0.78, player.radius * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawEffects() {
  for (const ring of game.rings) {
    if (!isVisible(ring.x, ring.y, ring.radius + RENDER_MARGIN)) continue;
    const alpha = clamp(ring.life / ring.maxLife, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = colorWithAlpha(ring.color, alpha * 0.85);
    ctx.lineWidth = ring.lineWidth;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const bolt of game.bolts) {
    if (!isVisible((bolt.x1 + bolt.x2) / 2, (bolt.y1 + bolt.y2) / 2, Math.hypot(bolt.x1 - bolt.x2, bolt.y1 - bolt.y2) * 0.5 + RENDER_MARGIN)) continue;
    const alpha = clamp(bolt.life / bolt.maxLife, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = colorWithAlpha(bolt.color, alpha);
    ctx.lineWidth = 3;
    ctx.shadowColor = bolt.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(bolt.x1, bolt.y1);
    const midX = (bolt.x1 + bolt.x2) / 2 + randomRange(-8, 8);
    const midY = (bolt.y1 + bolt.y2) / 2 + randomRange(-8, 8);
    ctx.lineTo(midX, midY);
    ctx.lineTo(bolt.x2, bolt.y2);
    ctx.stroke();
    ctx.restore();
  }

  for (const particle of game.particles) {
    if (!isVisible(particle.x, particle.y, particle.radius + RENDER_MARGIN)) continue;
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = colorWithAlpha(particle.color, alpha);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * (0.6 + alpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const text of game.floatingTexts) {
    if (!isVisible(text.x, text.y, RENDER_MARGIN)) continue;
    const alpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.font = "700 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text.text, text.x, text.y);
    ctx.restore();
  }
}

function createSpriteSheets() {
  return {
    storm: createSpriteSheet("assets/hero.png", true, {
      idle: [
        { x: 180, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
        { x: 275, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
      ],
      move: [
        { x: 180, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
        { x: 275, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
        { x: 275, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
        { x: 180, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
      ],
    }),
    windman: createSpriteSheet("assets/windman.png", false, {
      idle: [
        { x: 176, y: 512, w: 508, h: 440, anchorX: 0.5, anchorY: 0.84 },
        { x: 608, y: 584, w: 360, h: 356, anchorX: 0.5, anchorY: 0.85 },
      ],
      move: [
        { x: 176, y: 512, w: 508, h: 440, anchorX: 0.5, anchorY: 0.84 },
        { x: 608, y: 584, w: 360, h: 356, anchorX: 0.5, anchorY: 0.85 },
      ],
      slash: [
        { x: 608, y: 584, w: 360, h: 356, anchorX: 0.5, anchorY: 0.85 },
        { x: 176, y: 512, w: 508, h: 440, anchorX: 0.5, anchorY: 0.84 },
      ],
      tornado: [
        { x: 1040, y: 156, w: 460, h: 416 },
        { x: 1168, y: 572, w: 340, h: 380 },
      ],
    }),
  };
}

function createSpriteSheet(src, chromaKey, frames) {
  const image = new Image();
  const sprite = {
    image,
    source: null,
    loaded: false,
    failed: false,
    frames,
  };

  image.onload = () => {
    sprite.source = chromaKey ? createChromaKeyedHeroSheet(image) : image;
    sprite.loaded = true;
  };
  image.onerror = () => {
    sprite.failed = true;
  };
  image.src = src;

  return sprite;
}

function createChromaKeyedHeroSheet(image) {
  const sheet = document.createElement("canvas");
  sheet.width = image.naturalWidth || image.width;
  sheet.height = image.naturalHeight || image.height;
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.drawImage(image, 0, 0);

  try {
    const pixels = sheetCtx.getImageData(0, 0, sheet.width, sheet.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);

      if (max < 14) {
        data[i + 3] = 0;
      } else if (max < 30 && max - min < 10) {
        data[i + 3] = Math.round(((max - 14) / 16) * 190);
      }
    }
    sheetCtx.putImageData(pixels, 0, 0);
    return sheet;
  } catch (error) {
    return image;
  }
}

function createDecorations() {
  const rng = mulberry32(73051);
  const decorations = [];

  for (let i = 0; i < 64; i += 1) {
    decorations.push({
      kind: "rift",
      x: rng() * WORLD.width,
      y: rng() * WORLD.height,
      size: 48 + rng() * 82,
      rotation: rng() * Math.PI * 2,
      seed: rng() * 1000,
    });
  }

  for (let i = 0; i < 22; i += 1) {
    decorations.push({
      kind: "circle",
      x: rng() * WORLD.width,
      y: rng() * WORLD.height,
      size: 36 + rng() * 82,
      rotation: rng() * Math.PI * 2,
      seed: rng() * 1000,
    });
  }

  for (let i = 0; i < 72; i += 1) {
    decorations.push({
      kind: "ember",
      x: rng() * WORLD.width,
      y: rng() * WORLD.height,
      size: 3 + rng() * 7,
      rotation: 0,
      seed: rng() * 1000,
    });
  }

  for (let i = 0; i < 18; i += 1) {
    decorations.push({
      kind: "banner",
      x: rng() * WORLD.width,
      y: rng() * WORLD.height,
      size: 28 + rng() * 36,
      rotation: rng() * Math.PI * 2,
      seed: rng() * 1000,
    });
  }

  return decorations;
}

function createRing(x, y, radius, color, life, lineWidth) {
  if (game.rings.length >= MAX_RINGS) {
    game.rings.shift();
  }
  game.rings.push({
    x,
    y,
    radius: radius * 0.38,
    grow: radius / life,
    maxLife: life,
    life,
    color,
    lineWidth,
  });
}

function createBolt(x1, y1, x2, y2, color, life) {
  if (game.bolts.length >= MAX_BOLTS) {
    game.bolts.shift();
  }
  game.bolts.push({
    x1,
    y1,
    x2,
    y2,
    color,
    maxLife: life,
    life,
  });
}

function burst(x, y, count, color, speed, life) {
  for (let i = 0; i < count; i += 1) {
    if (game.particles.length >= MAX_PARTICLES) {
      game.particles.shift();
    }
    const angle = randomRange(0, Math.PI * 2);
    const velocity = randomRange(speed * 0.25, speed);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      radius: randomRange(2, 5),
      color,
      maxLife: randomRange(life * 0.55, life),
      life: randomRange(life * 0.55, life),
    });
  }
}

function addFloatingText(x, y, text, color) {
  if (game.floatingTexts.length >= MAX_FLOATING_TEXTS) {
    game.floatingTexts.shift();
  }
  game.floatingTexts.push({
    x,
    y,
    text,
    color,
    vy: -28,
    maxLife: 0.72,
    life: 0.72,
  });
}

function getShieldCooldown(level) {
  return Math.max(5.2, 11.4 - level * 0.78) * game.player.cooldownMultiplier;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

function colorWithAlpha(color, alpha) {
  if (color.startsWith("#")) {
    const r = Number.parseInt(color.slice(1, 3), 16);
    const g = Number.parseInt(color.slice(3, 5), 16);
    const b = Number.parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function isVisible(x, y, margin) {
  return (
    x > game.camera.x - margin &&
    x < game.camera.x + game.view.width + margin &&
    y > game.camera.y - margin &&
    y < game.camera.y + game.view.height + margin
  );
}

function randomLike(seed) {
  return Math.sin(seed * 12.9898) * 0.5 + 0.5;
}

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

window.VoidHuntDebug = {
  snapshot() {
    return {
      state: game.state,
      elapsed: game.elapsed,
      phase: game.phase,
      level: game.player.level,
      hp: game.player.hp,
      ultimate: { ...game.player.ultimate },
      bossHp: game.boss.hp,
      enemies: game.enemies.length,
      kills: game.kills,
      upgradeMode: game.upgradeMode,
    };
  },
};
