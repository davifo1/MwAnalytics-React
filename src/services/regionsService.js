/**
 * Regions Service
 * Serviço para buscar informações sobre regiões do mapa e seus coletáveis
 */

import { ItemsService } from './itemsService';

/**
 * Busca todas as regiões do regions.xml
 */
export async function getRegions() {
  try {
    const response = await fetch('/api/map/regions');
    if (!response.ok) {
      throw new Error('Erro ao buscar regiões');
    }
    const data = await response.json();
    return data.regions || [];
  } catch (error) {
    console.error('Erro ao buscar regiões:', error);
    throw error;
  }
}

/**
 * Busca todos os items coletáveis do items.xml
 * Usa o mesmo método que MapItemsPage
 */
export async function getCollectibleItems() {
  try {
    console.log('Loading collectible items for regions - started');

    // Carrega todos os items usando ItemsService
    const allItems = await ItemsService.loadItemsFromXML('all');

    // Filtra apenas items com categories contendo 'collectible'
    const collectibleItems = allItems.filter(item => {
      if (!item.categories) return false;
      const cats = item.categories.split(';').map(c => c.trim());
      return cats.includes('collectible');
    });

    // Mapeia para o formato esperado
    const items = collectibleItems.map(item => ({
      id: parseInt(item.id),
      name: item.name,
      tier: item.tier || 'basic'
    }));

    console.log('Loading collectible items for regions - completed:', items.length);
    return items;
  } catch (error) {
    console.error('Erro ao buscar items coletáveis:', error);
    throw error;
  }
}

/**
 * Busca a análise de coletáveis por região
 */
export async function getCollectiblesByRegion() {
  try {
    console.log('[RegionsService] getCollectiblesByRegion - started');

    // Primeiro busca os items coletáveis
    const collectibles = await getCollectibleItems();
    console.log('[RegionsService] Found collectibles:', collectibles.length);

    if (collectibles.length === 0) {
      console.log('[RegionsService] No collectibles found, returning empty');
      return { regions: [] };
    }

    // Monta lista de IDs para buscar no mapa
    const itemIds = collectibles.map(item => item.id).join(',');
    console.log('[RegionsService] Analyzing map with IDs:', itemIds.substring(0, 100) + '...');

    // Busca análise por região
    const url = `/api/map/analyze-by-region?ids=${itemIds}`;
    console.log('[RegionsService] Calling API:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Erro ao analisar mapa por região');
    }
    const data = await response.json();
    console.log('[RegionsService] API Response:', data);

    // Transformar formato da API para o formato esperado
    // API retorna: { results: { itemId: { regionName: count } } }
    // Precisamos: { regions: [{ region: name, items: [{id, name, count, tier}] }] }

    if (!data.results) {
      console.log('[RegionsService] No results in API response');
      return { regions: [] };
    }

    // Criar um mapa de região -> items
    const regionMap = new Map();

    // Iterar sobre cada item nos resultados
    Object.entries(data.results).forEach(([itemIdStr, regionCounts]) => {
      const itemId = parseInt(itemIdStr);
      const collectibleInfo = collectibles.find(c => c.id === itemId);

      if (!collectibleInfo) {
        console.log('[RegionsService] Item not found in collectibles:', itemId);
        return;
      }

      // Para cada região onde este item aparece
      Object.entries(regionCounts).forEach(([regionName, count]) => {
        if (!regionMap.has(regionName)) {
          regionMap.set(regionName, []);
        }

        regionMap.get(regionName).push({
          id: itemId,
          name: collectibleInfo.name,
          count: count,
          tier: collectibleInfo.tier || 'basic'
        });
      });
    });

    // Converter mapa para array de regiões
    const regions = Array.from(regionMap.entries()).map(([regionName, items]) => {
      // Calcular resumo por tier
      const tierSummary = {
        basic: 0,
        epic: 0,
        legendary: 0
      };

      items.forEach(item => {
        tierSummary[item.tier] = (tierSummary[item.tier] || 0) + item.count;
      });

      const totalItems = items.reduce((sum, item) => sum + item.count, 0);

      return {
        region: regionName,
        items: items,
        tierSummary: tierSummary,
        totalItems: totalItems
      };
    });

    console.log('[RegionsService] Processed regions:', regions.length);
    regions.forEach(r => {
      console.log(`[RegionsService] Region "${r.region}": ${r.totalItems} items (${r.items.length} unique)`);
    });

    return { regions };
  } catch (error) {
    console.error('[RegionsService] Error in getCollectiblesByRegion:', error);
    throw error;
  }
}

/**
 * Busca informações completas de uma região específica
 */
export async function getRegionDetails(regionName) {
  try {
    const [regions, analysis] = await Promise.all([
      getRegions(),
      getCollectiblesByRegion()
    ]);

    const regionInfo = regions.find(r => r.name === regionName);
    const regionAnalysis = analysis.regions?.find(r => r.region === regionName);

    return {
      ...regionInfo,
      ...regionAnalysis
    };
  } catch (error) {
    console.error('Erro ao buscar detalhes da região:', error);
    throw error;
  }
}
