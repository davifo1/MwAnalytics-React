/**
 * Script de teste para o MovementsService
 * Para testar, adicione temporariamente um botão ou execute no console
 */

import { loadEquipMovements, findMovementsBySlot, findMovementsWithLevel } from './movementsService';

export async function testMovementsService() {
  console.log('🧪 Testando MovementsService...');

  try {
    // Carregar todos os Equip Movements
    const equipMovements = await loadEquipMovements();

    console.log(`✅ Total de Equip Movements carregados: ${equipMovements.length}`);

    // Mostrar alguns exemplos
    if (equipMovements.length > 0) {
      console.log('\n📋 Primeiros 10 movements:');
      equipMovements.slice(0, 10).forEach((movement, index) => {
        let text = `${index + 1}. Item ID: ${movement.itemid}, Slot: ${movement.slot}`;
        if (movement.level) {
          text += `, Level: ${movement.level}`;
        }
        console.log(text);
      });
    }

    // Estatísticas por slot
    const slotStats = {};
    equipMovements.forEach(movement => {
      slotStats[movement.slot] = (slotStats[movement.slot] || 0) + 1;
    });

    console.log('\n📊 Estatísticas por Slot:');
    Object.entries(slotStats).forEach(([slot, count]) => {
      console.log(`   ${slot}: ${count} items`);
    });

    // Items com level requirement
    const itemsWithLevel = findMovementsWithLevel(equipMovements, 1);
    console.log(`\n🎯 Items com level requirement: ${itemsWithLevel.length}`);

    if (itemsWithLevel.length > 0) {
      console.log('   Primeiros 5 items com level:');
      itemsWithLevel.slice(0, 5).forEach(movement => {
        console.log(`   - Item ${movement.itemid}: Level ${movement.level} (${movement.slot})`);
      });
    }

    // Procurar items de um slot específico
    const headItems = findMovementsBySlot(equipMovements, 'head');
    console.log(`\n🎩 Items para slot "head": ${headItems.length}`);
    if (headItems.length > 0) {
      console.log('   Primeiros 5:');
      headItems.slice(0, 5).forEach(movement => {
        let text = `   - Item ${movement.itemid}`;
        if (movement.level) {
          text += ` (Level ${movement.level})`;
        }
        console.log(text);
      });
    }

    return equipMovements;
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return null;
  }
}

// Exportar para uso no console do browser
if (typeof window !== 'undefined') {
  window.testMovementsService = testMovementsService;
}