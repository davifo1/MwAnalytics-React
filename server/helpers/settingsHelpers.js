import path from 'path';
import { createRequire } from 'module';

/**
 * Helper functions for settings management
 */

const require = createRequire(import.meta.url);
let cachedSettings = null;

/**
 * Load settings from settings.js
 */
export function loadSettings() {
  if (!cachedSettings) {
    const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
    // Dynamic import for ES module
    cachedSettings = require(settingsPath).default;
  }
  return cachedSettings;
}

/**
 * Get monsters path from settings
 */
export function getMonstersPath() {
  const settings = loadSettings();
  return settings.database.monstersPath;
}

/**
 * Clear settings cache (useful for testing)
 */
export function clearSettingsCache() {
  cachedSettings = null;
}
