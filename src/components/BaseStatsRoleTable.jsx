import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, ChevronUp, Filter, AlertTriangle, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ItemMultiSelect from './ItemMultiSelect';
import { loadItemsForAutocomplete } from '@/services/monsterItemService';
import { toast } from 'sonner';
import { baseStatsRoleColors } from '@/utils/baseStatsRoleCalculator';

const BaseStatsRoleTable = ({ allMonsters, powerRange, setPowerRange, ignoreCustomMapRole, setIgnoreCustomMapRole, onBaseStatsRoleDropsChange, lootCategory = 'imbuement' }) => {
  const [baseStatsRoleData, setBaseStatsRoleData] = useState({});
  const [expandedBaseStatsRoles, setExpandedBaseStatsRoles] = useState(new Set());
  const [baseStatsRoleDrops, setBaseStatsRoleDrops] = useState({});
  const [availableItems, setAvailableItems] = useState([]);
  const [lootCategoryTiers, setLootCategoryTiers] = useState({});
  const [sortColumn, setSortColumn] = useState('count'); // 'baseStatsRole', 'count', 'avgPower', 'minPower', 'maxPower'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

  useEffect(() => {
    if (!allMonsters || allMonsters.length === 0) return;

    // Process monsters and extract baseStatsRoles
    const baseStatsRoleMap = {};

    allMonsters.forEach(monster => {
      // Handle monsters with no baseStatsRole as "None"
      const baseStatsRole = monster.baseStatsRole || 'None';

      if (!baseStatsRoleMap[baseStatsRole]) {
        baseStatsRoleMap[baseStatsRole] = [];
      }

      baseStatsRoleMap[baseStatsRole].push({
        name: monster.monsterName,
        power: monster.power || 0,
        hp: monster.hp || 0,
        atk: monster.atk || 0,
        def: monster.def || 0,
        loot: monster.loot || [],
        mapRole: monster.mapRole || 'None', // Include mapRole for filtering
        originalRace: monster.race || 'None', // Store original race string for overlap detection
        baseStatsRole: monster.baseStatsRole || 'None'
      });
    });

    setBaseStatsRoleData(baseStatsRoleMap);
  }, [allMonsters]);

  // Load available items (filtered by lootCategory)
  useEffect(() => {
    const loadItems = async () => {
      try {
        const items = await loadItemsForAutocomplete();
        setAvailableItems(items);
      } catch (error) {
        console.error('Error loading items:', error);
      }
    };
    loadItems();
  }, []);

  // Load baseStatsRole drops from API
  useEffect(() => {
    const loadBaseStatsRoleDrops = async () => {
      try {
        const response = await fetch('/api/base-stats-role-drops');
        if (response.ok) {
          const drops = await response.json();

          // Normalize old structure to new structure
          const normalizedDrops = {};
          Object.entries(drops).forEach(([baseStatsRole, value]) => {
            if (Array.isArray(value)) {
              // Old structure: convert to new structure
              normalizedDrops[baseStatsRole] = {
                'imbuement': value
              };
            } else {
              // New structure: use as is
              normalizedDrops[baseStatsRole] = value;
            }
          });

          setBaseStatsRoleDrops(normalizedDrops);
        }
      } catch (error) {
        console.error('Error loading baseStatsRole drops:', error);
      }
    };
    loadBaseStatsRoleDrops();
  }, []);

  // Load loot category tiers configuration
  useEffect(() => {
    const loadLootCategoryTiers = async () => {
      try {
        const response = await fetch('/data/loot-monster/loot-category-tiers.json');
        if (response.ok) {
          const tiers = await response.json();
          setLootCategoryTiers(tiers);
        }
      } catch (error) {
        console.error('Error loading loot-category-tiers:', error);
      }
    };
    loadLootCategoryTiers();
  }, []);

  const toggleBaseStatsRole = (baseStatsRole) => {
    const newExpanded = new Set(expandedBaseStatsRoles);
    if (newExpanded.has(baseStatsRole)) {
      newExpanded.delete(baseStatsRole);
    } else {
      newExpanded.add(baseStatsRole);
    }
    setExpandedBaseStatsRoles(newExpanded);
  };

  // Calculate statistics for each baseStatsRole
  const getBaseStatsRoleStats = (monsters) => {
    if (!monsters || monsters.length === 0) return { count: 0, avgPower: 0, maxPower: 0, minPower: 0 };

    const powers = monsters.map(m => m.power).filter(p => p > 0);
    return {
      count: monsters.length,
      avgPower: powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : 0,
      maxPower: powers.length > 0 ? Math.max(...powers) : 0,
      minPower: powers.length > 0 ? Math.min(...powers) : 0
    };
  };

  // Filtered and sorted baseStatsRole data
  const sortedBaseStatsRoleData = useMemo(() => {
    // First filter monsters by power range and map role
    const filteredBaseStatsRoleData = {};
    Object.entries(baseStatsRoleData).forEach(([baseStatsRole, monsters]) => {
      const filteredMonsters = monsters.filter(m => {
        const power = m.power || 0;
        const powerInRange = power >= powerRange[0] && power <= powerRange[1];
        const notCustom = ignoreCustomMapRole ? (m.mapRole !== 'Custom') : true;
        return powerInRange && notCustom;
      });

      // Only include baseStatsRoles that have monsters after filtering
      if (filteredMonsters.length > 0) {
        filteredBaseStatsRoleData[baseStatsRole] = filteredMonsters;
      }
    });

    // Then sort the filtered data
    const entries = Object.entries(filteredBaseStatsRoleData).map(([baseStatsRole, monsters]) => {
      const stats = getBaseStatsRoleStats(monsters);
      return { baseStatsRole, monsters, stats };
    });

    entries.sort((a, b) => {
      let compareValue = 0;

      switch(sortColumn) {
        case 'baseStatsRole':
          compareValue = a.baseStatsRole.localeCompare(b.baseStatsRole);
          break;
        case 'count':
          compareValue = a.stats.count - b.stats.count;
          break;
        case 'avgPower':
          compareValue = a.stats.avgPower - b.stats.avgPower;
          break;
        case 'minPower':
          compareValue = a.stats.minPower - b.stats.minPower;
          break;
        case 'maxPower':
          compareValue = a.stats.maxPower - b.stats.maxPower;
          break;
        default:
          compareValue = a.stats.count - b.stats.count;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    // Convert back to object format but maintain order
    const sorted = {};
    entries.forEach(({ baseStatsRole, monsters }) => {
      sorted[baseStatsRole] = monsters.sort((a, b) => b.power - a.power);
    });

    return sorted;
  }, [baseStatsRoleData, sortColumn, sortDirection, powerRange, ignoreCustomMapRole]);

  // Handle column header click for sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Handle drop change for a baseStatsRole
  const handleDropChange = async (baseStatsRole, newItemNames) => {
    try {
      // Update local state
      const updatedDrops = {
        ...baseStatsRoleDrops,
        [baseStatsRole]: {
          ...(baseStatsRoleDrops[baseStatsRole] || {}),
          [lootCategory]: newItemNames
        }
      };
      setBaseStatsRoleDrops(updatedDrops);

      // Save to API
      const response = await fetch('/api/base-stats-role-drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDrops)
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(`Drops de ${lootCategory} atualizados para Base Stats Role ${baseStatsRole}`);

      // Notify parent component that baseStatsRole drops changed
      if (onBaseStatsRoleDropsChange) {
        onBaseStatsRoleDropsChange(updatedDrops);
      }
    } catch (error) {
      console.error('Error saving drop:', error);
      toast.error('Erro ao salvar drops');
    }
  };

  // Calculate eligible items for a monster based on power and tier configuration
  const getMonsterEligibleItems = (baseStatsRole, monsterPower) => {
    const baseStatsRoleDropsByCategory = baseStatsRoleDrops[baseStatsRole] || {};
    const eligibleItems = [];

    // Process items for the current lootCategory
    const baseStatsRoleItemNames = baseStatsRoleDropsByCategory[lootCategory] || [];

    baseStatsRoleItemNames.forEach(itemName => {
      // Find item details
      const item = availableItems.find(i => i.name === itemName);
      if (!item) return;

      const tier = item.tier;

      // Get tier configuration
      const tierConfig = lootCategoryTiers[lootCategory]?.[tier];
      if (!tierConfig) return;

      // Check if monster power is within range
      const { powerMin, powerMax, chance } = tierConfig;
      if (monsterPower >= powerMin && monsterPower <= powerMax) {
        eligibleItems.push({
          name: itemName,
          lootCategory: lootCategory,
          tier: tier,
          chance: chance
        });
      }
    });

    return eligibleItems;
  };

  // Check if a monster has overlapping drops (not applicable for base stats role since each monster has only one)
  const hasOverlappingDrops = (monster) => {
    // Base stats role is single-valued, so no overlap possible within same grouping
    // However, we keep the function for compatibility
    return { hasOverlap: false };
  };


  return (
    <div className="w-full h-full bg-gray-950/50 rounded-lg overflow-hidden flex flex-col">
      {/* Filter Bar */}
      <div className="p-3 bg-gray-900/50 border-b border-gray-800 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Label className="text-sm text-gray-300">Power Range:</Label>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={powerRange[0]}
            onChange={(e) => setPowerRange([parseFloat(e.target.value) || 0, powerRange[1]])}
            className="w-20 h-8 bg-gray-800 border-gray-700"
            min="0"
            max="15"
            step="0.1"
          />
          <span className="text-gray-500">-</span>
          <Input
            type="number"
            value={powerRange[1]}
            onChange={(e) => setPowerRange([powerRange[0], parseFloat(e.target.value) || 15])}
            className="w-20 h-8 bg-gray-800 border-gray-700"
            min="0"
            max="15"
            step="0.1"
          />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="ignore-custom"
              checked={ignoreCustomMapRole}
              onCheckedChange={setIgnoreCustomMapRole}
              className="scale-90"
            />
            <Label
              htmlFor="ignore-custom"
              className="text-sm text-gray-300 cursor-pointer"
            >
              Ignore Custom
            </Label>
          </div>
          <div className="text-sm text-gray-400">
            Showing {Object.keys(sortedBaseStatsRoleData).length} baseStatsRoles • {Object.values(sortedBaseStatsRoleData).reduce((sum, monsters) => sum + monsters.length, 0)} monsters
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-scroll"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #111827',
        }}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
            <TableRow className="border-b border-gray-800">
              <TableHead className="text-gray-400 w-[40px]"></TableHead>
              <TableHead
                className="text-gray-400 cursor-pointer hover:text-gray-200"
                onClick={() => handleSort('baseStatsRole')}
              >
                <div className="flex items-center gap-1">
                  Base Stats Role
                  {sortColumn === 'baseStatsRole' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                  <Popover>
                    <PopoverTrigger onClick={(e) => e.stopPropagation()}>
                      <HelpCircle className="h-3 w-3 text-gray-600 hover:text-gray-400 cursor-help" />
                    </PopoverTrigger>
                    <PopoverContent className="w-96 bg-gray-900 border-gray-700" sideOffset={5}>
                      <div className="space-y-3 text-sm">
                        <h4 className="font-semibold text-gray-200">Base Stats Roles</h4>
                        <div className="space-y-2 text-gray-400">
                          <p><span className="text-blue-400 font-semibold">MixedAttacker:</span> Ataque balanceado físico e especial</p>
                          <p><span className="text-red-400 font-semibold">PhysicalAttacker:</span> Focado em ataque físico (ATK &gt; SpATK)</p>
                          <p><span className="text-purple-400 font-semibold">SpecialAttacker:</span> Focado em ataque especial (SpATK &gt; ATK)</p>
                          <p><span className="text-green-400 font-semibold">PhysicalTank:</span> Alta defesa física e HP</p>
                          <p><span className="text-cyan-400 font-semibold">SpecialTank:</span> Alta defesa especial e HP</p>
                          <p><span className="text-orange-400 font-semibold">GlassCannon:</span> Alto ataque mas defesas baixas</p>
                          <p><span className="text-yellow-400 font-semibold">Speedster:</span> Alta velocidade com bom ataque</p>
                          <p><span className="text-indigo-400 font-semibold">StallOrSupport:</span> Focado em defesa, baixo ataque</p>
                          <p><span className="text-emerald-400 font-semibold">BulkyOffense:</span> Bom ataque com boa defesa e HP</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Calculado automaticamente baseado nos stats do monstro
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TableHead>
              <TableHead
                className="text-gray-400 text-center cursor-pointer hover:text-gray-200"
                onClick={() => handleSort('count')}
              >
                <div className="flex items-center justify-center gap-1">
                  Monsters
                  {sortColumn === 'count' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="text-gray-400 text-center cursor-pointer hover:text-gray-200"
                onClick={() => handleSort('avgPower')}
              >
                <div className="flex items-center justify-center gap-1">
                  Avg Power
                  {sortColumn === 'avgPower' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="text-gray-400 text-center cursor-pointer hover:text-gray-200"
                onClick={() => handleSort('minPower')}
              >
                <div className="flex items-center justify-center gap-1">
                  Min Power
                  {sortColumn === 'minPower' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="text-gray-400 text-center cursor-pointer hover:text-gray-200"
                onClick={() => handleSort('maxPower')}
              >
                <div className="flex items-center justify-center gap-1">
                  Max Power
                  {sortColumn === 'maxPower' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-gray-400">
                {lootCategory.charAt(0).toUpperCase() + lootCategory.slice(1)} Drops {lootCategoryTiers[lootCategory]?.priority && (
                  <span className="text-gray-500 text-xs">({lootCategoryTiers[lootCategory].priority})</span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(sortedBaseStatsRoleData).map(([baseStatsRole, monsters]) => {
              const stats = getBaseStatsRoleStats(monsters);
              const isExpanded = expandedBaseStatsRoles.has(baseStatsRole);

              const categoryValue = baseStatsRoleDrops[baseStatsRole]?.[lootCategory] || [];

              return (
                <React.Fragment key={baseStatsRole}>
                  {/* BaseStatsRole header row */}
                  <TableRow
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => toggleBaseStatsRole(baseStatsRole)}
                  >
                    <TableCell className="p-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-sm font-medium border-gray-600 ${baseStatsRoleColors[baseStatsRole] || 'text-gray-400'}`}>
                        {baseStatsRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-gray-300">
                      {stats.count}
                    </TableCell>
                    <TableCell className="text-center text-gray-300">
                      {stats.avgPower > 0 ? stats.avgPower.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell className="text-center text-gray-300">
                      {stats.minPower > 0 ? stats.minPower.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell className="text-center text-gray-300">
                      {stats.maxPower > 0 ? stats.maxPower.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ItemMultiSelect
                        value={categoryValue}
                        onChange={(value) => handleDropChange(baseStatsRole, value)}
                        availableItems={availableItems.filter(item => item.lootCategory === lootCategory)}
                        placeholder={`Select ${lootCategory} items...`}
                        filterLabel={`lootCategory: ${lootCategory}`}
                      />
                    </TableCell>
                  </TableRow>

                  {/* Sub-header for expanded baseStatsRole */}
                  {isExpanded && (
                    <>
                      <TableRow className="bg-gray-800/20 border-b border-gray-700/50">
                        <TableCell></TableCell>
                        <TableCell className="pl-8 py-2">
                          <span className="text-xs text-gray-500 font-medium">Monster Name</span>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <span className="text-xs text-gray-500 font-medium">All BaseStatsRoles</span>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <span className="text-xs text-gray-500 font-medium">Power</span>
                        </TableCell>
                        <TableCell className="text-center py-2" colSpan={2}>
                          <span className="text-xs text-gray-500 font-medium">Drop %</span>
                        </TableCell>
                      </TableRow>

                      {/* Monster detail rows */}
                      {monsters.map((monster, index) => {
                        const overlapInfo = hasOverlappingDrops(monster);

                        return (
                        <TableRow
                          key={`${baseStatsRole}-${index}`}
                          className="border-b border-gray-800/30 bg-gray-900/30"
                        >
                          <TableCell></TableCell>
                          <TableCell className="pl-8 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                              {monster.name.toLowerCase()}
                              {overlapInfo.hasOverlap && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm bg-gray-900 border-gray-700">
                                      <div className="space-y-2 text-sm">
                                        <h4 className="font-semibold text-yellow-400">⚠️ Tier Overlap</h4>
                                        <p className="text-gray-300">
                                          Este monstro tem múltiplas baseStatsRoles com drops do mesmo tier. A chance de TODOS os items desse tier será dividida automaticamente.
                                        </p>
                                        <div className="mt-2">
                                          <p className="text-xs text-gray-400 font-medium mb-1">Tiers afetados:</p>
                                          {overlapInfo.overlappingTiers.map((tierInfo, idx) => (
                                            <div key={idx} className="text-xs text-gray-300 mb-2">
                                              <div className="font-medium text-yellow-400">Tier: {tierInfo.tier}</div>
                                              <div className="text-gray-500 ml-2">BaseStatsRoles: {tierInfo.baseStatsRoles.join(' + ')}</div>
                                              <div className="ml-2 mt-1">
                                                {tierInfo.items.map((item, itemIdx) => (
                                                  <div key={itemIdx}>
                                                    • {item.item} <span className="text-gray-600">({item.baseStatsRole})</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-wrap justify-center gap-1">
                              {(monster.baseStatsRole || 'None').split(';').map((r, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className={`text-xs border-gray-600 ${baseStatsRoleColors[r.trim()] || 'text-gray-400'}`}
                                >
                                  {r.trim()}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-400">
                            {monster.power.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-left text-sm text-gray-500 px-4" colSpan={2}>
                            {(() => {
                              const eligibleItems = getMonsterEligibleItems(baseStatsRole, monster.power);
                              if (eligibleItems.length === 0) {
                                return <span className="text-gray-600">No drops</span>;
                              }
                              return (
                                <div className="space-y-1">
                                  {eligibleItems.map((item, idx) => (
                                    <div key={idx} className="text-xs">
                                      {item.name} <span className="text-gray-600">({item.lootCategory})</span> - <span className="text-yellow-500">{item.chance}%</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BaseStatsRoleTable;