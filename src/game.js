import {
  CHEST_HITS_REQUIRED,
  CHARACTER_SKILL_IDS,
  CHARACTERS,
  COMMON_SKILL_IDS,
  ENEMY_QUERY_PADDING,
  ENEMY_SPATIAL_CELL_SIZE,
  ENEMY_TYPES,
  LIFE_STEAL_BALANCE,
  MAX_CHESTS,
  MAX_BOLTS,
  MAX_ENEMIES,
  MAX_FLOATING_TEXTS,
  MAX_PARTICLES,
  MAX_RINGS,
  PHASES,
  PLAYER_BASE_SPEED,
  RENDER_MARGIN,
  SKILLS,
  STAT_UPGRADES,
  ULTIMATES,
  WEAK_START,
  WORLD,
  XP_CURVE,
} from "./config.js?v=20260701-boss-meteors";
import { createSpatialIndex } from "./performance.js";
import { createGameState, createSkillLevels } from "./state.js?v=20260701-boss-meteors";
import { hideStartVideo, updateTouchUltimateButton } from "./ui.js?v=20260701-boss-meteors";
import { clamp, colorWithAlpha, distanceBetween, formatTime, lerp, randomLike, randomRange, shuffle } from "./utils.js";

export function createVoidHuntGame({ canvas, ctx, input, perf, sprites, ui }) {
const SPRITE_SHEETS = sprites;
const enemyIndex = createSpatialIndex(ENEMY_SPATIAL_CELL_SIZE);
let enemyIndexReady = false;
let game = createGameState();
let enemyId = 1;
let chestId = 1;
let resultImagesPreloaded = false;

const RESULT_IMAGES = {
  victory: {
    src: "assets/results/boss-defeat.jpg",
    alt: "暗紫虚空术士战败图",
    caption: "暗紫虚空术士已倒下",
  },
  storm: {
    src: "assets/results/storm-defeat.jpg",
    alt: "风暴之怒战败图",
    caption: "风暴之怒被虚空吞噬",
  },
  windman: {
    src: "assets/results/windman-defeat.jpg",
    alt: "快乐风男战败图",
    caption: "快乐风男倒在风暴中心",
  },
  childzed: {
    src: "assets/results/childzed-defeat.jpg",
    alt: "儿童劫战败图",
    caption: "儿童劫憋笑退场",
  },
};

function resetGame() {
  enemyId = 1;
  chestId = 1;
  enemyIndexReady = false;
  game = createGameState();
  ui.resultPanel.classList.add("hidden");
  ui.resultPanel.classList.remove("result-victory", "result-defeat");
  ui.levelUpPanel.classList.add("hidden");
  ui.characterPanel.classList.add("hidden");
  ui.startPanel.classList.add("hidden");
  startGame();
}

function startGame() {
  if (game.state !== "ready") return;
  preloadResultImages();
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
  player.attackTimer = 0;
  player.skills = createSkillLevels(character.initialSkills);
  player.cooldowns = {
    lightning: 0.45,
    frost: 3.2,
    wind: 1.6,
    shuriken: 0.4,
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
  hideStartVideo(ui);
  openLevelUp("opening");
}

function getCharacter() {
  return CHARACTERS[game.player.characterId] || CHARACTERS.storm;
}

function preloadResultImages() {
  if (resultImagesPreloaded) return;
  resultImagesPreloaded = true;
  for (const config of Object.values(RESULT_IMAGES)) {
    const image = new Image();
    image.decoding = "async";
    image.src = config.src;
  }
}

function getResultImageConfig(state) {
  if (state === "victory") return RESULT_IMAGES.victory;
  return RESULT_IMAGES[game.player.characterId] || RESULT_IMAGES.storm;
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
  updateVisibleBounds();
}

function tick(dt) {
  if (game.state === "playing") {
    updateGame(dt);
  } else {
    updateEffects(dt);
    updateCamera();
  }

  drawGame();
  updateUI();
}

function updateGame(dt) {
  game.elapsed += dt;
  game.bannerTimer = Math.max(0, game.bannerTimer - dt);
  game.shake = Math.max(0, game.shake - dt * 18);
  game.player.ultimate.castTimer = Math.max(0, game.player.ultimate.castTimer - dt);
  game.player.dash.slashTimer = Math.max(0, game.player.dash.slashTimer - dt);
  game.player.attackTimer = Math.max(0, game.player.attackTimer - dt);
  game.timeStopTimer = Math.max(0, game.timeStopTimer - dt);
  if (input.consumeUltimatePressed()) {
    castUltimate();
  }

  const worldStopped = game.timeStopTimer > 0;

  updatePhase();
  updatePlayer(dt);
  if (!worldStopped) {
    updateBoss(dt);
    updateEnemySpawner(dt);
    updateChests(dt);
    updateEnemies(dt);
  }
  rebuildEnemyIndex();
  if (!worldStopped) {
    updateHostileProjectiles(dt);
    updateHazards(dt);
  }
  updateSkills(dt);
  updateUltimateEffects(dt);
  updatePlayerProjectiles(dt);
  updateExpOrbs(dt);
  updateEffects(dt);
  updateCamera();
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
      game.boss.hp = Math.min(game.boss.hp, 5800);
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

  const movement = input.getMovementVector();
  const dx = movement.x;
  const dy = movement.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = PLAYER_BASE_SPEED * player.speedMultiplier * getActiveMonsoonSpeedMultiplier();
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
  boss.hasteTimer = Math.max(0, boss.hasteTimer - dt);
  const speedMultiplier = boss.hasteTimer > 0 ? 1.5 : 1;

  if (distance > boss.radius + player.radius + 28) {
    boss.x += Math.cos(angle) * phase.bossSpeed * speedMultiplier * dt;
    boss.y += Math.sin(angle) * phase.bossSpeed * speedMultiplier * dt;
  }

  boss.x = clamp(boss.x, boss.radius, WORLD.width - boss.radius);
  boss.y = clamp(boss.y, boss.radius, WORLD.height - boss.radius);
  boss.contactCooldown = Math.max(0, boss.contactCooldown - dt);
  boss.weakPulse = Math.max(0, boss.weakPulse - dt);
  boss.castTimer = Math.max(0, boss.castTimer - dt);

  if (distance < boss.radius + player.radius + 2 && boss.contactCooldown <= 0) {
    damagePlayer(game.phase === "weak" ? 24 : 48);
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

  boss.meteorTimer -= dt;
  if (boss.meteorTimer <= 0) {
    createBossMeteors();
    boss.meteorTimer = 6;
    boss.hasteTimer = 2;
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

function updateChests(dt) {
  for (const chest of game.chests) {
    chest.flash = Math.max(0, chest.flash - dt);
    chest.pulse += dt;

    for (const [key, cooldown] of chest.hitCooldowns.entries()) {
      const nextCooldown = cooldown - dt;
      if (nextCooldown <= 0) {
        chest.hitCooldowns.delete(key);
      } else {
        chest.hitCooldowns.set(key, nextCooldown);
      }
    }
  }

  game.chests = game.chests.filter((chest) => !chest.remove);
  game.chestSpawnTimer -= dt;
  if (game.chestSpawnTimer > 0) return;

  if (game.chests.length < MAX_CHESTS) {
    spawnChest(getChestSpawnPoint());
  }
  game.chestSpawnTimer = randomRange(22, 30);
}

function seedOpeningChests() {
  if (game.chests.length > 0) return;
  for (let i = 0; i < 3 && game.chests.length < MAX_CHESTS; i += 1) {
    spawnChest(getChestSpawnPoint());
  }
  game.chestSpawnTimer = randomRange(22, 30);
}

function spawnChest(point) {
  game.chests.push({
    id: chestId,
    x: point.x,
    y: point.y,
    radius: 24,
    hits: 0,
    hitsRequired: CHEST_HITS_REQUIRED,
    hitCooldowns: new Map(),
    flash: 0,
    pulse: randomRange(0, Math.PI * 2),
    remove: false,
  });
  chestId += 1;
}

function getChestSpawnPoint() {
  const player = game.player;
  let fallback = null;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const distance = randomRange(650, 1150);
    const point = {
      x: clamp(player.x + Math.cos(angle) * distance, 80, WORLD.width - 80),
      y: clamp(player.y + Math.sin(angle) * distance, 80, WORLD.height - 80),
    };
    fallback = fallback || point;

    const clearOfBoss = distanceBetween(point, game.boss) > 240;
    const clearOfChests = game.chests.every((chest) => distanceBetween(point, chest) > 180);
    if (clearOfBoss && clearOfChests) return point;
  }

  return fallback || { x: player.x, y: player.y };
}

function hitChest(chest, source, cooldown = 0) {
  if (game.state !== "playing" || chest.remove) return false;
  if (cooldown > 0 && chest.hitCooldowns.get(source) > 0) return false;

  if (cooldown > 0) {
    chest.hitCooldowns.set(source, cooldown);
  }

  chest.hits += 1;
  chest.flash = 0.24;
  createRing(chest.x, chest.y, 46 + chest.hits * 9, "#ffd36b", 0.22, 3);
  burst(chest.x, chest.y, 8, "#ffd36b", 110, 0.3);
  addFloatingText(chest.x, chest.y - 32, `${chest.hits}/${chest.hitsRequired}`, "#ffd36b");

  if (chest.hits >= chest.hitsRequired) {
    openChest(chest);
  }

  return true;
}

function damageChestsInRadius(x, y, radius, source, cooldown = 0) {
  for (const chest of game.chests) {
    if (!chest.remove && distanceBetween({ x, y }, chest) < radius + chest.radius) {
      hitChest(chest, source, cooldown);
    }
  }
}

function openChest(chest) {
  if (chest.remove) return;
  chest.remove = true;
  createRing(chest.x, chest.y, 138, "#ffd36b", 0.45, 5);
  burst(chest.x, chest.y, 34, "#ffd36b", 260, 0.62);

  const roll = Math.random();
  if (roll < 1 / 3) {
    addFloatingText(chest.x, chest.y - 44, "宝箱馈赠", "#ffd36b");
    openLevelUp("chest");
  } else if (roll < 2 / 3) {
    const ultimate = getUltimateConfig();
    addFloatingText(chest.x, chest.y - 44, "免费大招", "#ffe27a");
    showBanner(`宝箱：${ultimate.name}`, 1.45);
    castUltimate({ free: true, levelOverride: Math.max(1, game.player.ultimate.level) });
  } else {
    addFloatingText(chest.x, chest.y - 44, "虚空伏击", "#ff7bb0");
    showBanner("宝箱惊动了虚空", 1.45);
    summonChestEnemies(chest);
  }
}

function summonChestEnemies(chest) {
  const count = game.phase === "phase3" ? 8 : game.phase === "phase2" ? 6 : game.phase === "weak" ? 5 : 4;
  for (let i = 0; i < count && game.enemies.length < MAX_ENEMIES; i += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const distance = randomRange(90, 165);
    spawnEnemy(pickEnemyTypeForPhase(), {
      x: clamp(chest.x + Math.cos(angle) * distance, 40, WORLD.width - 40),
      y: clamp(chest.y + Math.sin(angle) * distance, 40, WORLD.height - 40),
    });
  }
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
    const isMeteor = hazard.kind === "meteor";
    const color = isMeteor ? "#3b184f" : "#b767ff";
    hazard.delay -= dt;
    hazard.life -= dt;

    if (!hazard.exploded && hazard.delay <= 0) {
      hazard.exploded = true;
      hazard.life = isMeteor ? 0.34 : 0.42;
      createRing(hazard.x, hazard.y, hazard.radius + (isMeteor ? 24 : 32), color, 0.34, isMeteor ? 5 : 7);
      burst(hazard.x, hazard.y, isMeteor ? 18 : 34, color, isMeteor ? 190 : 260, isMeteor ? 0.42 : 0.55);

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

  if (player.skills.shuriken > 0 && player.cooldowns.shuriken <= 0) {
    castShuriken();
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

    for (const enemy of queryEnemies(projectile.x, projectile.y, projectile.radius)) {
      if (enemy.dead || projectile.hitIds.has(enemy.id)) continue;
      if (distanceBetween(projectile, enemy) < projectile.radius + enemy.radius) {
        projectile.hitIds.add(enemy.id);
        damageEnemy(enemy, projectile.damage, projectile.kind || "wind");
        burst(enemy.x, enemy.y, projectile.kind === "tornado" ? 12 : 7, getProjectileImpactColor(projectile), projectile.kind === "tornado" ? 170 : 110, 0.3);
        if (projectile.kind !== "tornado") {
          projectile.pierce -= 1;
        }
        if (projectile.pierce <= 0 && projectile.kind !== "tornado") {
          projectile.remove = true;
          break;
        }
      }
    }

    if (!projectile.remove) {
      if (!projectile.hitChestIds) projectile.hitChestIds = new Set();
      for (const chest of game.chests) {
        if (chest.remove || projectile.hitChestIds.has(chest.id)) continue;
        if (distanceBetween(projectile, chest) < projectile.radius + chest.radius) {
          projectile.hitChestIds.add(chest.id);
          hitChest(chest, projectile.kind || "wind");
          if (projectile.kind !== "tornado") {
            projectile.pierce -= 1;
          }
          if (projectile.pierce <= 0 && projectile.kind !== "tornado") {
            projectile.remove = true;
            break;
          }
        }
      }
    }

    if (!projectile.remove && !projectile.hitBoss && distanceBetween(projectile, boss) < projectile.radius + boss.radius) {
      projectile.hitBoss = true;
      damageBoss(projectile.bossDamage ?? projectile.damage * 1.25, projectile.kind || "wind");
      createBolt(projectile.x, projectile.y, boss.x, boss.y, getProjectileImpactColor(projectile), projectile.kind === "tornado" ? 0.16 : 0.1);
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

function getProjectileImpactColor(projectile) {
  if (projectile.kind === "shuriken") return "#ff4768";
  return "#9ffff4";
}

function updateUltimateEffects(dt) {
  for (const effect of game.ultimateEffects) {
    effect.life -= dt;

    if (effect.kind === "monsoon") {
      updateMonsoonEffect(effect, dt);
    } else if (effect.kind === "lastBreath") {
      updateLastBreathEffect(effect, dt);
    } else if (effect.kind === "shadowKill") {
      updateShadowKillEffect(effect, dt);
    }

    if (effect.life <= 0) {
      effect.remove = true;
    }
  }

  game.ultimateEffects = game.ultimateEffects.filter((effect) => !effect.remove);
}

function updateMonsoonEffect(effect, dt) {
  const player = game.player;
  const center = { x: effect.x, y: effect.y };
  effect.pulse += dt * 2.2;
  effect.healText = Math.max(0, effect.healText - dt);

  if (distanceBetween(player, center) < effect.radius + player.radius * 0.35) {
    const gained = healPlayerFlat(effect.healPerSecond * dt, "#8bffd8", false);
    if (gained > 0 && effect.healText <= 0) {
      addFloatingText(player.x, player.y - 40, "+1", "#8bffd8");
      effect.healText = 0.9;
    }
  }

  for (const enemy of queryEnemies(effect.x, effect.y, effect.radius)) {
    if (enemy.dead || distanceBetween(center, enemy) > effect.radius + enemy.radius) continue;
    enemy.monsoonTick = Math.max(0, (enemy.monsoonTick || 0) - dt);
    damageEnemy(enemy, effect.damagePerSecond * dt, "monsoon", false);
    if (enemy.monsoonTick <= 0) {
      enemy.monsoonTick = 0.42;
      burst(enemy.x, enemy.y, 3, "#7effc5", 58, 0.22);
    }
  }

  damageChestsInRadius(effect.x, effect.y, effect.radius, "monsoon", 0.55);

  if (distanceBetween(center, game.boss) < effect.radius + game.boss.radius) {
    damageBoss(effect.damagePerSecond * dt * 1.15, "monsoon");
  }
}

function updateLastBreathEffect(effect, dt) {
  effect.reach += effect.speed * dt;

  for (const enemy of game.enemies) {
    if (enemy.dead || effect.hitIds.has(enemy.id)) continue;
    if (!isTargetInLastBreath(enemy, effect)) continue;
    effect.hitIds.add(enemy.id);
    damageEnemy(enemy, effect.enemyDamage, "lastBreath");
    createBolt(effect.originX, effect.originY, enemy.x, enemy.y, "#9ffff4", 0.14);
    burst(enemy.x, enemy.y, 12, "#9ffff4", 190, 0.34);
  }

  if (!effect.hitBoss && isTargetInLastBreath(game.boss, effect)) {
    effect.hitBoss = true;
    damageBoss(effect.bossDamage, "lastBreath");
    createBolt(effect.originX, effect.originY, game.boss.x, game.boss.y, "#9ffff4", 0.18);
    burst(game.boss.x, game.boss.y, 22, "#9ffff4", 240, 0.42);
  }

  if (effect.reach >= effect.range + effect.width) {
    effect.remove = true;
  }
}

function isTargetInLastBreath(target, effect) {
  const dx = target.x - effect.originX;
  const dy = target.y - effect.originY;
  const cos = Math.cos(effect.angle);
  const sin = Math.sin(effect.angle);
  const forward = dx * cos + dy * sin;
  const side = Math.abs(-dx * sin + dy * cos);
  return (
    forward >= -90 &&
    forward <= Math.min(effect.reach, effect.range) &&
    side <= effect.width * 0.5 + target.radius
  );
}

function updateShadowKillEffect(effect, dt) {
  const age = effect.maxLife - effect.life;
  for (const clone of effect.clones) {
    clone.attackTimer = Math.max(0, clone.attackTimer - dt);
    while (clone.fired < clone.shotTimes.length && age >= clone.shotTimes[clone.fired]) {
      fireShadowCloneShuriken(clone, effect.level);
      clone.fired += 1;
    }
  }
}

function getActiveMonsoonSpeedMultiplier() {
  const player = game.player;
  for (const effect of game.ultimateEffects) {
    if (effect.kind !== "monsoon" || effect.remove) continue;
    if (distanceBetween(player, effect) < effect.radius + player.radius * 0.35) {
      return 1.28;
    }
  }
  return 1;
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
  const lockTarget = getCameraLockTarget();
  const target = lockTarget || game.player;
  const targetX = target.x - view.width / 2;
  const targetY = target.y - view.height / 2;
  const maxX = Math.max(0, WORLD.width - view.width);
  const maxY = Math.max(0, WORLD.height - view.height);

  if (lockTarget) {
    game.camera.x = clamp(targetX, 0, maxX);
    game.camera.y = clamp(targetY, 0, maxY);
  } else {
    game.camera.x = clamp(lerp(game.camera.x, targetX, 0.14), 0, maxX);
    game.camera.y = clamp(lerp(game.camera.y, targetY, 0.14), 0, maxY);
  }
  updateVisibleBounds();
}

function getCameraLockTarget() {
  if (game.timeStopTimer <= 0) return null;
  return game.ultimateEffects.some((effect) => effect.kind === "shadowKill" && !effect.remove)
    ? game.boss
    : null;
}

function updateVisibleBounds() {
  game.visibleBounds.left = game.camera.x - RENDER_MARGIN;
  game.visibleBounds.right = game.camera.x + game.view.width + RENDER_MARGIN;
  game.visibleBounds.top = game.camera.y - RENDER_MARGIN;
  game.visibleBounds.bottom = game.camera.y + game.view.height + RENDER_MARGIN;
}

function rebuildEnemyIndex() {
  enemyIndex.rebuild(game.enemies);
  enemyIndexReady = true;
}

function queryEnemies(x, y, radius) {
  if (!enemyIndexReady) return game.enemies;
  return enemyIndex.queryCircle(x, y, radius + ENEMY_QUERY_PADDING);
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
    } else if (target.kind === "chest") {
      hitChest(target.chest, "lightning");
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

  for (const enemy of queryEnemies(player.x, player.y, radius)) {
    if (!enemy.dead && distanceBetween(player, enemy) < radius + enemy.radius) {
      enemy.slow = 2.25 + level * 0.16;
      damageEnemy(enemy, damage, "frost");
    }
  }
  damageChestsInRadius(player.x, player.y, radius, "frost");

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
      hitChestIds: new Set(),
      hitBoss: false,
    });
  }

  player.cooldowns.wind = Math.max(0.8, (1.85 - level * 0.09) * player.cooldownMultiplier);
}

function castShuriken() {
  const player = game.player;
  const level = player.skills.shuriken;
  if (level <= 0) return;

  const angle = Math.atan2(game.boss.y - player.y, game.boss.x - player.x);
  const speed = 760;
  player.facingAngle = angle;
  player.facingSign = Math.cos(angle) < 0 ? -1 : 1;
  player.attackTimer = 0.24;

  game.playerProjectiles.push({
    kind: "shuriken",
    x: player.x + Math.cos(angle) * 28,
    y: player.y + Math.sin(angle) * 28,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    radius: 12,
    damage: 18 + level * 7,
    bossDamage: 24 + level * 9,
    pierce: Infinity,
    life: 3.2,
    spin: randomRange(0, Math.PI * 2),
    hitIds: new Set(),
    hitChestIds: new Set(),
    hitBoss: false,
  });

  player.cooldowns.shuriken = Math.max(0.62, (1.25 - level * 0.07) * player.cooldownMultiplier);
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
  const targetKey = target.kind === "boss" ? "boss" : target.kind === "chest" ? `chest:${target.chest.id}` : target.enemy.id;
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
  } else if (target.kind === "chest") {
    hitChest(target.chest, "dash");
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

  for (const enemy of queryEnemies(player.x, player.y, range)) {
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

  for (const chest of game.chests) {
    const key = `chest:${chest.id}`;
    if (chest.remove || player.dash.targetCooldowns.has(key)) continue;
    const distance = distanceBetween(player, chest);
    if (distance <= range + chest.radius && distance < bestDistance) {
      best = {
        kind: "chest",
        chest,
        x: chest.x,
        y: chest.y,
        radius: chest.radius,
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
    hitChestIds: new Set(),
    hitBoss: false,
  });

  game.shake = Math.max(game.shake, 0.75);
  createRing(player.x, player.y, 120, "#7eebff", 0.32, 4);
  addFloatingText(player.x, player.y - 44, "疾风龙卷", "#9ffff4");
}

function getUltimateConfig(characterId = game.player.characterId) {
  return ULTIMATES[characterId] || ULTIMATES.storm;
}

function createUltimateUpgrade() {
  const player = game.player;
  const ultimate = getUltimateConfig();
  return {
    ...ultimate,
    name: player.ultimate.level > 0 ? `${ultimate.name} +1` : `解锁 ${ultimate.name}`,
  };
}

function castUltimate(options = {}) {
  const player = game.player;
  const ultimate = player.ultimate;
  const free = Boolean(options.free);
  const ultimateConfig = getUltimateConfig();
  const level = Math.max(1, options.levelOverride || ultimate.level);
  if (!free && (ultimate.charges <= 0 || ultimate.level <= 0)) return false;

  if (!free) {
    ultimate.charges -= 1;
  }
  ultimate.castTimer = player.characterId === "childzed" ? 2.6 : 0.82;
  ultimate.castLevel = level;
  game.shake = Math.max(game.shake, player.characterId === "childzed" ? 1.9 : 2.2);
  addFloatingText(player.x, player.y - 46, ultimateConfig.name, "#ffe27a");

  if (player.characterId === "windman") {
    castLastBreath(level);
  } else if (player.characterId === "childzed") {
    castShadowKill(level);
  } else {
    castMonsoon(level);
  }

  return true;
}

function castMonsoon(level) {
  const player = game.player;
  const radius = 230 + level * 18;
  game.ultimateEffects.push({
    kind: "monsoon",
    x: player.x,
    y: player.y,
    radius,
    level,
    maxLife: 10,
    life: 10,
    damagePerSecond: 18 + level * 8,
    healPerSecond: 1.4 + level * 0.25,
    pulse: randomRange(0, Math.PI * 2),
    healText: 0,
  });

  createRing(player.x, player.y, radius, "#7effc5", 0.72, 7);
  createRing(player.x, player.y, radius * 0.56, "#9ffff4", 0.52, 4);
  burst(player.x, player.y, 46, "#7effc5", 360, 0.72);
}

function castLastBreath(level) {
  const player = game.player;
  const angle = Math.atan2(game.boss.y - player.y, game.boss.x - player.x);
  const width = 220 + level * 20;
  const range = Math.hypot(WORLD.width, WORLD.height) + 320;
  const speed = 1800;
  const life = (range + 260) / speed;

  healPlayerFlat(20, "#8bffd8", true);
  player.facingAngle = angle;
  player.facingSign = Math.cos(angle) < 0 ? -1 : 1;
  player.dash.slashTimer = Math.max(player.dash.slashTimer, 0.38);

  game.ultimateEffects.push({
    kind: "lastBreath",
    originX: player.x,
    originY: player.y,
    angle,
    width,
    range,
    speed,
    reach: -140,
    maxLife: life,
    life,
    enemyDamage: 120 + level * 45,
    bossDamage: 220 + level * 80,
    hitIds: new Set(),
    hitBoss: false,
  });

  createRing(player.x, player.y, width * 0.72, "#9ffff4", 0.46, 6);
  burst(player.x, player.y, 42, "#9ffff4", 420, 0.58);
}

function castShadowKill(level) {
  const boss = game.boss;
  const player = game.player;
  const duration = 2.6;
  const cloneRadius = 148 + level * 4;
  const clones = [];

  healPlayerFlat(20, "#ff8bac", true);
  game.timeStopTimer = Math.max(game.timeStopTimer, duration);
  player.attackTimer = Math.max(player.attackTimer, duration);

  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
    clones.push({
      x: clamp(boss.x + Math.cos(angle) * cloneRadius, 48, WORLD.width - 48),
      y: clamp(boss.y + Math.sin(angle) * cloneRadius, 48, WORLD.height - 48),
      angle,
      fired: 0,
      shotTimes: [0.24 + i * 0.045, 1.12 + i * 0.045],
      attackTimer: 0,
    });
  }

  game.ultimateEffects.push({
    kind: "shadowKill",
    x: boss.x,
    y: boss.y,
    radius: cloneRadius + 92,
    level,
    maxLife: duration,
    life: duration,
    clones,
  });

  createRing(boss.x, boss.y, cloneRadius + 94, "#ff4768", 0.7, 8);
  burst(boss.x, boss.y, 44, "#ff4768", 360, 0.72);
}

function fireShadowCloneShuriken(clone, level) {
  const angle = Math.atan2(game.boss.y - clone.y, game.boss.x - clone.x);
  const speed = 820;
  clone.attackTimer = 0.28;

  game.playerProjectiles.push({
    kind: "shuriken",
    x: clone.x + Math.cos(angle) * 24,
    y: clone.y + Math.sin(angle) * 24,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    radius: 12,
    damage: 22 + level * 8,
    bossDamage: 30 + level * 11,
    pierce: Infinity,
    life: 2.6,
    spin: randomRange(0, Math.PI * 2),
    hitIds: new Set(),
    hitChestIds: new Set(),
    hitBoss: false,
  });

  createBolt(clone.x, clone.y, game.boss.x, game.boss.y, "#ff4768", 0.1);
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

    for (const enemy of queryEnemies(orb.x, orb.y, orb.radius)) {
      if (!enemy.dead && enemy.orbHitCooldown <= 0 && distanceBetween(orb, enemy) < orb.radius + enemy.radius) {
        damageEnemy(enemy, damage, "orbs");
        enemy.orbHitCooldown = 0.38;
        burst(enemy.x, enemy.y, 5, "#ffe27a", 80, 0.25);
      }
    }
    damageChestsInRadius(orb.x, orb.y, orb.radius, "orbs", 0.38);

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

  for (const enemy of queryEnemies(player.x, player.y, radius)) {
    if (enemy.dead || distanceBetween(player, enemy) > radius + enemy.radius) continue;
    enemy.stormTick -= dt;
    damageEnemy(enemy, damagePerSecond * dt, "storm", false);
    if (enemy.stormTick <= 0) {
      enemy.stormTick = 0.45;
      burst(enemy.x, enemy.y, 3, "#62f4cd", 55, 0.24);
    }
  }
  damageChestsInRadius(player.x, player.y, radius, "storm", 0.55);

  if (distanceBetween(player, game.boss) < radius + game.boss.radius) {
    damageBoss(damagePerSecond * dt * 1.25, "storm");
  }
}

function findLightningTarget(origin, range, hitTargets) {
  let best = null;
  let bestDistance = Infinity;
  const hitKeys = new Set(hitTargets.map((target) => target.kind === "boss" ? "boss" : target.kind === "chest" ? `chest:${target.chest.id}` : `enemy:${target.id}`));
  const bossAlreadyHit = hitTargets.some((target) => target.kind === "boss");

  if (!bossAlreadyHit) {
    const bossDistance = distanceBetween(origin, game.boss);
    const weakBonus = game.phase === "weak" ? 0.42 : 1;
    if (bossDistance < range * (game.phase === "weak" ? 1.35 : 0.7)) {
      best = { ...game.boss, kind: "boss" };
      bestDistance = bossDistance * weakBonus;
    }
  }

  for (const chest of game.chests) {
    if (chest.remove || hitKeys.has(`chest:${chest.id}`)) continue;
    const distance = distanceBetween(origin, chest);
    if (distance < range && distance < bestDistance) {
      best = {
        kind: "chest",
        chest,
        x: chest.x,
        y: chest.y,
        radius: chest.radius,
      };
      bestDistance = distance;
    }
  }

  for (const enemy of queryEnemies(origin.x, origin.y, range)) {
    if (enemy.dead || hitKeys.has(`enemy:${enemy.id}`)) continue;
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
  boss.castTimer = Math.max(boss.castTimer, 0.36);

  for (let i = 0; i < count; i += 1) {
    const angle = baseAngle + (i - (count - 1) / 2) * spread + randomRange(-0.06, 0.06);
    game.hostileProjectiles.push({
      x: boss.x + Math.cos(angle) * (boss.radius + 10),
      y: boss.y + Math.sin(angle) * (boss.radius + 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: game.phase === "phase3" ? 12 : 10,
      damage: game.phase === "weak" ? 20 : game.phase === "phase3" ? 36 : 28,
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
  game.boss.castTimer = Math.max(game.boss.castTimer, 0.42);
  game.hazards.push({
    x: clamp(player.x + player.velocityX * lead + randomRange(-38, 38), 70, WORLD.width - 70),
    y: clamp(player.y + player.velocityY * lead + randomRange(-38, 38), 70, WORLD.height - 70),
    radius: game.phase === "phase3" ? 78 : 66,
    delay: game.phase === "phase3" ? 0.88 : 1.1,
    life: 1.4,
    damage: game.phase === "phase3" ? 48 : 36,
    exploded: false,
  });
}

function createBossMeteors() {
  const player = game.player;
  game.boss.castTimer = Math.max(game.boss.castTimer, 0.5);

  for (let i = 0; i < 4; i += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const distance = randomRange(70, 310);
    const lead = randomRange(0.18, 0.42);
    game.hazards.push({
      kind: "meteor",
      x: clamp(player.x + player.velocityX * lead + Math.cos(angle) * distance, 70, WORLD.width - 70),
      y: clamp(player.y + player.velocityY * lead + Math.sin(angle) * distance, 70, WORLD.height - 70),
      radius: 54,
      delay: randomRange(0.7, 1.08),
      life: 1.45,
      damage: game.phase === "weak" ? 24 : game.phase === "phase3" ? 38 : 32,
      exploded: false,
      seed: randomRange(0, 1000),
    });
  }

  createRing(game.boss.x, game.boss.y, 150, "#3b184f", 0.48, 4);
  addFloatingText(game.boss.x, game.boss.y - game.boss.radius, "暗陨疾行", "#c68cff");
}

function summonBossMinions() {
  if (!Number.isFinite(PHASES[game.phase].summonCooldown)) return;
  const boss = game.boss;
  const count = game.phase === "phase3" ? 7 : game.phase === "weak" ? 3 : 4;
  boss.castTimer = Math.max(boss.castTimer, 0.48);
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

  const multiplier = game.phase === "weak" ? 2.05 : 1;
  const finalDamage = amount * multiplier;
  const previousHp = boss.hp;
  boss.hp -= finalDamage;

  if (Math.random() < 0.18 || finalDamage > 35) {
    addFloatingText(boss.x + randomRange(-18, 18), boss.y - boss.radius, Math.round(finalDamage).toString(), game.phase === "weak" ? "#ffd36b" : "#bda6df");
  }

  healPlayerFromDamage(Math.max(0, previousHp - Math.max(0, boss.hp)));

  if (boss.hp <= 0) {
    boss.hp = 0;
    finishGame("victory", getCharacter().victoryReason);
  }
}

function healPlayerFromDamage(amount) {
  const player = game.player;
  if (game.state !== "playing" || player.lifeSteal <= 0 || amount <= 0 || player.hp <= 0) return;

  const heal = Math.min(LIFE_STEAL_BALANCE.healCap, amount * player.lifeSteal);
  if (heal <= 0.05) return;

  const gained = healPlayerFlat(heal, "#8bffd8", false);
  if (gained >= 2) {
    addFloatingText(player.x, player.y - 36, `+${Math.round(gained)}`, "#8bffd8");
  }
}

function healPlayerFlat(amount, color = "#8bffd8", showText = true) {
  const player = game.player;
  if (game.state !== "playing" || amount <= 0 || player.hp <= 0) return 0;

  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + amount);
  const gained = player.hp - before;
  if (showText && gained > 0) {
    addFloatingText(player.x, player.y - 36, `+${Math.max(1, Math.round(gained))}`, color);
  }
  return gained;
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
  player.xpToNext = getXpToNext(player.level);
  openLevelUp();
}

function getXpToNext(level) {
  const lateLevel = Math.max(0, level - XP_CURVE.lateStartLevel);
  return Math.round(
    XP_CURVE.base
      + level * XP_CURVE.linearPerLevel
      + Math.pow(level, XP_CURVE.levelExponent)
      + Math.pow(lateLevel, XP_CURVE.lateExponent) * XP_CURVE.lateMultiplier
  );
}

function openLevelUp(mode = "level") {
  game.upgradeMode = mode;
  game.state = "levelUpPaused";
  const character = getCharacter();
  ui.levelUpTitle.textContent = mode === "opening" ? character.openingTitle : mode === "chest" ? "宝箱馈赠" : character.levelTitle;
  game.upgrades = pickUpgradeOptions(mode);
  ui.upgradeOptions.innerHTML = "";

  game.upgrades.forEach((upgrade, index) => {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    button.innerHTML = `
      <small>${mode === "opening" ? "开局" : mode === "chest" ? "宝箱" : upgrade.type}</small>
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

  if (mode === "chest") {
    const pool = [...skillUpgrades];
    if (player.ultimate.level < getUltimateConfig().maxLevel) {
      pool.push(createUltimateUpgrade());
    }
    shuffle(pool);
    return pool.slice(0, 3);
  }

  const pool = [...skillUpgrades];
  if (player.ultimate.level < getUltimateConfig().maxLevel) {
    pool.push(createUltimateUpgrade());
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
    seedOpeningChests();
    showBanner(PHASES.phase1.banner, 2.8);
  } else if (game.upgradeMode === "level") {
    tryLevelUp();
  }
}

function finishGame(state, reason) {
  if (game.state === "victory" || game.state === "defeat") return;
  game.state = state;
  game.resultReason = reason;
  const resultImage = getResultImageConfig(state);
  game.resultImage = resultImage.src;
  ui.resultPanel.classList.toggle("result-victory", state === "victory");
  ui.resultPanel.classList.toggle("result-defeat", state === "defeat");
  if (ui.resultImage) {
    ui.resultImage.src = resultImage.src;
    ui.resultImage.alt = resultImage.alt;
  }
  if (ui.resultCaption) {
    ui.resultCaption.textContent = resultImage.caption;
  }
  ui.resultKicker.textContent = state === "victory" ? "胜利" : "失败";
  ui.resultTitle.textContent = reason;
  ui.resultLevel.textContent = game.player.level.toString();
  ui.resultKills.textContent = game.kills.toString();
  ui.resultTime.textContent = formatTime(game.elapsed);
  ui.resultPanel.classList.remove("hidden");
  animateResultPanel();
}

function animateResultPanel() {
  const gsap = window.gsap;
  if (!gsap || !ui.resultCard) return;

  const targets = [
    ui.resultCard,
    ui.resultImage,
    ui.resultCaption,
    ui.resultKicker,
    ui.resultTitle,
    ...ui.resultPanel.querySelectorAll(".result-stats div"),
    ui.restartButton,
  ].filter(Boolean);
  gsap.killTweensOf(targets);

  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  timeline
    .fromTo(ui.resultCard, { autoAlpha: 0, y: 24, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.46 })
    .fromTo(ui.resultImage, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.62 }, "-=0.22")
    .fromTo([ui.resultKicker, ui.resultTitle], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.36 }, "-=0.3")
    .fromTo(ui.resultPanel.querySelectorAll(".result-stats div"), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.32 }, "-=0.18")
    .fromTo(ui.restartButton, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.28 }, "-=0.12");
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

  ui.healthText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}${player.shield > 0 ? "  护盾" : ""}`;
  ui.healthFill.style.transform = `scaleX(${healthRatio})`;
  ui.xpText.textContent = `Lv.${player.level}`;
  ui.xpFill.style.transform = `scaleX(${xpRatio})`;
  ui.timeText.textContent = formatTime(game.elapsed);
  ui.ultimateText.textContent = player.ultimate.charges > 0 ? `R x${player.ultimate.charges}` : "未充能";
  ui.ultimatePill.classList.toggle("ready", player.ultimate.charges > 0 && game.state === "playing");
  ui.ultimatePill.classList.toggle("disabled", player.ultimate.charges <= 0 || game.state !== "playing");
  updateTouchUltimateButton(ui, game);
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
  drawChests();
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
  ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 10;
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
    ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : orb.active ? 18 : 10;
    ctx.fillStyle = orb.value >= 5 ? "#ffd36b" : "#35d5c8";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawChests() {
  for (const chest of game.chests) {
    if (!isVisible(chest.x, chest.y, chest.radius + RENDER_MARGIN)) continue;

    const pulse = 0.8 + Math.sin(chest.pulse * 3) * 0.14;
    const flash = clamp(chest.flash / 0.24, 0, 1);
    const progress = clamp(chest.hits / chest.hitsRequired, 0, 1);

    ctx.save();
    ctx.translate(chest.x, chest.y);

    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.ellipse(0, chest.radius * 0.72, chest.radius * 1.3, chest.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(0, 0, chest.radius * 0.4, 0, 0, chest.radius * (2.2 + pulse * 0.25));
    aura.addColorStop(0, `rgba(255, 211, 107, ${0.14 + flash * 0.16})`);
    aura.addColorStop(0.55, "rgba(168, 92, 255, 0.12)");
    aura.addColorStop(1, "rgba(168, 92, 255, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, chest.radius * (2.2 + pulse * 0.25), 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = flash > 0 ? "rgba(255, 236, 160, 0.95)" : "rgba(255, 211, 107, 0.72)";
    const body = ctx.createLinearGradient(0, -chest.radius, 0, chest.radius);
    body.addColorStop(0, "#7e3bca");
    body.addColorStop(0.48, "#3f1c68");
    body.addColorStop(1, "#1b102e");
    ctx.fillStyle = body;
    ctx.beginPath();
    roundedRectPath(-chest.radius, -chest.radius * 0.45, chest.radius * 2, chest.radius * 1.28, 7);
    ctx.fill();
    ctx.stroke();

    const lid = ctx.createLinearGradient(0, -chest.radius * 1.1, 0, 0);
    lid.addColorStop(0, "#ffd36b");
    lid.addColorStop(0.2, "#8e4dff");
    lid.addColorStop(1, "#2a1645");
    ctx.fillStyle = lid;
    ctx.beginPath();
    roundedRectPath(-chest.radius * 1.08, -chest.radius * 0.9, chest.radius * 2.16, chest.radius * 0.62, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 211, 107, 0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -chest.radius * 0.84);
    ctx.lineTo(0, chest.radius * 0.76);
    ctx.moveTo(-chest.radius * 0.9, -chest.radius * 0.22);
    ctx.lineTo(chest.radius * 0.9, -chest.radius * 0.22);
    ctx.stroke();

    ctx.fillStyle = "#ffd36b";
    ctx.shadowColor = "#ffd36b";
    ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 12;
    ctx.beginPath();
    ctx.arc(0, chest.radius * 0.05, 5 + flash * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let i = 0; i < chest.hitsRequired; i += 1) {
      const filled = i < chest.hits;
      ctx.fillStyle = filled ? "#ffd36b" : "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(-chest.radius + i * 17, chest.radius + 9, 12, 4);
    }

    if (progress > 0) {
      ctx.strokeStyle = "rgba(255, 211, 107, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, chest.radius * (1.28 + flash * 0.14), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHazards() {
  for (const hazard of game.hazards) {
    if (!isVisible(hazard.x, hazard.y, hazard.radius + RENDER_MARGIN)) continue;
    if (hazard.kind === "meteor") {
      drawMeteorHazard(hazard);
      continue;
    }
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

function drawMeteorHazard(hazard) {
  const progress = clamp(1 - hazard.delay / 1.08, 0, 1);
  const pulse = 0.55 + Math.sin(game.elapsed * 9 + (hazard.seed || 0)) * 0.18;

  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  ctx.globalCompositeOperation = "lighter";

  if (!hazard.exploded) {
    ctx.strokeStyle = `rgba(196, 114, 255, ${0.3 + progress * 0.38})`;
    ctx.fillStyle = `rgba(59, 24, 79, ${0.08 + progress * 0.12})`;
    ctx.lineWidth = 2.5 + progress * 3;
    ctx.beginPath();
    ctx.arc(0, 0, hazard.radius * (0.72 + progress * 0.28), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const orbY = -140 * (1 - progress) - 34;
    const orbRadius = hazard.radius * (0.42 + progress * 0.16 + pulse * 0.04);
    const orb = ctx.createRadialGradient(-orbRadius * 0.28, orbY - orbRadius * 0.28, 2, 0, orbY, orbRadius * 1.35);
    orb.addColorStop(0, "rgba(214, 162, 255, 0.82)");
    orb.addColorStop(0.35, "rgba(84, 36, 116, 0.82)");
    orb.addColorStop(1, "rgba(9, 5, 16, 0.9)");
    ctx.fillStyle = orb;
    ctx.shadowColor = "#7b3fff";
    ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 18;
    ctx.beginPath();
    ctx.arc(0, orbY, orbRadius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const alpha = clamp(hazard.life / 0.34, 0, 1);
    ctx.fillStyle = `rgba(59, 24, 79, ${0.28 * alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, hazard.radius + 22 * (1 - alpha), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(198, 140, 255, ${0.46 * alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, hazard.radius * (1.05 + (1 - alpha) * 0.25), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawUltimateEffect() {
  for (const effect of game.ultimateEffects) {
    if (effect.kind === "monsoon") {
      drawMonsoonEffect(effect);
    } else if (effect.kind === "lastBreath") {
      drawLastBreathEffect(effect);
    } else if (effect.kind === "shadowKill") {
      drawShadowKillEffect(effect);
    }
  }
}

function drawMonsoonEffect(effect) {
  if (!isVisible(effect.x, effect.y, effect.radius + RENDER_MARGIN)) return;

  const fade = Math.min(1, (effect.maxLife - effect.life) * 2.4, effect.life * 2.2);
  const pulse = Math.sin(game.elapsed * 3.8 + effect.pulse) * 0.5 + 0.5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const field = ctx.createRadialGradient(effect.x, effect.y, 28, effect.x, effect.y, effect.radius);
  field.addColorStop(0, `rgba(126, 255, 197, ${0.22 * fade})`);
  field.addColorStop(0.56, `rgba(80, 223, 255, ${0.09 * fade})`);
  field.addColorStop(1, "rgba(126, 255, 197, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(126, 255, 197, ${(0.3 + pulse * 0.24) * fade})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const angle = game.elapsed * (0.75 + i * 0.08) + (Math.PI * 2 * i) / 4;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius * (0.34 + i * 0.14), angle, angle + Math.PI * 1.22);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLastBreathEffect(effect) {
  const drawReach = clamp(effect.reach, 0, effect.range);
  if (drawReach <= 0) return;

  const alpha = clamp(effect.life / effect.maxLife, 0, 1);
  const front = Math.min(effect.reach, effect.range);
  ctx.save();
  ctx.translate(effect.originX, effect.originY);
  ctx.rotate(effect.angle);
  ctx.globalCompositeOperation = "lighter";

  const gradient = ctx.createLinearGradient(0, 0, front, 0);
  gradient.addColorStop(0, `rgba(126, 235, 255, ${0.04 * alpha})`);
  gradient.addColorStop(0.72, `rgba(126, 235, 255, ${0.18 * alpha})`);
  gradient.addColorStop(1, `rgba(255, 255, 255, ${0.34 * alpha})`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-80, -effect.width * 0.42);
  ctx.lineTo(front, -effect.width * 0.5);
  ctx.lineTo(front + 90, 0);
  ctx.lineTo(front, effect.width * 0.5);
  ctx.lineTo(-80, effect.width * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `rgba(159, 255, 244, ${0.62 * alpha})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(Math.max(0, front - 260), -effect.width * 0.5);
  ctx.quadraticCurveTo(front - 80, 0, Math.max(0, front - 260), effect.width * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawShadowKillEffect(effect) {
  if (!isVisible(effect.x, effect.y, effect.radius + RENDER_MARGIN)) return;

  const fade = Math.min(1, (effect.maxLife - effect.life) * 4, effect.life * 2.4);
  const pulse = 0.6 + Math.sin(game.elapsed * 12) * 0.18;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const domain = ctx.createRadialGradient(effect.x, effect.y, 16, effect.x, effect.y, effect.radius);
  domain.addColorStop(0, `rgba(255, 71, 104, ${0.18 * fade})`);
  domain.addColorStop(0.54, `rgba(21, 8, 24, ${0.2 * fade})`);
  domain.addColorStop(1, "rgba(255, 71, 104, 0)");
  ctx.fillStyle = domain;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 71, 104, ${(0.42 + pulse * 0.18) * fade})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, effect.radius * (0.74 + pulse * 0.03), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  for (const clone of effect.clones) {
    drawShadowClone(clone, effect);
  }
}

function drawShadowClone(clone, effect) {
  const sprite = SPRITE_SHEETS.childzed;
  const angle = Math.atan2(game.boss.y - clone.y, game.boss.x - clone.x);
  const facingSign = Math.cos(angle) < 0 ? -1 : 1;
  const alpha = 0.55 + Math.sin(game.elapsed * 14 + clone.angle) * 0.12;

  ctx.save();
  ctx.translate(clone.x, clone.y);
  ctx.globalAlpha = clamp(alpha, 0.38, 0.72) * Math.min(1, effect.life * 2.4);
  ctx.globalCompositeOperation = "lighter";

  if (sprite.loaded && sprite.source) {
    const frame = sprite.frames.throw[0];
    const visualHeight = clone.attackTimer > 0 ? 82 : 74;
    const scale = visualHeight / frame.h;
    const drawWidth = frame.w * scale;
    const drawHeight = frame.h * scale;
    ctx.scale(facingSign, 1);
    ctx.shadowColor = "#ff4768";
    ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 16;
    ctx.drawImage(
      sprite.source,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      -drawWidth * frame.anchorX,
      18 - drawHeight * frame.anchorY,
      drawWidth,
      drawHeight,
    );
  } else {
    ctx.fillStyle = "rgba(20, 16, 24, 0.86)";
    ctx.strokeStyle = "rgba(255, 71, 104, 0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 24, 0, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 14;
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
    if (projectile.kind === "shuriken") {
      drawShurikenProjectile(projectile);
      continue;
    }

    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.spin);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "#9ffff4";
    ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 12;
    ctx.fillStyle = "#9ffff4";
    ctx.beginPath();
    ctx.ellipse(0, 0, projectile.radius * 1.7, projectile.radius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawShurikenProjectile(projectile) {
  const radius = projectile.radius;
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(projectile.spin * 1.8);
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = "#ff4768";
  ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 14;
  ctx.lineWidth = 1.4;

  for (let i = 0; i < 4; i += 1) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.15, -radius * 0.22);
    ctx.lineTo(radius * 1.85, -radius * 0.72);
    ctx.lineTo(radius * 0.72, 0);
    ctx.lineTo(radius * 1.85, radius * 0.72);
    ctx.lineTo(-radius * 0.15, radius * 0.22);
    ctx.closePath();
    ctx.fillStyle = "#17131b";
    ctx.strokeStyle = "rgba(255, 71, 104, 0.92)";
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = "#ff4768";
  ctx.fill();
  ctx.restore();
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
    ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 18;
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
  ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 10;
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
  const floatY = Math.sin(game.elapsed * 2.35 + 0.6) * 6 + Math.sin(game.elapsed * 5.4) * 1.2;
  const facingSign = game.player.x < boss.x ? -1 : 1;

  ctx.save();
  ctx.translate(boss.x, boss.y);
  drawBossAura(boss, weak, floatY);

  if (!drawBossSpriteBody(boss, weak, facingSign, floatY)) {
    drawFallbackBossBody(boss, weak, floatY);
  }

  drawBossPressureEffects(boss, weak, facingSign, floatY);
  ctx.restore();
}

function drawBossAura(boss, weak, floatY) {
  const auraRadius = boss.radius * (2.45 + Math.sin(game.elapsed * 4) * 0.1 + boss.weakPulse * 0.14);
  const aura = ctx.createRadialGradient(0, floatY * 0.35, boss.radius * 0.42, 0, floatY * 0.35, auraRadius);
  aura.addColorStop(0, weak ? "rgba(255, 211, 107, 0.22)" : "rgba(168, 92, 255, 0.32)");
  aura.addColorStop(1, "rgba(168, 92, 255, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, floatY * 0.35, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.beginPath();
  ctx.ellipse(0, boss.radius * 1.2, boss.radius * 1.55, boss.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.5)" : "rgba(188, 113, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, boss.radius * 1.15, boss.radius * 1.7, boss.radius * 0.38, Math.sin(game.elapsed) * 0.08, 0, Math.PI * 2);
  ctx.stroke();
  if (!perf.shouldReduceEffects()) {
    ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.28)" : "rgba(255, 94, 170, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, boss.radius * 1.14, boss.radius * 2.1, boss.radius * 0.52, -Math.sin(game.elapsed * 0.8) * 0.12, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBossSpriteBody(boss, weak, facingSign, floatY) {
  const sprite = SPRITE_SHEETS.boss;
  if (!sprite.loaded || !sprite.source) return false;

  const casting = boss.castTimer > 0.02;
  const frames = casting ? sprite.frames.cast : sprite.frames.idle;
  const frameRate = casting ? 10 : 1.7;
  const frame = frames[Math.floor(game.elapsed * frameRate) % frames.length];
  const visualHeight = (casting ? 136 : 168) + (weak ? 5 : 0);
  const scale = visualHeight / frame.h;
  const drawWidth = frame.w * scale;
  const drawHeight = frame.h * scale;
  const footY = casting ? boss.radius * 0.35 : boss.radius * 0.44;
  const sway = Math.sin(game.elapsed * 1.45) * (casting ? 0.02 : 0.04);

  ctx.save();
  ctx.translate(0, floatY);
  ctx.rotate(sway);
  ctx.scale(facingSign, 1);
  ctx.imageSmoothingEnabled = true;

  if (!perf.shouldReduceEffects()) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = weak ? 0.34 : 0.22;
    ctx.shadowColor = weak ? "#ffd36b" : "#b767ff";
    ctx.shadowBlur = weak ? 24 : 18;
    ctx.drawImage(
      sprite.source,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      -drawWidth * frame.anchorX - 3,
      footY - drawHeight * frame.anchorY - 3,
      drawWidth + 6,
      drawHeight + 6,
    );
    ctx.restore();
  }

  ctx.globalAlpha = weak && Math.sin(game.elapsed * 18) > 0.72 ? 0.86 : 1;
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

  if (casting) {
    const slashPulse = 0.65 + Math.sin(game.elapsed * 18) * 0.22;
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(202, 110, 255, ${0.34 + slashPulse * 0.28})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-boss.radius * 1.05, -boss.radius * 0.35, boss.radius * (0.9 + slashPulse * 0.12), -0.45, Math.PI * 1.05);
    ctx.stroke();
  }

  ctx.restore();
  return true;
}

function drawBossPressureEffects(boss, weak, facingSign, floatY) {
  ctx.save();
  ctx.translate(0, floatY);
  ctx.scale(facingSign, 1);
  ctx.globalCompositeOperation = "lighter";

  const orbPulse = 0.7 + Math.sin(game.elapsed * 7.5) * 0.18 + boss.castTimer * 0.45;
  const orbX = -boss.radius * 1.25;
  const orbY = -boss.radius * 0.68;
  const orbRadius = boss.radius * (0.28 + orbPulse * 0.08);
  const orb = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, boss.radius * 0.9);
  orb.addColorStop(0, weak ? "rgba(255, 230, 144, 0.9)" : "rgba(249, 219, 255, 0.9)");
  orb.addColorStop(0.42, weak ? "rgba(255, 211, 107, 0.42)" : "rgba(184, 82, 255, 0.58)");
  orb.addColorStop(1, "rgba(97, 35, 168, 0)");
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(orbX, orbY, boss.radius * (0.75 + orbPulse * 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.8)" : "rgba(218, 134, 255, 0.82)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbRadius, game.elapsed * 3.8, game.elapsed * 3.8 + Math.PI * 1.55);
  ctx.stroke();

  if (!perf.shouldReduceEffects()) {
    ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.34)" : "rgba(188, 113, 255, 0.24)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const t = game.elapsed * 1.8 + i * 1.7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(t) * boss.radius * 1.2, -boss.radius * 1.15 + Math.sin(t) * 8);
      ctx.quadraticCurveTo(Math.sin(t * 0.7) * boss.radius * 1.9, -boss.radius * 0.08, Math.cos(t + 1.2) * boss.radius * 1.35, boss.radius * 0.9);
      ctx.stroke();
    }
  }

  if (weak) {
    ctx.strokeStyle = "rgba(255, 211, 107, 0.88)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-boss.radius * 0.3, -boss.radius * 0.72);
    ctx.lineTo(-boss.radius * 0.08, -boss.radius * 0.25);
    ctx.lineTo(-boss.radius * 0.24, boss.radius * 0.22);
    ctx.moveTo(boss.radius * 0.28, -boss.radius * 0.52);
    ctx.lineTo(boss.radius * 0.08, 0);
    ctx.lineTo(boss.radius * 0.32, boss.radius * 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFallbackBossBody(boss, weak, floatY) {
  ctx.save();
  ctx.translate(0, floatY);
  ctx.strokeStyle = weak ? "rgba(255, 211, 107, 0.9)" : "rgba(188, 113, 255, 0.82)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(boss.radius * 0.78, -boss.radius * 1.28);
  ctx.lineTo(boss.radius * 1.24, boss.radius * 1.18);
  ctx.stroke();
  ctx.fillStyle = weak ? "#ffd36b" : "#b767ff";
  ctx.shadowColor = weak ? "#ffd36b" : "#b767ff";
  ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 16;
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
  ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 12;
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
  if (player.characterId === "childzed") {
    return drawChildzedSprite(player);
  }
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
  ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 16;
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

function drawChildzedSprite(player) {
  const sprite = SPRITE_SHEETS.childzed;
  if (!sprite.loaded || !sprite.source) return false;

  const moving = Math.hypot(player.velocityX, player.velocityY) > 12;
  const throwing = player.attackTimer > 0;
  const frames = throwing ? sprite.frames.throw : moving ? sprite.frames.move : sprite.frames.idle;
  const frameRate = moving ? 8.5 : 2.4;
  const frame = throwing ? frames[0] : frames[Math.floor(game.elapsed * frameRate) % frames.length];
  const blink = player.invulnerable > 0 && Math.sin(game.elapsed * 38) > 0.2;
  const speedRatio = clamp(Math.hypot(player.velocityX, player.velocityY) / (PLAYER_BASE_SPEED * player.speedMultiplier || 1), 0, 1);
  const bob = Math.sin(game.elapsed * (moving ? 10 : 3.4)) * (moving ? 2.1 : 1);
  const lean = clamp(player.velocityX / (PLAYER_BASE_SPEED * player.speedMultiplier || 1), -1, 1) * 0.17;
  const visualHeight = throwing ? 88 : 78 + speedRatio * 4;
  const scale = visualHeight / frame.h;
  const drawWidth = frame.w * scale;
  const drawHeight = frame.h * scale;
  const footY = player.radius * 1.18;

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.beginPath();
  ctx.ellipse(0, player.radius * 0.98, player.radius * 1.55, player.radius * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  if (throwing) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255, 71, 104, 0.62)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-player.facingSign * 38, -20);
    ctx.quadraticCurveTo(-player.facingSign * 8, -7, player.facingSign * 34, 10);
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(0, bob);
  ctx.rotate(throwing ? 0 : lean);
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

  const pulse = 0.58 + Math.sin(game.elapsed * 10) * 0.18;
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(255, 71, 104, ${0.24 + pulse * 0.28})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(10, -18, 18 + pulse * 3, -0.35, Math.PI * 0.95);
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
  ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 14;
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
    ctx.shadowBlur = perf.shouldReduceEffects() ? 0 : 16;
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

function createRing(x, y, radius, color, life, lineWidth) {
  const limit = perf.shouldReduceEffects() ? Math.floor(MAX_RINGS * 0.62) : MAX_RINGS;
  if (game.rings.length >= limit) {
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
  const limit = perf.shouldReduceEffects() ? Math.floor(MAX_BOLTS * 0.55) : MAX_BOLTS;
  if (game.bolts.length >= limit) {
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
  const particleLimit = perf.shouldReduceEffects() ? Math.floor(MAX_PARTICLES * 0.58) : MAX_PARTICLES;
  const particleCount = perf.shouldReduceEffects() ? Math.max(1, Math.ceil(count * 0.42)) : count;
  for (let i = 0; i < particleCount; i += 1) {
    if (game.particles.length >= particleLimit) {
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
  const limit = perf.shouldReduceEffects() ? Math.floor(MAX_FLOATING_TEXTS * 0.56) : MAX_FLOATING_TEXTS;
  if (game.floatingTexts.length >= limit) {
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

function isVisible(x, y, margin) {
  const bounds = game.visibleBounds;
  return (
    x + margin > bounds.left &&
    x - margin < bounds.right &&
    y + margin > bounds.top &&
    y - margin < bounds.bottom
  );
}

function createDebugSnapshot() {
  return {
    state: game.state,
    elapsed: game.elapsed,
    phase: game.phase,
    level: game.player.level,
    hp: game.player.hp,
    ultimate: { ...game.player.ultimate },
    timeStopTimer: game.timeStopTimer,
    ultimateEffects: game.ultimateEffects.map((effect) => ({
      kind: effect.kind,
      life: effect.life,
      level: effect.level,
      clones: effect.clones ? effect.clones.length : 0,
    })),
    bossHp: game.boss.hp,
    bossTimers: {
      meteorTimer: game.boss.meteorTimer,
      hasteTimer: game.boss.hasteTimer,
    },
    camera: { ...game.camera },
    resultImage: game.resultImage,
    enemies: game.enemies.length,
    kills: game.kills,
    upgradeMode: game.upgradeMode,
    perf: perf.snapshot(),
    quality: perf.quality,
    entities: {
      enemies: game.enemies.length,
      chests: game.chests.length,
      hazards: game.hazards.length,
      meteors: game.hazards.filter((hazard) => hazard.kind === "meteor").length,
      playerProjectiles: game.playerProjectiles.length,
      hostileProjectiles: game.hostileProjectiles.length,
      ultimateEffects: game.ultimateEffects.length,
      particles: game.particles.length,
      rings: game.rings.length,
      bolts: game.bolts.length,
      floatingTexts: game.floatingTexts.length,
    },
    spatialIndex: enemyIndex.snapshot(),
  };
}

const api = {
  tick,
  resizeCanvas,
  resetGame,
  startGame,
  selectCharacter,
  chooseUpgrade,
  castUltimate,
  getState: () => game.state,
  getUpgradeCount: () => game.upgrades.length,
  snapshot: createDebugSnapshot,
};

window.VoidHuntDebug = {
  snapshot: createDebugSnapshot,
};

return api;
}
