import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { parseStringPromise } from 'xml2js';
import { parseRequestBody, sendJson, sendError } from '../helpers/requestHelpers.js';
import { getMonstersPath } from '../helpers/settingsHelpers.js';

// Create require for importing CommonJS modules (settings.js)
const require = createRequire(import.meta.url);

/**
 * Helper function to get items.xml path from settings
 */
function getItemsXmlPath() {
  const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
  const settings = require(settingsPath).default;
  const itemsPath = settings.database?.itemsPath;

  if (!itemsPath) {
    throw new Error('itemsPath not found in settings.js');
  }

  return path.join(itemsPath, 'items.xml');
}
import { readMonsterXml, writeMonsterXml, extractLootSection, parseLootItems, updateLootSection } from '../helpers/monsterXmlHelpers.js';
import { calculateUnlockLevelsMap } from '../../src/utils/unlockLevelCalculator.js';
import {
  MONSTER_ROOT_FIELDS,
  BALANCE_FIELDS,
  ATTRIBUTES_BASE_FIELDS,
  ATTRIBUTES_PER_LEVEL_FIELDS,
  LOOK_FIELDS,
  LOOT_FIELDS,
  TARGET_CHANGE_FIELDS,
  FLAG_FIELDS,
  ELEMENT_FIELDS,
  IMMUNITY_TYPES,
  convertResourceBalanceToXml,
  valueToXml,
  shouldOmitField,
} from '../helpers/monsterFieldMapping.js';

/**
 * Cache for monster name to filename mapping
 */
let monsterNameToFileCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60000; // 1 minute

/**
 * Build a map of monster names to filenames by reading all XML files
 */
function buildMonsterNameToFileMap() {
  const monstersPath = getMonstersPath();
  const files = fs.readdirSync(monstersPath).filter(f => f.endsWith('.xml'));
  const nameToFile = new Map();

  for (const fileName of files) {
    try {
      const filePath = path.join(monstersPath, fileName);
      const xmlContent = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');

      // Extract monster name from XML
      const nameMatch = xmlContent.match(/<monster[^>]+name=["']([^"']+)["']/);
      if (nameMatch) {
        const monsterName = nameMatch[1];
        nameToFile.set(monsterName.toLowerCase(), fileName);
      }
    } catch (error) {
      console.error(`Error reading ${fileName}:`, error.message);
    }
  }

  return nameToFile;
}

/**
 * Get cached monster name to filename map (rebuilds if expired)
 */
function getMonsterNameToFileMap() {
  const now = Date.now();

  if (!monsterNameToFileCache || !cacheTimestamp || (now - cacheTimestamp) > CACHE_DURATION) {
    console.log('[Monster Name Map] Building/refreshing cache...');
    monsterNameToFileCache = buildMonsterNameToFileMap();
    cacheTimestamp = now;
    console.log(`[Monster Name Map] Cached ${monsterNameToFileCache.size} monsters`);
  }

  return monsterNameToFileCache;
}

/**
 * Helper function to recalculate unlock levels for a monster file
 */
