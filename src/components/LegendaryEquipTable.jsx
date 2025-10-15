import React, { useEffect, useState, Fragment, forwardRef, useImperativeHandle } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import MonsterInputChip from './MonsterInputChip';
import { calculateLegendaryDropMetrics, LEGENDARY_DROP_CONSTANTS } from '@/utils/legendaryDropCalculator';
import { toast } from 'sonner';

const LegendaryEquipTable = forwardRef(({ items, buildableItems, allMonsters }, ref) => {
  const [tableData, setTableData] = useState([]);
  const [monsterSelections, setMonsterSelections] = useState({});

  // Inicializar seleções de monstros com auto-detect
  useEffect(() => {
    if (!allMonsters || allMonsters.length === 0) return;

    const initialSelections = {};
    tableData.forEach(item => {
      if (item.primaryMaterial) {
        const key = `${item.id}_${item.primaryMaterial.itemName}`;
        // Auto-detect monsters for this material
        const monstersWithDrop = findMonstersWithItem(allMonsters, item.primaryMaterial.itemName);
        if (monstersWithDrop.length > 0) {
          initialSelections[key] = monstersWithDrop;
        }
      }
    });

    setMonsterSelections(initialSelections);
  }, [tableData, allMonsters]);

  // Atualizar seleção de monstros e XML
  const handleMonsterChange = async (itemId, primaryMaterialName, newMonsters) => {
    const key = `${itemId}_${primaryMaterialName}`;
    const oldMonsters = monsterSelections[key] || [];

    // Identificar monstros adicionados e removidos
    const addedMonsters = newMonsters.filter(
      newM => !oldMonsters.some(oldM => oldM.name === newM.name)
    );
    const removedMonsters = oldMonsters.filter(
      oldM => !newMonsters.some(newM => newM.name === oldM.name)
    );

    // Atualizar UI imediatamente
    setMonsterSelections(prev => ({
      ...prev,
      [key]: newMonsters
    }));

    // IMPORTANTE: Buscar mapeamento de nomes para arquivos
    const allMonsterNames = [...addedMonsters, ...removedMonsters].map(m => m.name);
    const nameToFileResponse = await fetch('/api/monsters/name-to-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monsterNames: allMonsterNames })
    });

    if (!nameToFileResponse.ok) {
      toast.error('Failed to fetch monster filename mappings');
      return;
    }

    const { results: nameToFileMap } = await nameToFileResponse.json();

    // IMPORTANTE: Coletar fileNames dos monstros afetados para recalcular unlock levels depois
    const affectedFileNames = new Set();

    // Processar adições
    for (const monster of addedMonsters) {
      try {
        const fileName = nameToFileMap[monster.name];

        if (!fileName) {
          toast.error(`Monster file not found for: ${monster.name}`);
          continue;
        }

        affectedFileNames.add(fileName);

        // Calcular chance baseada no power
        const metrics = calculateLegendaryDropMetrics(monster.power || 0);
        const chance = Math.round(metrics.adjustedDropChance * 1000);

        const response = await fetch('/api/monsters/update-loot-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            itemName: primaryMaterialName.toLowerCase(),
            chance: chance,
            origin: 'craft primary',
            source: 'equipBuildPrimary',
            action: 'add'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add item');
        }

        console.log(`Added ${primaryMaterialName} to ${monster.name}`);
      } catch (error) {
        console.error(`Error adding item to ${monster.name}:`, error);
        toast.error(`Failed to add item to ${monster.name}`);
      }
    }

    // Processar remoções
    for (const monster of removedMonsters) {
      try {
        const fileName = nameToFileMap[monster.name];

        if (!fileName) {
          toast.error(`Monster file not found for: ${monster.name}`);
          continue;
        }

        affectedFileNames.add(fileName);

        const response = await fetch('/api/monsters/update-loot-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            itemName: primaryMaterialName.toLowerCase(),
            action: 'remove'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove item');
        }

        console.log(`Removed ${primaryMaterialName} from ${monster.name}`);
      } catch (error) {
        console.error(`Error removing item from ${monster.name}:`, error);
        toast.error(`Failed to remove item from ${monster.name}`);
      }
    }

    // IMPORTANTE: Recalcular unlock levels para todos os monstros afetados
    if (affectedFileNames.size > 0) {
      const recalcPromises = [];
      for (const fileName of affectedFileNames) {
        recalcPromises.push(
          fetch('/api/monsters/update-unlock-levels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName })
          })
        );
      }

      try {
        await Promise.all(recalcPromises);
        console.log(`Recalculated unlock levels for ${affectedFileNames.size} monsters`);
      } catch (error) {
        console.error('Error recalculating unlock levels:', error);
      }
    }

    if (addedMonsters.length > 0 || removedMonsters.length > 0) {
      toast.success(`Updated ${addedMonsters.length + removedMonsters.length} monster(s)`);
    }
  };

  // Find monsters that drop the material
  const findMonstersWithItem = (monsters, itemName) => {
    if (!itemName || !monsters) return [];

    const searchName = itemName.toLowerCase().trim();
    const searchNameWithUnderscore = searchName.replace(/ /g, '_');
    const searchNameWithSpace = searchName.replace(/_/g, ' ');

    return monsters.filter(monster => {
      if (monster.loot && Array.isArray(monster.loot)) {
        return monster.loot.some(lootItem => {
          const lootName = lootItem.name?.toLowerCase().trim() || '';
          return lootName === searchName ||
                 lootName === searchNameWithUnderscore ||
                 lootName === searchNameWithSpace;
        });
      }
      return false;
    }).map(monster => {
      // Find the loot item to get unlock level
      const lootItem = monster.loot.find(item => {
        const lootName = item.name?.toLowerCase().trim() || '';
        return lootName === searchName ||
               lootName === searchNameWithUnderscore ||
               lootName === searchNameWithSpace;
      });

      return {
        name: monster.monsterName,
        power: monster.power || 0,
        unlockLevel: lootItem?.unlockLevel || 0
      };
    });
  };


  useEffect(() => {
    // Filtrar apenas items lendários com qualquer slotType não null
    const legendaryEquips = items.filter(item =>
        (item.tier === 'legendary' || item.name?.toLowerCase() === 'backpack of holding') &&
      item.slotType !== null &&
      item.slotType !== undefined &&
      item.slotType !== ''
    );

    // Mapear com os materiais do baldur
    const dataWithMaterials = legendaryEquips.map(equip => {
      // Buscar no baldur
      const buildableItem = buildableItems.find(b =>
        b.itemName?.toLowerCase() === equip.name?.toLowerCase()
      );

      return {
        id: equip.id,
        name: equip.name,
        slotType: equip.slotType,
        primaryMaterial: buildableItem?.build?.[0] || null
      };
    });

    // Ordenar primeiro por slotType, depois por nome
    dataWithMaterials.sort((a, b) => {
      const slotCompare = (a.slotType || '').toLowerCase().localeCompare((b.slotType || '').toLowerCase());
      if (slotCompare !== 0) return slotCompare;
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });

    setTableData(dataWithMaterials);
  }, [items, buildableItems]);

  const formatMaterial = (material) => {
    if (!material) return null;

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-300">{material.itemName?.toLowerCase()}</span>
        {material.fusionLevel && (
          <Badge variant="outline" className="text-xs">
            +{material.fusionLevel}
          </Badge>
        )}
        <Badge variant="secondary" className="text-xs">
          {material.count}x
        </Badge>
      </div>
    );
  };

  // Expose export/import functions to parent
  useImperativeHandle(ref, () => ({
    exportData: () => {
      const exportData = {};

      tableData.forEach(item => {
        if (item.primaryMaterial) {
          const key = `${item.id}_${item.primaryMaterial.itemName}`;
          const monsters = monsterSelections[key] || [];

          exportData[item.name] = {
            primaryMaterial: item.primaryMaterial.itemName,
            monsters: monsters.map(m => m.name)
          };
        }
      });

      return exportData;
    },

    importData: async (data) => {
      // IMPORTANTE: Ao atualizar loot de monstros, sempre recalcular unlock levels depois
      const newSelections = {};
      const monstersToUpdate = new Map(); // fileName -> { add: [items], remove: [items] }

      // Coletar todos os nomes de monstros que precisam de mapeamento
      const allMonsterNamesToMap = new Set();
      for (const [equipmentName, config] of Object.entries(data)) {
        const item = tableData.find(t => t.name === equipmentName);
        if (!item || !item.primaryMaterial) continue;

        const key = `${item.id}_${item.primaryMaterial.itemName}`;
        const currentMonsters = monsterSelections[key] || [];
        const importedMonsterNames = config.monsters || [];

        const importedMonsters = importedMonsterNames
          .map(name => allMonsters.find(m => m.monsterName?.toLowerCase() === name?.toLowerCase()))
          .filter(Boolean);

        const toAdd = importedMonsters.filter(
          imp => !currentMonsters.some(curr => curr.name === imp.monsterName)
        );
        const toRemove = currentMonsters.filter(
          curr => !importedMonsters.some(imp => imp.monsterName === curr.name)
        );

        [...toAdd, ...toRemove].forEach(m => allMonsterNamesToMap.add(m.monsterName || m.name));
      }

      // Buscar mapeamento de nomes para arquivos
      const nameToFileResponse = await fetch('/api/monsters/name-to-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterNames: Array.from(allMonsterNamesToMap) })
      });

      if (!nameToFileResponse.ok) {
        throw new Error('Failed to fetch monster filename mappings');
      }

      const { results: nameToFileMap } = await nameToFileResponse.json();

      // Processar cada equipamento no JSON importado
      for (const [equipmentName, config] of Object.entries(data)) {
        const item = tableData.find(t => t.name === equipmentName);
        if (!item || !item.primaryMaterial) {
          console.warn(`Equipment not found: ${equipmentName}`);
          continue;
        }

        const key = `${item.id}_${item.primaryMaterial.itemName}`;
        const currentMonsters = monsterSelections[key] || [];
        const importedMonsterNames = config.monsters || [];

        // Converter nomes em objetos monster
        const importedMonsters = importedMonsterNames
          .map(name => allMonsters.find(m => m.monsterName?.toLowerCase() === name?.toLowerCase()))
          .filter(Boolean)
          .map(m => ({ name: m.monsterName, power: m.power || 0 }));

        // Identificar adições e remoções
        const toAdd = importedMonsters.filter(
          imp => !currentMonsters.some(curr => curr.name === imp.name)
        );
        const toRemove = currentMonsters.filter(
          curr => !importedMonsters.some(imp => imp.name === curr.name)
        );

        // Atualizar seleções UI
        newSelections[key] = importedMonsters;

        // Agrupar mudanças por fileName
        for (const monster of toAdd) {
          const fileName = nameToFileMap[monster.name];
          if (!fileName) {
            console.warn(`Filename not found for monster: ${monster.name}`);
            continue;
          }

          if (!monstersToUpdate.has(fileName)) {
            monstersToUpdate.set(fileName, { add: [], remove: [], power: monster.power });
          }

          const metrics = calculateLegendaryDropMetrics(monster.power || 0);
          monstersToUpdate.get(fileName).add.push({
            itemName: config.primaryMaterial,
            chance: Math.round(metrics.adjustedDropChance * 1000),
            origin: 'craft primary',
            source: 'equipBuildPrimary'
          });
        }

        for (const monster of toRemove) {
          const fileName = nameToFileMap[monster.name];
          if (!fileName) {
            console.warn(`Filename not found for monster: ${monster.name}`);
            continue;
          }

          if (!monstersToUpdate.has(fileName)) {
            monstersToUpdate.set(fileName, { add: [], remove: [], power: monster.power || 0 });
          }

          monstersToUpdate.get(fileName).remove.push({
            itemName: config.primaryMaterial
          });
        }
      }

      // Atualizar UI imediatamente
      setMonsterSelections(prev => ({ ...prev, ...newSelections }));

      // Processar atualizações de loot por monster
      const updatePromises = [];
      for (const [fileName, changes] of monstersToUpdate.entries()) {
        // Adicionar items
        for (const item of changes.add) {
          updatePromises.push(
            fetch('/api/monsters/update-loot-item', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName,
                itemName: item.itemName.toLowerCase(),
                chance: item.chance,
                origin: item.origin,
                source: item.source,
                action: 'add'
              })
            })
          );
        }

        // Remover items
        for (const item of changes.remove) {
          updatePromises.push(
            fetch('/api/monsters/update-loot-item', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName,
                itemName: item.itemName.toLowerCase(),
                action: 'remove'
              })
            })
          );
        }
      }

      // Aguardar todas as atualizações
      await Promise.all(updatePromises);

      // IMPORTANTE: Recalcular unlock levels para todos os monstros afetados
      const recalcPromises = [];
      for (const fileName of monstersToUpdate.keys()) {
        recalcPromises.push(
          fetch('/api/monsters/update-unlock-levels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName })
          })
        );
      }

      await Promise.all(recalcPromises);

      console.log(`Import complete: Updated ${monstersToUpdate.size} monsters`);
    }
  }));

  return (
    <div className="w-full h-full bg-gray-950/50 rounded-lg overflow-hidden">
      <div
        className="h-[calc(100vh-200px)] overflow-y-scroll"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #111827',
        }}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
            <TableRow className="border-b border-gray-800">
              <TableHead className="text-gray-400">Equipment Name</TableHead>
              <TableHead className="text-gray-400">Slot</TableHead>
              <TableHead className="text-gray-400">Primary Material</TableHead>
              <TableHead className="text-gray-400 w-[250px]">Monster Drop</TableHead>
              <TableHead className="text-gray-400">Monster</TableHead>
              <TableHead className="text-gray-400">Unlock Lvl</TableHead>
              <TableHead className="text-gray-400">Power</TableHead>
              <TableHead className="text-gray-400">
                <div className="flex items-center gap-1">
                  Drop Chance
                  <Popover>
                    <PopoverTrigger>
                      <HelpCircle className="h-3 w-3 text-gray-500 hover:text-gray-300 cursor-help" />
                    </PopoverTrigger>
                    <PopoverContent className="w-96 bg-gray-900 border-gray-700">
                      <div className="space-y-3 text-sm">
                        <h4 className="font-semibold text-gray-200">Algoritmo de Chance de Drop</h4>
                        <div className="space-y-2 text-gray-400">
                          <p><strong>Constantes:</strong></p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>Kills por hora: {LEGENDARY_DROP_CONSTANTS.KILL_PER_HOUR} monstros</li>
                            <li>Power base: {LEGENDARY_DROP_CONSTANTS.POWER_BASE}</li>
                            <li>Tempo para dropar 30: {LEGENDARY_DROP_CONSTANTS.TIME_TO_DROP_30_IN_HOURS} horas</li>
                            <li>Total de materiais principais: {LEGENDARY_DROP_CONSTANTS.TOTAL_MAIN_MATERIALS}</li>
                            <li>Multiplicador de ajuste por power: {LEGENDARY_DROP_CONSTANTS.POWER_ADJUSTMENT_MULTIPLIER}</li>
                          </ul>
                          <p><strong>Cálculo:</strong></p>
                          <ol className="list-decimal pl-4 space-y-1">
                            <li>Total de monstros mortos = {LEGENDARY_DROP_CONSTANTS.KILL_PER_HOUR} * {LEGENDARY_DROP_CONSTANTS.TIME_TO_DROP_30_IN_HOURS} = {LEGENDARY_DROP_CONSTANTS.KILL_PER_HOUR * LEGENDARY_DROP_CONSTANTS.TIME_TO_DROP_30_IN_HOURS}</li>
                            <li>Chance base de drop = ({LEGENDARY_DROP_CONSTANTS.TOTAL_MAIN_MATERIALS}/{LEGENDARY_DROP_CONSTANTS.KILL_PER_HOUR * LEGENDARY_DROP_CONSTANTS.TIME_TO_DROP_30_IN_HOURS}) * 100 = {((LEGENDARY_DROP_CONSTANTS.TOTAL_MAIN_MATERIALS / (LEGENDARY_DROP_CONSTANTS.KILL_PER_HOUR * LEGENDARY_DROP_CONSTANTS.TIME_TO_DROP_30_IN_HOURS)) * 100).toFixed(2)}%</li>
                            <li>Chance ajustada = base * (1 + (power - {LEGENDARY_DROP_CONSTANTS.POWER_BASE}) * {LEGENDARY_DROP_CONSTANTS.POWER_ADJUSTMENT_MULTIPLIER})</li>
                          </ol>
                          <p className="text-xs text-gray-500 mt-2">
                            Monstros com maior power têm taxa de drop aumentada
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TableHead>
              <TableHead className="text-gray-400">Time/Material</TableHead>
              <TableHead className="text-gray-400">Total Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((item, index) => {
              const isNewSlotGroup = index === 0 || tableData[index - 1].slotType !== item.slotType;
              const key = item.primaryMaterial ? `${item.id}_${item.primaryMaterial.itemName}` : null;
              const monsters = key ? (monsterSelections[key] || []) : [];

              return (
                <Fragment key={item.id}>
                  {isNewSlotGroup && index > 0 && (
                    <TableRow className="h-2 bg-gray-900/30 border-0">
                      <TableCell colSpan={10} className="p-0"></TableCell>
                    </TableRow>
                  )}

                  {monsters.length > 0 ? (
                    monsters.map((monster, monsterIndex) => {
                      const metrics = calculateLegendaryDropMetrics(monster.power || 0);
                      const isFirstRow = monsterIndex === 0;

                      return (
                        <TableRow key={`${item.id}-${monsterIndex}`} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          {isFirstRow ? (
                            <>
                              <TableCell rowSpan={monsters.length} className="text-gray-200 align-top">
                                {item.name?.toLowerCase()}
                              </TableCell>
                              <TableCell rowSpan={monsters.length} className="align-top">
                                <span className="text-sm text-gray-400">
                                  {item.slotType}
                                </span>
                              </TableCell>
                              <TableCell rowSpan={monsters.length} className="align-top">
                                {formatMaterial(item.primaryMaterial)}
                              </TableCell>
                              <TableCell rowSpan={monsters.length} className="w-[300px] align-top">
                                <MonsterInputChip
                                  value={monsters}
                                  onChange={(newMonsters) => handleMonsterChange(item.id, item.primaryMaterial.itemName, newMonsters)}
                                  materialName={item.primaryMaterial.itemName}
                                  allMonsters={allMonsters}
                                  placeholder="Add monster..."
                                />
                              </TableCell>
                            </>
                          ) : null}

                          <TableCell className="text-sm text-gray-300">
                            {monster.name?.toLowerCase()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-400 font-mono text-center">
                            {monster.unlockLevel || 0}
                          </TableCell>
                          <TableCell className="text-sm text-gray-300">
                            {monster.power > 0 ? monster.power.toFixed(1) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-300">
                            {monster.power > 0 ? `${metrics.adjustedDropChance.toFixed(2)}%` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-300">
                            {monster.power > 0 ? `${metrics.timeToDropOneMaterialInMin.toFixed(1)} min` : '-'}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-blue-400">
                            {monster.power > 0 ? `${metrics.totalAdjustedTimeInHours.toFixed(1)}h` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <TableCell className="text-gray-200">
                        {item.name?.toLowerCase()}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-400">
                          {item.slotType}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.primaryMaterial ? (
                          formatMaterial(item.primaryMaterial)
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="w-[300px]">
                        {item.primaryMaterial ? (
                          <MonsterInputChip
                            value={monsters}
                            onChange={(newMonsters) => handleMonsterChange(item.id, item.primaryMaterial.itemName, newMonsters)}
                            materialName={item.primaryMaterial.itemName}
                            allMonsters={allMonsters}
                            placeholder="Add monster..."
                          />
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell colSpan={6} className="text-center text-gray-500 text-sm">
                        Nenhum monstro detectado
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

LegendaryEquipTable.displayName = 'LegendaryEquipTable';

export default LegendaryEquipTable;