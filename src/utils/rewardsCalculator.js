import { getRecommendedDefaultLevel } from './attributesBaseCalculator';

/**
 * Calcula o XP base baseado no power
 * @param {number} power - Power do monstro
 * @returns {number} XP base
 */
export function getBaseExpByPower(power) {
  if (power < 0 || power > 15) {
    console.error(`Power ${power} is out of range.`);
    return -1;
  }
  //Para XP e dificuldade: use curvas de potência (1.3–1.7), calibradas por TTK (Time To Kill - Tempo para matar) e custos por minuto.
  return Math.round(1.55 * Math.pow(power, 1.7));  // 1.7 = quanto maior, mais acentuada a curva
}

/**
 * Calcula o gold base por kill baseado no power
 * @param {number} power - Power do monstro
 * @returns {number} Gold coins per kill
 */
export function getGoldCoinPerKillByPower(power) {
  const L0 = 3;        // valor base no early (ajuste ao seu "P0")
  const r  = 1.40;     // crescimento geométrico principal (1.38–1.50)
  const λ  = 0.015;    // booster linear suave para “encher” o midgame (0–0.02)

  // soft-cap logístico para frear o fim sem matar o “uau”
  const pS = 10;       // onde começa a suavizar (P12 é bom)
  const w  = 2.4;      // largura da transição (2–3 = suave)
  const d  = 0.2;     // força do freio no late (0.2–0.4)

  const soft = 1 / (1 + Math.exp((power - pS) / w)); // ~1 no early, ~0 no late
  const damp = 1 - d * (1 - soft);                   // 1→(1-d) depois do pS
  const multiplier = 14;

  return Math.round((L0 * Math.pow(r, power) * (1 + λ * power) * damp) * multiplier) - 39;
}

/**
 * Calcula o gold por nível (budget per level) baseado no power
 * Este valor representa quanto gold o monstro deve fornecer por nível do jogador
 * @param {number} power - Power do monstro
 * @returns {number} Gold per level (com até 2 casas decimais)
 */
export function getGoldPerLevelByPower(power) {
  const goldPerKill = getGoldCoinPerKillByPower(power);
  const recommendedLevel = getRecommendedDefaultLevel(power);
  // console.log(`Gold per level by power ${power}: ${recommendedLevel} / ${goldPerKill} = ${goldPerKill / recommendedLevel}`);
  return parseFloat((goldPerKill / recommendedLevel).toFixed(2));
}

/**
 * Calcula o multiplicador de loot baseado no balance
 * @param {number} balance - N�vel de balance do loot (0-4) | TAGs: Loot1, Loot2, Loot3, Loot4
 * @returns {number} Multiplicador
 */
export function getBalanceMultiplier(balance) {
  if (balance <= 0) return 1;     // sem varia��o se for < 0

  const maxVariation = 0.15;        // varia��o m�xima = 15%
  const step = maxVariation / 4;    // cada n�vel adiciona 3,75%

  // garante que balance esteja entre 1 e 4
  const level = Math.min(balance, 4);

  return 1 + (level * step);
}

/**
 * Calcula o Gold Coins/Kill recomendado baseado no Budget/Kill/Lvl
 * Fórmula: Gold Coins/Kill recomendado = Budget/Kill/Lvl × GOLD_COINS_PERCENTAGE
 *
 * A porcentagem varia com o Power do monstro:
 * - Power 5 → 25% direto
 * - Power 15 → 15% direto
 *
 * @param {number} budgetPerKillPerLevel - Budget/Kill/Lvl do monstro
 * @param {number} power - Power do monstro (0-15)
 * @returns {number} Gold Coins/Kill recomendado (com até 2 casas decimais)
 */
export function getRecommendedGoldCoinsPerKill(budgetPerKillPerLevel, power = 10) {
  if (!budgetPerKillPerLevel || budgetPerKillPerLevel <= 0) {
    return 0;
  }
  // Aumentar % de gold direto para early game
  // Power 5 → 25% direto
  // Power 15 → 15% direto
  const goldCoinsPercentage = Math.max(0.15, 0.3 - (power * 0.01)); // 15% no mínimo e 30% - (Power × 1%) no máximo

  const recommended = budgetPerKillPerLevel * goldCoinsPercentage;

  return parseFloat(recommended.toFixed(2));
}

/**
 * Retorna o Base Gold Coins recomendado para um monstro
 *
 * @param {number} power - Power do monstro (0-15)
 * @returns {number} Base Gold Coins recomendado
 */
export function getRecommendedBaseGoldCoinsPerKill(power) {
  return 3;
}

//CPM (Custo por Minuto) deve seguir uma curva em “S” (sigmoidal ou logística),
export function getCPM(power) {
  const base = 100;   // custo mínimo inicial
  const max  = 3500;  // custo máximo (late game)
  const pS   = 8;     // power onde a curva sobe mais rápido
  const w    = 2.0;   // largura da transição (maior = curva mais suave)

  const logistic = 1 / (1 + Math.exp(-(power - pS) / w));
  return Math.round(base + (max - base) * logistic);
}