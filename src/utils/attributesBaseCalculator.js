/**
 * Calcula os atributos base e per level para um monstro
 * Fórmulas baseadas em power, mapRole e baseStatsRole
 */

// Speed type mapping
const SPEED_TYPE_MAP = {
  'Slow': 134,
  'NoBoot': 177,
  'Boot1': 220,
  'Boot2': 263,
  'BOH': 306,
  'VeryFast': 410,
  'None': 0
};

// Maximum penetration values
const MAX_ARMOR_PEN = 60;
const MAX_MAGIC_PEN = 60;

/**
 * Retorna o valor de health base
 * @param {number} power - Power do monstro (para futura customização)
 * @returns {number}
 */
export function getBaseHealth(power = 0) {
  // Por enquanto retorna valor fixo de attributes_formulas.json
  // Futuramente pode calcular baseado no power
  return 30;
}

/**
 * Retorna o valor de speed base baseado no speedType
 * @param {string} speedType - Tipo de velocidade (Slow, NoBoot, Boot1, Boot2, BOH, VeryFast, None)
 * @returns {number}
 */
export function getBaseSpeed(speedType) {
  return SPEED_TYPE_MAP[speedType] || 0;
}

/**
 * Retorna o valor de atk base
 * @param {number} power - Power do monstro (para futura customização)
 * @returns {number}
 */
export function getBaseAtk(power = 0) {
  // Por enquanto retorna 0
  // Futuramente pode calcular baseado no power
  return 11;
}

/**
 * Retorna o valor de atks (special attack) base
 * @param {number} power - Power do monstro (para futura customização)
 * @returns {number}
 */
export function getBaseAtks(power = 0) {
  // Por enquanto retorna 0
  // Futuramente pode calcular baseado no power
  return 11;
}

/**
 * Retorna o valor de magic penetration base
 * @param {number} power - Power do monstro (para futura customização)
 * @returns {number}
 */
export function getBaseMagicPen(power = 0) {
  // Por enquanto retorna 0 (de attributes_formulas.json)
  // Futuramente pode calcular baseado no power
  return 0;
}

/**
 * Retorna o valor de physical penetration base
 * @param {number} power - Power do monstro (para futura customização)
 * @returns {number}
 */
export function getBasePhysicalPen(power = 0) {
  // Por enquanto retorna 0 (de attributes_formulas.json)
  // Futuramente pode calcular baseado no power
  return 0;
}

/**
 * Retorna o valor de armor base
 * @param {number} power - Power do monstro (para futura customização)
 * @returns {number}
 */
export function getBaseArmor(power = 0) {
  // Por enquanto retorna 0
  // Futuramente pode calcular baseado no power (ex: base.armor de attributes_formulas.json = 2)
  return 2;
}

/**
 * Retorna o valor de magic resist base
 * @param {number} power - Power do monstro (para futura customização)
 * @returns {number}
 */
export function getBaseMagicResist(power = 0) {
  // Por enquanto retorna 0
  // Futuramente pode calcular baseado no power (ex: base.magicResist de attributes_formulas.json = 2)
  return 2;
}

/**
 * Retorna todos os atributos base para um monstro
 * @param {number} power - Power do monstro
 * @param {string} speedType - Tipo de velocidade
 * @returns {Object} Objeto com todos os atributos base
 */
export function getAllBaseAttributes(power = 0, speedType = 'None') {
  return {
    health: getBaseHealth(power),
    speed: getBaseSpeed(speedType),
    atk: getBaseAtk(power),
    atks: getBaseAtks(power),
    magicPen: getBaseMagicPen(power),
    physicalPen: getBasePhysicalPen(power),
    armor: getBaseArmor(power),
    magicResist: getBaseMagicResist(power),
  };
}

/**
 * Calcula o nível padrão recomendado baseado no Power do monstro
 * Fórmula: (power * 15) + (power * power * 0.5)
 * @param {number} power - Valor de Power do monstro (0-15)
 * @returns {number} Nível padrão recomendado
 *
 * Curva paramétrica (t≈0.45) mantém coerência com grandes MMOs: *
 * early linearizado (transição mais suave), *
 * mid estabilizado, *
 * late achatado (sem inflar o nível dos mobs de área 200).
 */
export function getRecommendedDefaultLevel(power, areaLevel = 200, t = 0.45) {
  const multiplier = 1.3;
  const x = power / 10;
  const curve = (1 - t) * x + t * x * x;
  return Math.round(areaLevel * curve * multiplier)-3;
}

