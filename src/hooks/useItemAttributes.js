import { useState, useEffect } from 'react';

/**
 * Hook para carregar e processar item_attributes.json
 * Retorna as categorias e um mapa de atributo -> categoria
 */
export const useItemAttributes = () => {
  const [attributesData, setAttributesData] = useState(null);
  const [attributeToCategory, setAttributeToCategory] = useState(new Map());
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttributes = async () => {
      try {
        const response = await fetch('/data/item_attributes.json');
        const data = await response.json();

        setAttributesData(data);

        // Criar mapa: atributo → categoria
        const attrMap = new Map();
        const categories = Object.keys(data);

        categories.forEach(category => {
          const attributes = data[category];
          if (Array.isArray(attributes)) {
            attributes.forEach(attr => {
              if (attr.name) {
                attrMap.set(attr.name, category);
              }
            });
          }
        });

        setAttributeToCategory(attrMap);
        setCategoryOrder(categories);

        console.log(`Loaded ${attrMap.size} attribute definitions from ${categories.length} categories`);
      } catch (error) {
        console.error('Error loading item_attributes.json:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAttributes();
  }, []);

  /**
   * Retorna a categoria de um atributo
   */
  const getCategoryForAttribute = (attributeName) => {
    return attributeToCategory.get(attributeName) || null;
  };

  /**
   * Agrupa os atributos de um item por categoria
   * @param {Object} itemAttributes - Objeto com os atributos do item
   * @param {Array} excludeAttributes - Lista de atributos a excluir do agrupamento
   * @returns {Object} - Objeto com categorias como chave e array de [key, value]
   */
  const groupAttributesByCategory = (itemAttributes, excludeAttributes = []) => {
    const grouped = {};
    const unmapped = [];

    Object.entries(itemAttributes || {}).forEach(([key, value]) => {
      // Pular atributos excluídos
      if (excludeAttributes.includes(key)) {
        return;
      }

      const category = getCategoryForAttribute(key);

      if (category) {
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push([key, value]);
      } else {
        // Atributo não mapeado
        unmapped.push([key, value]);
      }
    });

    // Adicionar "other" se houver atributos não mapeados
    if (unmapped.length > 0) {
      grouped['other'] = unmapped;
    }

    return grouped;
  };

  /**
   * Retorna a informação completa de um atributo
   */
  const getAttributeInfo = (attributeName) => {
    const category = getCategoryForAttribute(attributeName);
    if (!category || !attributesData) return null;

    const categoryData = attributesData[category];
    if (!Array.isArray(categoryData)) return null;

    return categoryData.find(attr => attr.name === attributeName);
  };

  /**
   * Retorna o nome legível de uma categoria
   */
  const getCategoryLabel = (categoryKey) => {
    const labels = {
      general: 'General',
      equipment: 'Equipment',
      legacy: 'Legacy',
      absorption: 'Absorption',
      basic: 'Basic',
      healthMana: 'Health & Mana',
      regeneration: 'Regeneration',
      specialConversion: 'Special Conversion',
      critical: 'Critical',
      movementSpeed: 'Movement Speed',
      textWriting: 'Text & Writing',
      transformation: 'Transformation',
      time: 'Time',
      magicField: 'Magic Field',
      movementBlocking: 'Movement & Blocking',
      location: 'Location',
      special: 'Special',
      other: 'Other Attributes'
    };

    return labels[categoryKey] || categoryKey;
  };

  return {
    attributesData,
    attributeToCategory,
    categoryOrder,
    loading,
    getCategoryForAttribute,
    groupAttributesByCategory,
    getAttributeInfo,
    getCategoryLabel
  };
};
