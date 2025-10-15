/**
 * Parser para arquivo XML de items
 */
export class ItemsService {
  static async loadItemsFromXML(viewType = 'all') {
    console.log('ItemsService.loadItemsFromXML - fetch starting for viewType:', viewType);
    try {
      // Carrega o arquivo XML
      const response = await fetch('/data/items.xml');
      const xmlText = await response.text();
      console.log('ItemsService.loadItemsFromXML - XML fetched, size:', xmlText.length);

      const items = [];
      const processedIds = new Set(); // Para evitar duplicatas

      // Divide o XML em blocos de items para processar atributos
      const itemBlocks = xmlText.split(/<item\s+/).slice(1);

      for (const block of itemBlocks) {
        // Extrai atributos da tag item
        const idMatch = block.match(/\bid="(\d+)"/);
        const fromIdMatch = block.match(/\bfromid="(\d+)"/);
        const toIdMatch = block.match(/\btoid="(\d+)"/);
        const nameMatch = block.match(/\bname="([^"]+)"/);
        const articleMatch = block.match(/\barticle="([^"]+)"/);
        const pluralMatch = block.match(/\bplural="([^"]+)"/);

        // Procura pelos atributos dentro do bloco do item
        const endOfItemTag = block.indexOf('>');
        const itemContent = block.substring(endOfItemTag + 1);

        // Captura TODOS os atributos como um objeto
        const attributes = {};
        const attributeRegex = /<attribute\s+key="([^"]+)"\s+value="([^"]+)"/g;
        let attrMatch;
        while ((attrMatch = attributeRegex.exec(itemContent)) !== null) {
          const key = attrMatch[1];
          const value = attrMatch[2];
          // Converte valores numéricos quando apropriado
          if (!isNaN(value) && value !== '') {
            attributes[key] = Number(value);
          } else {
            attributes[key] = value;
          }
        }

        // Extrai valores específicos para colunas
        const weight = attributes.weight || null;
        const categories = attributes.categories ? attributes.categories.replace(/;$/, '') : null;
        const slotType = attributes.slotType || null;
        const tier = attributes.tier || null;
        const sellPrice = attributes.sellingPrice || null;
        const valuation = attributes.valuation || null;

        // Aplica filtro baseado no viewType
        const shouldInclude = () => {
          switch(viewType) {
            case 'equipment':
              return slotType && slotType.trim() !== '' && tier && tier.trim() !== '';
            case 'monster-loot':
              return attributes.lootCategory && attributes.lootCategory !== '';
            default:
              return true;
          }
        };

        if (nameMatch && shouldInclude()) {
          const name = nameMatch[1];
          const baseItem = {
            id: null,
            name: name,
            article: articleMatch ? articleMatch[1] : null,
            plural: pluralMatch ? pluralMatch[1] : null,
            weight: weight,
            categories: categories,
            slotType: slotType,
            tier: tier,
            sellPrice: sellPrice,
            valuation: valuation,
            isMonsterLoot: attributes.lootCategory && attributes.lootCategory !== '', // Add flag for monster loot items
            attributes: attributes // Todos os atributos para detalhes
          };

          if (idMatch) {
            const id = idMatch[1];
            if (!processedIds.has(id)) {
              items.push({
                ...baseItem,
                id: id
              });
              processedIds.add(id);
            }
          } else if (fromIdMatch && toIdMatch) {
            // Para items com range de IDs
            const from = parseInt(fromIdMatch[1]);
            const to = parseInt(toIdMatch[1]);
            for (let j = from; j <= to; j++) {
              const id = j.toString();
              if (!processedIds.has(id)) {
                items.push({
                  ...baseItem,
                  id: id
                });
                processedIds.add(id);
              }
            }
          }
        }
      }

      // Ordena por ID numérico
      items.sort((a, b) => parseInt(a.id) - parseInt(b.id));

      console.log(`Total de items carregados (${viewType}): ${items.length}`);
      if (viewType === 'equipment') {
        console.log(`Items de equipamento com slot e tier: ${items.length}`);
      } else if (viewType === 'monster-loot') {
        console.log(`Items de monster loot: ${items.length}`);
      } else {
        console.log(`Items com weight: ${items.filter(i => i.weight > 0).length}`);
      }
      return items;
    } catch (error) {
      console.error('Erro ao carregar items:', error);
      // Retorna dados de exemplo se falhar
      return this.getMockItems();
    }
  }

  static getMockItems() {
    // Dados de exemplo baseados no XML real
    return [
      { id: '1', name: 'water' },
      { id: '2', name: 'blood' },
      { id: '3', name: 'beer' },
      { id: '4', name: 'slime' },
      { id: '5', name: 'lemonade' },
      { id: '6', name: 'milk' },
      { id: '7', name: 'manafluid' },
      { id: '10', name: 'lifefluid' },
      { id: '11', name: 'oil' },
      { id: '13', name: 'urine' },
      { id: '14', name: 'coconut milk' },
      { id: '15', name: 'wine' },
      { id: '19', name: 'mud' },
      { id: '21', name: 'fruit juice' },
      { id: '26', name: 'lava' },
      { id: '27', name: 'rum' },
      { id: '28', name: 'swamp' },
      { id: '35', name: 'tea' },
      { id: '43', name: 'mead' },
      { id: '100', name: 'void' },
      { id: '101', name: 'earth' },
      { id: '103', name: 'dirt' },
      { id: '104', name: 'sand' },
      { id: '106', name: 'grass' },
      { id: '194', name: 'dirt' },
      { id: '231', name: 'sand' },
      { id: '280', name: 'dirt floor' },
      { id: '293', name: 'grass' },
      { id: '294', name: 'pitfall' },
      { id: '354', name: 'muddy floor' },
      { id: '368', name: 'earth ground' },
      { id: '383', name: 'hole' },
    ];
  }
}