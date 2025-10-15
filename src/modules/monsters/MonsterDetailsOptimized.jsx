import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider, SliderThumb } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, TrashIcon, Shield, Sword, Heart, Zap, Award, Settings, HelpCircle, CheckIcon, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAttributeFormulas } from '@/hooks/useAttributeFormulas';
import { getPowerBaseByAttrPoints } from '@/utils/powerCalculator';
import { getRecommendedDefaultLevel } from '@/utils/attributesBaseCalculator';
import { calculateBaseStatsRole } from '@/utils/baseStatsRoleCalculator';
import {
  getBaseExpByPower,
  getGoldCoinPerKillByPower,
  getBalanceMultiplier,
  getGoldPerLevelByPower,
  getRecommendedGoldCoinsPerKill,
  getRecommendedBaseGoldCoinsPerKill
} from '@/utils/rewardsCalculator';
import { calculateMonsterUnlockLevels, calculateExpectedValue } from '@/utils/unlockLevelCalculator';
import SimulationDialog from './SimulationDialog';
import ItemInputChip from '@/components/ItemInputChip';
import MonsterLootTable from '@/components/MonsterLootTable';

const mapRoleDescriptions = {
  None: "Sem função específica no mapa",
  Scenery: "Serve como ambientação ou distração, baixo impacto",
  Combat: "Encontro comum de combate",
  Elite: "Encontro mais forte, exige cuidado ou preparação",
  Trash: "Encontro fraco, descartável, farmável, low-impact",
  Boss: "Encontro de chefe",
  Tower: "Encontro de torre, com mecânicas específicas",
  Custom: "Encontro personalizado, com regras específicas"
};

const baseStatsRoleDescriptions = {
  None: "Sem especialização específica",
  PhysicalAttacker: "Alto Attack, baixo Special Attack",
  SpecialAttacker: "Alto Special Attack, baixo Attack",
  PhysicalTank: "Alta Defense e HP",
  SpecialTank: "Alta Special Defense e HP",
  MixedAttacker: "Bons valores de Attack e Special Attack",
  GlassCannon: "Ataque altíssimo, defesas baixas",
  Speedster: "Muito rápido, com foco ofensivo",
  BulkyOffense: "Forte e resistente ao mesmo tempo",
  StallOrSupport: "Defensivo com foco em status, cura e suporte"
};

// Função auxiliar para converter speed type em valor numérico
const getSpeedValue = (speedType) => {
  const speedMap = {
    'Slow': 1,
    'NoBoot': 2,
    'Boot1': 3,
    'Boot2': 4,
    'BOH': 5,
    'VeryFast': 6,
    'None': 0
  };
  return speedMap[speedType] || 0;
};

const CompactSlider = ({ label, value, onChange, disabled, min = 0, max = 15, showPercent = false }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-500">{label}</Label>
        <span className="text-xs font-mono text-gray-400">
          {value}{showPercent && '%'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Slider
          min={min}
          max={max}
          step={1}
          value={[value]}
          onValueChange={(val) => onChange(val[0])}
          disabled={disabled}
          className="flex-1 h-1"
        >
          <SliderThumb className="h-3 w-3" />
        </Slider>
      </div>
    </div>
  );
};

// Helper para comparar unlock levels e retornar cor
const getUnlockLevelComparisonColor = (current, recommended) => {
  if (!recommended || recommended === 0) return 'text-gray-400';

  const currentVal = current || 0;
  const diff = Math.abs(currentVal - recommended);
  const percentDiff = (diff / recommended) * 100;

  if (currentVal === recommended) return 'text-green-400';
  if (percentDiff <= 20) return 'text-yellow-400';
  return 'text-red-400';
};

