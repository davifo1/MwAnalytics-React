/**
 * Script de teste para o BaldurService
 * Para testar, adicione temporariamente um botão ou execute no console
 */

import { loadBuildableItems } from './baldurService';

export async function testBaldurService() {
  console.log('🧪 Testando BaldurService...');

  try {
    // Carregar todos os BuildableItems
    const buildableItems = await loadBuildableItems();

    console.log(`✅ Total de BuildableItems carregados: ${buildableItems.length}`);

    // Mostrar alguns exemplos
    if (buildableItems.length > 0) {
      console.log('\n📋 Primeiros 5 items:');
      buildableItems.slice(0, 5).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.itemName}`);
        console.log('   Build requirements:');
        item.build.forEach(req => {
          let reqText = `   - ${req.itemName} x${req.count}`;
          if (req.fusionLevel) {
            reqText += ` (Fusion Level: ${req.fusionLevel})`;
          }
          console.log(reqText);
        });
      });
    }

    // Procurar por um item específico se existir
    const testItemName = "Boots Of Haste L";
    const specificItem = buildableItems.find(item => item.itemName === testItemName);

    if (specificItem) {
      console.log(`\n🔍 Detalhes de "${testItemName}":`);
      console.log(JSON.stringify(specificItem, null, 2));
    }

    return buildableItems;
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return null;
  }
}

// Exportar para uso no console do browser
if (typeof window !== 'undefined') {
  window.testBaldurService = testBaldurService;
}