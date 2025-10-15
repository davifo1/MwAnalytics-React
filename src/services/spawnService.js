// Service to load and parse world-spawn.xml file

/**
 * Loads the world-spawn.xml file and returns monster spawn counts
 * @returns {Promise<Map<string, number>>} Map with monster names (lowercase) as keys and spawn counts as values
 */
export async function loadSpawnCounts() {
  try {
    // Load spawn XML from API endpoint (uses absolute path from settings.json)
    const spawnResponse = await fetch('/api/spawn');
    if (!spawnResponse.ok) {
      const errorData = await spawnResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Failed to load world-spawn.xml:', errorData);
      throw new Error(`Failed to load world-spawn.xml: ${errorData.error}`);
    }

    const xmlText = await spawnResponse.text();

    // Use regex to find all monster spawns
    // Pattern: <monster name="MonsterName" ... />
    const monsterRegex = /<monster\s+name="([^"]+)"\s+[^>]*\/>/g;

    const spawnCounts = new Map();
    let match;

    while ((match = monsterRegex.exec(xmlText)) !== null) {
      const monsterName = match[1].toLowerCase();
      const currentCount = spawnCounts.get(monsterName) || 0;
      spawnCounts.set(monsterName, currentCount + 1);
    }

    console.log(`Loaded spawn counts for ${spawnCounts.size} unique monsters`);
    return spawnCounts;
  } catch (error) {
    console.error('Error loading spawn counts:', error);
    return new Map();
  }
}

/**
 * Gets the spawn count for a specific monster
 * @param {string} monsterName - The name of the monster
 * @param {Map<string, number>} spawnCounts - The spawn counts map
 * @returns {number} The spawn count for the monster, or 0 if not found
 */
export function getSpawnCount(monsterName, spawnCounts) {
  if (!monsterName || !spawnCounts) return 0;
  return spawnCounts.get(monsterName.toLowerCase()) || 0;
}
