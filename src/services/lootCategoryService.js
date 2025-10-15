/**
 * Service for managing loot categories
 */

let cachedCategories = null;

/**
 * Fetches and returns all loot category names from loot-category-tiers.json
 * @returns {Promise<string[]>} Array of category names sorted by priority (highest first)
 */
export async function getLootCategories() {
  // Return cached if available
  if (cachedCategories) {
    return cachedCategories;
  }

  try {
    const response = await fetch('/data/loot-monster/loot-category-tiers.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch loot categories: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract category names and sort by priority (highest first)
    const categories = Object.entries(data)
      .map(([name, config]) => ({
        name,
        priority: config.priority || 0
      }))
      .sort((a, b) => b.priority - a.priority) // Sort descending by priority
      .map(item => item.name);

    // Cache the result
    cachedCategories = categories;

    return categories;
  } catch (error) {
    console.error('Error loading loot categories:', error);
    // Return fallback categories if fetch fails
    return [
      'creature products',
      'craft secondary',
      'craft primary',
      'imbuement',
      'consumables',
      'gem',
      'egg',
      'fusion',
      'Race'
    ];
  }
}

/**
 * Clears the cached categories (useful for testing or hot reload)
 */
export function clearCategoryCache() {
  cachedCategories = null;
}

/**
 * Gets the priority of a specific category
 * @param {string} categoryName - Name of the category
 * @returns {Promise<number>} Priority value (higher = more important)
 */
export async function getCategoryPriority(categoryName) {
  try {
    const response = await fetch('/data/loot-monster/loot-category-tiers.json');
    const data = await response.json();
    return data[categoryName]?.priority || 0;
  } catch (error) {
    console.error('Error getting category priority:', error);
    return 0;
  }
}