/**
 * Calcula HP por level baseado no HP balance e power
 * Fórmula: hp * Math.pow(power, 1.5)
 * @param {number} hp - HP do balance (0-15)
 * @param {number} power - Power do monstro
 * @returns {number} HP por level
 */
export function getHpPerLevel(hp, power = 1) {
  const result = 11+(hp * Math.pow(power, 1.05))//  1.0 = LINEAR ; 1.5 (RECOMENDADO) = quanto maior, mais acentuada a curva (aumento linear com power e exponencial com hp
  return parseFloat(result.toFixed(2));
}

/**
 * Calcula ATK máximo por level baseado no ATK balance
 * Fórmula: atk * 0.54
 * @param {number} atk - ATK do balance (0-15)
 * @returns {number} ATK máximo por level
 */
export function getMaxAtkPerLevel(atk) {
  return parseFloat((atk * 0.54).toFixed(2));
}

/**
 * Calcula SATK máximo por level baseado no SATK balance
 * Fórmula: satk * 0.54
 * @param {number} satk - SATK do balance (0-15)
 * @returns {number} SATK máximo por level
 */
export function getMaxSAtkPerLevel(satk) {
  return parseFloat((satk * 0.54).toFixed(2));
}

/**
 * Calcula Physical Penetration por level
 * Fórmula: 0.15 (valor fixo)
 * @returns {number} Physical penetration por level
 */
export function getPhysicalPenPerLevel() {
  return 0.15;
}

/**
 * Calcula Magic Penetration por level
 * Fórmula: 0.15 (valor fixo)
 * @returns {number} Magic penetration por level
 */
export function getMagicPenPerLevel() {
  return 0.15;
}

/**
 * Calcula Armor por level baseado no DEF balance
 * Fórmula: def * 0.09
 * @param {number} def - DEF do balance (0-15)
 * @returns {number} Armor por level
 */
export function getArmorPerLevel(def) {
  return parseFloat((def * 0.09).toFixed(2));
}

/**
 * Calcula Magic Resist por level baseado no SDEF balance
 * Fórmula: sdef * 0.09
 * @param {number} sdef - SDEF do balance (0-15)
 * @returns {number} Magic resist por level
 */
export function getMagicResistPerLevel(sdef) {
  return parseFloat((sdef * 0.09).toFixed(2));
}

/**
 * Retorna os valores máximos de penetração
 * @returns {Object} Objeto com armorPen e magicPen máximos
 */
export function getMaxPenetrationValues() {
  return {
    armorPen: MAX_ARMOR_PEN,
    magicPen: MAX_MAGIC_PEN
  };
}

/**
 * Calcula todos os atributos recomendados para um monstro
 * @param {Object} stats - Stats do monstro (hp, atk, satk, def, sdef, speedType, power)
 * @returns {Object} Objeto com todos os atributos recomendados
 */
export function calculateRecommendedAttributes(stats) {
  const {
    hp = 0,
    atk = 0,
    satk = 0,
    def = 0,
    sdef = 0,
    speedType = 'None',
    power = 0
  } = stats;

  return {
    // Base attributes
    baseSpeed: getBaseSpeed(speedType),
    baseHealth: getBaseHealth(power),
    baseAtk: getBaseAtk(power),
    baseAtks: getBaseAtks(power),
    baseMagicPen: getBaseMagicPen(power),
    basePhysicalPen: getBasePhysicalPen(power),
    baseArmor: getBaseArmor(power),
    baseMagicResist: getBaseMagicResist(power),

    // Per level attributes
    healthPerLevel: getHpPerLevel(hp, power),
    maxAtkPerLevel: getMaxAtkPerLevel(atk),
    maxAtkSPerLevel: getMaxSAtkPerLevel(satk),
    physicalPenPerLevel: getPhysicalPenPerLevel(),
    magicPenPerLevel: getMagicPenPerLevel(),
    armorPerLevel: getArmorPerLevel(def),
    magicResistPerLevel: getMagicResistPerLevel(sdef),

    // Other
    recommendedDefaultLevel: getRecommendedDefaultLevel(power),
  };
}

/**
 * Mapeamento de speedType para valores
 * Exportado para uso em outras partes do código
 */
export { SPEED_TYPE_MAP };
