/**
 * Service para ler e processar Movements do arquivo movements.xml
 */

// Função para parsear o arquivo movements.xml e extrair eventos Equip
function parseEquipMovements(xmlContent) {
  const movements = [];

  // Regex para capturar <movevent event="Equip" ... />
  // Captura todos os atributos dentro da tag
  const equipRegex = /<movevent\s+[^>]*event="Equip"[^>]*\/>/gi;

  let match;
  while ((match = equipRegex.exec(xmlContent)) !== null) {
    const tagContent = match[0];

    try {
      const movement = {};

      // Extrair itemid
      const itemidMatch = tagContent.match(/itemid="(\d+)"/);
      if (itemidMatch) {
        movement.itemid = parseInt(itemidMatch[1]);
      } else {
        // Se não tem itemid, pular
        continue;
      }

      // Extrair level (opcional)
      const levelMatch = tagContent.match(/level="(\d+)"/);
      if (levelMatch) {
        movement.level = parseInt(levelMatch[1]);
      }

      // Extrair slot
      const slotMatch = tagContent.match(/slot="([^"]+)"/);
      if (slotMatch) {
        movement.slot = slotMatch[1];
      }

      // Adicionar apenas se tiver pelo menos itemid e slot
      if (movement.itemid && movement.slot) {
        movements.push(movement);
      }
    } catch (error) {
      console.error('Error parsing equip movement:', error, tagContent);
    }
  }

  return movements;
}

// Função principal para carregar Equip Movements
export async function loadEquipMovements() {
  try {
    // Load movements.xml from API endpoint (uses absolute path from settings.json)
    const response = await fetch('/api/movements');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Failed to load movements.xml:', errorData);
      throw new Error(`Failed to load movements.xml: ${errorData.error}`);
    }

    const xmlContent = await response.text();

    // Parsear os Equip Movements
    const equipMovements = parseEquipMovements(xmlContent);

    console.log(`Loaded ${equipMovements.length} equip movements from movements.xml`);

    return equipMovements;
  } catch (error) {
    console.error('Error loading equip movements:', error);
    return [];
  }
}

// Função para buscar movements por itemid
export function findMovementByItemId(movements, itemId) {
  return movements.filter(movement =>
    movement.itemid === parseInt(itemId)
  );
}

// Função para buscar movements por slot
export function findMovementsBySlot(movements, slot) {
  return movements.filter(movement =>
    movement.slot.toLowerCase() === slot.toLowerCase()
  );
}

// Função para buscar movements com level requirement
export function findMovementsWithLevel(movements, minLevel = 1) {
  return movements.filter(movement =>
    movement.level && movement.level >= minLevel
  );
}

// Export do objeto de serviço
const MovementsService = {
  loadEquipMovements,
  findMovementByItemId,
  findMovementsBySlot,
  findMovementsWithLevel
};

export default MovementsService;