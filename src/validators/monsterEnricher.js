import { getPowerBaseByAttrPoints } from '@/utils/powerCalculator';
import { getRecommendedDefaultLevel } from '@/utils/attributesBaseCalculator';
import { getBaseExpByPower, getBalanceMultiplier } from '@/utils/rewardsCalculator';
import { calculateDeviation } from './validatorHelper';

/**
 * Função auxiliar para converter speed type em valor numérico
 */
const getSpeedValue = (speedType) => {
  const speedMap = {
    'Slow': 1,
    'NoBoot': 2,
    'Boot1': 3,
    'Boot2': 4,
    'BOH': 5,
    'VeryFast': 6,
    'None': 0
  };
  return speedMap[speedType] || 0;
};

/**
 * Enriquece um monstro com dados de validação:
 * - Valores recomendados (recommended)
 * - Deviations pré-calculados
 */
export const enrichMonsterWithValidationData = (monster, calculateRecommendedAttributes) => {
  const speedValue = getSpeedValue(monster.speedType || 'None');

  // ===============================
  // 1. CALCULAR VALORES RECOMENDADOS
  // ===============================

  // Power recomendado
  const recommendedPower = getPowerBaseByAttrPoints(
    monster.hp || 0,
    monster.atk || 0,
    monster.satk || 0,
    monster.def || 0,
    monster.sdef || 0,
    monster.hostile || false,
    monster.hostileWhenAttacked || false,
    speedValue
  );

  // Default Level recomendado
  const recommendedDefaultLevel = getRecommendedDefaultLevel(monster.power || 0);

  // Attributes recomendados
  const recommendedAttributes = calculateRecommendedAttributes ? calculateRecommendedAttributes({
    hp: monster.hp || 1,
    atk: monster.atk || 1,
    satk: monster.satk || 1,
    def: monster.def || 1,
    sdef: monster.sdef || 1,
    speed: speedValue,
    speedType: monster.speedType || 'None',
    power: monster.power || 1
  }) : {};

  // XP recomendado
  const resourceBalance = monster.resourceBalance || 'Equals';
  let expBalance = 0;
  if (resourceBalance.includes('Exp')) {
    expBalance = parseInt(resourceBalance.replace('Exp', '')) || 0;
  }
  const baseExp = getBaseExpByPower(monster.power || 0);
  const multiplier = getBalanceMultiplier(expBalance);
  const recommendedXP = Math.round(baseExp * multiplier);

  // Loot: calcular maxLevel atual
  let currentLastUnlockLevel = 0;
  if (monster.loot && monster.loot.length > 0) {
    const unlockLevels = monster.loot
      .filter(item => item.unlockLevel !== undefined && item.unlockLevel !== null)
      .map(item => item.unlockLevel);
    if (unlockLevels.length > 0) {
      currentLastUnlockLevel = Math.max(...unlockLevels);
    }
  }

  // ===============================
  // 2. CALCULAR DEVIATIONS
  // ===============================

  const deviations = {
    power: calculateDeviation(monster.power, recommendedPower),
    defaultLevel: calculateDeviation(monster.defaultLevel, recommendedDefaultLevel),
    experience: calculateDeviation(monster.experience, recommendedXP),
    classXpPerLevel: calculateDeviation(monster.classXpPerLevel, recommendedXP),

    // Attributes
    healthPerLevel: calculateDeviation(monster.healthPerLevel, recommendedAttributes.healthPerLevel),
    baseSpeed: calculateDeviation(monster.baseSpeed, recommendedAttributes.baseSpeed),
    maxAtkPerLevel: calculateDeviation(monster.maxAtkPerLevel, recommendedAttributes.maxAtkPerLevel),
    maxAtkSPerLevel: calculateDeviation(monster.maxAtkSPerLevel, recommendedAttributes.maxAtkSPerLevel),
    magicPenPerLevel: calculateDeviation(monster.magicPenPerLevel, recommendedAttributes.magicPenPerLevel),
    physicalPenPerLevel: calculateDeviation(monster.physicalPenPerLevel, recommendedAttributes.physicalPenPerLevel),
    armorPerLevel: calculateDeviation(monster.armorPerLevel, recommendedAttributes.armorPerLevel),
    magicResistPerLevel: calculateDeviation(monster.magicResistPerLevel, recommendedAttributes.magicResistPerLevel),
  };

  // ===============================
  // 3. RETORNAR MONSTER ENRIQUECIDO
  // ===============================

  return {
    ...monster,
    recommended: {
      power: recommendedPower,
      defaultLevel: recommendedDefaultLevel,
      experience: recommendedXP,
      classXpPerLevel: recommendedXP,
      // Attributes
      healthPerLevel: recommendedAttributes.healthPerLevel,
      baseSpeed: recommendedAttributes.baseSpeed,
      maxAtkPerLevel: recommendedAttributes.maxAtkPerLevel,
      maxAtkSPerLevel: recommendedAttributes.maxAtkSPerLevel,
      magicPenPerLevel: recommendedAttributes.magicPenPerLevel,
      physicalPenPerLevel: recommendedAttributes.physicalPenPerLevel,
      armorPerLevel: recommendedAttributes.armorPerLevel,
      magicResistPerLevel: recommendedAttributes.magicResistPerLevel,
    },
    deviations,
    // Merge existing _validation with new values
    _validation: {
      ...(monster._validation || {}), // Preserve existing validation data from monsterService
      currentLastUnlockLevel,
      hasLootConflict: monster.isNoLoot && monster.resourceBalance?.includes('Loot')
    }
  };
};
