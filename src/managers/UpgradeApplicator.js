import { profile } from '../data/index.js';
import {
  HOOK_RANGE, RELEASE_BOOST, HEARTS_MAX, HOOK_COOLDOWN,
  OBSTACLE_HIT_RADIUS, EMBER_RATE, UPGRADES,
} from '../constants.js';

// Вычисляет эффективные игровые константы с учётом апгрейдов
export function getEffectiveConstants() {
  const lvl = (id) => profile.getUpgradeLevel(id);

  return {
    hookRange: HOOK_RANGE * (1 + lvl('hook_range') * UPGRADES.hook_range.effect),
    releaseBoost: RELEASE_BOOST * (1 + lvl('swing_power') * UPGRADES.swing_power.effect),
    startHearts: HEARTS_MAX + lvl('iron_heart') * UPGRADES.iron_heart.effect,
    hookCooldown: HOOK_COOLDOWN * (1 - lvl('quick_hook') * UPGRADES.quick_hook.effect),
    obstacleHitRadius: OBSTACLE_HIT_RADIUS * (1 - lvl('bug_armor') * UPGRADES.bug_armor.effect),
    emberMultiplier: 1 + lvl('ember_magnet') * UPGRADES.ember_magnet.effect,
    emberRate: EMBER_RATE,
  };
}

// Стоимость следующего уровня апгрейда
export function getUpgradeCost(upgradeId) {
  const def = UPGRADES[upgradeId];
  const level = profile.getUpgradeLevel(upgradeId);
  if (level >= def.maxLevel) return Infinity;
  if (def.costs) return def.costs[level];
  return Math.floor(def.baseCost * Math.pow(def.costScale, level));
}
