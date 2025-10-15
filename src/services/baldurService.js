/**
 * Service para ler e processar BuildableItems do arquivo baldur.lua
 */

// Função para parsear o arquivo baldur.lua e extrair BuildableItems
function parseBuildableItems(luaContent) {
  const items = [];

  // Usa uma abordagem linha por linha
  const lines = luaContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('shopModule:addBuildableItem')) {
      try {
        // Extrair o conteúdo entre { e } da chamada
        const startIdx = line.indexOf('{');
        const endIdx = line.lastIndexOf('}');

        if (startIdx === -1 || endIdx === -1) continue;

        const itemContent = line.substring(startIdx + 1, endIdx);

        // Extrair o itemName principal
        const itemNameMatch = itemContent.match(/itemName\s*=\s*"([^"]+)"/);
        if (!itemNameMatch) continue;

        const buildableItem = {
          itemName: itemNameMatch[1],
          build: []
        };

        // Extrair a seção build
        const buildStartIdx = itemContent.indexOf('build = {');
        if (buildStartIdx !== -1) {
          // Encontrar o fechamento correto da build
          let braceCount = 0;
          let buildEndIdx = -1;
          let inBuild = false;

          for (let j = buildStartIdx + 9; j < itemContent.length; j++) {
            if (itemContent[j] === '{') {
              braceCount++;
              inBuild = true;
            } else if (itemContent[j] === '}') {
              if (braceCount === 0 && inBuild) {
                buildEndIdx = j;
                break;
              }
              braceCount--;
            }
          }

          if (buildEndIdx !== -1) {
            const buildContent = itemContent.substring(buildStartIdx + 9, buildEndIdx);

            // Regex para capturar cada item dentro da build
            const buildItemRegex = /\{\s*itemName\s*=\s*"([^"]+)"(?:\s*,\s*count\s*=\s*(\d+))?(?:\s*,\s*fusionLevel\s*=\s*(\d+))?\s*\}/g;

            let buildItemMatch;
            while ((buildItemMatch = buildItemRegex.exec(buildContent)) !== null) {
              const buildItem = {
                itemName: buildItemMatch[1],
                count: buildItemMatch[2] ? parseInt(buildItemMatch[2]) : 1
              };

              // Adicionar fusionLevel apenas se existir
              if (buildItemMatch[3]) {
                buildItem.fusionLevel = parseInt(buildItemMatch[3]);
              }

              buildableItem.build.push(buildItem);
            }
          }
        }

        // Adicionar apenas se tiver itens na build
        if (buildableItem.build.length > 0) {
          items.push(buildableItem);
        }
      } catch (error) {
        console.error('Error parsing buildable item at line', i + 1, ':', error);
      }
    }
  }

  return items;
}

// Função principal para carregar BuildableItems
export async function loadBuildableItems() {
  try {
    // Load baldur.lua from API endpoint (uses absolute path from settings.json)
    const response = await fetch('/api/baldur');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Failed to load baldur.lua:', errorData);
      throw new Error(`Failed to load baldur.lua: ${errorData.error}`);
    }

    const luaContent = await response.text();

    // Parsear os BuildableItems
    const buildableItems = parseBuildableItems(luaContent);

    console.log(`Loaded ${buildableItems.length} buildable items from baldur.lua`);

    return buildableItems;
  } catch (error) {
    console.error('Error loading buildable items:', error);
    return [];
  }
}

// Função para buscar um BuildableItem específico
export function findBuildableItem(items, itemName) {
  return items.find(item =>
    item.itemName.toLowerCase() === itemName.toLowerCase()
  );
}

// Função para obter todos os itens necessários para construir um item (incluindo sub-builds)
export function getAllRequiredItems(items, itemName, visited = new Set()) {
  // Evitar recursão infinita
  if (visited.has(itemName)) {
    return [];
  }
  visited.add(itemName);

  const buildableItem = findBuildableItem(items, itemName);
  if (!buildableItem) {
    return [];
  }

  const requirements = [];

  for (const buildItem of buildableItem.build) {
    // Verificar se este item também é buildable
    const subBuildable = findBuildableItem(items, buildItem.itemName);

    if (subBuildable) {
      // Recursivamente obter os requisitos do sub-item
      const subRequirements = getAllRequiredItems(items, buildItem.itemName, visited);
      requirements.push(...subRequirements.map(req => ({
        ...req,
        count: req.count * buildItem.count
      })));
    } else {
      // Item base, adicionar aos requisitos
      requirements.push({
        itemName: buildItem.itemName,
        count: buildItem.count,
        fusionLevel: buildItem.fusionLevel
      });
    }
  }

  return requirements;
}

// Função para agrupar e somar requisitos duplicados
export function consolidateRequirements(requirements) {
  const consolidated = {};

  for (const req of requirements) {
    const key = req.fusionLevel
      ? `${req.itemName}_fusion${req.fusionLevel}`
      : req.itemName;

    if (consolidated[key]) {
      consolidated[key].count += req.count;
    } else {
      consolidated[key] = { ...req };
    }
  }

  return Object.values(consolidated);
}

// Export do objeto de serviço
const BaldurService = {
  loadBuildableItems,
  findBuildableItem,
  getAllRequiredItems,
  consolidateRequirements
};

export default BaldurService;