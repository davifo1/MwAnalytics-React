import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash as TrashIcon, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ItemInputChip from './ItemInputChip';
import { sortLootItemsByPriority, calculateExpectedValue } from '@/utils/unlockLevelCalculator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MonsterStageSelect } from '@/components/MonsterStageSelect';

const MonsterLootTable = ({
  loot = [],
  isEditing = false,
  availableItems = [],
  onLootChange,
  itemsMap,
  recommendedUnlockLevels = [],
  getUnlockLevelComparisonColor
}) => {
  // Carregar monster stages
  const [monsterStages, setMonsterStages] = React.useState([]);
  const [lootCategories, setLootCategories] = React.useState([]);

  React.useEffect(() => {
    // Load monster stages
    fetch('/data/monsterStages.json')
      .then(res => res.json())
      .then(data => setMonsterStages(data))
      .catch(err => console.error('Error loading monster stages:', err));

    // Load loot categories - hardcoded common categories
    setLootCategories(['Race', 'General', 'Legendary', 'Quest', 'Special']);
  }, []);

  // ⭐ Usa a função centralizada de ordenação
  const sortedLootItems = React.useMemo(() => {
    const lootItems = loot.filter(item =>
      item.name?.toLowerCase() !== 'gold coin' &&
      item.name?.toLowerCase() !== 'gold coins'
    );

    return sortLootItemsByPriority(lootItems, itemsMap);
  }, [loot, itemsMap]);

  const handleFieldChange = (index, field, value) => {
    const newLoot = [...loot];
    newLoot[index][field] = value;
    onLootChange(newLoot);
  };

  const handleRemoveItem = (index) => {
    const newLoot = loot.filter((_, i) => i !== index);
    onLootChange(newLoot);
  };

  if (sortedLootItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No loot items configured
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-3 pb-4">
        {/* Header Labels */}
        <div className="flex items-center w-full gap-2">
          <div className="w-[4%]">
            <Label className="text-xs text-gray-500">Info</Label>
          </div>
          <div className="w-[24%]">
            <Label className="text-xs text-gray-500">Name</Label>
          </div>
          <div className="w-[7%]">
            <Label className="text-xs text-gray-500">Chance %</Label>
          </div>
          <div className="w-[5%]">
            <Label className="text-xs text-gray-500">Max</Label>
          </div>
          <div className="w-[15%]">
            <Label className="text-xs text-gray-500">Origin</Label>
          </div>
          <div className="w-[6%] text-center">
            <Label className="text-xs text-gray-500">Value</Label>
          </div>
          <div className="w-[14%]">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-gray-500">Unlock Lvl</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-gray-500 hover:text-gray-300 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md bg-gray-900 border-gray-700">
                    <div className="space-y-2 text-sm">
                      <h4 className="font-semibold text-gray-200">Ordem de Prioridade de Unlock Level</h4>
                      <p className="text-gray-400">
                        {/* ⚠️ IMPORTANTE: Esta descrição é sincronizada com monsterStages.json e sortLootItemsByPriority() */}
                        <strong>1. Por Drop Stage</strong> (da menor faixa de level para a maior):
                      </p>
                      <ol className="list-decimal pl-4 space-y-1 text-gray-400">
                        {monsterStages.map((stage, index) => (
                          <li key={index}>
                            <strong>{stage.stage}</strong> ({stage.level_range})
                          </li>
                        ))}
                        <li><strong>Items sem Drop Stage</strong> (por último)</li>
                      </ol>
                      <p className="text-gray-400 mt-3">
                        <strong>2. Critérios de desempate</strong> (mesmo stage):
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-gray-400 text-xs">
                        <li>Maior prioridade de loot category primeiro</li>
                        <li>Menor valuation primeiro</li>
                        <li>Menor selling price primeiro</li>
                        <li>Menor tier primeiro</li>
                        <li>Ordem alfabética</li>
                      </ul>
                      <p className="text-xs text-gray-500 mt-2">
                        O unlock level é calculado baseado no custo acumulado dos items versus o orçamento por level do monstro.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-between">
            <Label className="text-xs text-gray-500">Drop Stage</Label>
          </div>
        </div>

        {/* Loot Items */}
        <div className="space-y-2">
          {sortedLootItems.map((lootItem) => {
            const index = loot.findIndex(item => item === lootItem);
            // Buscar o item completo no itemsMap para pegar o monsterDropStage
            const itemName = lootItem.name || lootItem.item || '';
            const itemData = itemsMap?.get(itemName.toLowerCase());
            const monsterDropStage = itemData?.attributes?.monsterDropStage || '';

            return (
              <div key={index} className="flex items-center w-full gap-2">
                {/* Info - 4% */}
                <div className="w-[4%] flex justify-center">
                  {lootItem.info ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-blue-400 hover:text-blue-300 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 border-gray-700">
                          <p className="text-xs text-gray-300">{lootItem.info}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="h-4 w-4"></div>
                  )}
                </div>

                {/* Name - 24% */}
                <div className="w-[24%]">
                  <ItemInputChip
                    value={lootItem.name || lootItem.item || ''}
                    onChange={(value) => {
                      const newLoot = [...loot];
                      newLoot[index].name = value;
                      newLoot[index].item = value;
                      onLootChange(newLoot);
                    }}
                    availableItems={availableItems}
                    filterBy={(item) => item.isMonsterLoot === true}
                    disabled={!isEditing}
                    placeholder="Item name"
                  />
                </div>

                {/* Chance - 7% */}
                <div className="w-[7%]">
                  <Input
                    type="number"
                    value={lootItem.chance || 0}
                    onChange={(e) => handleFieldChange(index, 'chance', parseFloat(e.target.value) || 0)}
                    disabled={!isEditing}
                    placeholder="0.000"
                    step="0.001"
                    min="0"
                    max="100"
                    className="h-7 text-xs w-full"
                  />
                </div>

                {/* Count Max - 5% */}
                <div className="w-[5%]">
                  <Input
                    type="number"
                    value={lootItem.countMax || 1}
                    onChange={(e) => handleFieldChange(index, 'countMax', parseInt(e.target.value) || 1)}
                    disabled={!isEditing}
                    placeholder="Max"
                    min="1"
                    className="h-7 text-xs w-full"
                  />
                </div>

                {/* Origin - 15% */}
                <div className="w-[15%]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select
                            value={lootItem.origin || 'None'}
                            onValueChange={(value) => handleFieldChange(index, 'origin', value)}
                            disabled={!isEditing}
                          >
                            <SelectTrigger className="h-7 text-xs w-full [&>span]:truncate">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              {lootCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                              {/* Legacy category not in loot-category-tiers.json */}
                              <SelectItem value="Race">Race</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 border-gray-700">
                        <p className="text-xs text-gray-300">{lootItem.origin || 'None'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Value - 6% */}
                <div className="w-[6%] text-center">
                  <span className="text-xs text-gray-400">
                    {(() => {
                      const expectedValue = calculateExpectedValue(lootItem, itemsMap);
                      if (expectedValue === null || expectedValue === 0) return "?";
                      return `${expectedValue} gp`;
                    })()}
                  </span>
                </div>

                {/* Unlock Level - 14% */}
                <div className="w-[14%]">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={lootItem.unlockLevel || 0}
                      onChange={(e) => handleFieldChange(index, 'unlockLevel', parseInt(e.target.value) || 0)}
                      disabled={!isEditing}
                      className="h-7 text-xs w-16 text-center font-mono"
                      min="0"
                    />
                    {recommendedUnlockLevels[index] !== undefined && (
                      <span className={cn(
                        "text-[10px] font-medium whitespace-nowrap",
                        getUnlockLevelComparisonColor(lootItem.unlockLevel, recommendedUnlockLevels[index])
                      )}>
                        REC: {recommendedUnlockLevels[index]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Drop Stage + Delete - flex-1 */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1">
                    <MonsterStageSelect
                      value={monsterDropStage}
                      onValueChange={() => {}} // Não faz nada - read-only
                      stages={monsterStages}
                      disabled={true}
                      className="text-[10px]"
                    />
                  </div>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveItem(index)}
                      className="h-7 w-7 p-0 flex-shrink-0"
                    >
                      <TrashIcon className="size-3 text-gray-400" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Row */}
        <div className="flex items-center w-full border-t border-gray-700 pt-2 mt-2 gap-2">
          <div className="w-[55%] flex justify-end">
            <span className="text-xs font-semibold text-gray-400">Total:</span>
          </div>
          <div className="w-[6%] text-center">
            <span className="text-xs font-semibold text-yellow-400">
              {(() => {
                const total = loot
                  .filter(item =>
                    item.name?.toLowerCase() !== 'gold coin' &&
                    item.name?.toLowerCase() !== 'gold coins'
                  )
                  .reduce((acc, item) => {
                    const value = calculateExpectedValue(item, itemsMap);
                    return acc + (value || 0);
                  }, 0);
                return `${total} gp`;
              })()}
            </span>
          </div>
          <div className="flex-1"></div>
        </div>
      </div>
    </div>
  );
};

export default MonsterLootTable;
