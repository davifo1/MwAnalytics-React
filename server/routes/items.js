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

  // API endpoint to update items valuation based on tier configs
  server.middlewares.use('/api/update-items-valuation', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { lootCategory, tierConfigs, includeSellingPrice } = await parseRequestBody(req);

      // Caminho do items.xml
      const itemsXmlPath = getItemsXmlPath();

      // Ler items.xml
      let xmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');
      xmlContent = xmlContent.replace(/^\uFEFF/, ''); // Remove BOM

      let updatedCount = 0;

      // Processar apenas items com conteúdo (não self-closing)
      // Match items que NÃO terminam com />, ou seja, <item ...> (sem /> no final)
      const itemRegex = /<item\s+([^>]*[^/])>\s*([\s\S]*?)\s*<\/item>/g;

      xmlContent = xmlContent.replace(itemRegex, (match, itemAttrs, itemContent) => {
        // Ignorar items vazios ou sem attributes
        if (!itemContent.trim() || !itemContent.includes('<attribute')) {
          return match;
        }

        // Verificar se tem lootCategory correspondente
        const lootCatMatch = itemContent.match(/<attribute\s+key=["']lootCategory["']\s+value=["']([^"']+)["']/i);

        if (!lootCatMatch || lootCatMatch[1].trim() !== lootCategory) {
          return match; // Não é o lootCategory que queremos
        }

        // Verificar se tem tier
        const tierMatch = itemContent.match(/<attribute\s+key=["']tier["']\s+value=["']([^"']+)["']/i);

        if (!tierMatch) {
          return match; // Não tem tier
        }

        const itemTier = tierMatch[1].toLowerCase();
        const tierConfig = tierConfigs[itemTier];

        if (!tierConfig) {
          return match; // Tier não encontrado no config
        }

        // Extrair todos os atributos
        const attributeRegex = /<attribute\s+key=["']([^"']+)["']\s+value=["']([^"']*)["']\s*\/>/g;
        const attributes = new Map();
        let attrMatch;

        while ((attrMatch = attributeRegex.exec(itemContent)) !== null) {
          attributes.set(attrMatch[1], attrMatch[2]);
        }

        // Atualizar/adicionar valuation
        attributes.set('valuation', String(tierConfig.valuation));

        // Atualizar/adicionar sellingPrice se necessário
        if (includeSellingPrice) {
          attributes.set('sellingPrice', String(tierConfig.sellingPrice));
        }

        // Atualizar/adicionar monsterDropStage
        if (tierConfig.monsterDropStage) {
          attributes.set('monsterDropStage', String(tierConfig.monsterDropStage));
        } else {
          // Remover monsterDropStage se vazio
          attributes.delete('monsterDropStage');
        }

        // Separar atributos: valuation, sellingPrice e monsterDropStage vão para o final
        const regularAttrs = [];
        const specialAttrs = [];

        for (const [key, value] of attributes) {
          if (key === 'valuation' || key === 'sellingPrice' || key === 'monsterDropStage') {
            specialAttrs.push({ key, value });
          } else {
            regularAttrs.push({ key, value });
          }
        }

        // Ordenar atributos especiais (valuation, sellingPrice, monsterDropStage)
        const order = { 'valuation': 1, 'sellingPrice': 2, 'monsterDropStage': 3 };
        specialAttrs.sort((a, b) => {
          return (order[a.key] || 999) - (order[b.key] || 999);
        });

        // Reconstruir o item com atributos ordenados
        const allAttrs = [...regularAttrs, ...specialAttrs];
        const newContent = allAttrs.map(attr =>
          `    <attribute key="${attr.key}" value="${attr.value}"/>`
        ).join('\n');

        updatedCount++;

        return `<item ${itemAttrs}>\n${newContent}\n  </item>`;
      });

      // Salvar items.xml atualizado
      fs.writeFileSync(itemsXmlPath, xmlContent, 'utf-8');

      sendJson(res, 200, {
        success: true,
        updatedCount
      });
    } catch (error) {
      console.error('Error processing update-items-valuation:', error);
      sendError(res, 500, error.message);
    }
  });

  // API endpoint to bulk add/edit attribute
  server.middlewares.use('/api/items/bulk-add-attribute', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { itemIds, attributeKey, attributeValue } = await parseRequestBody(req);

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return sendError(res, 400, 'itemIds must be a non-empty array');
      }

      if (!attributeKey || !attributeValue) {
        return sendError(res, 400, 'attributeKey and attributeValue are required');
      }

      console.log(`[API] Bulk adding/editing attribute "${attributeKey}" for ${itemIds.length} items`);

      // Read items.xml
      const itemsXmlPath = getItemsXmlPath();
      let xmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');
      xmlContent = xmlContent.replace(/^\uFEFF/, ''); // Remove BOM

      let updatedCount = 0;
      const itemIdsSet = new Set(itemIds.map(id => String(id)));

      // Regex for matching <item>...</item> blocks
      const itemBlockRegex = /<item\s+([^>]*?)>([\s\S]*?)<\/item>/g;

      xmlContent = xmlContent.replace(itemBlockRegex, (match, itemAttrs, itemContent) => {
        // Extract item id
        const idMatch = itemAttrs.match(/id=["']([^"']+)["']/);
        if (!idMatch) return match;

        const itemId = idMatch[1];

        // Check if this item is in the list
        if (!itemIdsSet.has(itemId)) {
          return match; // Don't modify
        }

        // Check if attribute already exists
        const attributeRegex = new RegExp(
          `<attribute\\s+key=["']${attributeKey}["']\\s+value=["']([^"']*)["']\\s*\\/>`,
          'i'
        );

        let updatedContent = itemContent;

        if (attributeRegex.test(itemContent)) {
          // Update existing attribute
          updatedContent = itemContent.replace(
            attributeRegex,
            `<attribute key="${attributeKey}" value="${attributeValue}"/>`
          );
        } else {
          // Add new attribute preserving indentation
          // Find any existing attribute to detect indentation pattern
          const attributeMatch = itemContent.match(/\n(\s+)<attribute/);
          const indent = attributeMatch ? attributeMatch[1] : '    ';

          // Find the position right after the last attribute tag
          const lastAttributeIndex = itemContent.lastIndexOf('/>');
          if (lastAttributeIndex !== -1) {
            // Insert new attribute right after the last attribute
            const beforeLast = itemContent.substring(0, lastAttributeIndex + 2);
            const afterLast = itemContent.substring(lastAttributeIndex + 2);
            updatedContent = beforeLast + `\n${indent}<attribute key="${attributeKey}" value="${attributeValue}"/>` + afterLast;
          } else {
            // No attributes yet, add as first attribute
            updatedContent = `\n${indent}<attribute key="${attributeKey}" value="${attributeValue}"/>\n  `;
          }
        }

        updatedCount++;
        return `<item ${itemAttrs}>${updatedContent}</item>`;
      });

      // Save updated XML
      fs.writeFileSync(itemsXmlPath, xmlContent, 'utf-8');

      console.log(`[API] Bulk added/edited attribute for ${updatedCount} items`);

      sendJson(res, 200, {
        success: true,
        updatedCount,
        message: `Updated ${updatedCount} item(s)`
      });
    } catch (error) {
      console.error('Error bulk adding/editing attribute:', error);
      sendError(res, 500, error.message);
    }
  });

  // API endpoint to bulk remove attribute
  server.middlewares.use('/api/items/bulk-remove-attribute', async (req, res, next) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const { itemIds, attributeKey } = await parseRequestBody(req);

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return sendError(res, 400, 'itemIds must be a non-empty array');
      }

      if (!attributeKey) {
        return sendError(res, 400, 'attributeKey is required');
      }

      console.log(`[API] Bulk removing attribute "${attributeKey}" for ${itemIds.length} items`);

      // Read items.xml
      const itemsXmlPath = getItemsXmlPath();
      let xmlContent = fs.readFileSync(itemsXmlPath, 'utf-8');
      xmlContent = xmlContent.replace(/^\uFEFF/, ''); // Remove BOM

      let updatedCount = 0;
      const itemIdsSet = new Set(itemIds.map(id => String(id)));

      // Regex for matching <item>...</item> blocks
      const itemBlockRegex = /<item\s+([^>]*?)>([\s\S]*?)<\/item>/g;

      xmlContent = xmlContent.replace(itemBlockRegex, (match, itemAttrs, itemContent) => {
        // Extract item id
        const idMatch = itemAttrs.match(/id=["']([^"']+)["']/);
        if (!idMatch) return match;

        const itemId = idMatch[1];

        // Check if this item is in the list
        if (!itemIdsSet.has(itemId)) {
          return match; // Don't modify
        }

        // Remove attribute if it exists
        const attributeRegex = new RegExp(
          `\\s*<attribute\\s+key=["']${attributeKey}["']\\s+value=["'][^"']*["']\\s*\\/>\\s*`,
          'gi'
        );

        const updatedContent = itemContent.replace(attributeRegex, '');

        // Only count if something was actually removed
        if (updatedContent !== itemContent) {
          updatedCount++;
        }

        return `<item ${itemAttrs}>${updatedContent}</item>`;
      });

      // Save updated XML
      fs.writeFileSync(itemsXmlPath, xmlContent, 'utf-8');

      console.log(`[API] Bulk removed attribute from ${updatedCount} items`);

      sendJson(res, 200, {
        success: true,
        updatedCount,
        message: `Updated ${updatedCount} item(s)`
      });
    } catch (error) {
      console.error('Error bulk removing attribute:', error);
      sendError(res, 500, error.message);
    }
  });
}
