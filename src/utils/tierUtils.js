/**
 * Tier Utilities
 * Constantes e funções utilitárias para trabalhar com tiers de items
 *
 * Ordem de tiers (do menor para o maior):
 * common < basic < epic < legendary
 */

/**
 * Ordem numérica dos tiers para sorting
 * Valores maiores = tier superior
 */
export const TIER_ORDER = {
  'common': 1,
  'basic': 2,
  'epic': 3,
  'legendary': 4,
};

/**
 * Cores dos tiers usando Tailwind CSS classes
 * Formato: bg-{color} text-{color}
 */
export const TIER_COLORS = {
  'common': 'bg-gray-500 text-gray-300',      // Cinza discreto
  'basic': 'bg-stone-700 text-stone-300',     // Marrom acinzentado discreto
  'epic': 'bg-purple-600 text-purple-100',    // Roxo
  'legendary': 'bg-yellow-600 text-yellow-100', // Dourado
  'rare': 'bg-blue-600 text-blue-100',        // Azul (mantido para compatibilidade)
  'uncommon': 'bg-green-600 text-green-100',  // Verde (mantido para compatibilidade)
};

/**
 * Retorna a classe CSS de cores para um tier específico
 * @param {string} tier - Nome do tier (ex: 'legendary', 'epic', 'basic', 'common')
 * @returns {string} Classes CSS do Tailwind
 */
export function getTierColor(tier) {
  if (!tier) return TIER_COLORS['common'];
  const tierLower = tier.toLowerCase();
  return TIER_COLORS[tierLower] || TIER_COLORS['common'];
}

/**
 * Retorna o valor numérico de ordenação para um tier
 * @param {string} tier - Nome do tier
 * @returns {number} Valor numérico (maior = tier superior)
 */
export function getTierOrder(tier) {
  if (!tier) return 0;
  const tierLower = tier.toLowerCase();
  return TIER_ORDER[tierLower] || 0;
}

/**
 * Compara dois items baseado em seus tiers
 * Útil para Array.sort()
 *
 * @param {Object} itemA - Primeiro item
 * @param {Object} itemB - Segundo item
 * @param {boolean} descending - Se true, ordena do maior para menor (legendary primeiro)
 * @returns {number} Resultado da comparação (-1, 0, 1)
 */
export function compareTiers(itemA, itemB, descending = true) {
  const orderA = getTierOrder(itemA.tier);
  const orderB = getTierOrder(itemB.tier);

  if (descending) {
    return orderB - orderA; // Maior tier primeiro
  }
  return orderA - orderB; // Menor tier primeiro
}

/**
 * Ordena um array de items por tier
 * @param {Array} items - Array de items
 * @param {boolean} descending - Se true, ordena do maior para menor
 * @returns {Array} Array ordenado (novo array, não modifica o original)
 */
export function sortByTier(items, descending = true) {
  return [...items].sort((a, b) => compareTiers(a, b, descending));
}

/**
 * Sorting function personalizada para usar com TanStack Table
 * Ordena por tier (descendente) e depois por nome (ascendente)
 *
 * @param {Object} rowA - Primeira linha da tabela
 * @param {Object} rowB - Segunda linha da tabela
 * @returns {number} Resultado da comparação
 */
export function tierNameSortingFn(rowA, rowB) {
  // Primeiro ordena por tier (descendente: legendary > epic > basic > common)
  const tierA = getTierOrder(rowA.original.tier);
  const tierB = getTierOrder(rowB.original.tier);

  if (tierA !== tierB) {
    return tierB - tierA; // Ordem descendente de tier
  }

  // Se tier for igual, ordena alfabeticamente por nome (ascendente)
  const nameA = rowA.original.name?.toLowerCase() || '';
  const nameB = rowB.original.name?.toLowerCase() || '';
  return nameA.localeCompare(nameB);
}

/**
 * Lista de todos os tiers disponíveis, em ordem ascendente
 */
export const TIER_LIST = ['common', 'basic', 'epic', 'legendary'];

/**
 * Lista de todos os tiers disponíveis, em ordem descendente
 */
export const TIER_LIST_DESC = ['legendary', 'epic', 'basic', 'common'];
