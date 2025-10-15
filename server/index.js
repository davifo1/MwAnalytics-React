/**
 * API Server Plugin - Modular Structure
 * This is the new refactored API structure
 */

import { utilsRoutes } from './routes/utils.js';
import { monstersRoutes } from './routes/monsters.js';
import { itemsRoutes } from './routes/items.js';
import { mapRoutes } from './routes/map.js';
import { configRoutes } from './routes/config.js';

/**
 * Main API plugin
 * Registers all route modules
 */
export function apiPlugin() {
  return {
    name: 'api-server-modular',
    configureServer(server) {
      console.log('🚀 Initializing modular API structure');

      // Register route modules
      utilsRoutes(server);
      monstersRoutes(server);
      itemsRoutes(server);
      mapRoutes(server);
      configRoutes(server);

      console.log('✅ Modular API structure initialized');
    }
  };
}
