import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, ChevronUp, Filter, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ItemMultiSelect from './ItemMultiSelect';
import { loadItemsForAutocomplete } from '@/services/monsterItemService';
import { toast } from 'sonner';

const RaceTable = ({ allMonsters, powerRange, setPowerRange, ignoreCustomMapRole, setIgnoreCustomMapRole, onRaceDropsChange, lootCategory = 'imbuement' }) => {
  const [raceData, setRaceData] = useState({});
  const [expandedRaces, setExpandedRaces] = useState(new Set());
  const [raceDrops, setRaceDrops] = useState({});
  const [availableItems, setAvailableItems] = useState([]);
  const [lootCategoryTiers, setLootCategoryTiers] = useState({});
  const [sortColumn, setSortColumn] = useState('count'); // 'race', 'count', 'avgPower', 'minPower', 'maxPower'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

  useEffect(() => {
    if (!allMonsters || allMonsters.length === 0) return;

    // Process monsters and extract races
    const raceMap = {};

    allMonsters.forEach(monster => {
      // Handle monsters with no race as "None"
      const raceValue = monster.race || 'None';

      // Split races by semicolon
      const races = raceValue.split(';').map(r => r.trim()).filter(r => r);

      races.forEach(race => {
        if (!raceMap[race]) {
          raceMap[race] = [];
        }

        raceMap[race].push({
          name: monster.monsterName,
          power: monster.power || 0,
          hp: monster.hp || 0,
          atk: monster.atk || 0,
          def: monster.def || 0,
          loot: monster.loot || [],
          mapRole: monster.mapRole || 'None', // Include mapRole for filtering
          originalRace: monster.race || 'None' // Store original race string
        });
      });
    });

    setRaceData(raceMap);
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

  // Load race drops from API
  useEffect(() => {
    const loadRaceDrops = async () => {
      try {
        const response = await fetch('/api/race-drops');
        if (response.ok) {
          const drops = await response.json();

          // Normalize old structure to new structure
          const normalizedDrops = {};
          Object.entries(drops).forEach(([race, value]) => {
            if (Array.isArray(value)) {
              // Old structure: convert to new structure
              normalizedDrops[race] = {
                'imbuement': value
              };
            } else {
              // New structure: use as is
              normalizedDrops[race] = value;
            }
          });

          setRaceDrops(normalizedDrops);
        }
      } catch (error) {
        console.error('Error loading race drops:', error);
      }
    };
    loadRaceDrops();
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

  const toggleRace = (race) => {
    const newExpanded = new Set(expandedRaces);
    if (newExpanded.has(race)) {
      newExpanded.delete(race);
    } else {
      newExpanded.add(race);
    }
    setExpandedRaces(newExpanded);
  };

  // Calculate statistics for each race
  const getRaceStats = (monsters) => {
    if (!monsters || monsters.length === 0) return { count: 0, avgPower: 0, maxPower: 0, minPower: 0 };

    const powers = monsters.map(m => m.power).filter(p => p > 0);
    return {
      count: monsters.length,
      avgPower: powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : 0,
      maxPower: powers.length > 0 ? Math.max(...powers) : 0,
      minPower: powers.length > 0 ? Math.min(...powers) : 0
    };
  };

  // Filtered and sorted race data
  const sortedRaceData = useMemo(() => {
    // First filter monsters by power range and map role
    const filteredRaceData = {};
    Object.entries(raceData).forEach(([race, monsters]) => {
      const filteredMonsters = monsters.filter(m => {
        const power = m.power || 0;
        const powerInRange = power >= powerRange[0] && power <= powerRange[1];
        const notCustom = ignoreCustomMapRole ? (m.mapRole !== 'Custom') : true;
        return powerInRange && notCustom;
      });

      // Only include races that have monsters after filtering
      if (filteredMonsters.length > 0) {
        filteredRaceData[race] = filteredMonsters;
      }
    });

    // Then sort the filtered data
    const entries = Object.entries(filteredRaceData).map(([race, monsters]) => {
      const stats = getRaceStats(monsters);
      return { race, monsters, stats };
    });

    entries.sort((a, b) => {
      let compareValue = 0;

      switch(sortColumn) {
        case 'race':
          compareValue = a.race.localeCompare(b.race);
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
    entries.forEach(({ race, monsters }) => {
      sorted[race] = monsters.sort((a, b) => b.power - a.power);
    });

    return sorted;
  }, [raceData, sortColumn, sortDirection, powerRange, ignoreCustomMapRole]);

  // Handle column header click for sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Handle drop change for a race
  const handleDropChange = async (race, newItemNames) => {
    try {
      // Update local state
      const updatedDrops = {
        ...raceDrops,
        [race]: {
          ...(raceDrops[race] || {}),
          [lootCategory]: newItemNames
        }
      };
      setRaceDrops(updatedDrops);

      // Save to API
      const response = await fetch('/api/race-drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDrops)
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(`Drops de ${lootCategory} atualizados para race ${race}`);

      // Notify parent component that race drops changed
      if (onRaceDropsChange) {
        onRaceDropsChange(updatedDrops);
      }
    } catch (error) {
      console.error('Error saving drop:', error);
      toast.error('Erro ao salvar drops');
    }
  };

  // Calculate eligible items for a monster based on power and tier configuration
  const getMonsterEligibleItems = (race, monsterPower, monster) => {
    const raceDropsByCategory = raceDrops[race] || {};
    const eligibleItems = [];

    // Process items for the current lootCategory
    const raceItemNames = raceDropsByCategory[lootCategory] || [];

    raceItemNames.forEach(itemName => {
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
        // Check if this tier has overlap for this monster
        const overlapInfo = hasOverlappingDrops(monster);
        const tierHasOverlap = overlapInfo.overlappingTiers?.some(t => t.tier === tier);

        eligibleItems.push({
          name: itemName,
          lootCategory: lootCategory,
          tier: tier,
          chance: chance,
          hasOverlap: tierHasOverlap
        });
      }
    });

    return eligibleItems;
  };

  // Check if a monster has overlapping drops (multiple races with same-tier items)
  const hasOverlappingDrops = (monster) => {
    const races = (monster.originalRace || 'None').split(';').map(r => r.trim()).filter(r => r);
    if (races.length < 2) return { hasOverlap: false };

    // Get eligible items from each race, grouped by tier
    const tiersByRace = {}; // race -> { tier -> [items] }
    races.forEach(race => {
      const raceDropsByCategory = raceDrops[race] || {};
      const raceItemNames = raceDropsByCategory[lootCategory] || [];
      tiersByRace[race] = {};

      raceItemNames.forEach(itemName => {
        const item = availableItems.find(i => i.name === itemName);
        if (!item) return;

        const tierConfig = lootCategoryTiers[lootCategory]?.[item.tier];
        if (!tierConfig) return;

        const { powerMin, powerMax } = tierConfig;
        if (monster.power >= powerMin && monster.power <= powerMax) {
          if (!tiersByRace[race][item.tier]) {
            tiersByRace[race][item.tier] = [];
          }
          tiersByRace[race][item.tier].push(itemName);
        }
      });
    });

    // Check for tier overlaps - if multiple races have items of the same tier
    const tierOverlaps = {}; // tier -> [races that have this tier]
    races.forEach(race => {
      Object.keys(tiersByRace[race] || {}).forEach(tier => {
        if (!tierOverlaps[tier]) {
          tierOverlaps[tier] = [];
        }
        tierOverlaps[tier].push(race);
      });
    });

    // Find tiers that appear in multiple races
    const overlappingTiers = [];
    Object.entries(tierOverlaps).forEach(([tier, racesWithTier]) => {
      if (racesWithTier.length > 1) {
        // Collect all items of this tier from all races
        const allItemsOfThisTier = [];
        racesWithTier.forEach(race => {
          const items = tiersByRace[race][tier] || [];
          items.forEach(itemName => {
            allItemsOfThisTier.push({ item: itemName, race });
          });
        });

        overlappingTiers.push({
          tier,
          races: racesWithTier,
          items: allItemsOfThisTier
        });
      }
    });

    return {
      hasOverlap: overlappingTiers.length > 0,
      overlappingTiers
    };
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
            Showing {Object.keys(sortedRaceData).length} races • {Object.values(sortedRaceData).reduce((sum, monsters) => sum + monsters.length, 0)} monsters
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
                onClick={() => handleSort('race')}
              >
                <div className="flex items-center gap-1">
                  Race
                  {sortColumn === 'race' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
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
            {Object.entries(sortedRaceData).map(([race, monsters]) => {
              const stats = getRaceStats(monsters);
              const isExpanded = expandedRaces.has(race);

              const categoryValue = raceDrops[race]?.[lootCategory] || [];

              return (
                <React.Fragment key={race}>
                  {/* Race header row */}
                  <TableRow
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => toggleRace(race)}
                  >
                    <TableCell className="p-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-sm font-medium">
                        {race}
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
                        onChange={(value) => handleDropChange(race, value)}
                        availableItems={availableItems.filter(item => item.lootCategory === lootCategory)}
                        placeholder={`Select ${lootCategory} items...`}
                        filterLabel={`lootCategory: ${lootCategory}`}
                      />
                    </TableCell>
                  </TableRow>

                  {/* Expanded monster details - Independent table */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <div className="w-full overflow-x-auto">
                          <Table className="w-full table-fixed">
                            <TableHeader>
                              <TableRow className="bg-gray-800/20 border-b border-gray-700/50">
                                <TableHead className="w-[300px] pl-8 py-2">
                                  <span className="text-xs text-gray-500 font-medium">Monster Name</span>
                                </TableHead>
                                <TableHead className="w-[180px] text-center py-2">
                                  <span className="text-xs text-gray-500 font-medium">All Races</span>
                                </TableHead>
                                <TableHead className="w-[100px] text-center py-2">
                                  <span className="text-xs text-gray-500 font-medium">Power</span>
                                </TableHead>
                                <TableHead className="text-left py-2">
                                  <span className="text-xs text-gray-500 font-medium">Drop %</span>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {monsters.map((monster, index) => {
                                const overlapInfo = hasOverlappingDrops(monster);

                                return (
                                  <TableRow
                                    key={`${race}-${index}`}
                                    className="border-b border-gray-800/30 bg-gray-900/30"
                                  >
                                    <TableCell className="pl-8 text-sm text-gray-400">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate">{monster.name.toLowerCase()}</span>
                                        {overlapInfo.hasOverlap && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                              </TooltipTrigger>
                                              <TooltipContent className="max-w-sm bg-gray-900 border-gray-700">
                                                <div className="space-y-2 text-sm">
                                                  <h4 className="font-semibold text-yellow-400">⚠️ Tier Overlap</h4>
                                                  <p className="text-gray-300">
                                                    Este monstro tem múltiplas races com drops do mesmo tier. A chance de TODOS os items desse tier será dividida automaticamente.
                                                  </p>
                                                  <div className="mt-2">
                                                    <p className="text-xs text-gray-400 font-medium mb-1">Tiers afetados:</p>
                                                    {overlapInfo.overlappingTiers.map((tierInfo, idx) => (
                                                      <div key={idx} className="text-xs text-gray-300 mb-2">
                                                        <div className="font-medium text-yellow-400">Tier: {tierInfo.tier}</div>
                                                        <div className="text-gray-500 ml-2">Races: {tierInfo.races.join(' + ')}</div>
                                                        <div className="ml-2 mt-1">
                                                          {tierInfo.items.map((item, itemIdx) => (
                                                            <div key={itemIdx}>
                                                              • {item.item} <span className="text-gray-600">({item.race})</span>
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
                                        {(monster.originalRace || 'None').split(';').map((r, i) => (
                                          <Badge
                                            key={i}
                                            variant="outline"
                                            className="text-xs border-gray-600"
                                          >
                                            {r.trim()}
                                          </Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-gray-400">
                                      {monster.power.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-left text-sm text-gray-500 px-4">
                                      {(() => {
                                        const eligibleItems = getMonsterEligibleItems(race, monster.power, monster);
                                        if (eligibleItems.length === 0) {
                                          return <span className="text-gray-600">No drops</span>;
                                        }
                                        return (
                                          <div className="space-y-1">
                                            {eligibleItems.map((item, idx) => {
                                              const realChance = item.chance;
                                              const dividedChance = item.hasOverlap ? realChance / 2 : realChance;

                                              return (
                                                <div key={idx} className="text-xs">
                                                  {item.name} <span className="text-gray-600">({item.lootCategory})</span> -
                                                  {item.hasOverlap ? (
                                                    <span className="text-yellow-500">
                                                      {' '}{dividedChance.toFixed(2)}% <span className="text-gray-600">(real: {realChance}% ÷ 2)</span>
                                                    </span>
                                                  ) : (
                                                    <span className="text-yellow-500"> {realChance}%</span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
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

export default RaceTable;