const MonsterDetailsOptimized = ({
  editingMonster,
  isEditing,
  handleFieldChange,
  availableItems = [],
  activeTab = 'general',
  onTabChange
}) => {
  const { calculateRecommendedAttributes } = useAttributeFormulas();

  // Cria um Map de items por nome para busca rápida
  const itemsMap = useMemo(() => {
    const map = new Map();
    for (const item of availableItems) {
      if (item.name) {
        map.set(item.name.toLowerCase(), item);
      }
    }
    return map;
  }, [availableItems]);

  // Calcula automaticamente o Base Stats Role baseado nos stats atuais
  const calculatedRole = calculateBaseStatsRole(
    editingMonster?.hp || 0,
    editingMonster?.atk || 0,
    editingMonster?.satk || 0,
    editingMonster?.def || 0,
    editingMonster?.sdef || 0,
    getSpeedValue(editingMonster?.speedType || 'None')
  );

  // Atualiza o baseStatsRole automaticamente quando os stats mudarem
  React.useEffect(() => {
    if (editingMonster && calculatedRole !== editingMonster.baseStatsRole) {
      handleFieldChange('baseStatsRole', calculatedRole);
    }
  }, [calculatedRole, editingMonster?.hp, editingMonster?.atk, editingMonster?.satk,
      editingMonster?.def, editingMonster?.sdef, editingMonster?.speedType]);

  // Cria uma chave estável para os itens de loot para detectar mudanças relevantes
  const lootItemsKey = useMemo(() => {
    if (!editingMonster?.loot) return '';
    return editingMonster.loot
      .map(item => `${item.name || ''}-${item.chance || 0}-${item.countMax || 0}-${item.priority || 0}`)
      .join('|');
  }, [editingMonster?.loot]);

  // AUTO-UPDATE DESABILITADO: Os unlock levels agora vêm do XML, não são calculados automaticamente
  // Use o botão "Update Unlock Levels" no bulk actions para recalcular e salvar
  // React.useEffect(() => {
  //   if (!editingMonster?.loot || !availableItems.length || !itemsMap) return;

  //   const power = editingMonster.power || 0;
  //   const resourceBalance = editingMonster?.resourceBalance || 'Equals';

  //   // Converte resourceBalance para lootBalance numérico
  //   let lootBalance = 0;
  //   if (resourceBalance.includes('Loot')) {
  //     lootBalance = parseInt(resourceBalance.replace('Loot', '')) || 0;
  //   }

  //   const baseGold = getGoldPerLevelByPower(power);
  //   const multiplier = getBalanceMultiplier(lootBalance);
  //   const budgetPerLevel = parseFloat((baseGold * multiplier).toFixed(2));

  //   // Ordenar items na mesma ordem da UI (por categoria, depois por valor esperado)
  //   const lootItems = editingMonster.loot.filter(item =>
  //     item.name?.toLowerCase() !== 'gold coin' &&
  //     item.name?.toLowerCase() !== 'gold coins'
  //   );

  //   const sortByValue = (items) => {
  //     return [...items].sort((a, b) => {
  //       const valueA = calculateExpectedValue(a) ?? 0;
  //       const valueB = calculateExpectedValue(b) ?? 0;
  //       return valueA - valueB;
  //     });
  //   };

  //   const baseItems = sortByValue(lootItems.filter(item => !item.origin || item.origin === 'None'));
  //   const craftItems = sortByValue(lootItems.filter(item =>
  //     item.origin === 'craft primary' || item.origin === 'craft secondary'
  //   ));
  //   const craftPrimaryItems = sortByValue(lootItems.filter(item => item.origin === 'craft primary'));
  //   const imbuementItems = sortByValue(lootItems.filter(item => item.origin === 'imbuement'));
  //   const raceItems = sortByValue(lootItems.filter(item => item.origin === 'Race'));

  //   // Concatenar na ordem visual
  //   const sortedLoot = [...baseItems, ...craftItems, ...craftPrimaryItems, ...imbuementItems, ...raceItems];

  //   // Calcula os unlock levels na ordem visual
  //   const unlockLevels = calculateUnlockLevels(sortedLoot, budgetPerLevel, itemsMap);

  //   // Mapear de volta para os índices originais
  //   const unlockLevelsByOriginalIndex = unlockLevels.map(({ index, unlockLevel }) => {
  //     const sortedItem = sortedLoot[index];
  //     const originalIndex = editingMonster.loot.indexOf(sortedItem);
  //     return { index: originalIndex, unlockLevel };
  //   });

  //   // Verifica se algum unlock level mudou antes de atualizar
  //   const hasChanges = unlockLevelsByOriginalIndex.some(({ index, unlockLevel }) => {
  //     const currentLevel = editingMonster.loot[index]?.unlockLevel;
  //     // Considera mudança se: não existe, é diferente, ou é 0/undefined mas deveria ser > 0
  //     return currentLevel !== unlockLevel ||
  //            (currentLevel === undefined && unlockLevel > 0) ||
  //            (currentLevel === 0 && unlockLevel > 0);
  //   });

  //   if (hasChanges) {
  //     const updatedLoot = applyUnlockLevels(editingMonster.loot, unlockLevelsByOriginalIndex);
  //     handleFieldChange('loot', updatedLoot);
  //   }
  // }, [editingMonster?.monsterName, editingMonster?.power, editingMonster?.resourceBalance, lootItemsKey, availableItems.length, itemsMap, editingMonster]);

  // Calcula os unlock levels recomendados para exibição (sem auto-atualizar)
  const recommendedUnlockLevels = useMemo(() => {
    if (!editingMonster?.loot || !availableItems.length || !itemsMap) return {};

    // Usar a mesma função que o bulk action usa
    const lootWithUnlockLevels = calculateMonsterUnlockLevels(editingMonster, itemsMap);

    // Criar um mapa de índice original -> unlock level recomendado
    const recommendedMap = {};
    lootWithUnlockLevels.forEach((item, index) => {
      recommendedMap[index] = item.unlockLevel;
    });

    return recommendedMap;
  }, [editingMonster?.loot, editingMonster?.power, editingMonster?.resourceBalance, editingMonster, availableItems.length, itemsMap]);

  // Calcula o total da loot table (excluindo gold coins)
  const lootTableTotal = useMemo(() => {
    if (!editingMonster?.loot || !itemsMap.size) return 0;

    return editingMonster.loot
      .filter(item =>
        item.name?.toLowerCase() !== 'gold coin' &&
        item.name?.toLowerCase() !== 'gold coins'
      )
      .reduce((acc, item) => {
        const value = calculateExpectedValue(item, itemsMap);
        return acc + (value || 0);
      }, 0);
  }, [editingMonster?.loot, itemsMap]);

  // Get recommended values using formulas from JSON file
  const recommendedValues = useMemo(() => {
    if (!editingMonster || !calculateRecommendedAttributes) return {};

    const speedValue = getSpeedValue(editingMonster.speedType || 'None');

    return calculateRecommendedAttributes({
      hp: editingMonster.hp || 1,
      atk: editingMonster.atk || 1,
      satk: editingMonster.satk || 1,
      def: editingMonster.def || 1,
      sdef: editingMonster.sdef || 1,
      speed: speedValue,
      speedType: editingMonster.speedType || 'None',
      power: editingMonster.power || 1
    });
  }, [
    editingMonster?.hp,
    editingMonster?.atk,
    editingMonster?.satk,
    editingMonster?.def,
    editingMonster?.sdef,
    editingMonster?.speedType,
    editingMonster?.power,
    calculateRecommendedAttributes
  ]);

  // Calculate recommended Power value
  const recommendedPower = useMemo(() => {
    if (!editingMonster) return 0;

    const speedValue = getSpeedValue(editingMonster.speedType || 'None');

    return getPowerBaseByAttrPoints(
      editingMonster.hp || 0,
      editingMonster.atk || 0,
      editingMonster.satk || 0,
      editingMonster.def || 0,
      editingMonster.sdef || 0,
      editingMonster.hostile || false,
      editingMonster.hostileWhenAttacked || false,
      speedValue
    );
  }, [
    editingMonster?.hp,
    editingMonster?.atk,
    editingMonster?.satk,
    editingMonster?.def,
    editingMonster?.sdef,
    editingMonster?.hostile,
    editingMonster?.hostileWhenAttacked,
    editingMonster?.speedType
  ]);

  // Calculate deviation percentage and color
  const getDeviationInfo = (currentValue, recommendedValue) => {
    if (!recommendedValue || recommendedValue === 0) return { percentage: 0, color: 'text-gray-500', show: false };

    const current = currentValue || 0;
    const deviation = ((current - recommendedValue) / recommendedValue) * 100;
    const absDeviation = Math.abs(deviation);

    // Don't show if within 10% tolerance
    if (absDeviation <= 10) return { percentage: 0, color: 'text-green-500', show: false };

    let color = 'text-green-500';
    if (absDeviation > 10 && absDeviation <= 30) color = 'text-yellow-500';
    if (absDeviation > 30) color = 'text-red-500';

    return {
      percentage: deviation,
      color,
      show: true,
      formatted: `${deviation > 0 ? '+' : ''}${deviation.toFixed(0)}%`
    };
  };

  // Apply all recommendations
  const applyAllRecommendations = () => {
    // Apply each recommended value to the monster
    Object.entries(recommendedValues).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        handleFieldChange(key, value);
      }
    });

    // Apply recommended default level based on power
    const power = editingMonster?.power || 0;
    const recommendedLevel = getRecommendedDefaultLevel(power);
    if (recommendedLevel > 0) {
      handleFieldChange('defaultLevel', recommendedLevel);
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full overflow-hidden flex flex-col" data-panel-id="monsters-details">
        <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full" data-panel-id="monsters-details-tabs">
        <TabsList variant="line" className="w-full justify-start px-6 mb-4">
          <TabsTrigger value="general">
            <Shield className="size-4 mr-2 text-gray-400" />
            General
          </TabsTrigger>
          <TabsTrigger value="points">
            <Zap className="size-4 mr-2 text-gray-400" />
            Points
          </TabsTrigger>
          <TabsTrigger value="combat">
            <Sword className="size-4 mr-2 text-gray-400" />
            Combat
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Award className="size-4 mr-2 text-gray-400" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="size-4 mr-2 text-gray-400" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general" className="overflow-y-auto px-6 space-y-4 mt-0 pb-10" style={{ height: 'calc(100vh - 300px)' }} data-panel-id="monsters-details-general">
          {/* Basic Info Card - Full Width */}
          <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-general-basic">
              <h5 className="text-sm font-semibold text-gray-300">
                Basic Info
              </h5>

              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-500">Monster Name</Label>
                  <Input
                    value={editingMonster?.monsterName || ''}
                    onChange={(e) => handleFieldChange('monsterName', e.target.value)}
                    disabled={!isEditing}
                    className="h-8 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="h-5 flex items-center">
                      <Label className="text-xs text-gray-500">Race(s)</Label>
                    </div>
                    {isEditing ? (
                      <Input
                        type="text"
                        value={editingMonster?.race || ''}
                        onChange={(e) => handleFieldChange('race', e.target.value)}
                        placeholder="e.g. blood;fire;undead"
                        className="h-8"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1 min-h-[32px] items-center">
                        {(editingMonster?.race || 'None').split(';').map((r, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {r.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="h-5 flex items-center gap-1">
                      <Label className="text-xs text-gray-500">Map Role</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                            <HelpCircle className="h-3 w-3 text-gray-500 hover:text-gray-300" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm mb-2">Map Role - Descrições</h4>
                            {Object.entries(mapRoleDescriptions).map(([role, description]) => (
                              <div key={role} className="flex gap-2">
                                <Badge variant="outline" className="min-w-[70px] justify-center text-xs">
                                  {role}
                                </Badge>
                                <span className="text-xs text-gray-400">{description}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Select
                      value={editingMonster?.mapRole || 'None'}
                      onValueChange={(value) => handleFieldChange('mapRole', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Scenery">Scenery</SelectItem>
                        <SelectItem value="Combat">Combat</SelectItem>
                        <SelectItem value="Elite">Elite</SelectItem>
                        <SelectItem value="Trash">Trash</SelectItem>
                        <SelectItem value="Boss">Boss</SelectItem>
                        <SelectItem value="Tower">Tower</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="h-5 flex items-center gap-1">
                      <Label className="text-xs text-gray-500">Tactical Role</Label>
                      <span className="text-xs text-yellow-500">(Em breve)</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                            <HelpCircle className="h-3 w-3 text-gray-500 hover:text-gray-300" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm mb-2">Tactical Role - Descrições</h4>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">None</Badge>
                              <span className="text-xs text-gray-400">Sem papel tático definido</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">Lead</Badge>
                              <span className="text-xs text-gray-400">Entra primeiro para usar armadilhas/status</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">Wallbreaker</Badge>
                              <span className="text-xs text-gray-400">Quebra defesas inimigas</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">Tank</Badge>
                              <span className="text-xs text-gray-400">Absorve muito dano físico ou especial</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">Sweeper</Badge>
                              <span className="text-xs text-gray-400">Ataca após boosts</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">SetupSupport</Badge>
                              <span className="text-xs text-gray-400">Usa buffs, debuffs ou hazards</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">Pivot</Badge>
                              <span className="text-xs text-gray-400">Pressiona e troca com U-turn/Volt Switch</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">HazardControl</Badge>
                              <span className="text-xs text-gray-400">Coloca ou remove armadilhas</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">StatusSpreader</Badge>
                              <span className="text-xs text-gray-400">Usa moves de status para controlar o adversário</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center text-xs">Cleric</Badge>
                              <span className="text-xs text-gray-400">Cura aliados ou remove status</span>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Select
                      value={editingMonster.tacticalRole || 'None'}
                      disabled={true}
                      className="text-sm"
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Wallbreaker">Wallbreaker</SelectItem>
                        <SelectItem value="Tank">Tank</SelectItem>
                        <SelectItem value="Sweeper">Sweeper</SelectItem>
                        <SelectItem value="SetupSupport">SetupSupport</SelectItem>
                        <SelectItem value="Pivot">Pivot</SelectItem>
                        <SelectItem value="HazardControl">HazardControl</SelectItem>
                        <SelectItem value="StatusSpreader">StatusSpreader</SelectItem>
                        <SelectItem value="Cleric">Cleric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </div>

              {/* Appearance Section */}
              <div className="">
                <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="h-5 flex items-center">
                    <Label className="text-xs text-gray-500">Look Type</Label>
                  </div>
                  <Input
                    type="number"
                    value={editingMonster?.lookType || 0}
                    onChange={(e) => handleFieldChange('lookType', parseInt(e.target.value))}
                    disabled={!isEditing}
                    className="h-8"
                  />
                </div>
                <div>
                  <div className="h-5 flex items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label className="text-xs text-gray-500 flex items-center gap-1 cursor-help">
                          Corpse
                          <Info className="h-3 w-3 text-gray-400" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">O loot default é 3073</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="number"
                    value={editingMonster?.corpse || 0}
                    onChange={(e) => handleFieldChange('corpse', parseInt(e.target.value))}
                    disabled={!isEditing}
                    className="h-8"
                  />
                </div>
                <div>
                  <div className="h-5 flex items-center">
                    <Label className="text-xs text-gray-500">Type Ex</Label>
                  </div>
                  <Input
                    type="number"
                    value={editingMonster?.lookTypeEx || 0}
                    onChange={(e) => handleFieldChange('lookTypeEx', parseInt(e.target.value))}
                    disabled={!isEditing}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* POINTS TAB */}
        <TabsContent value="points" className="overflow-y-auto px-6 space-y-4 mt-0 pb-10" style={{ height: 'calc(100vh - 300px)' }} data-panel-id="monsters-details-points">
          {/* Power and Default Level Card */}
          <div className="border border-blue-500/50 rounded-lg p-4 bg-blue-500/5" data-panel-id="monsters-details-points-power">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold text-blue-400">
                Power & Default Level
              </Label>
              <SimulationDialog monster={editingMonster} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Power Column */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-sm text-gray-400">Power</Label>
                  {recommendedPower > 0 && (
                    <span className="text-xs text-gray-400">(Rec: {recommendedPower.toFixed(2)})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.power, recommendedPower);
                    return info.show && <span className={`font-semibold text-xs ${info.color}`}>{info.formatted}</span>;
                  })()}
                </div>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  step="0.01"
                  value={editingMonster?.power || 0}
                  onChange={(e) => handleFieldChange('power', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 text-lg font-semibold"
                />
                <div className="text-xs text-gray-400 mt-2">
                  <p>Determina a dificuldade geral do monstro (0-15)</p>
                  <p className="mt-1">Baseado em HP, ATK, DEF e velocidade</p>
                </div>
              </div>

              {/* Default Level Column */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-sm text-gray-400">Default Level</Label>
                  {(() => {
                    const power = editingMonster?.power || 0;
                    const recommendedLevel = getRecommendedDefaultLevel(power);
                    if (recommendedLevel > 0) {
                      return <span className="text-xs text-gray-400">(Rec: {recommendedLevel})</span>;
                    }
                    return null;
                  })()}
                  {(() => {
                    const power = editingMonster?.power || 0;
                    const recommendedLevel = getRecommendedDefaultLevel(power);
                    const info = getDeviationInfo(editingMonster?.defaultLevel, recommendedLevel);
                    return info.show && <span className={`font-semibold text-xs ${info.color}`}>{info.formatted}</span>;
                  })()}
                </div>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={editingMonster?.defaultLevel || 0}
                  onChange={(e) => handleFieldChange('defaultLevel', parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 text-lg font-semibold"
                />
                <div className="text-xs text-gray-400 mt-2">
                  <p>Nível padrão do monstro para cálculos de combate</p>
                  <p className="mt-1">Calculado com base no Power</p>
                </div>
              </div>
            </div>
          </div>

          {/* Combat Stats Card */}
          <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-points-stats">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold text-gray-300">
                Combat Stats
              </h5>
              <Badge variant="outline">
                Total: {(editingMonster?.hp || 0) + (editingMonster?.atk || 0) +
                       (editingMonster?.satk || 0) + (editingMonster?.def || 0) +
                       (editingMonster?.sdef || 0)}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <CompactSlider
                label="HP"
                value={editingMonster?.hp || 0}
                onChange={(val) => handleFieldChange('hp', val)}
                disabled={!isEditing}
              />
              <CompactSlider
                label="ATK"
                value={editingMonster?.atk || 0}
                onChange={(val) => handleFieldChange('atk', val)}
                disabled={!isEditing}
              />
              <CompactSlider
                label="SATK"
                value={editingMonster?.satk || 0}
                onChange={(val) => handleFieldChange('satk', val)}
                disabled={!isEditing}
              />
              <CompactSlider
                label="DEF"
                value={editingMonster?.def || 0}
                onChange={(val) => handleFieldChange('def', val)}
                disabled={!isEditing}
              />
              <CompactSlider
                label="SDEF"
                value={editingMonster?.sdef || 0}
                onChange={(val) => handleFieldChange('sdef', val)}
                disabled={!isEditing}
              />
              <div>
                <Label className="text-xs text-gray-500">Speed</Label>
                <Select
                  value={editingMonster?.speedType || 'None'}
                  onValueChange={(value) => handleFieldChange('speedType', value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Slow">Slow</SelectItem>
                    <SelectItem value="NoBoot">No Boot</SelectItem>
                    <SelectItem value="Boot1">Boot 1</SelectItem>
                    <SelectItem value="Boot2">Boot 2</SelectItem>
                    <SelectItem value="BOH">BOH</SelectItem>
                    <SelectItem value="VeryFast">Very Fast</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-3 mt-3">
              {(() => {
                // Calculate normalized stats
                const hp = editingMonster?.hp || 0;
                const atk = editingMonster?.atk || 0;
                const satk = editingMonster?.satk || 0;
                const def = editingMonster?.def || 0;
                const sdef = editingMonster?.sdef || 0;
                const speed = getSpeedValue(editingMonster?.speedType || 'None');
                const max = Math.max(1, hp, atk, satk, def, sdef, speed);

                const normalized = {
                  hp: hp / max,
                  atk: atk / max,
                  satk: satk / max,
                  def: def / max,
                  sdef: sdef / max,
                  speed: speed / max
                };

                // Define role requirements (what stats should be for each role)
                const roleRequirements = {
                  'GlassCannon': {
                    hp: { min: 0, max: 0.4 },
                    atk: { min: 0.9, max: 1.0 },
                    satk: { min: 0.9, max: 1.0 },
                    def: { min: 0, max: 0.4 },
                    sdef: { min: 0, max: 0.4 },
                    speed: { min: 0, max: 1.0 }
                  },
                  'Speedster': {
                    hp: { min: 0, max: 1.0 },
                    atk: { min: 0.6, max: 1.0 },
                    satk: { min: 0.6, max: 1.0 },
                    def: { min: 0, max: 1.0 },
                    sdef: { min: 0, max: 1.0 },
                    speed: { min: 0.9, max: 1.0 }
                  },
                  'PhysicalAttacker': {
                    hp: { min: 0, max: 1.0 },
                    atk: { min: 0.8, max: 1.0 },
                    satk: { min: 0, max: 0.4 },
                    def: { min: 0, max: 1.0 },
                    sdef: { min: 0, max: 1.0 },
                    speed: { min: 0, max: 1.0 }
                  },
                  'SpecialAttacker': {
                    hp: { min: 0, max: 1.0 },
                    atk: { min: 0, max: 0.4 },
                    satk: { min: 0.8, max: 1.0 },
                    def: { min: 0, max: 1.0 },
                    sdef: { min: 0, max: 1.0 },
                    speed: { min: 0, max: 1.0 }
                  },
                  'PhysicalTank': {
                    hp: { min: 0.6, max: 1.0 },
                    atk: { min: 0, max: 1.0 },
                    satk: { min: 0, max: 1.0 },
                    def: { min: 0.85, max: 1.0 },
                    sdef: { min: 0, max: 1.0 },
                    speed: { min: 0, max: 1.0 }
                  },
                  'SpecialTank': {
                    hp: { min: 0.6, max: 1.0 },
                    atk: { min: 0, max: 1.0 },
                    satk: { min: 0, max: 1.0 },
                    def: { min: 0, max: 1.0 },
                    sdef: { min: 0.85, max: 1.0 },
                    speed: { min: 0, max: 1.0 }
                  },
                  'StallOrSupport': {
                    hp: { min: 0, max: 1.0 },
                    atk: { min: 0, max: 0.4 },
                    satk: { min: 0, max: 0.4 },
                    def: { min: 0.6, max: 1.0 },
                    sdef: { min: 0.6, max: 1.0 },
                    speed: { min: 0, max: 1.0 }
                  },
                  'BulkyOffense': {
                    hp: { min: 0.6, max: 1.0 },
                    atk: { min: 0.6, max: 1.0 },
                    satk: { min: 0.6, max: 1.0 },
                    def: { min: 0.6, max: 1.0 },
                    sdef: { min: 0.6, max: 1.0 },
                    speed: { min: 0, max: 1.0 }
                  },
                  'MixedAttacker': {
                    hp: { min: 0, max: 1.0 },
                    atk: { min: 0.5, max: 1.0 },
                    satk: { min: 0.5, max: 1.0 },
                    def: { min: 0, max: 1.0 },
                    sdef: { min: 0, max: 1.0 },
                    speed: { min: 0, max: 1.0 }
                  }
                };

                // Check if current stats match a role
                const checkRoleMatch = (role) => {
                  const req = roleRequirements[role];
                  if (!req) return false;

                  // For attackers, check if at least one attack stat is high
                  if (role === 'GlassCannon') {
                    return (normalized.atk >= 0.9 || normalized.satk >= 0.9) &&
                           normalized.hp < 0.4 &&
                           normalized.def < 0.4 &&
                           normalized.sdef < 0.4;
                  }
                  if (role === 'Speedster') {
                    return normalized.speed >= 0.9 && (normalized.atk >= 0.6 || normalized.satk >= 0.6);
                  }
                  if (role === 'PhysicalAttacker') {
                    return normalized.atk >= normalized.satk + 0.4;
                  }
                  if (role === 'SpecialAttacker') {
                    return normalized.satk >= normalized.atk + 0.4;
                  }
                  if (role === 'PhysicalTank') {
                    return normalized.def >= 0.85 && normalized.hp >= 0.6;
                  }
                  if (role === 'SpecialTank') {
                    return normalized.sdef >= 0.85 && normalized.hp >= 0.6;
                  }
                  if (role === 'StallOrSupport') {
                    return normalized.atk <= 0.4 && normalized.satk <= 0.4 && (normalized.def >= 0.6 || normalized.sdef >= 0.6);
                  }
                  if (role === 'BulkyOffense') {
                    return (normalized.atk >= 0.6 || normalized.satk >= 0.6) &&
                           (normalized.def >= 0.6 || normalized.sdef >= 0.6) &&
                           normalized.hp >= 0.6;
                  }
                  if (role === 'MixedAttacker') {
                    return normalized.atk >= 0.5 && normalized.satk >= 0.5 &&
                           Math.abs(normalized.atk - normalized.satk) < 0.3;
                  }

                  return false;
                };

                const roleColors = {
                  'GlassCannon': 'border-orange-500 bg-orange-500/10',
                  'Speedster': 'border-yellow-500 bg-yellow-500/10',
                  'PhysicalAttacker': 'border-red-500 bg-red-500/10',
                  'SpecialAttacker': 'border-purple-500 bg-purple-500/10',
                  'PhysicalTank': 'border-green-500 bg-green-500/10',
                  'SpecialTank': 'border-cyan-500 bg-cyan-500/10',
                  'StallOrSupport': 'border-indigo-500 bg-indigo-500/10',
                  'BulkyOffense': 'border-emerald-500 bg-emerald-500/10',
                  'MixedAttacker': 'border-blue-500 bg-blue-500/10'
                };

                const [hoveredRole, setHoveredRole] = React.useState(null);
                const [simulatedStats, setSimulatedStats] = React.useState(null);

                // Function to simulate what stats would be for a given role
                const simulateRoleStats = (role) => {
                  // Get current stats
                  const currentHP = editingMonster?.hp || 0;
                  const currentATK = editingMonster?.atk || 0;
                  const currentSATK = editingMonster?.satk || 0;
                  const currentDEF = editingMonster?.def || 0;
                  const currentSDEF = editingMonster?.sdef || 0;
                  const currentSpeed = getSpeedValue(editingMonster?.speedType || 'None');
                  const currentHostile = editingMonster?.hostile || false;
                  const currentHostileWhenAttacked = editingMonster?.hostileWhenAttacked || false;

                  // Calculate current power
                  const targetPower = getPowerBaseByAttrPoints(
                    currentHP,
                    currentATK,
                    currentSATK,
                    currentDEF,
                    currentSDEF,
                    currentHostile,
                    currentHostileWhenAttacked,
                    currentSpeed
                  );

                  // Define preset distributions for each role
                  const rolePresets = {
                    'GlassCannon': { hp: 0.15, atk: 0.35, satk: 0.35, def: 0.075, sdef: 0.075 },
                    'Speedster': { hp: 0.20, atk: 0.25, satk: 0.25, def: 0.15, sdef: 0.15 },
                    'PhysicalAttacker': { hp: 0.25, atk: 0.40, satk: 0.10, def: 0.125, sdef: 0.125 },
                    'SpecialAttacker': { hp: 0.25, atk: 0.10, satk: 0.40, def: 0.125, sdef: 0.125 },
                    'PhysicalTank': { hp: 0.30, atk: 0.15, satk: 0.15, def: 0.30, sdef: 0.10 },
                    'SpecialTank': { hp: 0.30, atk: 0.15, satk: 0.15, def: 0.10, sdef: 0.30 },
                    'StallOrSupport': { hp: 0.25, atk: 0.10, satk: 0.10, def: 0.275, sdef: 0.275 },
                    'BulkyOffense': { hp: 0.25, atk: 0.20, satk: 0.20, def: 0.175, sdef: 0.175 },
                    'MixedAttacker': { hp: 0.20, atk: 0.25, satk: 0.25, def: 0.15, sdef: 0.15 }
                  };

                  const preset = rolePresets[role];
                  if (!preset) return null;

                  // Determine speed for simulation
                  let newSpeedType = editingMonster?.speedType || 'Normal';
                  if (role === 'Speedster') {
                    newSpeedType = 'VeryFast';
                  }
                  const newSpeed = getSpeedValue(newSpeedType);

                  // Start with a base scale
                  let scale = Math.max(currentHP, currentATK, currentSATK, currentDEF, currentSDEF) || 10;

                  // Iteratively adjust scale to match target power
                  let iterations = 0;
                  const maxIterations = 50;
                  let bestStats = null;
                  let bestPowerDiff = Infinity;

                  while (iterations < maxIterations) {
                    const testStats = {
                      hp: Math.round(scale * preset.hp),
                      atk: Math.round(scale * preset.atk),
                      satk: Math.round(scale * preset.satk),
                      def: Math.round(scale * preset.def),
                      sdef: Math.round(scale * preset.sdef)
                    };

                    const testPower = getPowerBaseByAttrPoints(
                      testStats.hp,
                      testStats.atk,
                      testStats.satk,
                      testStats.def,
                      testStats.sdef,
                      currentHostile,
                      currentHostileWhenAttacked,
                      newSpeed
                    );

                    const powerDiff = Math.abs(testPower - targetPower);

                    if (powerDiff < bestPowerDiff) {
                      bestPowerDiff = powerDiff;
                      bestStats = { ...testStats };
                    }

                    if (powerDiff < 0.05) break;

                    if (testPower < targetPower) {
                      scale *= 1.1;
                    } else {
                      scale *= 0.9;
                    }

                    iterations++;
                  }

                  return bestStats;
                };

                // Update simulated stats when hovering
                React.useEffect(() => {
                  if (hoveredRole) {
                    const simulated = simulateRoleStats(hoveredRole);
                    setSimulatedStats(simulated);
                  } else {
                    setSimulatedStats(null);
                  }
                }, [hoveredRole, editingMonster?.hp, editingMonster?.atk, editingMonster?.satk, editingMonster?.def, editingMonster?.sdef]);

                // Function to apply role preset (only in edit mode)
                const applyRolePreset = (role) => {
                  if (!isEditing) return;

                  // Get current stats
                  const currentHP = editingMonster?.hp || 0;
                  const currentATK = editingMonster?.atk || 0;
                  const currentSATK = editingMonster?.satk || 0;
                  const currentDEF = editingMonster?.def || 0;
                  const currentSDEF = editingMonster?.sdef || 0;
                  const currentSpeed = getSpeedValue(editingMonster?.speedType || 'None');
                  const currentHostile = editingMonster?.hostile || false;
                  const currentHostileWhenAttacked = editingMonster?.hostileWhenAttacked || false;

                  // Calculate current power
                  const targetPower = getPowerBaseByAttrPoints(
                    currentHP,
                    currentATK,
                    currentSATK,
                    currentDEF,
                    currentSDEF,
                    currentHostile,
                    currentHostileWhenAttacked,
                    currentSpeed
                  );

                  // Define preset distributions for each role (these are ratios)
                  const rolePresets = {
                    'GlassCannon': { hp: 0.15, atk: 0.35, satk: 0.35, def: 0.075, sdef: 0.075, speed: 0.5 },
                    'Speedster': { hp: 0.20, atk: 0.25, satk: 0.25, def: 0.15, sdef: 0.15, speed: 1.0 },
                    'PhysicalAttacker': { hp: 0.25, atk: 0.40, satk: 0.10, def: 0.125, sdef: 0.125, speed: 0.6 },
                    'SpecialAttacker': { hp: 0.25, atk: 0.10, satk: 0.40, def: 0.125, sdef: 0.125, speed: 0.6 },
                    'PhysicalTank': { hp: 0.30, atk: 0.15, satk: 0.15, def: 0.30, sdef: 0.10, speed: 0.4 },
                    'SpecialTank': { hp: 0.30, atk: 0.15, satk: 0.15, def: 0.10, sdef: 0.30, speed: 0.4 },
                    'StallOrSupport': { hp: 0.25, atk: 0.10, satk: 0.10, def: 0.275, sdef: 0.275, speed: 0.5 },
                    'BulkyOffense': { hp: 0.25, atk: 0.20, satk: 0.20, def: 0.175, sdef: 0.175, speed: 0.5 },
                    'MixedAttacker': { hp: 0.20, atk: 0.25, satk: 0.25, def: 0.15, sdef: 0.15, speed: 0.5 }
                  };

                  const preset = rolePresets[role];
                  if (!preset) return;

                  // Pick appropriate speed type - only change for Speedster role
                  let newSpeedType = editingMonster?.speedType || 'Normal';
                  if (role === 'Speedster') {
                    // Speedster should be very fast (BOH or VeryFast)
                    newSpeedType = 'VeryFast';
                  }
                  // For all other roles, keep current speed
                  const newSpeed = getSpeedValue(newSpeedType);

                  // Start with a base scale (we'll adjust to match power)
                  let scale = Math.max(currentHP, currentATK, currentSATK, currentDEF, currentSDEF) || 10;

                  // Iteratively adjust scale to match target power
                  let iterations = 0;
                  const maxIterations = 50;
                  let bestStats = null;
                  let bestPowerDiff = Infinity;

                  while (iterations < maxIterations) {
                    const testStats = {
                      hp: Math.round(scale * preset.hp),
                      atk: Math.round(scale * preset.atk),
                      satk: Math.round(scale * preset.satk),
                      def: Math.round(scale * preset.def),
                      sdef: Math.round(scale * preset.sdef)
                    };

                    const testPower = getPowerBaseByAttrPoints(
                      testStats.hp,
                      testStats.atk,
                      testStats.satk,
                      testStats.def,
                      testStats.sdef,
                      currentHostile,
                      currentHostileWhenAttacked,
                      newSpeed
                    );

                    const powerDiff = Math.abs(testPower - targetPower);

                    // Keep best result
                    if (powerDiff < bestPowerDiff) {
                      bestPowerDiff = powerDiff;
                      bestStats = { ...testStats };
                    }

                    // If we're close enough, stop
                    if (powerDiff < 0.05) break;

                    // Adjust scale based on power difference
                    if (testPower < targetPower) {
                      scale *= 1.1; // Increase scale
                    } else {
                      scale *= 0.9; // Decrease scale
                    }

                    iterations++;
                  }

                  // Apply the best stats found
                  if (bestStats) {
                    handleFieldChange('hp', bestStats.hp);
                    handleFieldChange('atk', bestStats.atk);
                    handleFieldChange('satk', bestStats.satk);
                    handleFieldChange('def', bestStats.def);
                    handleFieldChange('sdef', bestStats.sdef);

                    // Only change speed for Speedster role
                    if (role === 'Speedster') {
                      handleFieldChange('speedType', newSpeedType);
                    }
                  }
                };

                return (
                  <div>
                    <Label className="text-xs text-gray-500 mb-3 block">
                      Base Stats Role
                      {isEditing && <span className="text-xs text-gray-600 ml-2">(Click to apply preset)</span>}
                    </Label>

                    {/* Horizontal Role Cards */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {Object.keys(roleRequirements).map((role) => {
                        const isActive = calculatedRole === role;
                        const isHovered = hoveredRole === role;
                        const matches = checkRoleMatch(role);

                        return (
                          <div
                            key={role}
                            className={cn(
                              "p-1.5 rounded-lg border-2 transition-all h-[60px] flex flex-col",
                              isEditing && "cursor-pointer hover:scale-105",
                              !isEditing && "cursor-default",
                              isActive && roleColors[role],
                              !isActive && "border-gray-700 bg-gray-800/30 hover:border-gray-600",
                              isHovered && "ring-2 ring-white/20"
                            )}
                            onMouseEnter={() => setHoveredRole(role)}
                            onMouseLeave={() => setHoveredRole(null)}
                            onClick={() => applyRolePreset(role)}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              {isActive && <CheckIcon className="h-3 w-3 text-green-400 flex-shrink-0" />}
                              <span className={cn(
                                "text-xs font-semibold truncate leading-none",
                                isActive ? "text-gray-200" : "text-gray-400"
                              )}>
                                {role}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-2 flex-1 leading-tight">
                              {baseStatsRoleDescriptions[role]}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Stats Bars */}
                    <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/20">
                      <div className="space-y-2">
                        {Object.entries(normalized).map(([stat, value]) => {
                          const statUpper = stat.toUpperCase();

                          // Get actual stat values (not normalized)
                          const currentValue = editingMonster?.[stat] || (stat === 'speed' ? getSpeedValue(editingMonster?.speedType || 'None') : 0);

                          // Get simulated value for this stat when hovering
                          let simulatedValue = null;
                          let simulatedNormalized = null;
                          if (hoveredRole && simulatedStats) {
                            if (stat === 'speed') {
                              // For speed, check if Speedster
                              if (hoveredRole === 'Speedster') {
                                simulatedValue = getSpeedValue('VeryFast');
                              } else {
                                simulatedValue = currentValue;
                              }
                            } else {
                              simulatedValue = simulatedStats[stat] || 0;
                            }
                            // Normalize simulated value
                            const maxForSim = Math.max(1, simulatedStats?.hp || 1, simulatedStats?.atk || 1, simulatedStats?.satk || 1, simulatedStats?.def || 1, simulatedStats?.sdef || 1, simulatedValue || 1);
                            simulatedNormalized = simulatedValue / maxForSim;
                          }

                          const willIncrease = simulatedNormalized !== null && simulatedNormalized > value;
                          const willDecrease = simulatedNormalized !== null && simulatedNormalized < value;

                          return (
                            <div key={stat}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-gray-400 w-12">{statUpper}</span>
                                <div className="flex-1 flex items-center gap-2">
                                  <div className="flex-1 h-2.5 bg-gray-900 rounded-full overflow-hidden relative">
                                    {/* Current value bar (gray) */}
                                    <div
                                      className="absolute h-full rounded-full transition-all duration-300 bg-gray-600"
                                      style={{ width: `${value * 100}%` }}
                                    />
                                    {/* Simulated change indicator */}
                                    {hoveredRole && simulatedNormalized !== null && (
                                      <>
                                        {willIncrease && (
                                          // Will increase - show green bar from current to simulated
                                          <div
                                            className="absolute h-full bg-green-500/60 transition-all duration-300 z-10"
                                            style={{
                                              left: `${value * 100}%`,
                                              width: `${(simulatedNormalized - value) * 100}%`
                                            }}
                                          />
                                        )}
                                        {willDecrease && (
                                          // Will decrease - show red bar from simulated to current
                                          <div
                                            className="absolute h-full bg-red-500/60 transition-all duration-300 z-10"
                                            style={{
                                              left: `${simulatedNormalized * 100}%`,
                                              width: `${(value - simulatedNormalized) * 100}%`
                                            }}
                                          />
                                        )}
                                      </>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono text-gray-500 w-10 text-right">
                                    {(value * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              {/* Show simulated change info when hovering */}
                              {hoveredRole && simulatedValue !== null && simulatedValue !== currentValue && (
                                <div className="ml-14 text-xs text-gray-500">
                                  Will change: {currentValue} → {simulatedValue}
                                  <span className={cn("ml-2", willIncrease ? "text-green-400" : "text-red-400")}>
                                    {willIncrease ? `↑ +${simulatedValue - currentValue}` : `↓ ${simulatedValue - currentValue}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Base Attributes Card */}
          <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-base-attributes">
            <h5 className="text-sm font-semibold text-gray-300">Base Attributes</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Base Health</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.baseHealth || 0}
                  onChange={(e) => handleFieldChange('baseHealth', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Base Speed
                  {recommendedValues.baseSpeed > 0 && (
                    <span className="text-gray-400">(Rec: {recommendedValues.baseSpeed})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.baseSpeed, recommendedValues.baseSpeed);
                    return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                  })()}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.baseSpeed || 0}
                  onChange={(e) => handleFieldChange('baseSpeed', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Base Attack</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.baseAtk || 0}
                  onChange={(e) => handleFieldChange('baseAtk', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Base Special Attack</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.baseAtks || 0}
                  onChange={(e) => handleFieldChange('baseAtks', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Base Magic Penetration</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.baseMagicPen || 0}
                  onChange={(e) => handleFieldChange('baseMagicPen', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Base Physical Penetration</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.basePhysicalPen || 0}
                  onChange={(e) => handleFieldChange('basePhysicalPen', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Base Armor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.baseArmor || 0}
                  onChange={(e) => handleFieldChange('baseArmor', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Base Magic Resist</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.baseMagicResist || 0}
                  onChange={(e) => handleFieldChange('baseMagicResist', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Attributes Per Level Card */}
          <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-points-attributes">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold text-gray-300">
                Attributes Per Level
              </h5>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={applyAllRecommendations}
                  className="h-7"
                >
                  <CheckIcon className="size-3 mr-1" />
                  Apply Recommendations
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Health/Level
                  {recommendedValues.healthPerLevel && (
                    <span className="text-gray-400">(Rec: {recommendedValues.healthPerLevel})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.healthPerLevel, recommendedValues.healthPerLevel);
                    return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                  })()}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.healthPerLevel || 0}
                  onChange={(e) => handleFieldChange('healthPerLevel', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Speed/Level
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.speedPerLevel || 0}
                  onChange={(e) => handleFieldChange('speedPerLevel', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Max ATK/Level
                  {recommendedValues.maxAtkPerLevel && (
                    <span className="text-gray-400">(Rec: {recommendedValues.maxAtkPerLevel})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.maxAtkPerLevel, recommendedValues.maxAtkPerLevel);
                    return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                  })()}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.maxAtkPerLevel || 0}
                  onChange={(e) => handleFieldChange('maxAtkPerLevel', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Max SATK/Level
                  {recommendedValues.maxAtkSPerLevel && (
                    <span className="text-gray-400">(Rec: {recommendedValues.maxAtkSPerLevel})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.maxAtkSPerLevel, recommendedValues.maxAtkSPerLevel);
                    return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                  })()}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.maxAtkSPerLevel || 0}
                  onChange={(e) => handleFieldChange('maxAtkSPerLevel', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Magic Pen/Level
                  {recommendedValues.magicPenPerLevel && (
                    <span className="text-gray-400">(Rec: {recommendedValues.magicPenPerLevel})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.magicPenPerLevel, recommendedValues.magicPenPerLevel);
                    return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                  })()}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.magicPenPerLevel || 0}
                  onChange={(e) => handleFieldChange('magicPenPerLevel', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Physical Pen/Level
                  {recommendedValues.physicalPenPerLevel && (
                    <span className="text-gray-400">(Rec: {recommendedValues.physicalPenPerLevel})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.physicalPenPerLevel, recommendedValues.physicalPenPerLevel);
                    return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                  })()}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.physicalPenPerLevel || 0}
                  onChange={(e) => handleFieldChange('physicalPenPerLevel', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Armor/Level
                  {recommendedValues.armorPerLevel && (
                    <span className="text-gray-400">(Rec: {recommendedValues.armorPerLevel})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.armorPerLevel, recommendedValues.armorPerLevel);
                    return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                  })()}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.armorPerLevel || 0}
                  onChange={(e) => handleFieldChange('armorPerLevel', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  Magic Resist/Level
                  {recommendedValues.magicResistPerLevel && (
                    <span className="text-gray-400">(Rec: {recommendedValues.magicResistPerLevel})</span>
                  )}
                  {(() => {
                    const info = getDeviationInfo(editingMonster?.magicResistPerLevel, recommendedValues.magicResistPerLevel);
                    return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                  })()}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingMonster?.magicResistPerLevel || 0}
                  onChange={(e) => handleFieldChange('magicResistPerLevel', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="h-8 mt-1"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* COMBAT TAB */}
        <TabsContent value="combat" className="overflow-y-auto px-6 space-y-4 mt-0 pb-10" style={{ height: 'calc(100vh - 300px)' }} data-panel-id="monsters-details-combat">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Behavior Flags */}
            <div className="space-y-4">
              {/* Flags de Comportamento */}
              <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-combat-behavior">
                <h5 className="text-sm font-semibold text-gray-300">
                  Flags de Comportamento
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.attackable || false}
                      onCheckedChange={(checked) => handleFieldChange('attackable', checked)}
                      id="attackable"
                    />
                    <Label htmlFor="attackable" className="text-xs cursor-pointer">Attackable</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.hostile || false}
                      onCheckedChange={(checked) => handleFieldChange('hostile', checked)}
                      id="hostile"
                    />
                    <Label htmlFor="hostile" className="text-xs cursor-pointer">Hostile</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.hostileWhenAttacked || false}
                      onCheckedChange={(checked) => handleFieldChange('hostileWhenAttacked', checked)}
                      id="hostileWhenAttacked"
                    />
                    <Label htmlFor="hostileWhenAttacked" className="text-xs cursor-pointer">Hostile When Attacked</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.pushable || false}
                      onCheckedChange={(checked) => handleFieldChange('pushable', checked)}
                      id="pushable"
                    />
                    <Label htmlFor="pushable" className="text-xs cursor-pointer">Pushable</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.canpushitems || false}
                      onCheckedChange={(checked) => handleFieldChange('canpushitems', checked)}
                      id="canpushitems"
                    />
                    <Label htmlFor="canpushitems" className="text-xs cursor-pointer">Can Push Items</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.canpushcreatures || false}
                      onCheckedChange={(checked) => handleFieldChange('canpushcreatures', checked)}
                      id="canpushcreatures"
                    />
                    <Label htmlFor="canpushcreatures" className="text-xs cursor-pointer">Can Push Creatures</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.challengeable || false}
                      onCheckedChange={(checked) => handleFieldChange('challengeable', checked)}
                      id="challengeable"
                    />
                    <Label htmlFor="challengeable" className="text-xs cursor-pointer">Challengeable</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.notMove || false}
                      onCheckedChange={(checked) => handleFieldChange('notMove', checked)}
                      id="notMove"
                    />
                    <Label htmlFor="notMove" className="text-xs cursor-pointer">Not Move</Label>
                  </div>
                </div>
              </div>

              {/* Flags Especiais */}
              <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-combat-special">
                <h5 className="text-sm font-semibold text-gray-300">
                  Flags Especiais
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.isboss || false}
                      onCheckedChange={(checked) => handleFieldChange('isboss', checked)}
                      id="isboss"
                    />
                    <Label htmlFor="isboss" className="text-xs cursor-pointer">Is Boss</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.hidehealth || false}
                      onCheckedChange={(checked) => handleFieldChange('hidehealth', checked)}
                      id="hidehealth"
                    />
                    <Label htmlFor="hidehealth" className="text-xs cursor-pointer">Hide Health</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.ignorespawnblock || false}
                      onCheckedChange={(checked) => handleFieldChange('ignorespawnblock', checked)}
                      id="ignorespawnblock"
                    />
                    <Label htmlFor="ignorespawnblock" className="text-xs cursor-pointer">Ignore Spawn Block</Label>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Combat Settings */}
            <div className="space-y-4">
              {/* Comportamento em Combate */}
              <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-combat-settings">
                <h5 className="text-sm font-semibold text-gray-300">
                  Comportamento em Combate
                </h5>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Target Distance</Label>
                      <Input
                        type="number"
                        value={editingMonster?.targetdistance || 1}
                        onChange={(e) => handleFieldChange('targetdistance', parseInt(e.target.value))}
                        disabled={!isEditing}
                        min="1"
                        max="10"
                        className="h-8 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Static Attack</Label>
                      <Input
                        type="number"
                        value={editingMonster?.staticattack || 0}
                        onChange={(e) => handleFieldChange('staticattack', parseInt(e.target.value))}
                        disabled={!isEditing}
                        min="0"
                        max="100"
                        className="h-8 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Run on Health %</Label>
                      <Input
                        type="number"
                        value={editingMonster?.runonhealth || 0}
                        onChange={(e) => handleFieldChange('runonhealth', parseInt(e.target.value))}
                        disabled={!isEditing}
                        min="0"
                        max="100"
                        className="h-8 mt-1"
                      />
                    </div>
                  </div>

                  {/* Target Change Settings - Separated */}
                  <div className="border-t pt-3">
                    <h6 className="text-xs font-medium text-gray-400 mb-2">Target Change Settings</h6>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500">Interval (ms)</Label>
                        <Input
                          type="number"
                          value={editingMonster?.targetChangeInterval || 0}
                          onChange={(e) => handleFieldChange('targetChangeInterval', parseInt(e.target.value))}
                          disabled={!isEditing}
                          min="0"
                          className="h-8 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Chance %</Label>
                        <Input
                          type="number"
                          value={editingMonster?.targetChangeChance || 0}
                          onChange={(e) => handleFieldChange('targetChangeChance', parseInt(e.target.value))}
                          disabled={!isEditing}
                          min="0"
                          max="100"
                          className="h-8 mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Movimento em Fields */}
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-semibold text-gray-300">
                  Movimento em Fields
                </h5>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.canwalkonenergy || false}
                      onCheckedChange={(checked) => handleFieldChange('canwalkonenergy', checked)}
                      id="canwalkonenergy"
                    />
                    <Label htmlFor="canwalkonenergy" className="text-xs cursor-pointer">Can Walk on Energy</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.canwalkonfire || false}
                      onCheckedChange={(checked) => handleFieldChange('canwalkonfire', checked)}
                      id="canwalkonfire"
                    />
                    <Label htmlFor="canwalkonfire" className="text-xs cursor-pointer">Can Walk on Fire</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={!isEditing}
                      checked={editingMonster?.canwalkonpoison || false}
                      onCheckedChange={(checked) => handleFieldChange('canwalkonpoison', checked)}
                      id="canwalkonpoison"
                    />
                    <Label htmlFor="canwalkonpoison" className="text-xs cursor-pointer">Can Walk on Poison</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Element Resistances and Immunities - Full Width Below */}
          <div className="grid grid-cols-2 gap-6">
            {/* Element Resistance */}
            <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-combat-resistance">
              <h5 className="text-sm font-semibold text-gray-300">
                Element Resistance
              </h5>
              <div className="grid grid-cols-1 gap-2">
                <CompactSlider
                  label="Physical"
                  value={editingMonster?.elements?.physicalPercent || 0}
                  onChange={(val) => handleFieldChange('elements', {...(editingMonster?.elements || {}), physicalPercent: val})}
                  disabled={!isEditing}
                  min={-100}
                  max={100}
                  showPercent
                />
                <CompactSlider
                  label="Death"
                  value={editingMonster?.elements?.deathPercent || 0}
                  onChange={(val) => handleFieldChange('elements', {...(editingMonster?.elements || {}), deathPercent: val})}
                  disabled={!isEditing}
                  min={-100}
                  max={100}
                  showPercent
                />
                <CompactSlider
                  label="Energy"
                  value={editingMonster?.elements?.energyPercent || 0}
                  onChange={(val) => handleFieldChange('elements', {...(editingMonster?.elements || {}), energyPercent: val})}
                  disabled={!isEditing}
                  min={-100}
                  max={100}
                  showPercent
                />
                <CompactSlider
                  label="Earth"
                  value={editingMonster?.elements?.earthPercent || 0}
                  onChange={(val) => handleFieldChange('elements', {...(editingMonster?.elements || {}), earthPercent: val})}
                  disabled={!isEditing}
                  min={-100}
                  max={100}
                  showPercent
                />
                <CompactSlider
                  label="Ice"
                  value={editingMonster?.elements?.icePercent || 0}
                  onChange={(val) => handleFieldChange('elements', {...(editingMonster?.elements || {}), icePercent: val})}
                  disabled={!isEditing}
                  min={-100}
                  max={100}
                  showPercent
                />
                <CompactSlider
                  label="Holy"
                  value={editingMonster?.elements?.holyPercent || 0}
                  onChange={(val) => handleFieldChange('elements', {...(editingMonster?.elements || {}), holyPercent: val})}
                  disabled={!isEditing}
                  min={-100}
                  max={100}
                  showPercent
                />
                <CompactSlider
                  label="Fire"
                  value={editingMonster?.elements?.firePercent || 0}
                  onChange={(val) => handleFieldChange('elements', {...(editingMonster?.elements || {}), firePercent: val})}
                  disabled={!isEditing}
                  min={-100}
                  max={100}
                  showPercent
                />
                <CompactSlider
                  label="Arcane"
                  value={editingMonster?.elements?.arcanePercent || 0}
                  onChange={(val) => handleFieldChange('elements', {...(editingMonster?.elements || {}), arcanePercent: val})}
                  disabled={!isEditing}
                  min={-100}
                  max={100}
                  showPercent
                />
              </div>
            </div>

            {/* Immunities */}
            <div className="border rounded-lg p-4 space-y-4" data-panel-id="monsters-details-combat-immunities">
              <h5 className="text-sm font-semibold text-gray-300">
                Immunities
              </h5>

              {/* Elemental Immunities */}
              <div className="space-y-2">
                <h6 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Elemental Immunities
                </h6>
                <div className="grid grid-cols-2 gap-2">
                  {['Fire', 'Ice', 'Death', 'Holy', 'Earth', 'Energy', 'Physical', 'Arcane'].map((immunity) => (
                    <div key={immunity} className="flex items-center gap-2">
                      <Checkbox
                        disabled={!isEditing}
                        checked={editingMonster?.immunities?.includes(immunity) || false}
                        onCheckedChange={(checked) => {
                          const currentImmunities = editingMonster?.immunities || [];
                          if (checked) {
                            handleFieldChange('immunities', [...currentImmunities, immunity]);
                          } else {
                            handleFieldChange('immunities', currentImmunities.filter(i => i !== immunity));
                          }
                        }}
                        id={`immunity-${immunity}`}
                      />
                      <Label htmlFor={`immunity-${immunity}`} className="text-xs cursor-pointer">{immunity}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Immunities */}
              <div className="space-y-2">
                <h6 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Other Immunities
                </h6>
                <div className="grid grid-cols-2 gap-2">
                  {['Drown', 'Lifedrain', 'Manadrain', 'Paralyze', 'Invisible', 'Pacified', 'Rooted', 'Outfit', 'Drunk'].map((immunity) => (
                    <div key={immunity} className="flex items-center gap-2">
                      <Checkbox
                        disabled={!isEditing}
                        checked={editingMonster?.immunities?.includes(immunity) || false}
                        onCheckedChange={(checked) => {
                          const currentImmunities = editingMonster?.immunities || [];
                          if (checked) {
                            handleFieldChange('immunities', [...currentImmunities, immunity]);
                          } else {
                            handleFieldChange('immunities', currentImmunities.filter(i => i !== immunity));
                          }
                        }}
                        id={`immunity-${immunity}`}
                      />
                      <Label htmlFor={`immunity-${immunity}`} className="text-xs cursor-pointer">{immunity}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* REWARDS TAB */}
        <TabsContent value="rewards" className="overflow-auto px-6 space-y-4 mt-0 pb-10" style={{ height: 'calc(100vh - 300px)' }} data-panel-id="monsters-details-rewards">
          {/* Balance XP/Loot Card - Main Focus */}
          <div className="border border-purple-500/50 rounded-lg p-4 bg-purple-500/5" data-panel-id="monsters-details-rewards-balance">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold text-purple-400">
                Balance XP/Loot
              </Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  disabled={!isEditing}
                  checked={editingMonster?.noLoot || false}
                  onCheckedChange={(checked) => handleFieldChange('noLoot', checked)}
                  id="noLoot"
                />
                <Label htmlFor="noLoot" className="text-xs cursor-pointer">No Loot</Label>
              </div>
            </div>

            {/* Visual Balance Slider */}
            <div className="space-y-4">
              <div className="relative">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span className="font-semibold text-blue-400">XP Focus</span>
                  <span className="text-gray-500">Balanced</span>
                  <span className="font-semibold text-yellow-400">Loot Focus</span>
                </div>

                {/* Custom Balance Slider */}
                <div className="relative h-12 bg-gray-800 rounded-lg p-1">
                  <div className="absolute inset-0 flex items-center justify-between px-2">
                    {['Exp4', 'Exp3', 'Exp2', 'Exp1', 'Equals', 'Loot1', 'Loot2', 'Loot3', 'Loot4'].map((value, index) => (
                      <button
                        key={value}
                        disabled={!isEditing}
                        onClick={() => handleFieldChange('resourceBalance', value)}
                        className={cn(
                          "w-10 h-10 rounded-md flex items-center justify-center text-xs font-medium transition-all",
                          editingMonster?.resourceBalance === value
                            ? index < 4
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                              : index === 4
                              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/50"
                              : "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/50"
                            : "hover:bg-gray-700 text-gray-400",
                          !isEditing && "cursor-not-allowed opacity-50"
                        )}
                      >
                        {value === 'Equals' ? '=' : value.replace('Exp', 'XP').replace('Loot', 'Loot')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Selection Display */}
                <div className="text-center mt-3">
                  <span className="text-sm text-gray-400">Current: </span>
                  <span className={cn(
                    "text-sm font-semibold",
                    editingMonster?.resourceBalance?.includes('Exp') ? "text-blue-400" :
                    editingMonster?.resourceBalance?.includes('Loot') ? "text-yellow-400" :
                    "text-purple-400"
                  )}>
                    {editingMonster?.resourceBalance || 'Equals'}
                  </span>
                  {(() => {
                    const resourceBalance = editingMonster?.resourceBalance || 'Equals';
                    let balance = 0;

                    if (resourceBalance.includes('Loot')) {
                      balance = parseInt(resourceBalance.replace('Loot', '')) || 0;
                    } else if (resourceBalance.includes('Exp')) {
                      balance = parseInt(resourceBalance.replace('Exp', '')) || 0;
                    }

                    if (balance > 0) {
                      const multiplier = getBalanceMultiplier(balance);
                      const percent = ((multiplier - 1) * 100).toFixed(1);
                      return (
                        <span className="text-sm text-gray-400 ml-2">
                          ({percent > 0 ? '+' : ''}{percent}%)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Warning message for No Loot + Loot balance conflict */}
                {editingMonster?.noLoot && editingMonster?.resourceBalance?.includes('Loot') && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/50 rounded-md">
                    <p className="text-xs text-red-400 text-center font-medium">
                      ⚠️ Conflito: "No Loot" marcado mas balanço favorece Loot
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Panel - XP/Gold Values */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <h5 className="text-sm font-semibold text-gray-300">XP/Level</h5>
                {(() => {
                  const power = editingMonster?.power || 0;
                  const resourceBalance = editingMonster?.resourceBalance || 'Equals';

                  // Converte resourceBalance para expBalance numérico
                  let expBalance = 0;
                  if (resourceBalance.includes('Exp')) {
                    expBalance = parseInt(resourceBalance.replace('Exp', '')) || 0;
                  }

                  const baseExp = getBaseExpByPower(power);
                  const multiplier = getBalanceMultiplier(expBalance);
                  const recommendedExp = Math.round(baseExp * multiplier);

                  if (recommendedExp > 0) {
                    return <span className="text-xs text-gray-400">(Rec: {recommendedExp})</span>;
                  }
                  return null;
                })()}
                {(() => {
                  const power = editingMonster?.power || 0;
                  const resourceBalance = editingMonster?.resourceBalance || 'Equals';

                  // Converte resourceBalance para expBalance numérico
                  let expBalance = 0;
                  if (resourceBalance.includes('Exp')) {
                    expBalance = parseInt(resourceBalance.replace('Exp', '')) || 0;
                  }

                  const baseExp = getBaseExpByPower(power);
                  const multiplier = getBalanceMultiplier(expBalance);
                  const recommendedExp = Math.round(baseExp * multiplier);

                  const info = getDeviationInfo(editingMonster?.experience, recommendedExp);
                  return info.show && <span className={`font-semibold text-xs ${info.color}`}>{info.formatted}</span>;
                })()}
              </div>
              <Input
                type="number"
                value={editingMonster?.experience || 0}
                onChange={(e) => handleFieldChange('experience', parseInt(e.target.value))}
                disabled={!isEditing}
                className="h-8"
                placeholder="Experience per level"
              />
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <h5 className="text-sm font-semibold text-gray-300">Class XP/Level</h5>
                {(() => {
                  const power = editingMonster?.power || 0;
                  const resourceBalance = editingMonster?.resourceBalance || 'Equals';

                  // Converte resourceBalance para expBalance numérico
                  let expBalance = 0;
                  if (resourceBalance.includes('Exp')) {
                    expBalance = parseInt(resourceBalance.replace('Exp', '')) || 0;
                  }

                  const baseExp = getBaseExpByPower(power);
                  const multiplier = getBalanceMultiplier(expBalance);
                  const recommendedExp = Math.round(baseExp * multiplier);

                  if (recommendedExp > 0) {
                    return <span className="text-xs text-gray-400">(Rec: {recommendedExp})</span>;
                  }
                  return null;
                })()}
                {(() => {
                  const power = editingMonster?.power || 0;
                  const resourceBalance = editingMonster?.resourceBalance || 'Equals';

                  // Converte resourceBalance para expBalance numérico
                  let expBalance = 0;
                  if (resourceBalance.includes('Exp')) {
                    expBalance = parseInt(resourceBalance.replace('Exp', '')) || 0;
                  }

                  const baseExp = getBaseExpByPower(power);
                  const multiplier = getBalanceMultiplier(expBalance);
                  const recommendedExp = Math.round(baseExp * multiplier);

                  const info = getDeviationInfo(editingMonster?.classXpPerLevel, recommendedExp);
                  return info.show && <span className={`font-semibold text-xs ${info.color}`}>{info.formatted}</span>;
                })()}
              </div>
              <Input
                type="number"
                value={editingMonster?.classXpPerLevel || 0}
                onChange={(e) => handleFieldChange('classXpPerLevel', parseInt(e.target.value))}
                disabled={!isEditing}
                className="h-8"
                placeholder="Class XP per level"
              />
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <h5 className="text-sm font-semibold text-gray-300">Budget/Kill/Lvl</h5>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-yellow-500 hover:text-yellow-400 cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md p-0 shadow-xl" sideOffset={5}>
                    <div className="p-4 bg-gray-950">
                      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-gray-800">
                        <div className="h-2 w-2 rounded-full bg-yellow-400" />
                        <p className="text-sm font-semibold text-gray-100">Gold per Kill by Power</p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 text-xs">
                        {/* Coluna esquerda: Power 0-7 */}
                        <div className="space-y-2">
                          {[0, 1, 2, 3, 4, 5, 6, 7].map((power) => {
                            const goldPerKill = getGoldCoinPerKillByPower(power);
                            const isCurrentPower = Math.round(editingMonster?.power || 0) === power;
                            return (
                              <div key={power} className={cn(
                                "flex justify-between items-center gap-4 px-2.5 py-1 rounded transition-colors",
                                isCurrentPower
                                  ? "bg-yellow-900/40 border border-yellow-600/50"
                                  : "hover:bg-gray-900"
                              )}>
                                <span className={cn(
                                  "font-medium min-w-[60px]",
                                  isCurrentPower ? "text-yellow-400" : "text-gray-400"
                                )}>
                                  Power {power.toString().padStart(2, '0')}
                                </span>
                                <span className={cn(
                                  "font-mono font-semibold tabular-nums",
                                  isCurrentPower ? "text-yellow-300" : "text-gray-300"
                                )}>
                                  {goldPerKill.toLocaleString()} gp
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Coluna direita: Power 8-15 */}
                        <div className="space-y-2">
                          {[8, 9, 10, 11, 12, 13, 14, 15].map((power) => {
                            const goldPerKill = getGoldCoinPerKillByPower(power);
                            const isCurrentPower = Math.round(editingMonster?.power || 0) === power;
                            return (
                              <div key={power} className={cn(
                                "flex justify-between items-center gap-4 px-2.5 py-1 rounded transition-colors",
                                isCurrentPower
                                  ? "bg-yellow-900/40 border border-yellow-600/50"
                                  : "hover:bg-gray-900"
                              )}>
                                <span className={cn(
                                  "font-medium min-w-[60px]",
                                  isCurrentPower ? "text-yellow-400" : "text-gray-400"
                                )}>
                                  Power {power.toString().padStart(2, '0')}
                                </span>
                                <span className={cn(
                                  "font-mono font-semibold tabular-nums",
                                  isCurrentPower ? "text-yellow-300" : "text-gray-300"
                                )}>
                                  {goldPerKill.toLocaleString()} gp
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
                {(() => {
                  const power = editingMonster?.power || 0;
                  const resourceBalance = editingMonster?.resourceBalance || 'Equals';
                  const goldPerKill = getGoldCoinPerKillByPower(power);
                  const recommendedLevel = getRecommendedDefaultLevel(power);

                  // Converte resourceBalance para lootBalance numérico
                  let lootBalance = 0;
                  if (resourceBalance.includes('Loot')) {
                    lootBalance = parseInt(resourceBalance.replace('Loot', '')) || 0;
                  }

                  const multiplier = getBalanceMultiplier(lootBalance);
                  const balancePercent = ((multiplier - 1) * 100).toFixed(1);
                  const budgetPerLevel = getGoldPerLevelByPower(power);
                  const finalBudget = parseFloat((budgetPerLevel * multiplier).toFixed(2));

                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-gray-500 font-mono cursor-help">
                          ({goldPerKill}/{recommendedLevel})
                          {multiplier > 1 && <span className="text-green-500 ml-1">+{balancePercent}%</span>}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold mb-2 text-gray-100">Cálculo do Budget</p>
                          <p><span className="text-gray-400">Gold/Kill:</span> <span className="text-gray-200">{goldPerKill} gp</span></p>
                          <p><span className="text-gray-400">Nível Recomendado:</span> <span className="text-gray-200">{recommendedLevel}</span></p>
                          <p><span className="text-gray-400">Budget Base:</span> <span className="text-gray-200">{goldPerKill} / {recommendedLevel} = {budgetPerLevel.toFixed(2)} gp/lvl</span></p>
                          {multiplier > 1 && (
                            <>
                              <p><span className="text-gray-400">Multiplicador Balance:</span> <span className="text-gray-200">×{multiplier.toFixed(2)} (+{balancePercent}%)</span></p>
                              <p className="font-semibold text-green-400 pt-1 border-t border-gray-700">
                                Budget Final: {finalBudget} gp/lvl
                              </p>
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              </div>
              <Input
                type="number"
                value={(() => {
                  // Se noLoot estiver marcado, retorna 0
                  if (editingMonster?.noLoot) {
                    return 0;
                  }

                  const power = editingMonster?.power || 0;
                  const resourceBalance = editingMonster?.resourceBalance || 'Equals';

                  // Converte resourceBalance para lootBalance numérico
                  let lootBalance = 0;
                  if (resourceBalance.includes('Loot')) {
                    lootBalance = parseInt(resourceBalance.replace('Loot', '')) || 0;
                  }

                  const baseGold = getGoldPerLevelByPower(power);
                  const multiplier = getBalanceMultiplier(lootBalance);
                  return parseFloat((baseGold * multiplier).toFixed(2));
                })()}
                readOnly
                disabled={true}
                className="h-8 opacity-60 text-center"
                placeholder="Gold per level"
              />
            </div>
          </div>

          {/* Loot Table */}
          <div className="border rounded-lg p-4 space-y-3" data-panel-id="monsters-details-rewards-loot">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-semibold text-gray-300">Loot Table</h5>
                {/* Error message when noLoot=1 but has loot items */}
                {editingMonster?.noLoot && editingMonster?.loot && editingMonster.loot.length > 0 && (
                  <span className="text-xs text-red-400 font-semibold ml-2">
                    ⚠️ ERRO: noLoot marcado mas há itens na tabela!
                  </span>
                )}
              </div>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newLoot = [...(editingMonster?.loot || []),
                      {
                        name: '',
                        ratio: 0.5,
                        chance: 0,
                        countMax: 1,
                        rarity: 'None',
                        origin: 'None',
                        priority: 0
                      }
                    ];
                    handleFieldChange('loot', newLoot);
                  }}
                  className="h-7"
                >
                  <Plus className="size-3 mr-1" />
                  Add Item
                </Button>
              )}
            </div>

            <MonsterLootTable
              loot={editingMonster?.loot || []}
              isEditing={isEditing}
              availableItems={availableItems}
              onLootChange={(newLoot) => handleFieldChange('loot', newLoot)}
              itemsMap={itemsMap}
              recommendedUnlockLevels={recommendedUnlockLevels}
              getUnlockLevelComparisonColor={getUnlockLevelComparisonColor}
            />
          </div>

          {/* Gold Drop/Kill and Drop Egg Panels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <h5 className="text-sm font-semibold text-gray-300">Gold Coins/Kill</h5>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-gray-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200 max-w-xs">
                      {(() => {
                        const baseGold = editingMonster?.baseGoldCoinsPerKill || 0;
                        const expectedGold = editingMonster?.goldCoinsPerKillPerLvl || 0;
                        const defaultLevel = editingMonster?.defaultLevel || 0;
                        const goldAtDefaultLevel = baseGold + (expectedGold * defaultLevel);

                        return (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold">Gold at Default Level ({defaultLevel}):</p>
                            <p className="text-sm font-mono">{goldAtDefaultLevel.toFixed(2)} gold</p>
                            <p className="text-xs text-gray-400 mt-2">
                              Formula: base + (expected × level)
                            </p>
                            <p className="text-xs text-gray-400">
                              {baseGold.toFixed(2)} + ({expectedGold.toFixed(2)} × {defaultLevel}) = {goldAtDefaultLevel.toFixed(2)}
                            </p>
                          </div>
                        );
                      })()}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div>
                {(() => {
                  const currentGold = editingMonster?.goldCoinsPerKillPerLvl || 0;

                  // Se noLoot estiver marcado, recomendação é 0
                  let recommendedGold = 0;
                  if (!editingMonster?.noLoot) {
                    // Calcula recomendação: 20% do Budget/Kill/Lvl
                    const power = editingMonster?.power || 0;
                    const budgetPerLevel = getGoldPerLevelByPower(power);
                    const resourceBalance = editingMonster?.resourceBalance || '';
                    let lootBalance = 0;
                    if (resourceBalance.includes('Loot')) {
                      lootBalance = parseInt(resourceBalance.replace('Loot', '')) || 0;
                    }
                    const balanceMultiplier = getBalanceMultiplier(lootBalance);
                    const budgetPerKillPerLevel = budgetPerLevel * balanceMultiplier;
                    const monsterPower = editingMonster?.power || 10;
                    recommendedGold = getRecommendedGoldCoinsPerKill(budgetPerKillPerLevel, monsterPower);
                  }

                  // Calcula desvio
                  const deviationInfo = getDeviationInfo(currentGold, recommendedGold);

                  return (
                    <>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        Expected Gold per Kill
                        {recommendedGold > 0 && (
                          <span className="text-gray-400">(Rec: {recommendedGold.toFixed(2)})</span>
                        )}
                        {editingMonster?.noLoot && (
                          <span className="text-gray-400">(Rec: 0)</span>
                        )}
                        {(() => {
                          const info = getDeviationInfo(currentGold, recommendedGold);
                          return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                        })()}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={currentGold}
                          onChange={(e) => handleFieldChange('goldCoinsPerKillPerLvl', parseFloat(e.target.value) || 0)}
                          disabled={!isEditing}
                          className="h-8 mt-1"
                          placeholder="0"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
              <div>
                {(() => {
                  const currentBaseGold = editingMonster?.baseGoldCoinsPerKill || 0;
                  const power = editingMonster?.power || 10;
                  const recommendedBaseGold = getRecommendedBaseGoldCoinsPerKill(power);

                  return (
                    <>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        Base Gold Coins per Kill
                        {recommendedBaseGold > 0 && (
                          <span className="text-gray-400">(Rec: {recommendedBaseGold})</span>
                        )}
                        {(() => {
                          const info = getDeviationInfo(currentBaseGold, recommendedBaseGold);
                          return info.show && <span className={`font-semibold ${info.color}`}>{info.formatted}</span>;
                        })()}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={currentBaseGold}
                          onChange={(e) => handleFieldChange('baseGoldCoinsPerKill', parseFloat(e.target.value) || 0)}
                          disabled={!isEditing}
                          className="h-8 mt-1"
                          placeholder="0"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <h5 className="text-sm font-semibold text-gray-300">Drop Egg</h5>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 mb-1">Egg ID</Label>
                  <Input
                    type="number"
                    value={editingMonster?.['egg-id'] || 0}
                    onChange={(e) => handleFieldChange('egg-id', parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    className="h-8"
                    placeholder="Item ID"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1">Chance (1 in X)</Label>
                  <Input
                    type="number"
                    value={editingMonster?.['egg-chance'] || 0}
                    onChange={(e) => handleFieldChange('egg-chance', parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    className="h-8"
                    min="0"
                    placeholder="2000"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ADVANCED TAB */}
        <TabsContent value="advanced" className="overflow-y-auto px-6 space-y-4 mt-0 pb-10" style={{ height: 'calc(100vh - 300px)' }} data-panel-id="monsters-details-advanced">
          {/* Advanced Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                disabled={!isEditing}
                checked={editingMonster?.ignoreDarkAndHorde || false}
                onCheckedChange={(checked) => handleFieldChange('ignoreDarkAndHorde', checked)}
                id="ignoreDark"
              />
              <Label htmlFor="ignoreDark" className="text-sm cursor-pointer font-medium">Ignore Dark/Horde</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                disabled={!isEditing}
                checked={editingMonster?.ignoreAreaLevel || false}
                onCheckedChange={(checked) => handleFieldChange('ignoreAreaLevel', checked)}
                id="ignoreAreaLevel"
              />
              <Label htmlFor="ignoreAreaLevel" className="text-sm cursor-pointer font-medium">Ignore Area Level</Label>
            </div>
          </div>

          {/* Summons */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold text-gray-300">Summons</h5>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Max:</span>
                <span className="text-xs text-gray-300 font-medium px-2 py-1 bg-gray-800 rounded">
                  {editingMonster?.maxSummons || 0}
                </span>
              </div>
            </div>

            {/* Summons List */}
            {editingMonster?.summons && editingMonster.summons.length > 0 && (
              <div className="space-y-2">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="text-left p-2 text-gray-400 font-medium">Name</th>
                        <th className="text-left p-2 text-gray-400 font-medium">Interval</th>
                        <th className="text-left p-2 text-gray-400 font-medium">Chance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingMonster.summons.map((summon, index) => (
                        <tr key={index} className="border-t border-gray-800">
                          <td className="p-2 text-gray-300">{summon.name}</td>
                          <td className="p-2 text-gray-400">{summon.interval}ms</td>
                          <td className="p-2 text-gray-400">{summon.chance}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="border rounded-lg p-4 space-y-3">
            <h5 className="text-sm font-semibold text-gray-300">Tags</h5>
            <Textarea
              value={editingMonster?.tags || ''}
              onChange={(e) => handleFieldChange('tags', e.target.value)}
              disabled={!isEditing}
              placeholder="Enter tags separated by commas"
              className="h-20 text-xs"
            />
          </div>

          {/* Difficulty Tags */}
          <div className="border rounded-lg p-4 space-y-3">
            <h5 className="text-sm font-semibold text-gray-300">Auto-generated Tags</h5>
            <div className="flex flex-wrap gap-2">
              {editingMonster?.runonhealth > 0 && <Badge variant="secondary">RunLowHealth</Badge>}
              {(editingMonster?.summons || []).length > 0 && <Badge variant="secondary">Summons</Badge>}
              {editingMonster?.targetdistance > 1 && <Badge variant="secondary">Ranged</Badge>}
              {!editingMonster?.hostile && !editingMonster?.hostileWhenAttacked && <Badge variant="success">Pacific</Badge>}
              {editingMonster?.isboss && <Badge variant="danger">Boss</Badge>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
};

export default MonsterDetailsOptimized;