async function recalculateUnlockLevelsForMonster(filePath) {
  try {
    // Load items map for unlock level calculation
    const itemsXmlPath = getItemsXmlPath();
    let itemsXmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');
    itemsXmlContent = itemsXmlContent.replace(/^\uFEFF/, '');

    const itemsMap = new Map();
    const itemBlockRegex = /<item\s+([^>]*?)>([\s\S]*?)<\/item>/g;
    let blockMatch;

    while ((blockMatch = itemBlockRegex.exec(itemsXmlContent)) !== null) {
      const itemAttrs = blockMatch[1];
      const itemContent = blockMatch[2];

      const nameMatch = itemAttrs.match(/name=["']([^"']+)["']/);
      if (!nameMatch) continue;

      const itemName = nameMatch[1];
      const tierMatch = itemContent.match(/<attribute\s+key=["']tier["']\s+value=["']([^"']+)["']/);
      const valuationMatch = itemContent.match(/<attribute\s+key=["']valuation["']\s+value=["']([^"']+)["']/);
      const sellingPriceMatch = itemContent.match(/<attribute\s+key=["']sellingPrice["']\s+value=["']([^"']+)["']/);
      const monsterDropStageMatch = itemContent.match(/<attribute\s+key=["']monsterDropStage["']\s+value=["']([^"']+)["']/);

      if (tierMatch && (valuationMatch || sellingPriceMatch)) {
        itemsMap.set(itemName.toLowerCase(), {
          name: itemName,
          valuation: valuationMatch ? parseInt(valuationMatch[1]) : null,
          sellPrice: sellingPriceMatch ? parseInt(sellingPriceMatch[1]) : null,
          tier: tierMatch[1],
          attributes: {
            monsterDropStage: monsterDropStageMatch ? monsterDropStageMatch[1] : ''
          }
        });
      }
    }

    // Read monster file
    let xmlContent = fs.readFileSync(filePath, 'utf-8');
    xmlContent = xmlContent.replace(/^\uFEFF/, '');

    // Extract monster power and extraLoot
    const balanceMatch = xmlContent.match(/<balance[^>]*power=["']([^"']+)["'][^>]*extraLoot=["']([^"']+)["']/);
    const monsterPower = balanceMatch ? parseFloat(balanceMatch[1]) : 0;
    const extraLoot = balanceMatch ? parseInt(balanceMatch[2]) : 0;
    const resourceBalance = `Loot${extraLoot}`;

    // Parse loot items
    const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
    const lootMatch = xmlContent.match(lootRegex);

    if (!lootMatch) return;

    const lootContent = lootMatch[2]; // [2] is content, [1] is attributes
    const itemRegex = /<item([^>]*)\/>/g;
    const allLootItems = [];
    let itemMatch;

    while ((itemMatch = itemRegex.exec(lootContent)) !== null) {
      const itemAttrs = itemMatch[1];
      const nameMatch = itemAttrs.match(/name=["']([^"']+)["']/);
      const chanceMatch = itemAttrs.match(/chance=["']([^"']+)["']/);
      const countMaxMatch = itemAttrs.match(/countmax=["']([^"']+)["']/i);
      const originMatch = itemAttrs.match(/bko_origin=["']([^"']+)["']/);

      if (nameMatch) {
        allLootItems.push({
          name: nameMatch[1],
          chance: chanceMatch ? parseFloat(chanceMatch[1]) / 1000 : 0,
          countMax: countMaxMatch ? parseInt(countMaxMatch[1]) : 1,
          origin: originMatch ? originMatch[1] : 'None'
        });
      }
    }

    // Calculate unlock levels
    const unlockLevels = calculateUnlockLevelsMap(allLootItems, monsterPower, resourceBalance, itemsMap);

    console.log(`[Recalculate] Monster: ${path.basename(filePath)}, Power: ${monsterPower}, ResourceBalance: ${resourceBalance}`);
    console.log(`[Recalculate] Found ${allLootItems.length} loot items:`, allLootItems.map(i => i.name));
    console.log(`[Recalculate] Calculated unlock levels:`, unlockLevels);

    // Update XML with new unlock levels - ONLY within the <loot> section
    xmlContent = xmlContent.replace(/<loot([^>]*)>([\s\S]*?)<\/loot>/, (fullMatch, lootAttrs, lootContent) => {
      console.log(`[Recalculate] Processing <loot> section with ${lootAttrs ? 'attributes' : 'no attributes'}`);

      const updatedLootContent = lootContent.replace(/<item([^>]*?)\/>/g, (match, attrs) => {
        const nameMatch = attrs.match(/name=["']([^"']+)["']/);
        if (!nameMatch) return match;

        const itemName = nameMatch[1];
        const newUnlockLevel = unlockLevels.get(itemName.toLowerCase());

        console.log(`[Recalculate] Checking item: "${itemName}" -> unlock level: ${newUnlockLevel}`);

        if (newUnlockLevel !== undefined) {
          // Remove existing unlock_level and add new one
          let newAttrs = attrs.replace(/\s*unlock_level=["']\d+["']/, '');
          newAttrs += ` unlock_level="${newUnlockLevel}"`;
          console.log(`[Recalculate] Adding unlock_level to: "${itemName}"`);
          return `<item${newAttrs}/>`;
        }

        return match;
      });

      return `<loot${lootAttrs}>${updatedLootContent}</loot>`;
    });

    // Save updated file
    fs.writeFileSync(filePath, xmlContent, 'utf-8');
    console.log(`[Recalculate Unlock Levels] Updated: ${path.basename(filePath)}`);
    console.log(`[Recalculate Unlock Levels] Full path: ${filePath}`);
  } catch (error) {
    console.error(`[Recalculate Unlock Levels] Error for ${filePath}:`, error.message);
  }
}

/**
 * Monster routes
 */
export function monstersRoutes(server) {
  // API endpoint to list all monster files without cache
  server.middlewares.use(async (req, res, next) => {
    if (req.url !== '/api/monsters/list') {
      return next();
    }

    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const monstersPath = getMonstersPath();

      // Get all XML files in the monsters directory - always fresh from disk
      const files = fs.readdirSync(monstersPath);
      const monsterFiles = files
        .filter(file => file.endsWith('.xml'))
        .map(file => file.replace('.xml', ''));

      console.log(`API: Found ${monsterFiles.length} monster XML files from disk`);

      // Send response with no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      sendJson(res, 200, monsterFiles);

    } catch (error) {
      console.error('Error listing monsters:', error);
      sendError(res, 500, error.message);
    }
  });

  // API endpoint to clear loot from monsters
  server.middlewares.use('/api/monsters/clear-loot', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { monsterFiles, onlyWithoutOrigin = false } = await parseRequestBody(req);

      if (!Array.isArray(monsterFiles)) {
        return sendError(res, 400, 'monsterFiles must be an array');
      }

      const monstersPath = getMonstersPath();

      let updatedCount = 0;
      const errors = [];

      // Process each monster
      for (const fileName of monsterFiles) {
        try {
          const filePath = path.join(monstersPath, fileName);

          // Check if file exists
          if (!fs.existsSync(filePath)) {
            errors.push(`Monster file not found: ${fileName}`);
            continue;
          }

          // Read XML file
          let xmlContent = fs.readFileSync(filePath, 'utf-8');
          xmlContent = xmlContent.replace(/^\uFEFF/, '');

          // Replace loot section with empty loot
          const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
          const lootMatch = xmlContent.match(lootRegex);

          if (lootMatch) {
            // SAVE loot tag attributes BEFORE clearing
            const savedLootAttributes = lootMatch[1];
            let newLootContent = '\n\t';

            if (onlyWithoutOrigin) {
              // Filtrar items: manter apenas items COM bko_origin que não seja "None"
              const lootContent = lootMatch[2]; // [2] is content, [1] is attributes

              // Regex para capturar cada item individual (incluindo multiline)
              const itemRegex = /<item[^>]*(?:\/>|>[\s\S]*?<\/item>)/g;
              const items = lootContent.match(itemRegex) || [];

              const keptItems = items.filter(item => {
                // Verifica se tem bko_origin
                const hasOrigin = /bko_origin\s*=\s*["']([^"']+)["']/i.test(item);

                if (!hasOrigin) {
                  // Não tem bko_origin - REMOVE
                  return false;
                }

                // Tem bko_origin - verifica se é "None" (case insensitive)
                const originMatch = item.match(/bko_origin\s*=\s*["']([^"']+)["']/i);
                if (originMatch) {
                  const originValue = originMatch[1].toLowerCase();
                  if (originValue === 'none') {
                    // bko_origin="None" - REMOVE
                    return false;
                  }
                }

                // Tem bko_origin com valor diferente de "None" - MANTÉM
                return true;
              });

              if (keptItems.length > 0) {
                newLootContent = '\n\t\t' + keptItems.join('\n\t\t') + '\n\t';
              }
            }

            // RESTORE loot tag attributes AFTER clearing
            xmlContent = xmlContent.replace(lootRegex, `<loot${savedLootAttributes}>${newLootContent}</loot>`);

            // Write back to file
            fs.writeFileSync(filePath, xmlContent, 'utf-8');
            updatedCount++;
            console.log(`Cleared loot from: ${fileName} (onlyWithoutOrigin: ${onlyWithoutOrigin})`);
          } else {
            errors.push(`No loot section found in: ${fileName}`);
          }
        } catch (error) {
          console.error(`Error processing ${fileName}:`, error);
          errors.push(`Error processing ${fileName}: ${error.message}`);
        }
      }

      sendJson(res, 200, {
        success: true,
        updated: updatedCount,
        total: monsterFiles.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error clearing loot:', error);
      sendError(res, 500, error.message);
    }
  });

  // API endpoint to update single monster loot item (add or remove)
  server.middlewares.use('/api/monsters/update-loot-item', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { fileName, itemName, chance, origin, action, source } = await parseRequestBody(req);

      if (!fileName || !itemName || !action) {
        return sendError(res, 400, 'fileName, itemName, and action are required');
      }

      const monstersPath = getMonstersPath();
      const filePath = path.join(monstersPath, fileName);

      if (!fs.existsSync(filePath)) {
        return sendError(res, 404, `Monster file not found: ${fileName}`);
      }

      let xmlContent = fs.readFileSync(filePath, 'utf-8');
      xmlContent = xmlContent.replace(/^\uFEFF/, '');

      const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
      const lootMatch = xmlContent.match(lootRegex);

      if (!lootMatch) {
        return sendError(res, 400, `No loot section found in: ${fileName}`);
      }

      // SAVE loot tag attributes BEFORE any operation
      const savedLootAttributes = lootMatch[1];
      const lootContent = lootMatch[2]; // [2] is content, [1] is attributes
      const itemRegex = /<item[^>]*\/>/g;
      const existingItems = lootContent.match(itemRegex) || [];

      if (action === 'add') {
        // Check if item already exists
        const itemExists = existingItems.some(itemXml => {
          const nameMatch = itemXml.match(/name=["']([^"']+)["']/);
          return nameMatch && nameMatch[1].toLowerCase() === itemName.toLowerCase();
        });

        if (itemExists) {
          // Update existing item
          const updatedItems = existingItems.map(itemXml => {
            const nameMatch = itemXml.match(/name=["']([^"']+)["']/);
            if (nameMatch && nameMatch[1].toLowerCase() === itemName.toLowerCase()) {
              const sourceAttr = source ? ` bko_source="${source}"` : '';
              return `<item name="${itemName}" chance="${chance}" bko_origin="${origin}"${sourceAttr} />`;
            }
            return itemXml;
          });

          const newLootContent = '\n\t\t' + updatedItems.join('\n\t\t') + '\n\t';
          // RESTORE loot tag attributes AFTER updating items
          xmlContent = xmlContent.replace(lootRegex, `<loot${savedLootAttributes}>${newLootContent}</loot>`);
        } else {
          // Add new item
          const sourceAttr = source ? ` bko_source="${source}"` : '';
          const newItem = `<item name="${itemName}" chance="${chance}" bko_origin="${origin}"${sourceAttr} />`;
          const allItems = [...existingItems, newItem];
          const newLootContent = '\n\t\t' + allItems.join('\n\t\t') + '\n\t';
          // RESTORE loot tag attributes AFTER adding item
          xmlContent = xmlContent.replace(lootRegex, `<loot${savedLootAttributes}>${newLootContent}</loot>`);
        }

        fs.writeFileSync(filePath, xmlContent, 'utf-8');

        // Recalculate unlock levels after adding item
        await recalculateUnlockLevelsForMonster(filePath);

        sendJson(res, 200, { success: true, action: 'added', fileName });

      } else if (action === 'remove') {
        // Remove item
        const filteredItems = existingItems.filter(itemXml => {
          const nameMatch = itemXml.match(/name=["']([^"']+)["']/);
          return !(nameMatch && nameMatch[1].toLowerCase() === itemName.toLowerCase());
        });

        if (filteredItems.length === existingItems.length) {
          return sendError(res, 404, `Item ${itemName} not found in ${fileName}`);
        }

        const newLootContent = filteredItems.length > 0
          ? '\n\t\t' + filteredItems.join('\n\t\t') + '\n\t'
          : '\n\t';

        // RESTORE loot tag attributes AFTER removing item
        xmlContent = xmlContent.replace(lootRegex, `<loot${savedLootAttributes}>${newLootContent}</loot>`);
        fs.writeFileSync(filePath, xmlContent, 'utf-8');

        // Recalculate unlock levels after removing item
        await recalculateUnlockLevelsForMonster(filePath);

        sendJson(res, 200, { success: true, action: 'removed', fileName });

      } else {
        return sendError(res, 400, 'Invalid action. Must be "add" or "remove"');
      }

    } catch (error) {
      console.error('Error updating loot item:', error);
      if (error.message === 'Invalid JSON in request body') {
        sendError(res, 400, error.message);
      } else {
        sendError(res, 500, error.message);
      }
    }
  });

  // API endpoint to update unlock levels for monster loot items
  // API endpoint to add items based on race configuration
  server.middlewares.use('/api/monsters/add-race-items', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { monsters } = await parseRequestBody(req);

      if (!Array.isArray(monsters)) {
        return sendError(res, 400, 'monsters must be an array');
      }

      console.log(`\n[Add Race Items] Starting process for ${monsters.length} filtered monsters`);

      const monstersPath = getMonstersPath();

      // Load race drops configuration
      const raceDropsPath = path.join(process.cwd(), 'public', 'data', 'race-drops.json');
      const raceDrops = fs.existsSync(raceDropsPath)
        ? JSON.parse(fs.readFileSync(raceDropsPath, 'utf-8'))
        : {};

      // Load loot category tiers configuration
      const lootTiersPath = path.join(process.cwd(), 'public', 'data', 'loot-monster', 'loot-category-tiers.json');
      const lootCategoryTiers = fs.existsSync(lootTiersPath)
        ? JSON.parse(fs.readFileSync(lootTiersPath, 'utf-8'))
        : {};

      // Load items to get tier, valuation, and sellPrice information
      const itemsXmlPath = getItemsXmlPath();
      let itemsXmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');
      itemsXmlContent = itemsXmlContent.replace(/^\uFEFF/, '');

      // Parse items to build maps
      const itemTierMap = {};
      const itemsMap = new Map(); // For unlock level calculation

      // Match each <item>...</item> block
      const itemBlockRegex = /<item\s+([^>]*?)>([\s\S]*?)<\/item>/g;
      let blockMatch;
      while ((blockMatch = itemBlockRegex.exec(itemsXmlContent)) !== null) {
        const itemAttrs = blockMatch[1];
        const itemContent = blockMatch[2];

        // Extract name from item attributes
        const nameMatch = itemAttrs.match(/name=["']([^"']+)["']/);
        if (!nameMatch) continue;

        const itemName = nameMatch[1];

        // Extract tier from attribute tags inside item
        const tierMatch = itemContent.match(/<attribute\s+key=["']tier["']\s+value=["']([^"']+)["']/);

        // Extract valuation, sellingPrice, and monsterDropStage for unlock level calculation
        const valuationMatch = itemContent.match(/<attribute\s+key=["']valuation["']\s+value=["']([^"']+)["']/);
        const sellingPriceMatch = itemContent.match(/<attribute\s+key=["']sellingPrice["']\s+value=["']([^"']+)["']/);
        const monsterDropStageMatch = itemContent.match(/<attribute\s+key=["']monsterDropStage["']\s+value=["']([^"']+)["']/);

        // Only add to tierMap if has tier
        if (tierMatch) {
          itemTierMap[itemName] = tierMatch[1];
        }

        // Only add to itemsMap if has tier AND (valuation OR sellingPrice)
        // This prevents overwriting valid items with duplicate empty entries
        if (tierMatch && (valuationMatch || sellingPriceMatch)) {
          itemsMap.set(itemName.toLowerCase(), {
            name: itemName,
            valuation: valuationMatch ? parseInt(valuationMatch[1]) : null,
            sellPrice: sellingPriceMatch ? parseInt(sellingPriceMatch[1]) : null,
            tier: tierMatch[1],
            attributes: {
              monsterDropStage: monsterDropStageMatch ? monsterDropStageMatch[1] : ''
            }
          });
        }
      }

      let updatedCount = 0;
      const errors = [];

      // STEP 1: Clean all loot category items from FILTERED monsters only
      console.log('[Step 1] Removing all loot category items from filtered monsters...');

      // Create a Set of fileNames to clean (only filtered monsters)
      const fileNamesToClean = new Set(monsters.map(m => m.fileName));

      // Get all available loot categories from loot-category-tiers.json
      const categoriesToClean = Object.keys(lootCategoryTiers);
      console.log(`[Step 1] Categories to clean: ${categoriesToClean.join(', ')}`);
      console.log(`[Step 1] Processing ${fileNamesToClean.size} unique monster files`);
      let cleanedCount = 0;

      for (const fileName of fileNamesToClean) {
        try {
          const filePath = path.join(monstersPath, fileName);

          if (!fs.existsSync(filePath)) {
            continue;
          }

          let xmlContent = fs.readFileSync(filePath, 'utf-8');
          xmlContent = xmlContent.replace(/^\uFEFF/, '');

          const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
          const lootMatch = xmlContent.match(lootRegex);

          if (lootMatch) {
            // SAVE loot tag attributes BEFORE cleaning
            const savedLootAttributes = lootMatch[1];
            const lootContent = lootMatch[2];
            const itemRegex = /<item[^>]*\/>/g;
            const existingItems = lootContent.match(itemRegex) || [];

            const keptItems = [];
            let removedAny = false;

            existingItems.forEach(itemXml => {
              const originMatch = itemXml.match(/bko_origin=["']([^"']+)["']/);
              const sourceMatch = itemXml.match(/bko_source=["']([^"']+)["']/);

              // Only remove items that:
              // 1. Have bko_origin in categoriesToClean
              // 2. Have bko_source="race" OR no bko_source attribute (legacy items from previous runs)
              if (originMatch && categoriesToClean.includes(originMatch[1])) {
                const source = sourceMatch ? sourceMatch[1] : null;
                if (source === 'race' || source === null) {
                  // Remove this item (both new race items and old items without source)
                  removedAny = true;
                } else {
                  // Keep this item (it's from another source like baseStatsRole)
                  keptItems.push(itemXml);
                }
              } else {
                // Keep this item (different origin category)
                keptItems.push(itemXml);
              }
            });

            if (removedAny) {
              let newLootContent = '';
              if (keptItems.length > 0) {
                newLootContent = '\n\t\t' + keptItems.join('\n\t\t') + '\n\t';
              } else {
                newLootContent = '\n\t';
              }

              // RESTORE loot tag attributes AFTER cleaning
              xmlContent = xmlContent.replace(lootRegex, `<loot${savedLootAttributes}>${newLootContent}</loot>`);
              fs.writeFileSync(filePath, xmlContent, 'utf-8');
              cleanedCount++;
            }
          }
        } catch (error) {
          console.error(`Error cleaning ${fileName}:`, error);
        }
      }

      console.log(`[Step 1] Cleaned ${cleanedCount} monsters`);

      // STEP 2: Add new items based on race configuration
      console.log('[Step 2] Adding new race items...');
      console.log(`[Step 2] Processing ${monsters.length} monsters`);

      // Process each monster
      let processedInStep2 = 0;
      for (const monster of monsters) {
        processedInStep2++;

        // Special debug for Behemoth
        const isBehemoth = monster.monsterName && monster.monsterName.toLowerCase().includes('behemoth');

        // Only log every 10th monster + first/last to avoid spam (or if it's Behemoth)
        if (isBehemoth || processedInStep2 === 1 || processedInStep2 % 10 === 0 || processedInStep2 === monsters.length) {
          console.log(`[Step 2] Processing ${processedInStep2}/${monsters.length}: ${monster.monsterName} ${isBehemoth ? '🔍 BEHEMOTH DETECTED' : ''}`);
        }

        try {
          const filePath = path.join(monstersPath, monster.fileName);

          if (!fs.existsSync(filePath)) {
            console.error(`[Step 2] File not found: ${monster.fileName}`);
            errors.push(`Monster file not found: ${monster.fileName}`);
            continue;
          }

          // Parse monster races
          const races = (monster.race || 'None').split(';').map(r => r.trim()).filter(r => r);

          if (isBehemoth) {
            console.log(`[Behemoth Debug] races: [${races.join(', ')}], power: ${monster.power}`);
          }

          // Map to track items: itemName -> { races: Set, chance, origin, tier }
          const itemsToAddMap = new Map();

          for (const race of races) {
            const raceConfig = raceDrops[race];
            if (!raceConfig) {
              console.log(`[Race Items] ${monster.monsterName} - No config for race: ${race}`);
              continue;
            }

            // Process all loot categories
            for (const lootCategory of categoriesToClean) {
              const itemNames = raceConfig[lootCategory] || [];

              for (const itemName of itemNames) {
                const tier = itemTierMap[itemName];
                if (!tier) {
                  console.log(`[Race Items] ${monster.monsterName} - No tier found for item: ${itemName}`);
                  continue;
                }

                const tierConfig = lootCategoryTiers[lootCategory]?.[tier];
                if (!tierConfig) {
                  console.log(`[Race Items] ${monster.monsterName} - No tier config for: ${lootCategory}/${tier}`);
                  continue;
                }

                const { powerMin, powerMax, chance } = tierConfig;

                // Check if monster power is in range
                if (monster.power >= powerMin && monster.power <= powerMax) {
                  console.log(`[Race Items] ${monster.monsterName} (power:${monster.power}) - Adding ${itemName} from ${race} (${lootCategory}/${tier})`);
                } else {
                  console.log(`[Race Items] ${monster.monsterName} (power:${monster.power}) - Skipping ${itemName} - power not in range ${powerMin}-${powerMax}`);
                  continue;
                }
                if (monster.power >= powerMin && monster.power <= powerMax) {
                  // Track which races provide this item
                  if (!itemsToAddMap.has(itemName)) {
                    itemsToAddMap.set(itemName, {
                      races: new Set(),
                      chance: chance * 1000, // Convert percentage to XML format
                      origin: lootCategory,
                      tier: tier
                    });
                  }

                  // Add this race to the set of races that provide this item
                  itemsToAddMap.get(itemName).races.add(race);
                }
              }
            }
          }

          // Group items by (lootCategory + tier) to check for tier conflicts
          const tierRaceCount = {}; // key: "category:tier" -> Set of races
          itemsToAddMap.forEach((itemInfo, itemName) => {
            const key = `${itemInfo.origin}:${itemInfo.tier}`;
            if (!tierRaceCount[key]) {
              tierRaceCount[key] = new Set();
            }
            itemInfo.races.forEach(race => tierRaceCount[key].add(race));
          });

          // Convert Map to array, dividing chance when multiple races provide same tier
          const itemsToAdd = [];
          itemsToAddMap.forEach((itemInfo, itemName) => {
            const key = `${itemInfo.origin}:${itemInfo.tier}`;
            const numRacesForThisTier = tierRaceCount[key].size;

            // Divide chance if multiple races provide items of this tier
            const adjustedChance = numRacesForThisTier > 1 ? itemInfo.chance / numRacesForThisTier : itemInfo.chance;
            const allRaces = Array.from(itemInfo.races).join(';');

            // Create descriptive bko_info
            let bkoInfo = allRaces;
            if (numRacesForThisTier > 1) {
              bkoInfo += ` (÷${numRacesForThisTier})`;
            }

            itemsToAdd.push({
              name: itemName,
              chance: adjustedChance,
              origin: itemInfo.origin,
              info: bkoInfo
            });

            if (numRacesForThisTier > 1) {
              console.log(`[Add Race Items] ${monster.monsterName} - ${itemName} (${itemInfo.tier}): chance divided by ${numRacesForThisTier} (${itemInfo.chance} -> ${adjustedChance}) - ${numRacesForThisTier} races have ${itemInfo.tier} tier in ${itemInfo.origin}`);
            }
          });

          // Skip if no items to add
          if (itemsToAdd.length === 0) {
            if (isBehemoth) {
              console.log(`[Behemoth Debug] ❌ NO ITEMS TO ADD!`);
              console.log(`[Behemoth Debug] Races checked: [${races.join(', ')}]`);
              console.log(`[Behemoth Debug] itemsToAddMap size: ${itemsToAddMap.size}`);
            }
            console.log(`[Race Items] ${monster.monsterName} (power:${monster.power}) - No items to add. Races: [${races.join(', ')}]. Check if races are configured and power is in tier range.`);
            continue;
          }

          if (isBehemoth) {
            console.log(`[Behemoth Debug] ✅ Found ${itemsToAdd.length} items to add:`);
            itemsToAdd.forEach(item => {
              console.log(`  - ${item.name} (${item.origin}): ${item.chance/1000}%`);
            });
          }

          // Read and modify XML
          let xmlContent = fs.readFileSync(filePath, 'utf-8');
          xmlContent = xmlContent.replace(/^\uFEFF/, '');

          const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
          const lootMatch = xmlContent.match(lootRegex);

          if (lootMatch) {
            const lootAttributes = lootMatch[1]; // Capture loot tag attributes
            const lootContent = lootMatch[2];
            let newLootContent = lootContent.trimEnd();

            // Add each item
            for (const item of itemsToAdd) {
              const newItem = `<item name="${item.name}" chance="${item.chance}" bko_origin="${item.origin}" bko_info="${item.info}" bko_source="race" />`;

              if (newLootContent.trim()) {
                newLootContent += '\n\t\t' + newItem;
              } else {
                newLootContent = '\n\t\t' + newItem + '\n\t';
              }
            }

            if (!newLootContent.endsWith('\n\t')) {
              newLootContent += '\n\t';
            }

            // Replace loot in XML, preserving attributes
            xmlContent = xmlContent.replace(lootRegex, `<loot${lootAttributes}>${newLootContent}</loot>`);

            // STEP 3: Recalculate unlock levels for all loot items
            // Parse all loot items from the updated XML
            const updatedLootMatch = xmlContent.match(lootRegex);
            if (updatedLootMatch) {
              const updatedLootContent = updatedLootMatch[2]; // [2] is content, [1] is attributes
              const itemRegex = /<item([^>]*)\/>/g;
              const allLootItems = [];
              let itemMatch;

              while ((itemMatch = itemRegex.exec(updatedLootContent)) !== null) {
                const itemAttrs = itemMatch[1];
                const nameMatch = itemAttrs.match(/name=["']([^"']+)["']/);
                const chanceMatch = itemAttrs.match(/chance=["']([^"']+)["']/);
                const countMaxMatch = itemAttrs.match(/countmax=["']([^"']+)["']/i);
                const originMatch = itemAttrs.match(/bko_origin=["']([^"']+)["']/);

                if (nameMatch) {
                  allLootItems.push({
                    name: nameMatch[1],
                    chance: chanceMatch ? parseFloat(chanceMatch[1]) / 1000 : 0, // Convert from XML format (0-100000) to percentage (0-100)
                    countMax: countMaxMatch ? parseInt(countMaxMatch[1]) : 1,
                    origin: originMatch ? originMatch[1] : 'None'
                  });
                }
              }

              // Extract resourceBalance from monster XML
              // Calculate resourceBalance based on extraLoot and extraXp (same logic as monsterService.js)
              const balanceMatch = xmlContent.match(/<balance\s+([^>]+)>/);
              let resourceBalance = 'Equals';
              if (balanceMatch) {
                const balanceAttrs = balanceMatch[1];
                const extraLootMatch = balanceAttrs.match(/extraLoot=["']([^"']+)["']/);
                const extraXpMatch = balanceAttrs.match(/extraXp=["']([^"']+)["']/);

                const extraLoot = extraLootMatch ? parseInt(extraLootMatch[1]) : 0;
                const extraXp = extraXpMatch ? parseInt(extraXpMatch[1]) : 0;

                if (extraXp > 0) {
                  resourceBalance = `Exp${extraXp}`;
                } else if (extraLoot > 0) {
                  resourceBalance = `Loot${extraLoot}`;
                }
              }

              // Calculate unlock levels using centralized function
              const unlockLevels = calculateUnlockLevelsMap(allLootItems, monster.power, resourceBalance, itemsMap);

              // Update XML with unlock levels
              let finalLootContent = updatedLootContent;
              unlockLevels.forEach((unlockLevel, itemName) => {
                // Find and update each item with its unlock level
                const itemPattern = new RegExp(`(<item[^>]*name=["']${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*)(\\/>)`, 'g');
                finalLootContent = finalLootContent.replace(itemPattern, (match, p1, p2) => {
                  // Remove existing unlock_level if present
                  let updatedItem = p1.replace(/\s*unlock_level=["'][^"']*["']/, '');
                  // Add new unlock_level
                  return `${updatedItem} unlock_level="${unlockLevel}"${p2}`;
                });
              });

              // Parse items and sort by unlock level
              const itemMatches = [...finalLootContent.matchAll(/<item([^>]*)\/>/g)];
              const itemsWithUnlock = itemMatches.map(match => {
                const fullItem = match[0];
                const unlockMatch = match[1].match(/unlock_level=["']([^"']+)["']/);
                const unlockLevel = unlockMatch ? parseInt(unlockMatch[1]) : 0;
                return { fullItem, unlockLevel };
              });

              // Sort by unlock level (ascending)
              itemsWithUnlock.sort((a, b) => a.unlockLevel - b.unlockLevel);

              // Rebuild loot content with sorted items
              finalLootContent = '\n\t\t' + itemsWithUnlock.map(item => item.fullItem).join('\n\t\t') + '\n\t';

              // Replace with updated loot content, preserving loot tag attributes
              xmlContent = xmlContent.replace(lootRegex, `<loot${lootAttributes}>${finalLootContent}</loot>`);
            }

            fs.writeFileSync(filePath, xmlContent, 'utf-8');
            updatedCount++;
            console.log(`Added ${itemsToAdd.length} items and recalculated unlock levels for: ${monster.fileName}`);
          } else {
            errors.push(`No loot section found in: ${monster.fileName}`);
          }
        } catch (error) {
          console.error(`Error processing ${monster.fileName}:`, error);
          errors.push(`Error processing ${monster.fileName}: ${error.message}`);
        }
      }

      const skipped = monsters.length - updatedCount;

      console.log(`\n[Step 2] Completed: Added items to ${updatedCount} monsters`);
      console.log(`[Summary] ====================`);
      console.log(`  Total filtered: ${monsters.length} monsters`);
      console.log(`  Cleaned (Step 1): ${cleanedCount} monsters`);
      console.log(`  Updated (Step 2): ${updatedCount} monsters with new items`);
      console.log(`  Skipped: ${skipped} monsters (no items to add based on race/power)`);
      console.log(`====================`);

      // Count how many monsters had no items to add (were only cleaned)
      const onlyCleaned = cleanedCount - updatedCount;

      sendJson(res, 200, {
        success: true,
        cleaned: cleanedCount,
        updated: updatedCount,
        onlyCleaned: onlyCleaned,
        skipped: skipped,
        total: monsters.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error adding race items:', error);
      if (error.message === 'Invalid JSON in request body') {
        sendError(res, 400, error.message);
      } else {
        sendError(res, 500, error.message);
      }
    }
  });

  // API endpoint to add base stats role items to monsters
  server.middlewares.use('/api/monsters/add-base-stats-role-items', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { monsters } = await parseRequestBody(req);

      if (!Array.isArray(monsters)) {
        return sendError(res, 400, 'monsters must be an array');
      }

      const monstersPath = getMonstersPath();

      // Load base stats role drops configuration
      const baseStatsRoleDropsPath = path.join(process.cwd(), 'public', 'data', 'base-stats-role-drops.json');
      const baseStatsRoleDrops = fs.existsSync(baseStatsRoleDropsPath)
        ? JSON.parse(fs.readFileSync(baseStatsRoleDropsPath, 'utf-8'))
        : {};

      // Load loot category tiers configuration
      const lootTiersPath = path.join(process.cwd(), 'public', 'data', 'loot-monster', 'loot-category-tiers.json');
      const lootCategoryTiers = fs.existsSync(lootTiersPath)
        ? JSON.parse(fs.readFileSync(lootTiersPath, 'utf-8'))
        : {};

      // Load items to get tier, valuation, and sellPrice information
      const itemsXmlPath = getItemsXmlPath();
      let itemsXmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');
      itemsXmlContent = itemsXmlContent.replace(/^\uFEFF/, '');

      // Parse items to build maps
      const itemTierMap = {};
      const itemsMap = new Map(); // For unlock level calculation

      // Match each <item>...</item> block
      const itemBlockRegex = /<item\s+([^>]*?)>([\s\S]*?)<\/item>/g;
      let blockMatch;
      while ((blockMatch = itemBlockRegex.exec(itemsXmlContent)) !== null) {
        const itemAttrs = blockMatch[1];
        const itemContent = blockMatch[2];

        // Extract name from item attributes
        const nameMatch = itemAttrs.match(/name=["']([^"']+)["']/);
        if (!nameMatch) continue;

        const itemName = nameMatch[1];

        // Extract tier from attribute tags inside item
        const tierMatch = itemContent.match(/<attribute\s+key=["']tier["']\s+value=["']([^"']+)["']/);

        // Extract valuation, sellingPrice, and monsterDropStage for unlock level calculation
        const valuationMatch = itemContent.match(/<attribute\s+key=["']valuation["']\s+value=["']([^"']+)["']/);
        const sellingPriceMatch = itemContent.match(/<attribute\s+key=["']sellingPrice["']\s+value=["']([^"']+)["']/);
        const monsterDropStageMatch = itemContent.match(/<attribute\s+key=["']monsterDropStage["']\s+value=["']([^"']+)["']/);

        // Only add to tierMap if has tier
        if (tierMatch) {
          itemTierMap[itemName] = tierMatch[1];
        }

        // Only add to itemsMap if has tier AND (valuation OR sellingPrice)
        if (tierMatch && (valuationMatch || sellingPriceMatch)) {
          itemsMap.set(itemName.toLowerCase(), {
            name: itemName,
            valuation: valuationMatch ? parseInt(valuationMatch[1]) : null,
            sellPrice: sellingPriceMatch ? parseInt(sellingPriceMatch[1]) : null,
            tier: tierMatch[1],
            attributes: {
              monsterDropStage: monsterDropStageMatch ? monsterDropStageMatch[1] : ''
            }
          });
        }
      }

      let updatedCount = 0;
      const errors = [];

      // STEP 1: Clean all loot category items from FILTERED monsters only
      console.log('[Step 1] Removing all loot category items from filtered monsters...');

      // Create a Set of fileNames to clean (only filtered monsters)
      const fileNamesToClean = new Set(monsters.map(m => m.fileName));

      // Get all available loot categories from loot-category-tiers.json
      const categoriesToClean = Object.keys(lootCategoryTiers);
      console.log(`[Step 1] Categories to clean: ${categoriesToClean.join(', ')}`);
      let cleanedCount = 0;

      for (const fileName of fileNamesToClean) {
        try {
          const filePath = path.join(monstersPath, fileName);

          if (!fs.existsSync(filePath)) {
            continue;
          }

          let xmlContent = fs.readFileSync(filePath, 'utf-8');
          xmlContent = xmlContent.replace(/^\uFEFF/, '');

          const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
          const lootMatch = xmlContent.match(lootRegex);

          if (lootMatch) {
            // SAVE loot tag attributes BEFORE cleaning
            const savedLootAttributes = lootMatch[1];
            const lootContent = lootMatch[2];
            const itemRegex = /<item[^>]*\/>/g;
            const existingItems = lootContent.match(itemRegex) || [];

            const keptItems = [];
            let removedAny = false;

            existingItems.forEach(itemXml => {
              const originMatch = itemXml.match(/bko_origin=["']([^"']+)["']/);
              const sourceMatch = itemXml.match(/bko_source=["']([^"']+)["']/);

              // Only remove items that:
              // 1. Have bko_origin in categoriesToClean
              // 2. Have bko_source="baseStatsRole" OR no bko_source attribute (legacy items)
              if (originMatch && categoriesToClean.includes(originMatch[1])) {
                const source = sourceMatch ? sourceMatch[1] : null;
                if (source === 'baseStatsRole' || source === null) {
                  // Remove this item (both new baseStatsRole items and old items without source)
                  removedAny = true;
                } else {
                  // Keep this item (it's from another source like race)
                  keptItems.push(itemXml);
                }
              } else {
                // Keep this item (different origin category)
                keptItems.push(itemXml);
              }
            });

            if (removedAny) {
              let newLootContent = '';
              if (keptItems.length > 0) {
                newLootContent = '\n\t\t' + keptItems.join('\n\t\t') + '\n\t';
              } else {
                newLootContent = '\n\t';
              }

              // RESTORE loot tag attributes AFTER cleaning
              xmlContent = xmlContent.replace(lootRegex, `<loot${savedLootAttributes}>${newLootContent}</loot>`);
              fs.writeFileSync(filePath, xmlContent, 'utf-8');
              cleanedCount++;
            }
          }
        } catch (error) {
          console.error(`Error cleaning ${fileName}:`, error);
        }
      }

      console.log(`[Step 1] Cleaned ${cleanedCount} monsters`);

      // STEP 2: Add new items based on base stats role configuration
      console.log('[Step 2] Adding new base stats role items...');

      // Process each monster
      for (const monster of monsters) {
        try {
          const filePath = path.join(monstersPath, monster.fileName);

          if (!fs.existsSync(filePath)) {
            errors.push(`Monster file not found: ${monster.fileName}`);
            continue;
          }

          // Get base stats role (single value, no semicolon splitting)
          const baseStatsRole = monster.baseStatsRole || 'None';
          const roleConfig = baseStatsRoleDrops[baseStatsRole];

          // Skip if no config for this base stats role
          if (!roleConfig) continue;

          // Array to collect items to add
          const itemsToAdd = [];

          // Process all loot categories
          for (const lootCategory of categoriesToClean) {
            const itemNames = roleConfig[lootCategory] || [];

            for (const itemName of itemNames) {
              const tier = itemTierMap[itemName];
              if (!tier) continue;

              const tierConfig = lootCategoryTiers[lootCategory]?.[tier];
              if (!tierConfig) continue;

              const { powerMin, powerMax, chance } = tierConfig;

              // Check if monster power is in range
              if (monster.power >= powerMin && monster.power <= powerMax) {
                itemsToAdd.push({
                  name: itemName,
                  chance: chance * 1000, // Convert percentage to XML format
                  origin: lootCategory,
                  info: baseStatsRole // Simple bko_info with just the base stats role
                });
              }
            }
          }

          // Skip if no items to add
          if (itemsToAdd.length === 0) continue;

          // Read and modify XML
          let xmlContent = fs.readFileSync(filePath, 'utf-8');
          xmlContent = xmlContent.replace(/^\uFEFF/, '');

          const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
          const lootMatch = xmlContent.match(lootRegex);

          if (lootMatch) {
            const lootAttributes = lootMatch[1]; // Capture loot tag attributes
            const lootContent = lootMatch[2];
            let newLootContent = lootContent.trimEnd();

            // Add each item
            for (const item of itemsToAdd) {
              const newItem = `<item name="${item.name}" chance="${item.chance}" bko_origin="${item.origin}" bko_info="${item.info}" bko_source="baseStatsRole" />`;

              if (newLootContent.trim()) {
                newLootContent += '\n\t\t' + newItem;
              } else {
                newLootContent = '\n\t\t' + newItem + '\n\t';
              }
            }

            if (!newLootContent.endsWith('\n\t')) {
              newLootContent += '\n\t';
            }

            // Replace loot in XML, preserving attributes
            xmlContent = xmlContent.replace(lootRegex, `<loot${lootAttributes}>${newLootContent}</loot>`);

            // STEP 3: Recalculate unlock levels for all loot items
            const updatedLootMatch = xmlContent.match(lootRegex);
            if (updatedLootMatch) {
              const updatedLootContent = updatedLootMatch[2]; // [2] is content, [1] is attributes
              const itemRegex = /<item([^>]*)\/>/g;
              const allLootItems = [];
              let itemMatch;

              while ((itemMatch = itemRegex.exec(updatedLootContent)) !== null) {
                const itemAttrs = itemMatch[1];
                const nameMatch = itemAttrs.match(/name=["']([^"']+)["']/);
                const chanceMatch = itemAttrs.match(/chance=["']([^"']+)["']/);
                const countMaxMatch = itemAttrs.match(/countmax=["']([^"']+)["']/i);
                const originMatch = itemAttrs.match(/bko_origin=["']([^"']+)["']/);

                if (nameMatch) {
                  allLootItems.push({
                    name: nameMatch[1],
                    chance: chanceMatch ? parseFloat(chanceMatch[1]) / 1000 : 0,
                    countMax: countMaxMatch ? parseInt(countMaxMatch[1]) : 1,
                    origin: originMatch ? originMatch[1] : 'None'
                  });
                }
              }

              // Extract resourceBalance from monster XML
              const balanceMatch = xmlContent.match(/<balance\s+([^>]+)>/);
              let resourceBalance = 'Equals';
              if (balanceMatch) {
                const balanceAttrs = balanceMatch[1];
                const extraLootMatch = balanceAttrs.match(/extraLoot=["']([^"']+)["']/);
                const extraXpMatch = balanceAttrs.match(/extraXp=["']([^"']+)["']/);

                const extraLoot = extraLootMatch ? parseInt(extraLootMatch[1]) : 0;
                const extraXp = extraXpMatch ? parseInt(extraXpMatch[1]) : 0;

                if (extraXp > 0) {
                  resourceBalance = `Exp${extraXp}`;
                } else if (extraLoot > 0) {
                  resourceBalance = `Loot${extraLoot}`;
                }
              }

              // Calculate unlock levels using centralized function
              const unlockLevels = calculateUnlockLevelsMap(allLootItems, monster.power, resourceBalance, itemsMap);

              // Update XML with unlock levels
              let finalLootContent = updatedLootContent;
              unlockLevels.forEach((unlockLevel, itemName) => {
                // Find and update each item with its unlock level
                const itemPattern = new RegExp(`(<item[^>]*name=["']${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*)(\\/>)`, 'g');
                finalLootContent = finalLootContent.replace(itemPattern, (match, p1, p2) => {
                  // Remove existing unlock_level if present
                  let updatedItem = p1.replace(/\s*unlock_level=["'][^"']*["']/, '');
                  // Add new unlock_level
                  return `${updatedItem} unlock_level="${unlockLevel}"${p2}`;
                });
              });

              // Parse items and sort by unlock level
              const itemMatches = [...finalLootContent.matchAll(/<item([^>]*)\/>/g)];
              const itemsWithUnlock = itemMatches.map(match => {
                const fullItem = match[0];
                const unlockMatch = match[1].match(/unlock_level=["']([^"']+)["']/);
                const unlockLevel = unlockMatch ? parseInt(unlockMatch[1]) : 0;
                return { fullItem, unlockLevel };
              });

              // Sort by unlock level (ascending)
              itemsWithUnlock.sort((a, b) => a.unlockLevel - b.unlockLevel);

              // Rebuild loot content with sorted items
              finalLootContent = '\n\t\t' + itemsWithUnlock.map(item => item.fullItem).join('\n\t\t') + '\n\t';

              // Replace with updated loot content, preserving loot tag attributes
              xmlContent = xmlContent.replace(lootRegex, `<loot${lootAttributes}>${finalLootContent}</loot>`);
            }

            fs.writeFileSync(filePath, xmlContent, 'utf-8');
            updatedCount++;
            console.log(`Added ${itemsToAdd.length} items and recalculated unlock levels for: ${monster.fileName}`);
          } else {
            errors.push(`No loot section found in: ${monster.fileName}`);
          }
        } catch (error) {
          console.error(`Error processing ${monster.fileName}:`, error);
          errors.push(`Error processing ${monster.fileName}: ${error.message}`);
        }
      }

      console.log(`[Step 2] Added items to ${updatedCount} monsters`);

      sendJson(res, 200, {
        success: true,
        cleaned: cleanedCount,
        updated: updatedCount,
        total: monsters.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error adding base stats role items:', error);
      if (error.message === 'Invalid JSON in request body') {
        sendError(res, 400, error.message);
      } else {
        sendError(res, 500, error.message);
      }
    }
  });

  // API endpoint to add primary materials (craft primary) to monsters
  server.middlewares.use('/api/monsters/add-primary-materials', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { monstersToUpdate } = await parseRequestBody(req);

      if (!Array.isArray(monstersToUpdate)) {
        return sendError(res, 400, 'monstersToUpdate must be an array');
      }

      const monstersPath = getMonstersPath();

      let updatedCount = 0;
      const errors = [];
      const removedItems = [];
      const addedItems = [];

      // STEP 1: Remove all craft primary from ALL monsters
      console.log('[Step 1] Removing all craft primary items from all monsters...');

      const allFiles = fs.readdirSync(monstersPath);
      const allXmlFiles = allFiles.filter(file => file.endsWith('.xml'));

      for (const fileName of allXmlFiles) {
        try {
          const filePath = path.join(monstersPath, fileName);
          let xmlContent = fs.readFileSync(filePath, 'utf-8');
          xmlContent = xmlContent.replace(/^\uFEFF/, '');

          const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
          const lootMatch = xmlContent.match(lootRegex);

          if (lootMatch) {
            // SAVE loot tag attributes BEFORE cleaning
            const savedLootAttributes = lootMatch[1];
            const lootContent = lootMatch[2];
            const itemRegex = /<item[^>]*\/>/g;
            const existingItems = lootContent.match(itemRegex) || [];

            const removedFromThisMonster = [];
            const keptItems = [];

            existingItems.forEach(itemXml => {
              const originMatch = itemXml.match(/bko_origin=["']([^"']+)["']/);
              const nameMatch = itemXml.match(/name=["']([^"']+)["']/);

              if (originMatch && originMatch[1] === 'craft primary') {
                if (nameMatch) {
                  removedFromThisMonster.push(nameMatch[1]);
                }
              } else {
                keptItems.push(itemXml);
              }
            });

            if (removedFromThisMonster.length > 0) {
              const monsterNameMatch = xmlContent.match(/<monster[^>]+name=["']([^"']+)["']/);
              removedItems.push({
                monsterName: monsterNameMatch ? monsterNameMatch[1] : fileName,
                items: removedFromThisMonster
              });

              let newLootContent = '';
              if (keptItems.length > 0) {
                newLootContent = '\n\t\t' + keptItems.join('\n\t\t') + '\n\t';
              } else {
                newLootContent = '\n\t';
              }

              // RESTORE loot tag attributes AFTER cleaning
              xmlContent = xmlContent.replace(lootRegex, `<loot${savedLootAttributes}>${newLootContent}</loot>`);
              fs.writeFileSync(filePath, xmlContent, 'utf-8');
            }
          }
        } catch (error) {
          console.error(`Error cleaning ${fileName}:`, error);
        }
      }

      console.log(`[Step 1] Removed craft primary from ${removedItems.length} monsters`);

      // STEP 2: Add new primary materials
      console.log('[Step 2] Adding new primary materials...');

      const monsterMap = new Map();
      monstersToUpdate.forEach(update => {
        if (!monsterMap.has(update.fileName)) {
          monsterMap.set(update.fileName, []);
        }
        monsterMap.get(update.fileName).push(update);
      });

      for (const [fileName, updates] of monsterMap) {
        try {
          const filePath = path.join(monstersPath, fileName);

          if (!fs.existsSync(filePath)) {
            errors.push(`Monster file not found: ${fileName}`);
            continue;
          }

          let xmlContent = fs.readFileSync(filePath, 'utf-8');
          xmlContent = xmlContent.replace(/^\uFEFF/, '');

          const lootRegex = /<loot([^>]*)>([\s\S]*?)<\/loot>/;
          const lootMatch = xmlContent.match(lootRegex);

          if (lootMatch) {
            // SAVE loot tag attributes BEFORE adding items
            const savedLootAttributes = lootMatch[1];
            const lootContent = lootMatch[2];
            const itemRegex = /<item[^>]*\/>/g;
            const existingItems = lootContent.match(itemRegex) || [];

            const addedToThisMonster = [];

            for (const update of updates) {
              const newItem = `<item name="${update.itemName}" chance="${update.chance}" bko_origin="${update.origin}" />`;
              existingItems.push(newItem);
              addedToThisMonster.push({ itemName: update.itemName, chance: update.chance });
            }

            const monsterNameMatch = xmlContent.match(/<monster[^>]+name=["']([^"']+)["']/);
            addedItems.push({
              monsterName: monsterNameMatch ? monsterNameMatch[1] : fileName,
              items: addedToThisMonster
            });

            let newLootContent = '';
            if (existingItems.length > 0) {
              newLootContent = '\n\t\t' + existingItems.join('\n\t\t') + '\n\t';
            } else {
              newLootContent = '\n\t';
            }

            // RESTORE loot tag attributes AFTER adding items
            xmlContent = xmlContent.replace(lootRegex, `<loot${savedLootAttributes}>${newLootContent}</loot>`);
            fs.writeFileSync(filePath, xmlContent, 'utf-8');
            updatedCount++;
          } else {
            errors.push(`No loot section found in: ${fileName}`);
          }
        } catch (error) {
          console.error(`Error processing ${fileName}:`, error);
          errors.push(`Error processing ${fileName}: ${error.message}`);
        }
      }

      console.log(`[Step 2] Added primary materials to ${updatedCount} monsters`);

      sendJson(res, 200, {
        success: true,
        updated: updatedCount,
        total: monsterMap.size,
        removedItems,
        addedItems,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error adding primary materials:', error);
      if (error.message === 'Invalid JSON in request body') {
        sendError(res, 400, error.message);
      } else {
        sendError(res, 500, error.message);
      }
    }
  });

  // API endpoint to get monster loot items (items with lootCategory)
  server.middlewares.use('/api/monster-loot-items', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const itemsXmlPath = getItemsXmlPath();
      let xmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');
      xmlContent = xmlContent.replace(/^\uFEFF/, '');

      const items = [];

      // Parse items with content (not self-closing)
      // Match only items that have content: <item ...>...</item>
      // Exclude self-closing items: <item ... />
      const itemBlockRegex = /<item\s+([^>]*?[^/])>([\s\S]*?)<\/item>/g;
      let blockMatch;

      while ((blockMatch = itemBlockRegex.exec(xmlContent)) !== null) {
        const itemAttrs = blockMatch[1];
        const itemContent = blockMatch[2];

        // Skip items with fromid/toid (ranges are decorative items, not loot)
        const hasFromId = /\bfromid=/.test(itemAttrs);
        const hasToId = /\btoid=/.test(itemAttrs);
        if (hasFromId || hasToId) continue;

        // Skip if attributes end with / (self-closing check)
        if (itemAttrs.trim().endsWith('/')) continue;

        // Extract name from item attributes
        const nameMatch = itemAttrs.match(/name=["']([^"']+)["']/);
        if (!nameMatch) continue;

        const itemName = nameMatch[1];

        // Check if item has lootCategory attribute
        const lootCategoryMatch = itemContent.match(/<attribute\s+key=["']lootCategory["']\s+value=["']([^"']+)["']/i);
        if (!lootCategoryMatch) continue;

        const lootCategory = lootCategoryMatch[1];

        // Skip items with empty or whitespace-only lootCategory
        if (!lootCategory || !lootCategory.trim()) continue;

        // Extract tier if available
        const tierMatch = itemContent.match(/<attribute\s+key=["']tier["']\s+value=["']([^"']+)["']/i);
        const tier = tierMatch ? tierMatch[1] : 'common';

        items.push({
          name: itemName,
          lootCategory: lootCategory,
          tier: tier
        });
      }

      sendJson(res, 200, items);

    } catch (error) {
      console.error('Error loading monster loot items:', error);
      sendError(res, 500, error.message);
    }
  });

  // Original API endpoint for full monster data
  server.middlewares.use('/api/monsters', async (req, res, next) => {
    // Only handle exact /api/monsters path (after prefix removal, url is just "/")
    if (req.url !== '/' && req.url !== '') {
      return next();
    }

    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const monstersPath = getMonstersPath();

      // Get all XML files in the monsters directory
      const files = fs.readdirSync(monstersPath);
      const xmlFiles = files.filter(file => file.endsWith('.xml'));

      const monsters = [];

      // Parse each XML file
      for (const file of xmlFiles) {
        try {
          const filePath = path.join(monstersPath, file);
          const xmlContent = fs.readFileSync(filePath, 'utf-8');

          // Remove BOM if present
          const cleanContent = xmlContent.replace(/^\uFEFF/, '');

          const result = await parseStringPromise(cleanContent, {
            explicitArray: false,
            ignoreAttrs: false,
            mergeAttrs: false
          });

          if (result && result.monster) {
            const monster = result.monster;
            const monsterData = {
              // Generate unique ID from file name
              id: file.replace('.xml', '').toLowerCase().replace(/\s+/g, '_'),

              // Basic info from root attributes
              monsterName: monster.$.name || '',
              nameDescription: monster.$.nameDescription || '',
              race: monster.$.race || '',
              experience: parseInt(monster.$.experience) || 0,
              vocationPoints: parseInt(monster.$.vocationpoints) || 0,

              // Balance attributes
              power: parseFloat(monster.balance?.$?.power) || 0,
              hp: parseInt(monster.balance?.$?.hp) || 0,
              atk: parseInt(monster.balance?.$?.atk) || 0,
              def: parseInt(monster.balance?.$?.def) || 0,
              satk: parseInt(monster.balance?.$?.satk) || 0,
              sdef: parseInt(monster.balance?.$?.sdef) || 0,
              speed: parseInt(monster.balance?.$?.speed) || 0,
              extraLoot: parseInt(monster.balance?.$?.extraLoot) || 0,
              extraXp: parseInt(monster.balance?.$?.extraXp) || 0,
              defaultLevel: parseInt(monster.balance?.$?.defaultLevel) || 1,

              // Look
              lookType: parseInt(monster.look?.$?.type) || 0,
              corpse: parseInt(monster.look?.$?.corpse) || 0,

              // Flags
              attackable: false,
              hostile: false,
              targetDistance: 0,
              staticAttack: 0,
              runOnHealth: 0,

              // File source
              fileName: file
            };

            // Process flags
            if (monster.flags?.flag) {
              const flags = Array.isArray(monster.flags.flag)
                ? monster.flags.flag
                : [monster.flags.flag];

              flags.forEach(flag => {
                if (flag.$.attackable !== undefined) monsterData.attackable = flag.$.attackable === '1';
                if (flag.$.hostile !== undefined) monsterData.hostile = flag.$.hostile === '1';
                if (flag.$.targetdistance !== undefined) monsterData.targetDistance = parseInt(flag.$.targetdistance) || 0;
                if (flag.$.staticattack !== undefined) monsterData.staticAttack = parseInt(flag.$.staticattack) || 0;
                if (flag.$.runonhealth !== undefined) monsterData.runOnHealth = parseInt(flag.$.runonhealth) || 0;
              });
            }

            // Process loot
            const lootList = [];
            if (monster.loot?.item) {
              const items = Array.isArray(monster.loot.item)
                ? monster.loot.item
                : [monster.loot.item];

              items.forEach(item => {
                const lootItem = {
                  name: item.$.name || '',
                  chance: parseFloat(item.$.chance) || 0,
                  countMax: parseInt(item.$.countmax) || 1,
                  ratio: parseFloat(item.$['bko_ratio']) || 0,
                  rarity: item.$['bko_rarity'] || 'None',
                  origin: item.$['bko_origin'] || 'None',
                  info: item.$['bko_info'] || '',
                  unlockLevel: item.$['unlock_level'] !== undefined ? parseInt(item.$['unlock_level']) : undefined
                };

                // Convert chance to percentage (value from XML is always divided by 1000)
                lootItem.chance = lootItem.chance / 1000;

                lootList.push(lootItem);
              });
            }
            monsterData.loot = lootList;

            monsters.push(monsterData);
          }
        } catch (error) {
          console.error(`Error parsing ${file}:`, error.message);
        }
      }

      const sortedMonsters = monsters.sort((a, b) => a.power - b.power || a.monsterName.localeCompare(b.monsterName));

      sendJson(res, 200, {
        monsters: sortedMonsters,
        total: sortedMonsters.length
      });

    } catch (error) {
      console.error('Error loading monsters:', error);
      sendError(res, 500, error.message);
    }
  });

  // API endpoint to save monster data
  server.middlewares.use('/api/monsters/save', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      console.log('[Monster Save] Parsing request body...');
      const body = await parseRequestBody(req);
      console.log('[Monster Save] Request body keys:', Object.keys(body));

      const { fileName, monsterData } = body;
      console.log(`[Monster Save] Processing: ${fileName}`);

      if (!fileName || !monsterData) {
        console.error('[Monster Save] Missing required fields:', { fileName: !!fileName, monsterData: !!monsterData });
        return sendError(res, 400, 'fileName and monsterData are required');
      }

      const monstersPath = getMonstersPath();
      const filePath = path.join(monstersPath, fileName);

      if (!fs.existsSync(filePath)) {
        return sendError(res, 404, `Monster file not found: ${fileName}`);
      }

      // Read existing XML
      let xmlContent = fs.readFileSync(filePath, 'utf-8');
      xmlContent = xmlContent.replace(/^\uFEFF/, '');

      // Update root monster attributes using regex
      MONSTER_ROOT_FIELDS.forEach(field => {
        if (monsterData[field.uiField] !== undefined) {
          const value = monsterData[field.uiField];
          const xmlValue = valueToXml(value, field.type);
          const attrPattern = new RegExp(`(<monster[^>]*)(\\s+)${field.xmlAttr}=["'][^"']*["']`, 'i');

          // Check if we should omit this field
          if (shouldOmitField(value, field.type, field.omitIfZero)) {
            // Remove the attribute if it exists
            if (attrPattern.test(xmlContent)) {
              xmlContent = xmlContent.replace(attrPattern, '$1');
            }
          } else {
            // Update or add the attribute
            if (attrPattern.test(xmlContent)) {
              // Update existing attribute
              xmlContent = xmlContent.replace(attrPattern, `$1$2${field.xmlAttr}="${xmlValue}"`);
            } else {
              // Add new attribute (insert before closing >)
              xmlContent = xmlContent.replace(/(<monster[^>]*)>/, `$1 ${field.xmlAttr}="${xmlValue}">`);
            }
          }
        }
      });

      // Update balance element attributes
      BALANCE_FIELDS.forEach(field => {
        if (monsterData[field.uiField] !== undefined) {
          const xmlValue = valueToXml(monsterData[field.uiField], field.type);
          const attrPattern = new RegExp(`(<balance[^>]*\\s)${field.xmlAttr}=["'][^"']*["']`, 'i');
          if (attrPattern.test(xmlContent)) {
            xmlContent = xmlContent.replace(attrPattern, `$1${field.xmlAttr}="${xmlValue}"`);
          } else {
            // Insert attribute before closing /> or >
            xmlContent = xmlContent.replace(/(<balance[^/>]*?)(\s*\/?>)/, `$1 ${field.xmlAttr}="${xmlValue}"$2`);
          }
        }
      });

      // Handle resourceBalance -> extraLoot/extraXp conversion
      if (monsterData.resourceBalance !== undefined) {
        const { extraLoot, extraXp } = convertResourceBalanceToXml(monsterData.resourceBalance);
        const extraLootPattern = /(<balance[^>]*\s)extraLoot=["'][^"']*["']/i;
        const extraXpPattern = /(<balance[^>]*\s)extraXp=["'][^"']*["']/i;

        if (extraLootPattern.test(xmlContent)) {
          xmlContent = xmlContent.replace(extraLootPattern, `$1extraLoot="${extraLoot}"`);
        } else {
          xmlContent = xmlContent.replace(/(<balance[^/>]*?)(\s*\/?>)/, `$1 extraLoot="${extraLoot}"$2`);
        }

        if (extraXpPattern.test(xmlContent)) {
          xmlContent = xmlContent.replace(extraXpPattern, `$1extraXp="${extraXp}"`);
        } else {
          xmlContent = xmlContent.replace(/(<balance[^/>]*?)(\s*\/?>)/, `$1 extraXp="${extraXp}"$2`);
        }
      }

      // Update attributesBase element attributes (only if at least one base attribute is present in monsterData)
      const hasAnyBaseAttribute = ATTRIBUTES_BASE_FIELDS.some(field =>
        monsterData[field.uiField] !== undefined
      );

      if (hasAnyBaseAttribute) {
        const hasAttributesBase = /<attributesBase[^>]*\/?>/.test(xmlContent);

        if (!hasAttributesBase) {
          // Create attributesBase element if it doesn't exist
          const baseAttrs = [];
          ATTRIBUTES_BASE_FIELDS.forEach(field => {
            const value = monsterData[field.uiField] !== undefined ? monsterData[field.uiField] : field.default;
            const xmlValue = valueToXml(value, field.type);
            baseAttrs.push(`${field.xmlAttr}="${xmlValue}"`);
          });

          // Insert before attributesPerLevel or before </monster> if attributesPerLevel doesn't exist
          const insertTag = `  <attributesBase ${baseAttrs.join(' ')} />\n`;
          if (/<attributesPerLevel/.test(xmlContent)) {
            xmlContent = xmlContent.replace(/(<attributesPerLevel)/, `${insertTag}$1`);
          } else {
            xmlContent = xmlContent.replace(/(<\/monster>)/, `${insertTag}$1`);
          }
        } else {
          // Update existing attributesBase element
          ATTRIBUTES_BASE_FIELDS.forEach(field => {
            const value = monsterData[field.uiField] !== undefined ? monsterData[field.uiField] : field.default;
            const xmlValue = valueToXml(value, field.type);
            const attrPattern = new RegExp(`(<attributesBase[^>]*\\s)${field.xmlAttr}=["'][^"']*["']`, 'i');

            if (attrPattern.test(xmlContent)) {
              // Update existing attribute
              xmlContent = xmlContent.replace(attrPattern, `$1${field.xmlAttr}="${xmlValue}"`);
            } else {
              // Add new attribute (insert before / or >)
              xmlContent = xmlContent.replace(/(<attributesBase[^/>]*?)(\s*\/?>)/, `$1 ${field.xmlAttr}="${xmlValue}"$2`);
            }
          });
        }
      }

      // Migrate legacy baseHealth and baseSpeed from attributesPerLevel to attributesBase
      // Remove these attributes from attributesPerLevel if they exist
      xmlContent = xmlContent.replace(/(<attributesPerLevel[^>]*)\s+baseHealth=["'][^"']*["']/, '$1');
      xmlContent = xmlContent.replace(/(<attributesPerLevel[^>]*)\s+baseSpeed=["'][^"']*["']/, '$1');

      // Update attributesPerLevel element attributes
      ATTRIBUTES_PER_LEVEL_FIELDS.forEach(field => {
        if (monsterData[field.uiField] !== undefined) {
          const xmlValue = valueToXml(monsterData[field.uiField], field.type);
          const attrPattern = new RegExp(`(<attributesPerLevel[^>]*\\s)${field.xmlAttr}=["'][^"']*["']`, 'i');

          if (attrPattern.test(xmlContent)) {
            // Update existing attribute
            xmlContent = xmlContent.replace(attrPattern, `$1${field.xmlAttr}="${xmlValue}"`);
          } else {
            // Add new attribute (insert before closing /> or >)
            xmlContent = xmlContent.replace(/(<attributesPerLevel[^/>]*?)(\s*\/?>)/, `$1 ${field.xmlAttr}="${xmlValue}"$2`);
          }
        }
      });

      // Update look element attributes
      LOOK_FIELDS.forEach(field => {
        if (monsterData[field.uiField] !== undefined) {
          const xmlValue = valueToXml(monsterData[field.uiField], field.type);
          const attrPattern = new RegExp(`(<look[^>]*\\s)${field.xmlAttr}=["'][^"']*["']`, 'i');
          if (attrPattern.test(xmlContent)) {
            xmlContent = xmlContent.replace(attrPattern, `$1${field.xmlAttr}="${xmlValue}"`);
          }
        }
      });

      // Update loot element attributes
      // Check if loot element exists
      const hasLootElement = /<loot[^>]*>/.test(xmlContent);

      // Special handling for noLoot
      const hasNoLoot = monsterData.noLoot === true || monsterData.noLoot === 1;

      if (!hasLootElement) {
        // Create loot element if it doesn't exist
        // Insert before </monster> closing tag
        if (hasNoLoot) {
          xmlContent = xmlContent.replace(/(<\/monster>)/, '  <loot noLoot="1" />\n$1');
        } else {
          // Create empty loot element with attributes if needed
          const lootAttrs = [];
          LOOT_FIELDS.forEach(field => {
            if (monsterData[field.uiField] !== undefined) {
              const value = monsterData[field.uiField];
              if (!shouldOmitField(value, field.type, field.omitIfZero)) {
                const xmlValue = valueToXml(value, field.type);
                lootAttrs.push(`${field.xmlAttr}="${xmlValue}"`);
              }
            }
          });
          const lootTag = lootAttrs.length > 0
            ? `  <loot ${lootAttrs.join(' ')}>\n  </loot>\n`
            : '  <loot>\n  </loot>\n';
          xmlContent = xmlContent.replace(/(<\/monster>)/, `${lootTag}$1`);
        }
      } else {
        // Loot element exists, update it
        if (hasNoLoot) {
          // Se noLoot=1, remove todos os itens do loot e goldCoinsPerKillPerLvl
          const lootRegex = /<loot[^>]*>([\s\S]*?)<\/loot>/;
          if (lootRegex.test(xmlContent)) {
            xmlContent = xmlContent.replace(lootRegex, '<loot noLoot="1" />');
          }
        } else {
          // Se noLoot=0 ou false, processa normalmente
          LOOT_FIELDS.forEach(field => {
            if (monsterData[field.uiField] !== undefined) {
              const value = monsterData[field.uiField];
              const xmlValue = valueToXml(value, field.type);
              const attrPattern = new RegExp(`(<loot[^>]*)(\\s+)${field.xmlAttr}=["'][^"']*["']`, 'i');

              // Check if we should omit this field (empty, zero, or false)
              if (shouldOmitField(value, field.type, field.omitIfZero) || xmlValue === '' || xmlValue === '0' && field.type === 'float') {
                // Remove the attribute if it exists
                if (attrPattern.test(xmlContent)) {
                  xmlContent = xmlContent.replace(attrPattern, '$1');
                }
              } else {
                // Update or add the attribute
                if (attrPattern.test(xmlContent)) {
                  // Update existing attribute
                  xmlContent = xmlContent.replace(attrPattern, `$1$2${field.xmlAttr}="${xmlValue}"`);
                } else {
                  // Add new attribute (insert after <loot)
                  xmlContent = xmlContent.replace(/(<loot)(\s|>)/, `$1 ${field.xmlAttr}="${xmlValue}"$2`);
                }
              }
            }
          });
        }
      }

      // Update targetchange element attributes
      TARGET_CHANGE_FIELDS.forEach(field => {
        if (monsterData[field.uiField] !== undefined) {
          const xmlValue = valueToXml(monsterData[field.uiField], field.type);
          const attrPattern = new RegExp(`(<targetchange[^>]*\\s)${field.xmlAttr}=["'][^"']*["']`, 'i');
          if (attrPattern.test(xmlContent)) {
            xmlContent = xmlContent.replace(attrPattern, `$1${field.xmlAttr}="${xmlValue}"`);
          }
        }
      });

      // Update flags section
      if (FLAG_FIELDS.some(f => monsterData[f.uiField] !== undefined)) {
        const flagsRegex = /<flags>([\s\S]*?)<\/flags>/;
        const flagsMatch = xmlContent.match(flagsRegex);

        if (flagsMatch) {
          const newFlags = [];
          FLAG_FIELDS.forEach(field => {
            if (monsterData[field.uiField] !== undefined) {
              const xmlValue = valueToXml(monsterData[field.uiField], field.type);
              // Only create flag if value is truthy (for booleans) or non-zero (for numbers)
              if ((field.type === 'boolean' && xmlValue === '1') ||
                  (field.type === 'number' && xmlValue !== '0')) {
                newFlags.push(`    <flag ${field.xmlAttr}="${xmlValue}" />`);
              }
            }
          });

          const newFlagsContent = newFlags.length > 0
            ? '\n' + newFlags.join('\n') + '\n  '
            : '\n  ';

          xmlContent = xmlContent.replace(flagsRegex, `<flags>${newFlagsContent}</flags>`);
        }
      }

      // Update elements section (only non-zero values)
      if (monsterData.elements) {
        const elementsRegex = /<elements>([\s\S]*?)<\/elements>/;
        const elementsMatch = xmlContent.match(elementsRegex);

        if (elementsMatch) {
          const newElements = [];
          ELEMENT_FIELDS.forEach(field => {
            const value = monsterData.elements[field.uiField];
            if (value !== undefined && value !== 0) {
              const xmlValue = valueToXml(value, field.type);
              newElements.push(`    <element ${field.xmlAttr}="${xmlValue}" />`);
            }
          });

          const newElementsContent = newElements.length > 0
            ? '\n' + newElements.join('\n') + '\n  '
            : '\n  ';

          xmlContent = xmlContent.replace(elementsRegex, `<elements>${newElementsContent}</elements>`);
        }
      }

      // Update immunities section (only active immunities with value 1)
      if (monsterData.immunities) {
        const immunitiesRegex = /<immunities>([\s\S]*?)<\/immunities>/;
        const immunitiesMatch = xmlContent.match(immunitiesRegex);

        if (immunitiesMatch) {
          const activeImmunities = new Set(monsterData.immunities.map(name => name.toLowerCase()));
          const newImmunities = [];

          IMMUNITY_TYPES.forEach(immunityType => {
            const isActive = activeImmunities.has(immunityType);
            if (isActive) {
              newImmunities.push(`    <immunity ${immunityType}="1" />`);
            }
          });

          const newImmunitiesContent = newImmunities.length > 0
            ? '\n' + newImmunities.join('\n') + '\n  '
            : '\n  ';

          xmlContent = xmlContent.replace(immunitiesRegex, `<immunities>${newImmunitiesContent}</immunities>`);
        }
      }

      const updatedXmlString = xmlContent;

      // Check if file needs to be renamed (for camelCase fix)
      let finalFileName = fileName;
      if (monsterData._renameFile) {
        const { oldName, newName } = monsterData._renameFile;
        const oldPath = path.join(monstersPath, `${oldName}.xml`);
        let targetName = newName;
        let newPath = path.join(monstersPath, `${targetName}.xml`);

        // Check for collision: if target file exists and is different from source
        if (fs.existsSync(newPath) && oldPath !== newPath) {
          console.warn(`[Monster Save] Collision detected: ${targetName}.xml already exists`);

          // Find an available name with numeric suffix
          let counter = 1;
          while (fs.existsSync(newPath)) {
            targetName = `${newName}_${counter}`;
            newPath = path.join(monstersPath, `${targetName}.xml`);
            counter++;
          }

          console.log(`[Monster Save] Using collision-free name: ${targetName}.xml`);
        }

        console.log(`[Monster Save] Renaming file: ${oldName}.xml -> ${targetName}.xml`);

        // Write to new location first
        fs.writeFileSync(newPath, updatedXmlString, 'utf-8');

        // Delete old file if it exists and is different
        if (fs.existsSync(oldPath) && oldPath !== newPath) {
          fs.unlinkSync(oldPath);
          console.log(`[Monster Save] Deleted old file: ${oldName}.xml`);
        }

        finalFileName = `${targetName}.xml`;
      } else {
        // Write updated XML to same location
        fs.writeFileSync(filePath, updatedXmlString, 'utf-8');
      }

      console.log(`[Monster Save] SUCCESS: ${finalFileName}`);

      sendJson(res, 200, { success: true, fileName: finalFileName });

    } catch (error) {
      console.error('[Monster Save] Error:', error);
      if (error.message === 'Invalid JSON in request body') {
        sendError(res, 400, error.message);
      } else {
        sendError(res, 500, error.message);
      }
    }
  });

  // API endpoint to get monster name to filename mapping
  server.middlewares.use('/api/monsters/name-to-file', async (req, res, next) => {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const nameToFileMap = getMonsterNameToFileMap();

      if (req.method === 'GET') {
        // Return entire map as object
        const mapObject = Object.fromEntries(nameToFileMap);
        return sendJson(res, 200, { map: mapObject, count: nameToFileMap.size });
      }

      // POST: Lookup specific monster names
      const { monsterNames } = await parseRequestBody(req);

      if (!monsterNames || !Array.isArray(monsterNames)) {
        return sendError(res, 400, 'monsterNames array is required');
      }

      const results = {};
      for (const name of monsterNames) {
        const fileName = nameToFileMap.get(name.toLowerCase());
        results[name] = fileName || null;
      }

      sendJson(res, 200, { results, found: Object.values(results).filter(f => f).length });
    } catch (error) {
      console.error('Error getting monster name to file mapping:', error);
      sendError(res, 500, error.message);
    }
  });

  // API endpoint to serve monster XML files from the configured path
  server.middlewares.use(async (req, res, next) => {
    // Match /api/monsters/xml/:filename pattern manually
    const xmlPathMatch = req.url.match(/^\/api\/monsters\/xml\/([^?]+)/);

    if (!xmlPathMatch) {
      return next();
    }

    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      // Decode URL-encoded filename (e.g., "Grim%20Reaper.xml" -> "Grim Reaper.xml")
      const filename = decodeURIComponent(xmlPathMatch[1]);

      // Security: Only allow .xml files and prevent directory traversal
      if (!filename.endsWith('.xml') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return sendError(res, 400, 'Invalid filename');
      }

      const monstersPath = getMonstersPath();
      const filePath = path.join(monstersPath, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return sendError(res, 404, `Monster file not found: ${filename}`);
      }

      // Read and serve the XML file
      const xmlContent = fs.readFileSync(filePath, 'utf-8');

      // Set appropriate headers for XML
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.statusCode = 200;
      res.end(xmlContent);
    } catch (error) {
      console.error('Error serving monster XML file:', error);
      sendError(res, 500, error.message);
    }
  });
}
