export const WORLD = { width: 3600, height: 2600 };
export const WEAK_START = 160;
export const BOSS_MAX_HP = 12000;
export const PLAYER_BASE_SPEED = 260;
export const MAX_ENEMIES = 190;
export const MAX_CHESTS = 5;
export const CHEST_HITS_REQUIRED = 3;
export const RENDER_MARGIN = 250;
export const MAX_PARTICLES = 220;
export const MAX_RINGS = 64;
export const MAX_BOLTS = 80;
export const MAX_FLOATING_TEXTS = 90;
export const ENEMY_SPATIAL_CELL_SIZE = 220;
export const ENEMY_QUERY_PADDING = 42;

export const XP_CURVE = {
  base: 8,
  linearPerLevel: 4.5,
  levelExponent: 1.32,
  lateStartLevel: 8,
  lateExponent: 1.35,
  lateMultiplier: 2.2,
};

export const LIFE_STEAL_BALANCE = {
  increment: 0.02,
  max: 0.1,
  healCap: 4,
};

function applyUltimateUpgrade(player, maxLevel) {
  player.ultimate.level = Math.min(maxLevel, player.ultimate.level + 1);
  player.ultimate.charges += 1;
}

export const CHARACTERS = {
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
  childzed: {
    id: "childzed",
    name: "儿童劫",
    openingTitle: "选择开局影刃",
    levelTitle: "影刃童心觉醒",
    victoryReason: "儿童劫笑着收下了胜利",
    maxHp: 95,
    speedMultiplier: 1.12,
    initialSkills: {
      shuriken: 1,
    },
  },
};

export const COMMON_SKILL_IDS = ["frost", "wind", "orbs", "shield", "storm"];
export const CHARACTER_SKILL_IDS = {
  storm: ["lightning"],
  windman: ["dash", "tornado"],
  childzed: ["shuriken"],
};

export const PHASES = {
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

export const ENEMY_TYPES = {
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

export const SKILLS = {
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
  shuriken: {
    name: "影手里剑",
    type: "技能",
    owner: "childzed",
    desc: "自动朝 Boss 投掷无限穿透手里剑，升级后伤害提高、冷却缩短。",
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

export const ULTIMATES = {
  storm: {
    id: "ultimate",
    kind: "ultimate",
    type: "大招",
    name: "复苏季风",
    maxLevel: 6,
    desc: "获得 1 次 R 键大招充能。释放后创建 10 秒风场，入场加速回血，敌人持续掉血。",
    apply(player) {
      applyUltimateUpgrade(player, this.maxLevel);
    },
  },
  windman: {
    id: "ultimate",
    kind: "ultimate",
    type: "大招",
    name: "狂风绝息斩",
    maxLevel: 6,
    desc: "获得 1 次 R 键大招充能。释放后回血 20，并召唤横扫战场的疾风冲击波。",
    apply(player) {
      applyUltimateUpgrade(player, this.maxLevel);
    },
  },
  childzed: {
    id: "ultimate",
    kind: "ultimate",
    type: "大招",
    name: "暗域影杀阵",
    maxLevel: 6,
    desc: "获得 1 次 R 键大招充能。释放后短暂时停，召唤分身围绕 Boss 连续投掷影手里剑。",
    apply(player) {
      applyUltimateUpgrade(player, this.maxLevel);
    },
  },
};

export const STAT_UPGRADES = [
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
    desc: "角色移动更快，更容易拉开 Boss 和小怪。",
    apply(player) {
      player.speedMultiplier = Math.min(1.9, player.speedMultiplier * 1.1);
    },
  },
  {
    id: "lifeSteal",
    name(player) {
      const incrementPercent = Math.round(LIFE_STEAL_BALANCE.increment * 100);
      return player.lifeSteal > 0
        ? `生命偷取 +${incrementPercent}%（当前 ${Math.round(player.lifeSteal * 100)}%）`
        : `解锁 生命偷取 +${incrementPercent}%`;
    },
    type: "属性",
    desc: `造成伤害时按比例回复生命，最多叠加到 ${Math.round(LIFE_STEAL_BALANCE.max * 100)}%。`,
    isAvailable(player) {
      return player.lifeSteal < LIFE_STEAL_BALANCE.max;
    },
    apply(player) {
      player.lifeSteal = Math.min(
        LIFE_STEAL_BALANCE.max,
        Number((player.lifeSteal + LIFE_STEAL_BALANCE.increment).toFixed(4))
      );
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
    desc: "自动技能释放更频繁。",
    apply(player) {
      player.cooldownMultiplier = Math.max(0.52, player.cooldownMultiplier * 0.9);
    },
  },
];
