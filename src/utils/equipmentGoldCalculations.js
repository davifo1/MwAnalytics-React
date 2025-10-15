/**
 * Calcula o valor total em gold de um equipamento baseado em seus atributos
 * Função única e simples para garantir congruência de cálculo em toda aplicação
 *
 * @param {Array<{attributeName: string, value: number, goldPerPoint: number}>} attributes - Array de atributos
 * @param {object} item - Objeto completo do item com todos seus atributos (para lógicas customizadas)
 * @returns {number} Valor total acumulado em gold
 *
 * @example
 * // Exemplo básico
 * const attributes = [
 *   { attributeName: 'attackDamage', value: 50, goldPerPoint: 35 },
 *   { attributeName: 'abilityPower', value: 30, goldPerPoint: 20 }
 * ];
 * const item = {
 *   id: '2123',
 *   name: 'ring of the sky',
 *   tier: 'legendary',
 *   slotType: 'ring',
 *   attackDamage: 50,
 *   abilityPower: 30
 * };
 * const total = calculateEquipmentGoldValueByAttributes(attributes, item);
 * // total = 2350 (50*35 + 30*20)
 *
 * @example
 * // Exemplo com lógica customizada - Bônus por tier
 * // Você pode acessar:
 * // - item.tier (legendary, epic, basic, common)
 * // - item.slotType (ring, necklace, weapon, etc)
 * // - item.name (nome do item)
 * // - item.unique (se é único)
 * // - item.passive (passive especial)
 * // - Qualquer outro atributo do item
 */
export function calculateEquipmentGoldValueByAttributes(attributes, item = {}) {
  // Soma base de todos os atributos
  let totalGold = attributes.reduce((total, attr) => {
    const value = parseFloat(attr.value);
    const goldPerPoint = parseFloat(attr.goldPerPoint);

    if (isNaN(value) || isNaN(goldPerPoint) || value <= 0 || goldPerPoint <= 0) {
      return total;
    }

    return total + (value * goldPerPoint);
  }, 0);

  // ========================================
  // EXEMPLOS DE LÓGICAS CUSTOMIZADAS
  // ========================================

  // Exemplo 1: Bônus por tier do equipamento
  // if (item.tier === 'legendary') {
  //   totalGold *= 1.2; // 20% bonus para lendários
  // } else if (item.tier === 'epic') {
  //   totalGold *= 1.1; // 10% bonus para épicos
  // }

  // Exemplo 2: Penalidade para items únicos (já que não podem stackar)
  // if (item.unique) {
  //   totalGold *= 0.9; // 10% de redução
  // }


  return totalGold;
}
