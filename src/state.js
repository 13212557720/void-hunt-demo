import { CHARACTERS, SKILLS, WORLD } from "./config.js";
import { mulberry32 } from "./utils.js";

export function createGameState() {
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
      castTimer: 0,
    },
    camera: { x: 0, y: 0 },
    view: { width: window.innerWidth, height: window.innerHeight, dpr: 1 },
    visibleBounds: {
      left: 0,
      right: window.innerWidth,
      top: 0,
      bottom: window.innerHeight,
    },
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

export function createSkillLevels(initialSkills = {}) {
  const skills = {};
  for (const id of Object.keys(SKILLS)) {
    skills[id] = initialSkills[id] || 0;
  }
  return skills;
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
