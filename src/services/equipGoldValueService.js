import { calculateEquipmentGoldValueByAttributes } from '../utils/equipmentGoldCalculations.js';

class EquipGoldValueService {
  constructor() {
    this.goldValues = null;
  }

  /**
   * Carrega os valores de gold dos atributos do JSON
   */
  async loadGoldValues() {
    if (this.goldValues) return this.goldValues;

    try {
      const response = await fetch('/data/equip_attribute_gold_values.json');
      const data = await response.json();
      this.goldValues = data.attributeGoldValues;
      return this.goldValues;
    } catch (error) {
      console.error('Error loading equipment gold values:', error);
      return {};
    }
  }

  /**
   * Retorna o valor em gold por ponto de um atributo específico
   * @param {string} attributeName - Nome do atributo (ex: 'attackDamage')
   * @returns {number|null} Valor em gold por ponto, ou null se não encontrado
   */
  getGoldValuePerPoint(attributeName) {
    if (!this.goldValues) {
      console.warn('Gold values not loaded. Call loadGoldValues() first.');
      return null;
    }

    const attribute = this.goldValues[attributeName];
    return attribute ? attribute.goldValuePerPoint : null;
  }

  /**
   * Retorna informações completas de um atributo
   * @param {string} attributeName - Nome do atributo
   * @returns {object|null} Objeto com displayName, goldValuePerPoint e description
   */
  getAttributeInfo(attributeName) {
    if (!this.goldValues) {
      console.warn('Gold values not loaded. Call loadGoldValues() first.');
      return null;
    }

    return this.goldValues[attributeName] || null;
  }

  /**
   * Calcula o valor total em gold de um equipamento baseado em seus atributos
   * Usa a função única de utils para garantir congruência
   * @param {object} itemAttributes - Objeto com os atributos do item
   * @param {object} fullItem - Objeto completo do item (com id, name, tier, slotType, etc) para lógicas customizadas
   * @returns {object} Objeto com totalGold e breakdown detalhado
   */
  calculateEquipmentGoldValue(itemAttributes, fullItem = {}) {
    if (!this.goldValues) {
      console.warn('Gold values not loaded. Call loadGoldValues() first.');
      return { totalGold: 0, breakdown: [], hasValidAttributes: false };
    }

    const breakdown = [];
    const validAttributes = [];

    // Itera sobre todos os atributos do item
    Object.keys(itemAttributes).forEach(attributeName => {
      const goldPerPoint = this.getGoldValuePerPoint(attributeName);

      if (goldPerPoint !== null && goldPerPoint !== undefined) {
        const attributeValue = parseFloat(itemAttributes[attributeName]);

        // Valida se o valor do atributo é um número válido e positivo
        if (!isNaN(attributeValue) && attributeValue > 0) {
          const attributeInfo = this.getAttributeInfo(attributeName);

          breakdown.push({
            attributeName,
            displayName: attributeInfo.displayName,
            value: attributeValue,
            goldPerPoint,
            totalGold: attributeValue * goldPerPoint
          });

          validAttributes.push({
            attributeName,
            value: attributeValue,
            goldPerPoint
          });
        }
      }
    });

    // Usa a função única de utils para garantir mesmo cálculo em toda aplicação
    // Passa o item completo para permitir lógicas customizadas
    const totalGold = calculateEquipmentGoldValueByAttributes(validAttributes, fullItem);

    return {
      totalGold,
      breakdown,
      hasValidAttributes: breakdown.length > 0
    };
  }

  /**
   * Verifica se um item possui pelo menos um atributo válido para cálculo de gold
   * @param {object} item - Objeto do item
   * @returns {boolean} true se possui atributos válidos
   */
  hasValidGoldAttributes(item) {
    if (!this.goldValues) return false;

    return Object.keys(item).some(attributeName => {
      const goldPerPoint = this.getGoldValuePerPoint(attributeName);
      const attributeValue = parseFloat(item[attributeName]);
      return goldPerPoint !== null && !isNaN(attributeValue) && attributeValue > 0;
    });
  }
}

// Exporta uma instância única (singleton)
export default new EquipGoldValueService();
