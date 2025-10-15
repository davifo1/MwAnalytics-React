import { createValidator } from './validatorHelper';
import branorService from '@/services/branorService';

/**
 * Valida um item com atributo dream="1"
 *
 * @param {Object} item - Item a ser validado
 * @param {Set<number>} branorSellableItems - Set of item IDs sellable in branor (optional)
 * @returns {Object} - Resultado da validação com erros, warnings e status
 */
export const validateItem = (item, branorSellableItems = null) => {
  const validator = createValidator();

  // Validação 1: Verificar se existe o atributo "sellingPrice"
  if (!item.attributes?.sellingPrice || item.attributes.sellingPrice === '' || item.attributes.sellingPrice === '0') {
    validator.addError('sellingPrice', 'Selling Price', {
      current: item.attributes?.sellingPrice || 'missing',
      recommended: 'required',
      deviation: null,
      extra: 'Selling Price attribute is required for dream items'
    });
  }

  // Validação 2: Verificar se o item está sendo vendido no branor.lua
  if (branorSellableItems !== null) {
    const itemId = parseInt(item.id, 10);
    if (!branorSellableItems.has(itemId)) {
      validator.addError('branorSellable', 'Branor Sellable', {
        current: 'not selling in branor',
        recommended: 'should be added to branor.lua',
        deviation: null,
        extra: `Item ID ${itemId} is not being sold in branor.lua via shopModule:addDreamSellableItem()`
      });
      // Note: No .withFix() for this validation as it requires manual Lua file editing
    }
  }

  return validator.getResult();
};

/**
 * Calcula estatísticas gerais de validação para uma lista de items
 * @param {Array} items - Lista de items a validar
 * @param {Set<number>} branorSellableItems - Set of item IDs sellable in branor (optional)
 */
export const calculateValidationStats = (items, branorSellableItems = null) => {
  const stats = {
    total: items.length,
    critical: 0,
    warning: 0,
    good: 0,
    criticalPercent: 0,
    warningPercent: 0,
    goodPercent: 0
  };

  items.forEach(item => {
    const validation = validateItem(item, branorSellableItems);
    if (validation.status === 'critical') stats.critical++;
    else if (validation.status === 'warning') stats.warning++;
    else stats.good++;
  });

  stats.criticalPercent = ((stats.critical / stats.total) * 100).toFixed(1);
  stats.warningPercent = ((stats.warning / stats.total) * 100).toFixed(1);
  stats.goodPercent = ((stats.good / stats.total) * 100).toFixed(1);

  return stats;
};
