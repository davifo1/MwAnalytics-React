// Service to load and parse items XML for autocomplete
export async function loadItemsForAutocomplete() {
  try {
    const response = await fetch('/data/items.xml');
    if (!response.ok) {
      throw new Error(`Failed to load items XML: ${response.status}`);
    }

    const xmlText = await response.text();

    const items = [];
    const processedIds = new Set();

    // Split XML into item blocks (same approach as itemsService.js)
    const itemBlocks = xmlText.split(/<item\s+/).slice(1);

    for (const block of itemBlocks) {
      // Extract attributes from item tag
      const idMatch = block.match(/\bid="(\d+)"/);
      const fromIdMatch = block.match(/\bfromid="(\d+)"/);
      const toIdMatch = block.match(/\btoid="(\d+)"/);
      const nameMatch = block.match(/\bname="([^"]+)"/);

      if (!nameMatch) continue; // Skip items without name

      const name = nameMatch[1];

      // Find attributes within the item block
      const endOfItemTag = block.indexOf('>');
      const itemContent = block.substring(endOfItemTag + 1);

      // Capture all attributes
      const attributes = {};
      const attributeRegex = /<attribute\s+key="([^"]+)"\s+value="([^"]+)"/g;
      let attrMatch;
      while ((attrMatch = attributeRegex.exec(itemContent)) !== null) {
        const key = attrMatch[1];
        const value = attrMatch[2];
        // Convert numeric values when appropriate
        if (!isNaN(value) && value !== '') {
          attributes[key] = Number(value);
        } else {
          attributes[key] = value;
        }
      }

      // Check if item has lootCategory attribute or monsterLoot in categories
      let lootCategory = attributes.lootCategory || '';
      const categories = attributes.categories || '';

      // If no lootCategory but has monsterLoot in categories, extract it
      const hasMonsterLootInCategories = categories.includes('monsterLoot');

      if (!lootCategory && hasMonsterLootInCategories) {
        // Extract first valid category or use 'monsterLoot'
        const categoriesList = categories.split(';').filter(c => c.trim());
        lootCategory = categoriesList.find(c => c !== 'monsterLoot') || 'monsterLoot';
      }

      // Include item if it has lootCategory OR monsterLoot in categories
      if (lootCategory || hasMonsterLootInCategories) {
        // Use monsterLoot as fallback if still no lootCategory
        if (!lootCategory) {
          lootCategory = 'monsterLoot';
        }

        const baseItem = {
          name: name,
          lootCategory: lootCategory,
          tier: attributes.tier || null,
          sellPrice: attributes.sellingPrice || null,
          valuation: attributes.valuation || null,
          isMonsterLoot: true, // Flag para ItemSelectionModal
          attributes: attributes, // Incluir todos os atributos (incluindo monsterDropStage)
          // Priority for sorting by lootCategory
          priority: lootCategory === 'consumables' ? 0 : 1
        };

        if (idMatch) {
          const id = parseInt(idMatch[1]);
          if (!processedIds.has(id)) {
            items.push({
              ...baseItem,
              id: id
            });
            processedIds.add(id);
          }
        } else if (fromIdMatch && toIdMatch) {
          // For items with ID range
          const from = parseInt(fromIdMatch[1]);
          const to = parseInt(toIdMatch[1]);
          for (let j = from; j <= to; j++) {
            if (!processedIds.has(j)) {
              items.push({
                ...baseItem,
                id: j
              });
              processedIds.add(j);
            }
          }
        }
      }
    }

    // Sort by priority (consumables first) then by name
    items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`[monsterItemService] Loaded ${items.length} items with lootCategory`);
    console.log(`[monsterItemService] Sample items:`, items.slice(0, 5).map(i => ({ name: i.name, lootCategory: i.lootCategory })));

    return items;
  } catch (error) {
    console.error('Error loading items for autocomplete:', error);
    return [];
  }
}