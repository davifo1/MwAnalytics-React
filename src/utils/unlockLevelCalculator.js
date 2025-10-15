// Utility functions for calculating unlock levels for monster loot items
import { getGoldPerLevelByPower, getBalanceMultiplier } from './rewardsCalculator';

// ⚙️ CONFIGURAÇÃO: Cap máximo de unlock level
// Se for -1, não há limite máximo
export const MAX_UNLOCK_LEVEL = -1;

// Map de prioridades das categorias de loot (maior prioridade = unlock primeiro)
// Hardcoded priorities - higher values unlock first
const lootCategoryPriorities = {
  'craft primary': 7,
  'craft secondary': 6,
  'legendary': 5,
  'quest': 4,
  'special': 3,
  'race': 2,
  'general': 1,
};


/**
 * Calculate expected value for an item
 * IMPORTANTE: Esta lógica deve ser idêntica à da tela (MonsterDetailsOptimized.jsx)
 */
export const calculateExpectedValue = (lootItem, itemsMap) => {
  if (!lootItem || !itemsMap || !lootItem.name) return 0;

  const item = itemsMap.get(lootItem.name.toLowerCase());
  if (!item) return 0;

  // Prioridade: valuation > sellingPrice (mesma lógica da tela)
  const itemValue = item.valuation || item.sellPrice || 0;

  // Quantidade: metade do countMax (0 se 0, 1 se 1) - mesma lógica da tela
  const quantity = lootItem.countMax === 0 ? 0 :
                   lootItem.countMax === 1 ? 1 :
                   Math.floor(lootItem.countMax / 2);

  // Cálculo: valor * (chance/100) * quantidade
  const expectedValue = itemValue * ((lootItem.chance || 0) / 100) * quantity;

  return Math.floor(expectedValue);
};

/**
 * ⭐ FUNÇÃO CENTRAL: Ordena loot items seguindo a lógica de prioridade do sistema
 *
 * ⚠️ IMPORTANTE: Sempre que esta lógica mudar, atualizar TAMBÉM o tooltip em:
 *    src/components/MonsterLootTable.jsx (linhas 94-103)
 *
 * Ordem de prioridade (do primeiro ao último unlock):
 * 1. Por monsterDropStage (da menor faixa de level para a maior):
 *    - Beginner (1-15)
 *    - Low-level (15-80)
 *    - Intermediate (80-155)
 *    - Mid-level (155-250)
 *    - High-level (250-350)
 *    - Endgame (350+)
 *    - Items sem monsterDropStage (por último)
 *
 * 2. Critérios de desempate (quando têm o mesmo stage):
 *    - Maior prioridade de loot category primeiro (craft primary=7, craft secondary=6, etc)
 *    - Menor valuation primeiro
 *    - Menor sellingPrice primeiro
 *    - Menor tier primeiro (basic < common < uncommon < rare < epic < legendary < mythic)
 *    - Ordem alfabética pelo nome
 *
 * Esta função é usada em:
 * - Cálculo de unlock levels (REC)
 * - Add Race Items to All (vite.config.js)
 * - Exibição da loot table (MonsterLootTable.jsx)
 *
 * @param {Array} lootItems - Array de items do loot
 * @param {Map} itemsMap - Map de items (name -> {valuation, sellPrice, tier, attributes})
 * @returns {Array} - Array de items ordenados pela prioridade
 */
