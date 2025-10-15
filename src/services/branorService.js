import settings from '../../public/data/settings.js';

/**
 * Service to parse branor.lua file and extract sellable item IDs
 */
class BranorService {
  constructor() {
    this.sellableItems = null;
    this.lastLoadTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Loads and parses the branor.lua file to extract sellable item IDs
   * @returns {Promise<Set<number>>} Set of item IDs that are sellable in branor
   */
  async loadSellableItems() {
    // Return cached data if available and fresh
    if (this.sellableItems && this.lastLoadTime && (Date.now() - this.lastLoadTime < this.cacheTimeout)) {
      return this.sellableItems;
    }

    try {
      const branorPath = settings.database.branorFile;

      // Fetch the lua file content
      const response = await fetch(`/api/read-file?path=${encodeURIComponent(branorPath)}`);

      if (!response.ok) {
        throw new Error(`Failed to load branor.lua: ${response.statusText}`);
      }

      const luaContent = await response.text();

      // Extract all IDs from shopModule:addDreamSellableItem(ID) calls
      // Pattern matches: shopModule:addDreamSellableItem(2696) or shopModule:addDreamSellableItem( 2696 )
      const regex = /shopModule:addDreamSellableItem\s*\(\s*(\d+)\s*\)/g;
      const itemIds = new Set();

      let match;
      while ((match = regex.exec(luaContent)) !== null) {
        const itemId = parseInt(match[1], 10);
        itemIds.add(itemId);
      }

      console.log(`[BranorService] Loaded ${itemIds.size} sellable items from branor.lua`);

      // Cache the results
      this.sellableItems = itemIds;
      this.lastLoadTime = Date.now();

      return itemIds;
    } catch (error) {
      console.error('[BranorService] Error loading branor.lua:', error);
      throw error;
    }
  }

  /**
   * Checks if an item ID is sellable in branor
   * @param {number|string} itemId - The item ID to check
   * @returns {Promise<boolean>} True if item is sellable in branor
   */
  async isItemSellable(itemId) {
    const sellableItems = await this.loadSellableItems();
    const id = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    return sellableItems.has(id);
  }

  /**
   * Clears the cache to force reload on next request
   */
  clearCache() {
    this.sellableItems = null;
    this.lastLoadTime = null;
  }
}

// Export singleton instance
const branorService = new BranorService();
export default branorService;
