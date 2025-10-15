/**
 * Constantes do algoritmo de drop de materiais lendários
 */
export const LEGENDARY_DROP_CONSTANTS = {
  /** Quantidade de monstros mortos por hora de farm */
  KILL_PER_HOUR: 120,

  /** Power base de referência para o cálculo de ajuste */
  POWER_BASE: 4,

  /** Tempo esperado (em horas) para dropar 30 materiais principais */
  TIME_TO_DROP_30_IN_HOURS: 9,

  /** Quantidade total de materiais principais necessários para craftar um item lendário */
  TOTAL_MAIN_MATERIALS: 30,

  /** Ex: Se 0.2, para cada 1 de power, o drop aumenta em 20% do valor base */
  POWER_ADJUSTMENT_MULTIPLIER: 0.2
};

/**
 * Calcula as métricas de drop para materiais lendários
 *
 * @param {number} monsterPower - Power do monstro
 * @param {Object} constants - Constantes opcionais para override
 * @returns {Object} Métricas calculadas
 */
export function calculateLegendaryDropMetrics(monsterPower, constants = LEGENDARY_DROP_CONSTANTS) {
  if (!monsterPower || monsterPower === 0) {
    return {
      adjustedDropChance: 0,
      timeToDropOneMaterialInMin: 0,
      totalAdjustedTimeInHours: 0
    };
  }

  const {
    KILL_PER_HOUR,
    POWER_BASE,
    TIME_TO_DROP_30_IN_HOURS,
    TOTAL_MAIN_MATERIALS,
    POWER_ADJUSTMENT_MULTIPLIER
  } = constants;

  // Calcula o total de monstros mortos no período
  const totalMonstersKilled = KILL_PER_HOUR * TIME_TO_DROP_30_IN_HOURS;

  // Calcula a chance de drop base
  const baseDropChance = (TOTAL_MAIN_MATERIALS / totalMonstersKilled) * 100;

  // Ajusta a chance de drop com base no poder do monstro
  const adjustedDropChance = baseDropChance * (1 + (monsterPower - POWER_BASE) * POWER_ADJUSTMENT_MULTIPLIER);

  // Calcula o tempo necessário para dropar 1 material em minutos
  const timeToDropOneMaterialInMin = (60 / KILL_PER_HOUR) / (adjustedDropChance / 100);

  // Calcula o tempo total ajustado em horas
  const totalAdjustedTimeInHours = (timeToDropOneMaterialInMin * TOTAL_MAIN_MATERIALS) / 60;

  return {
    adjustedDropChance,
    timeToDropOneMaterialInMin,
    totalAdjustedTimeInHours
  };
}
