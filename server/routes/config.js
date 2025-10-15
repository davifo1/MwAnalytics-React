import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { parseRequestBody, sendJson, sendError } from '../helpers/requestHelpers.js';

// Create require for importing CommonJS modules (settings.js)
const require = createRequire(import.meta.url);

/**
 * Configuration and utility API endpoints
 * Handles various configuration files and external data sources
 */
export function configRoutes(server) {
  // API endpoint to get settings.js
  server.middlewares.use('/api/settings', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;

      sendJson(res, 200, settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      sendError(res, 500, 'Failed to load settings: ' + error.message);
    }
  });

  // API endpoint to save equipment build preferences
  server.middlewares.use('/api/save-equip-build-pref', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const data = await parseRequestBody(req);
      const filePath = path.join(process.cwd(), 'public', 'data', 'equip-build-primary-pref.json');

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

      sendJson(res, 200, { success: true, message: 'Preferences saved successfully' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      sendError(res, 500, 'Failed to save preferences: ' + error.message);
    }
  });

  // API endpoint to get baldur file from baldurPath
  server.middlewares.use('/api/baldur', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const baldurPath = settings.database?.baldurPath;

      if (!baldurPath) {
        throw new Error('baldurPath not found in settings.js');
      }

      if (!fs.existsSync(baldurPath)) {
        console.error(`Baldur file not found at: ${baldurPath}`);
        throw new Error(`Baldur file not found at: ${baldurPath}`);
      }

      const baldurContent = fs.readFileSync(baldurPath, 'utf-8');

      res.setHeader('Content-Type', 'text/plain');
      res.statusCode = 200;
      res.end(baldurContent);
    } catch (error) {
      console.error('Error loading baldur file:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to get movements.xml from movementsPath
  server.middlewares.use('/api/movements', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const movementsPath = settings.database?.movementsPath;

      if (!movementsPath) {
        throw new Error('movementsPath not found in settings.js');
      }

      if (!fs.existsSync(movementsPath)) {
        console.error(`Movements file not found at: ${movementsPath}`);
        throw new Error(`Movements file not found at: ${movementsPath}`);
      }

      const movementsContent = fs.readFileSync(movementsPath, 'utf-8');

      res.setHeader('Content-Type', 'application/xml');
      res.statusCode = 200;
      res.end(movementsContent);
    } catch (error) {
      console.error('Error loading movements file:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to get/set loot category tiers configuration
  server.middlewares.use('/api/loot-category-tiers', async (req, res, next) => {
    const configPath = path.join(process.cwd(), 'public', 'data', 'loot-monster', 'loot-category-tiers.json');

    if (req.method === 'GET') {
      try {
        // Se arquivo não existe, retorna estrutura vazia
        if (!fs.existsSync(configPath)) {
          return sendJson(res, 200, {});
        }

        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        sendJson(res, 200, config);
      } catch (error) {
        console.error('Error reading loot-category-tiers:', error);
        sendError(res, 500, error.message);
      }
    } else if (req.method === 'POST') {
      try {
        const config = await parseRequestBody(req);

        // Garantir que o diretório existe
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Salvar arquivo
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        sendJson(res, 200, { success: true });
      } catch (error) {
        console.error('Error saving loot-category-tiers:', error);
        sendError(res, 500, error.message);
      }
    } else {
      sendError(res, 405, 'Method not allowed');
    }
  });

  // API endpoint to get/set race drops configuration
  server.middlewares.use('/api/race-drops', async (req, res, next) => {
    const configPath = path.join(process.cwd(), 'public', 'data', 'race-drops.json');

    if (req.method === 'GET') {
      try {
        if (!fs.existsSync(configPath)) {
          return sendJson(res, 200, {});
        }

        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        sendJson(res, 200, config);
      } catch (error) {
        console.error('Error reading race-drops:', error);
        sendError(res, 500, error.message);
      }
    } else if (req.method === 'POST') {
      try {
        const config = await parseRequestBody(req);

        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        sendJson(res, 200, { success: true });
      } catch (error) {
        console.error('Error saving race-drops:', error);
        sendError(res, 500, error.message);
      }
    } else {
      sendError(res, 405, 'Method not allowed');
    }
  });

  // API endpoint to get/set base stats role drops configuration
  server.middlewares.use('/api/base-stats-role-drops', async (req, res, next) => {
    const configPath = path.join(process.cwd(), 'public', 'data', 'base-stats-role-drops.json');

    if (req.method === 'GET') {
      try {
        if (!fs.existsSync(configPath)) {
          return sendJson(res, 200, {});
        }

        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        sendJson(res, 200, config);
      } catch (error) {
        console.error('Error reading base-stats-role-drops:', error);
        sendError(res, 500, error.message);
      }
    } else if (req.method === 'POST') {
      try {
        const config = await parseRequestBody(req);

        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        sendJson(res, 200, { success: true });
      } catch (error) {
        console.error('Error saving base-stats-role-drops:', error);
        sendError(res, 500, error.message);
      }
    } else {
      sendError(res, 405, 'Method not allowed');
    }
  });
}
