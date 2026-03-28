import { profile } from '../data/index.js';
import {
  HOOK_RANGE, RELEASE_BOOST, HEARTS_MAX, HOOK_COOLDOWN,
  UPGRADES, PERK_PICKUPS,
} from '../constants.js';

// Вычисляет эффективные игровые константы с учётом постоянных апгрейдов + раундовых перков
export function getEffectiveConstants(roundPerkLevels = {}) {
  const rlvl = (id) => roundPerkLevels[id] || 0; // Уровни из раунда
  const plvl = (id) => profile.getUpgradeLevel(id); // Постоянные (только iron_heart)

  return {
    hookRange: HOOK_RANGE * (1 + rlvl('hook_range') * PERK_PICKUPS.hook_range.effect),
    releaseBoost: RELEASE_BOOST * (1 + rlvl('swing_power') * PERK_PICKUPS.swing_power.effect),
    startHearts: HEARTS_MAX + plvl('iron_heart') * UPGRADES.iron_heart.effect,
    hookCooldown: HOOK_COOLDOWN * (1 - rlvl('quick_hook') * PERK_PICKUPS.quick_hook.effect),
    emberMultiplier: 1 + rlvl('ember_magnet') * PERK_PICKUPS.ember_magnet.effect,
    // Уровни перков для визуального отображения в HUD
    perkLevels: {
      hook_range: rlvl('hook_range'),
      swing_power: rlvl('swing_power'),
      iron_heart: plvl('iron_heart'),
      quick_hook: rlvl('quick_hook'),
      ember_magnet: rlvl('ember_magnet'),
    },
  };
}

// Стоимость следующего уровня апгрейда (только для iron_heart)
export function getUpgradeCost(upgradeId) {
  const def = UPGRADES[upgradeId];
  if (!def) return Infinity;
  const level = profile.getUpgradeLevel(upgradeId);
  if (level >= def.maxLevel) return Infinity;
  if (def.costs) return def.costs[level];
  return Math.floor(def.baseCost * Math.pow(def.costScale, level));
}
