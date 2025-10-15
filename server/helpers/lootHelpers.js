/**
 * Helper functions for monster loot management
 */

/**
 * Ordena loot items por unlock_level (menor para maior)
 * Items sem unlock_level vêm primeiro
 */
export function sortLootByUnlockLevel(lootItems) {
  return [...lootItems].sort((a, b) => {
    const levelA = a.unlockLevel ?? -1;
    const levelB = b.unlockLevel ?? -1;

    // Items sem unlock_level (-1) vêm primeiro
    if (levelA === -1 && levelB !== -1) return -1;
    if (levelA !== -1 && levelB === -1) return 1;

    // Se ambos não têm ou ambos têm, ordena por unlock_level
    return levelA - levelB;
  });
}

/**
 * Formata um loot item como XML com indentação correta
 */
export function formatLootItemAsXML(item) {
  const attributes = [];

  // Nome sempre em lowercase
  if (item.name) {
    attributes.push(`name="${item.name.toLowerCase()}"`);
  }

  // Adicionar outros atributos na ordem correta
  if (item.chance !== undefined) attributes.push(`chance="${item.chance}"`);
  if (item.countMax !== undefined) attributes.push(`countmax="${item.countMax}"`);
  if (item.priority !== undefined) attributes.push(`priority="${item.priority}"`);
  if (item.origin) attributes.push(`bko_origin="${item.origin}"`);
  if (item.info) attributes.push(`bko_info="${item.info}"`);
  if (item.source) attributes.push(`bko_source="${item.source}"`);
  if (item.unlockLevel !== undefined && item.unlockLevel !== null) {
    attributes.push(`unlock_level="${item.unlockLevel}"`);
  }

  return `<item ${attributes.join(' ')} />`;
}

/**
 * Atualiza a seção de loot em um XML de monstro
 */
export function updateLootInXML(xmlContent, lootItems) {
  // Ordenar loot por unlock_level
  const sortedLoot = sortLootByUnlockLevel(lootItems);

  // Formatar cada item como XML com 4 espaços de indentação (2 níveis)
  const formattedItems = sortedLoot.map(item =>
    '    ' + formatLootItemAsXML(item)
  );

  // Criar novo conteúdo de loot com indentação correta
  // 2 espaços para <loot> e </loot>
  const newLootContent = '\n' + formattedItems.join('\n') + '\n  ';

  // Substituir seção de loot no XML, removendo qualquer indentação existente, mas preservando atributos
  const lootRegex = /\s*<loot([^>]*)>([\s\S]*?)<\/loot>/;
  return xmlContent.replace(lootRegex, (match, lootAttributes) => `\n  <loot${lootAttributes}>${newLootContent}</loot>`);
}