export const sortLootItemsByPriority = (lootItems, itemsMap) => {
  if (!lootItems || !Array.isArray(lootItems)) return [];

  // Ordem dos stages (menor level primeiro)
  const stageOrder = {
    'Beginner': 1,
    'Low-level': 2,
    'Intermediate': 3,
    'Mid-level': 4,
    'High-level': 5,
    'Endgame': 6,
    '': 999 // Items sem stage vão para o final
  };

  // Ordem dos tiers (menor tier primeiro)
  const tierOrder = {
    'basic': 1,
    'common': 2,
    'uncommon': 3,
    'rare': 4,
    'epic': 5,
    'legendary': 6,
    'mythic': 7,
    '': 999 // Items sem tier vão para o final
  };

  return [...lootItems].sort((a, b) => {
    // Busca os items no map para pegar atributos
    const itemA = itemsMap?.get(a.name?.toLowerCase());
    const itemB = itemsMap?.get(b.name?.toLowerCase());

    const stageA = itemA?.attributes?.monsterDropStage || '';
    const stageB = itemB?.attributes?.monsterDropStage || '';

    // 1. Ordena pela ordem do stage
    const orderA = stageOrder[stageA] ?? 999;
    const orderB = stageOrder[stageB] ?? 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Se têm o mesmo stage, aplicar critérios de desempate:

    // 2. Desempate por prioridade de loot category (maior prioridade primeiro)
    const lootCategoryA = (itemA?.attributes?.lootCategory || '').toLowerCase();
    const lootCategoryB = (itemB?.attributes?.lootCategory || '').toLowerCase();
    const priorityA = lootCategoryPriorities[lootCategoryA] ?? 0;
    const priorityB = lootCategoryPriorities[lootCategoryB] ?? 0;

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Maior prioridade primeiro (ordem decrescente)
    }

    // 3. Desempate por valuation (menor primeiro)
    const valuationA = itemA?.valuation ?? 999999999;
    const valuationB = itemB?.valuation ?? 999999999;

    if (valuationA !== valuationB) {
      return valuationA - valuationB;
    }

    // 4. Desempate por sellingPrice (menor primeiro)
    const sellPriceA = itemA?.sellPrice ?? 999999999;
    const sellPriceB = itemB?.sellPrice ?? 999999999;

    if (sellPriceA !== sellPriceB) {
      return sellPriceA - sellPriceB;
    }

    // 5. Desempate por tier (menor primeiro)
    const tierA = (itemA?.tier || '').toLowerCase();
    const tierB = (itemB?.tier || '').toLowerCase();
    const tierOrderA = tierOrder[tierA] ?? 999;
    const tierOrderB = tierOrder[tierB] ?? 999;

    if (tierOrderA !== tierOrderB) {
      return tierOrderA - tierOrderB;
    }

    // 6. Desempate por ordem alfabética
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

// Calculate unlock levels for loot items
const calculateUnlockLevels = (sortedLoot, budgetPerLevel, itemsMap, maxUnlockLevel = MAX_UNLOCK_LEVEL) => {
  const unlockLevels = [];
  let cumulativeCost = 0;
  let currentLevel = 0;

  // Proteção contra budgetPerLevel inválido
  if (budgetPerLevel <= 0) {
    console.warn('[unlockLevelCalculator] budgetPerLevel is zero or negative, returning all items with unlock level 0');
    return sortedLoot.map((_, index) => ({ index, unlockLevel: 0 }));
  }

  sortedLoot.forEach((lootItem, index) => {
    const expectedValue = calculateExpectedValue(lootItem, itemsMap);
    cumulativeCost += expectedValue;

    // Se maxUnlockLevel é -1, não há limite. Caso contrário, respeita o cap
    const hasMaxLevel = maxUnlockLevel !== -1;

    // Proteção contra loop infinito: limite de 10000 iterações
    let iterations = 0;
    const MAX_ITERATIONS = 10000;

    while (cumulativeCost > budgetPerLevel && (!hasMaxLevel || currentLevel < maxUnlockLevel)) {
      currentLevel++;
      cumulativeCost -= budgetPerLevel;

      iterations++;
      if (iterations > MAX_ITERATIONS) {
        console.error(`[unlockLevelCalculator] Infinite loop detected for item "${lootItem.name}" at index ${index}. cumulativeCost: ${cumulativeCost}, budgetPerLevel: ${budgetPerLevel}`);
        break;
      }
    }

    unlockLevels.push({
      index,
      unlockLevel: currentLevel
    });
  });

  return unlockLevels;
};

// Main function to calculate unlock levels for a monster
export const calculateMonsterUnlockLevels = (monsterData, itemsMap, maxUnlockLevel = MAX_UNLOCK_LEVEL) => {
  if (!monsterData?.loot || !itemsMap) {
    console.warn('[calculateMonsterUnlockLevels] Missing monsterData.loot or itemsMap');
    return [];
  }

  const power = monsterData.power || 0;
  const resourceBalance = monsterData.resourceBalance || 'Equals';

  // Convert resourceBalance to lootBalance numeric
  let lootBalance = 0;
  if (resourceBalance.includes('Loot')) {
    lootBalance = parseInt(resourceBalance.replace('Loot', '')) || 0;
  }

  const baseGold = getGoldPerLevelByPower(power);
  const multiplier = getBalanceMultiplier(lootBalance);
  const budgetPerLevel = parseFloat((baseGold * multiplier).toFixed(2));

  console.log(`[calculateMonsterUnlockLevels] Monster: ${monsterData.monsterName}, power: ${power}, budgetPerLevel: ${budgetPerLevel}, loot count: ${monsterData.loot.length}`);

  // Filter out gold coins
  const lootItems = monsterData.loot.filter(item =>
    item.name?.toLowerCase() !== 'gold coin' &&
    item.name?.toLowerCase() !== 'gold coins'
  );

  console.log(`[calculateMonsterUnlockLevels] After filtering gold coins: ${lootItems.length} items`);

  // ⭐ Usa a função centralizada de ordenação
  const sortedLoot = sortLootItemsByPriority(lootItems, itemsMap);
  console.log(`[calculateMonsterUnlockLevels] After sorting: ${sortedLoot.length} items`);

  const unlockLevels = calculateUnlockLevels(sortedLoot, budgetPerLevel, itemsMap, maxUnlockLevel);
  console.log(`[calculateMonsterUnlockLevels] Calculated ${unlockLevels.length} unlock levels`);

  // Map back to original loot items with calculated unlock levels
  const result = monsterData.loot.map(originalItem => {
    // Skip gold coins
    if (originalItem.name?.toLowerCase() === 'gold coin' ||
        originalItem.name?.toLowerCase() === 'gold coins') {
      return { ...originalItem, unlockLevel: 0 };
    }

    // Find in sorted loot
    const sortedIndex = sortedLoot.findIndex(item => item === originalItem);
    if (sortedIndex === -1) {
      return { ...originalItem, unlockLevel: 0 };
    }

    const unlockData = unlockLevels.find(ul => ul.index === sortedIndex);
    return {
      ...originalItem,
      unlockLevel: unlockData?.unlockLevel ?? 0
    };
  });

  return result;
};

// Simplified version that returns a Map of itemName -> unlockLevel
// Used for server-side unlock level calculation (vite.config.js)
export const calculateUnlockLevelsMap = (lootItems, power, resourceBalance, itemsMap, maxUnlockLevel = MAX_UNLOCK_LEVEL) => {
  if (!lootItems || !itemsMap) {
    return new Map();
  }

  // Convert resourceBalance to lootBalance numeric
  let lootBalance = 0;
  if (resourceBalance && resourceBalance.includes('Loot')) {
    lootBalance = parseInt(resourceBalance.replace('Loot', '')) || 0;
  }

  const baseGold = getGoldPerLevelByPower(power);
  const multiplier = getBalanceMultiplier(lootBalance);
  const budgetPerLevel = parseFloat((baseGold * multiplier).toFixed(2));

  // Filter out gold coins
  const filteredItems = lootItems.filter(item =>
    item.name?.toLowerCase() !== 'gold coin' &&
    item.name?.toLowerCase() !== 'gold coins'
  );

  // ⭐ Usa a função centralizada de ordenação
  const sortedLoot = sortLootItemsByPriority(filteredItems, itemsMap);

  // Calculate unlock levels
  const unlockLevels = new Map();
  let cumulativeCost = 0;
  let currentLevel = 0;

  // Proteção contra budgetPerLevel inválido
  if (budgetPerLevel <= 0) {
    console.warn('[unlockLevelCalculator] budgetPerLevel is zero or negative in calculateUnlockLevelsMap, returning all items with unlock level 0');
    filteredItems.forEach(item => {
      unlockLevels.set(item.name.toLowerCase(), 0);
    });
    return unlockLevels;
  }

  // Se maxUnlockLevel é -1, não há limite. Caso contrário, respeita o cap
  const hasMaxLevel = maxUnlockLevel !== -1;

  sortedLoot.forEach((lootItem, index) => {
    const expectedValue = calculateExpectedValue(lootItem, itemsMap);
    cumulativeCost += expectedValue;

    // Proteção contra loop infinito: limite de 10000 iterações
    let iterations = 0;
    const MAX_ITERATIONS = 10000;

    while (cumulativeCost > budgetPerLevel && (!hasMaxLevel || currentLevel < maxUnlockLevel)) {
      currentLevel++;
      cumulativeCost -= budgetPerLevel;

      iterations++;
      if (iterations > MAX_ITERATIONS) {
        console.error(`[unlockLevelCalculator] Infinite loop detected in calculateUnlockLevelsMap for item "${lootItem.name}" at index ${index}. cumulativeCost: ${cumulativeCost}, budgetPerLevel: ${budgetPerLevel}`);
        break;
      }
    }

    // Use lowercase for case-insensitive comparison
    unlockLevels.set(lootItem.name.toLowerCase(), currentLevel);
  });

  // Add any items that weren't processed (items not in itemsMap) with unlock level 0
  lootItems.forEach((item) => {
    const itemNameLower = item.name.toLowerCase();
    if (!unlockLevels.has(itemNameLower)) {
      unlockLevels.set(itemNameLower, 0);
    }
  });

  return unlockLevels;
};
