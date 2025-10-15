import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { parseRequestBody, sendJson, sendError } from '../helpers/requestHelpers.js';

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

/**
 * Items routes
 */
export function itemsRoutes(server) {
  // API endpoint to serve items.xml from itemsPath
  server.middlewares.use('/data/items.xml', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const itemsXmlPath = getItemsXmlPath();

      if (!fs.existsSync(itemsXmlPath)) {
        console.error(`Items XML not found at: ${itemsXmlPath}`);
        return sendError(res, 404, `Items XML not found at: ${itemsXmlPath}`);
      }

      const xmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');

      res.setHeader('Content-Type', 'application/xml');
      res.statusCode = 200;
      res.end(xmlContent);
    } catch (error) {
      console.error('Error loading items.xml:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to update lootFrom attribute in items.xml
  server.middlewares.use('/api/items/update-loot-from', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { updates } = await parseRequestBody(req);

      if (!Array.isArray(updates)) {
        return sendError(res, 400, 'updates must be an array');
      }

      // Criar mapa para lookup rápido: itemName -> lootFrom
      const updatesMap = new Map();
      updates.forEach(({ name, lootFrom }) => {
        updatesMap.set(name, lootFrom);
      });

      console.log(`[API] Processing lootFrom updates for ${updatesMap.size} items`);

      // Ler items.xml
      const itemsXmlPath = getItemsXmlPath();
      let xmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');
      xmlContent = xmlContent.replace(/^\uFEFF/, ''); // Remove BOM

      let updatedCount = 0;

      // Regex para match de blocos <item>...</item>
      // Captura: tag de abertura, conteúdo, tag de fechamento
      const itemBlockRegex = /<item\s+([^>]*?)>([\s\S]*?)<\/item>/g;

      xmlContent = xmlContent.replace(itemBlockRegex, (match, itemAttrs, itemContent) => {
        // Extrair o name do item
        const nameMatch = itemAttrs.match(/name=["']([^"']+)["']/);
        if (!nameMatch) return match;

        const itemName = nameMatch[1];

        // Verificar se este item precisa de update
        if (!updatesMap.has(itemName)) {
          return match; // Não modificar
        }

        const newLootFrom = updatesMap.get(itemName);

        // Regex para encontrar atributo lootFrom existente
        const lootFromRegex = /<attribute\s+key=["']lootFrom["']\s+value=["']([^"']*)["']\s*\/>/;

        let updatedContent = itemContent;

        if (lootFromRegex.test(itemContent)) {
          // Atualizar lootFrom existente
          updatedContent = itemContent.replace(
            lootFromRegex,
            `<attribute key="lootFrom" value="${newLootFrom}" />`
          );
        } else {
          // Adicionar novo lootFrom no início do conteúdo
          updatedContent = `\n\t\t<attribute key="lootFrom" value="${newLootFrom}" />${itemContent}`;
        }

        updatedCount++;
        return `<item ${itemAttrs}>${updatedContent}</item>`;
      });

      // Salvar o XML atualizado
      fs.writeFileSync(itemsXmlPath, xmlContent, 'utf-8');

      console.log(`[API] Updated lootFrom for ${updatedCount} items`);

      sendJson(res, 200, {
        success: true,
        updatedCount,
        message: `Updated lootFrom for ${updatedCount} items`
      });
    } catch (error) {
      console.error('Error updating lootFrom:', error);
      sendError(res, 500, error.message);
    }
  });
}
