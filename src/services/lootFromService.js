/**
 * Service otimizado para buscar lootFrom de items específicos diretamente do XML
 */

class LootFromService {
  static xmlCache = null;
  static lootFromCache = new Map();

  /**
   * Carrega o XML uma única vez e mantém em cache
   */
  static async loadXML() {
    if (!this.xmlCache) {
      try {
        const response = await fetch('/data/items.xml');
        this.xmlCache = await response.text();
        console.log('LootFromService: XML loaded and cached');
      } catch (error) {
        console.error('Error loading XML for lootFrom:', error);
        this.xmlCache = '';
      }
    }
    return this.xmlCache;
  }

  /**
   * Busca o lootFrom de um item específico usando regex
   * @param {string} itemName - Nome do item a buscar
   * @returns {string|null} - Valor do lootFrom ou null se não encontrado
   */
  static async getLootFrom(itemName) {
    if (!itemName) return null;

    // Verifica cache primeiro
    const cacheKey = itemName.toLowerCase();
    if (this.lootFromCache.has(cacheKey)) {
      return this.lootFromCache.get(cacheKey);
    }

    // Carrega XML se necessário
    const xml = await this.loadXML();
    if (!xml) return null;

    // Escapa caracteres especiais para uso em regex
    const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Cria regex para encontrar o item e seus atributos
    // Busca por item com name="itemName" e depois busca o lootFrom dentro dele
    const itemRegex = new RegExp(
      `<item[^>]+name="${escapedName}"[^>]*>([\\s\\S]*?)(?=<\\/item>|<item\\s)`,
      'i'
    );

    const itemMatch = xml.match(itemRegex);
    if (!itemMatch) {
      // Tenta busca mais flexível sem case sensitive
      const flexibleRegex = new RegExp(
        `<item[^>]+name="[^"]*${escapedName}[^"]*"[^>]*>([\\s\\S]*?)(?=<\\/item>|<item\\s)`,
        'i'
      );
      const flexibleMatch = xml.match(flexibleRegex);
      if (!flexibleMatch) {
        this.lootFromCache.set(cacheKey, null);
        return null;
      }
      itemMatch[1] = flexibleMatch[1];
    }

    // Extrai o lootFrom do conteúdo do item
    const lootFromRegex = /<attribute\s+key="lootFrom"\s+value="([^"]+)"/;
    const lootFromMatch = itemMatch[1].match(lootFromRegex);

    const lootFrom = lootFromMatch ? lootFromMatch[1] : null;

    // Armazena no cache
    this.lootFromCache.set(cacheKey, lootFrom);

    return lootFrom;
  }

  /**
   * Busca lootFrom para múltiplos items de uma vez
   * @param {Array<string>} itemNames - Lista de nomes de items
   * @returns {Map<string, string>} - Map com itemName -> lootFrom
   */
  static async getLootFromMultiple(itemNames) {
    const results = new Map();

    // Carrega XML uma vez para todos
    await this.loadXML();

    // Busca cada item
    for (const itemName of itemNames) {
      const lootFrom = await this.getLootFrom(itemName);
      if (lootFrom) {
        results.set(itemName.toLowerCase(), lootFrom);
      }
    }

    return results;
  }

  /**
   * Limpa o cache (útil se o XML for atualizado)
   */
  static clearCache() {
    this.xmlCache = null;
    this.lootFromCache.clear();
  }
}

export default LootFromService;
export { LootFromService };