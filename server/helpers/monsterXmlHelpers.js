import fs from 'fs';
import path from 'path';
import { getMonstersPath } from './settingsHelpers.js';

/**
 * Helper functions for monster XML operations
 */

/**
 * Read monster XML file
 */
export function readMonsterXml(fileName) {
  const monstersPath = getMonstersPath();
  const filePath = path.join(monstersPath, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Monster file not found: ${fileName}`);
  }

  let xmlContent = fs.readFileSync(filePath, 'utf-8');
  // Remove BOM if present
  xmlContent = xmlContent.replace(/^\uFEFF/, '');

  return { xmlContent, filePath };
}

/**
 * Write monster XML file
 */
export function writeMonsterXml(filePath, xmlContent) {
  fs.writeFileSync(filePath, xmlContent, 'utf-8');
}

/**
 * Extract loot section from XML
 */
export function extractLootSection(xmlContent) {
  const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
  const lootMatch = xmlContent.match(lootRegex);

  if (!lootMatch) {
    throw new Error('No loot section found');
  }

  return {
    lootContent: lootMatch[2],
    lootAttributes: lootMatch[1],
    lootRegex
  };
}

/**
 * Parse loot items from XML content
 */
export function parseLootItems(lootContent) {
  const itemRegex = /<item[^>]*(?:\/>|>[\s\S]*?<\/item>)/g;
  return lootContent.match(itemRegex) || [];
}

/**
 * Update loot section in XML
 */
export function updateLootSection(xmlContent, items) {
  const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
  const newLootContent = items.length > 0
    ? '\n\t\t' + items.join('\n\t\t') + '\n\t'
    : '\n\t';

  return xmlContent.replace(lootRegex, (match, lootAttributes) => `<loot${lootAttributes}>${newLootContent}</loot>`);
}
