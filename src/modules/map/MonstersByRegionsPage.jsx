import { useEffect, useState, useMemo } from 'react';
import { Container } from '@/components/common/container';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, MapPin, Ghost, Target, TrendingUp, Hammer, Map as MapIcon, Filter, Package, Copy } from 'lucide-react';
import BaldurService from '@/services/baldurService';
import MonsterInputChip from '@/components/MonsterInputChip';
import ItemMultiSelect from '@/components/ItemMultiSelect';
import { ItemsService } from '@/services/itemsService';
import { toast } from 'sonner';

export function MonstersByRegionsPage() {
  usePageTitle('Monsters by Regions');

  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [speciesModalOpen, setSpeciesModalOpen] = useState(false);
  const [craftAccumulationModalOpen, setCraftAccumulationModalOpen] = useState(false);
  const [buildableItems, setBuildableItems] = useState([]);
  const [selectedMonsters, setSelectedMonsters] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [spawnPositionsModalOpen, setSpawnPositionsModalOpen] = useState(false);
  const [spawnPositionsData, setSpawnPositionsData] = useState(null);
  const [loadingSpawnPositions, setLoadingSpawnPositions] = useState(false);

  useEffect(() => {
    loadMonstersByRegion();
    loadBuildableItemsData();
    loadAvailableItems();
  }, []);

  async function loadAvailableItems() {
    try {
      const items = await ItemsService.loadItemsFromXML('monster-loot');
      setAvailableItems(items);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  }

  async function loadBuildableItemsData() {
    const items = await BaldurService.loadBuildableItems();
    setBuildableItems(items);
  }

  async function loadMonstersByRegion() {
    try {
      setLoading(true);
      setLoadingProgress(0);
      setError(null);

      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 500);

      const response = await fetch('/api/map/monsters-by-region');
      const data = await response.json();

      clearInterval(progressInterval);
      setLoadingProgress(100);

      if (!data.success) {
        throw new Error(data.error || 'Failed to load monsters by region');
      }

      setRegions(data.regions || []);
    } catch (err) {
      console.error('Erro ao carregar monstros por região:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectRegion(region) {
    setSelectedRegion(region);
    setSelectedArea(null); // Reset selected area when changing region
  }

  function handleSelectArea(area) {
    setSelectedArea(area);
  }

  async function loadSpawnPositions(monsterName, areaId) {
    try {
      setLoadingSpawnPositions(true);
      setSpawnPositionsModalOpen(true);

      const response = await fetch(`/api/map/monster-spawn-positions?monsterName=${encodeURIComponent(monsterName)}&areaId=${encodeURIComponent(areaId)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load spawn positions');
      }

      setSpawnPositionsData(data);
    } catch (err) {
      console.error('Error loading spawn positions:', err);
      setSpawnPositionsData({ error: err.message });
    } finally {
      setLoadingSpawnPositions(false);
    }
  }

  function getSortedSpecies() {
    if (!selectedRegion?.uniqueSpecies) return [];

    const species = [...selectedRegion.uniqueSpecies];

    // Sort: first by hasPrimaryCraft (with unlock <= maxLevel), then by maxLevel
    return species.sort((a, b) => {
      const aCraftUnlocked = a.hasPrimaryCraft && a.primaryCraftUnlockLevel <= a.maxLevel;
      const bCraftUnlocked = b.hasPrimaryCraft && b.primaryCraftUnlockLevel <= b.maxLevel;

      if (aCraftUnlocked && !bCraftUnlocked) return -1;
      if (!aCraftUnlocked && bCraftUnlocked) return 1;

      // If both have craft or both don't, sort by maxLevel
      return a.maxLevel - b.maxLevel;
    });
  }

  function findFinalItemForMaterial(materialName) {
    if (!buildableItems || buildableItems.length === 0) return materialName;

    // Find the first buildable item that uses this material
    const finalItem = buildableItems.find(item =>
      item.build.some(buildMaterial =>
        buildMaterial.itemName.toLowerCase() === materialName.toLowerCase()
      )
    );

    return finalItem ? finalItem.itemName : materialName;
  }

  // Get all unique monsters from all regions
  const allMonsters = useMemo(() => {
    if (!regions || regions.length === 0) return [];

    const monstersMap = new Map();

    regions.forEach(region => {
      const allAreas = [...(region.areas || []), ...(region.shrines || [])];
      allAreas.forEach(area => {
        area.monsters?.forEach(monster => {
          if (!monstersMap.has(monster.name)) {
            monstersMap.set(monster.name, {
              monsterName: monster.name,
              power: monster.power || 0
            });
          }
        });
      });
    });

    return Array.from(monstersMap.values()).sort((a, b) =>
      a.monsterName.localeCompare(b.monsterName)
    );
  }, [regions]);

  // Filter regions based on selected monsters and items
  const filteredRegions = useMemo(() => {
    if (!regions) return regions;

    // Early return if no filters active
    if (selectedMonsters.length === 0 && selectedItems.length === 0) {
      return regions;
    }

    const selectedMonsterNames = selectedMonsters.length > 0
      ? new Set(selectedMonsters.map(m => m.name?.toLowerCase()))
      : null;

    const selectedItemNames = selectedItems.length > 0
      ? new Set(selectedItems.map(itemName => itemName?.toLowerCase()))
      : null;

    return regions.map(region => {
      const regionVarLevel = region.regionVarLevel || 0;

      // Helper function to check if monster passes item filter
      const passesItemFilter = (monster, areaVarLevel) => {
        if (!selectedItemNames) return true; // No item filter active

        // Calculate effective level for this monster in this area
        const totalVarLevel = regionVarLevel + areaVarLevel;
        const effectiveLevel = Math.round(monster.defaultLevel * (1 + totalVarLevel / 100));

        // Check if monster drops any of the selected items with correct unlock_level
        return monster.lootItems?.some(lootItem => {
          const itemNameLower = lootItem.name.toLowerCase();
          const itemSelected = selectedItemNames.has(itemNameLower);
          const itemUnlocked = lootItem.unlockLevel <= effectiveLevel;
          return itemSelected && itemUnlocked;
        }) || false;
      };

      // Helper function to check if monster passes all filters
      const passesAllFilters = (monster, areaVarLevel) => {
        // Check monster name filter
        const passesMonsterFilter = !selectedMonsterNames ||
          selectedMonsterNames.has(monster.name.toLowerCase());

        // Check item filter
        const passesItemCheck = passesItemFilter(monster, areaVarLevel);

        // Must pass both filters (AND logic between filters, OR logic within item filter)
        return passesMonsterFilter && passesItemCheck;
      };

      // Filter areas and shrines
      const filteredAreas = region.areas?.map(area => {
        const filteredMonsters = area.monsters.filter(monster =>
          passesAllFilters(monster, area.areaVarLevel || 0)
        );

        if (filteredMonsters.length === 0) return null;

        return {
          ...area,
          monsters: filteredMonsters
        };
      }).filter(Boolean) || [];

      const filteredShrines = region.shrines?.map(shrine => {
        const filteredMonsters = shrine.monsters.filter(monster =>
          passesAllFilters(monster, shrine.areaVarLevel || 0)
        );

        if (filteredMonsters.length === 0) return null;

        return {
          ...shrine,
          monsters: filteredMonsters
        };
      }).filter(Boolean) || [];

      // Calculate totals for filtered region
      const totalSpawns = [
        ...(filteredAreas || []),
        ...(filteredShrines || [])
      ].reduce((sum, area) => {
        return sum + area.monsters.reduce((areaSum, m) => areaSum + m.count, 0);
      }, 0);

      const uniqueMonsters = new Set();
      [...filteredAreas, ...filteredShrines].forEach(area => {
        area.monsters.forEach(m => uniqueMonsters.add(m.name));
      });

      return {
        ...region,
        areas: filteredAreas,
        shrines: filteredShrines,
        totalSpawns,
        totalAreas: filteredAreas.length,
        totalShrines: filteredShrines.length,
        totalUniqueMonsters: uniqueMonsters.size
      };
    }).filter(region =>
      (region.areas?.length || 0) + (region.shrines?.length || 0) > 0
    );
  }, [regions, selectedMonsters, selectedItems]);

  // Calculate totals across all filtered regions
  const totalSummary = useMemo(() => {
    if (!filteredRegions || filteredRegions.length === 0) {
      return {
        totalRegions: 0,
        totalAreas: 0,
        totalShrines: 0,
        totalSpawns: 0,
        totalUniqueMonsters: 0,
        totalAvailableCrafts: 0
      };
    }

    const uniqueMonsters = new Set();
    const uniqueCrafts = new Set();
    let totalAreas = 0;
    let totalShrines = 0;
    let totalSpawns = 0;

    filteredRegions.forEach(region => {
      totalAreas += region.totalAreas || 0;
      totalShrines += region.totalShrines || 0;
      totalSpawns += region.totalSpawns || 0;

      // Add unique monsters and crafts from this region
      const allAreas = [...(region.areas || []), ...(region.shrines || [])];
      allAreas.forEach(area => {
        area.monsters?.forEach(monster => {
          uniqueMonsters.add(monster.name);

          // Check if monster has craft unlocked at this effective level
          if (monster.hasPrimaryCraft && monster.primaryCraftItemName) {
            const regionVarLevel = region.regionVarLevel || 0;
            const areaVarLevel = area.areaVarLevel || 0;
            const totalVarLevel = regionVarLevel + areaVarLevel;
            const effectiveLevel = Math.round(monster.defaultLevel * (1 + totalVarLevel / 100));

            if (monster.primaryCraftUnlockLevel <= effectiveLevel) {
              uniqueCrafts.add(monster.primaryCraftItemName);
            }
          }
        });
      });
    });

    return {
      totalRegions: filteredRegions.length,
      totalAreas,
      totalShrines,
      totalSpawns,
      totalUniqueMonsters: uniqueMonsters.size,
      totalAvailableCrafts: uniqueCrafts.size
    };
  }, [filteredRegions]);

  function getCraftAccumulationData() {
    if (!regions || regions.length === 0) return [];

    // Sort regions by minLevel (ascending)
    const sortedRegions = [...regions].sort((a, b) => a.minLevel - b.minLevel);

    // Global map to track crafts across all regions: materialName -> { finalItemName, monsterName, spawnsByRegion: Map }
    const globalCrafts = new Map();

    return sortedRegions.map(region => {
      // Get all monsters with crafts from all areas and shrines (data from API already has correct calculations)
      const allAreas = [...(region.areas || []), ...(region.shrines || [])];

      allAreas.forEach(area => {
        area.monsters?.forEach(monster => {
          // Check if monster has craft data from API
          if (monster.hasPrimaryCraft && monster.primaryCraftItemName && monster.primaryCraftUnlockLevel) {
            const materialName = monster.primaryCraftItemName;

            // Calculate effective level using same logic as "Detalhes da Área"
            const regionVarLevel = region.regionVarLevel || 0;
            const areaVarLevel = area.areaVarLevel || 0;
            const totalVarLevel = regionVarLevel + areaVarLevel;
            const effectiveLevel = Math.round(monster.defaultLevel * (1 + totalVarLevel / 100));

            // Only count if craft is unlocked at this effective level (same logic as panel 3)
            if (monster.primaryCraftUnlockLevel <= effectiveLevel) {
              if (!globalCrafts.has(materialName)) {
                const finalItemName = findFinalItemForMaterial(materialName);
                globalCrafts.set(materialName, {
                  materialName,
                  finalItemName,
                  monsterName: monster.name,
                  spawnsByRegion: new Map()
                });
              }

              const craftData = globalCrafts.get(materialName);
              const currentCount = craftData.spawnsByRegion.get(region.name) || 0;
              craftData.spawnsByRegion.set(region.name, currentCount + monster.count);
            }
          }
        });
      });

      // Build accumulated list for this region
      const accumulatedCrafts = [];
      globalCrafts.forEach((craftData) => {
        const currentRegionSpawns = craftData.spawnsByRegion.get(region.name) || 0;

        // Calculate total accumulated spawns up to this region
        let totalSpawns = 0;
        sortedRegions.forEach(r => {
          if (r.minLevel <= region.minLevel) {
            totalSpawns += craftData.spawnsByRegion.get(r.name) || 0;
          }
        });

        // Get breakdown by region (only regions up to current)
        const breakdown = [];
        sortedRegions.forEach(r => {
          if (r.minLevel <= region.minLevel) {
            const spawns = craftData.spawnsByRegion.get(r.name) || 0;
            if (spawns > 0) {
              breakdown.push({ regionName: r.name, spawns });
            }
          }
        });

        accumulatedCrafts.push({
          materialName: craftData.materialName,
          finalItemName: craftData.finalItemName,
          monsterName: craftData.monsterName,
          currentRegionSpawns,
          totalSpawns,
          breakdown
        });
      });

      // Calculate missing crafts
      const availableFinalItems = new Set(accumulatedCrafts.map(c => c.finalItemName.toLowerCase()));
      const missingCrafts = buildableItems
        .filter(item => !availableFinalItems.has(item.itemName.toLowerCase()))
        .map(item => item.itemName)
        .sort((a, b) => a.localeCompare(b));

      // Return region data with accumulated crafts sorted by total spawns (descending)
      return {
        regionName: region.name,
        minLevel: region.minLevel,
        recommendedLevel: region.recommendedLevel,
        crafts: accumulatedCrafts.sort((a, b) => b.totalSpawns - a.totalSpawns),
        totalBuildableItems: buildableItems.length,
        missingCrafts
      };
    });
  }

  return (
    <Container data-panel-id="map-monsters-by-regions" className="!px-2.5 lg:!px-3.5">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold text-gray-100">Monstros por Região</h1>
          <p className="text-xs text-gray-400">
            Visualize spawns de monstros organizados por região e área
          </p>
        </div>

        {/* Filters - Monster and Item side by side */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="py-2">
            <div className="flex items-center gap-3">
              {/* Monster Filter */}
              <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <MonsterInputChip
                    value={selectedMonsters}
                    onChange={setSelectedMonsters}
                    allMonsters={allMonsters}
                    placeholder="Filtrar por monstro..."
                  />
                </div>
                {selectedMonsters.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 text-xs flex-shrink-0">
                    {selectedMonsters.length} filtro{selectedMonsters.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-700 flex-shrink-0" />

              {/* Item Filter */}
              <div className="flex items-center gap-2 flex-1">
                <Package className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <ItemMultiSelect
                    value={selectedItems}
                    onChange={setSelectedItems}
                    availableItems={availableItems}
                    placeholder="Filtrar por items dropados..."
                    filterLabel="lootCategory: any"
                  />
                </div>
                {selectedItems.length > 0 && (
                  <Badge variant="secondary" className="bg-emerald-600/20 text-emerald-400 text-xs flex-shrink-0">
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Progress Bar */}
        {loading && (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="py-3">
              <div className="flex items-center gap-4">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">Analisando spawns de monstros...</span>
                    <span className="text-xs text-gray-500">{loadingProgress}%</span>
                  </div>
                  <Progress value={loadingProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="py-3">
              <p className="text-red-400 text-sm">Erro ao carregar monstros: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Painéis Horizontais - 3 colunas */}
        {!error && (
          <div className="flex gap-2 h-[calc(100vh-200px)]" data-panel-id="map-monsters-layout">
            {/* Painel 1 - Resumo das Regiões (33%) */}
            <div className="w-[33%] h-full" data-panel-id="map-monsters-regions-list">
              <Card className="h-full flex flex-col bg-gray-900 border-gray-700">
                <CardHeader className="py-2.5 flex-shrink-0 border-b border-gray-700">
                  <CardHeading>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-200">Resumo das Regiões</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCraftAccumulationModalOpen(true)}
                          className="px-2 py-1 text-[10px] font-medium text-emerald-300 bg-emerald-900/30 hover:bg-emerald-900/50 rounded border border-emerald-600/50 hover:border-emerald-500 transition-colors flex items-center gap-1"
                        >
                          <Hammer className="size-3" />
                          Crafts Acumulados
                        </button>
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-xs">
                          {filteredRegions.length} regiões
                        </Badge>
                      </div>
                    </div>
                  </CardHeading>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-2 p-3">
                      {/* Total Summary Card */}
                      {!loading && filteredRegions.length > 0 && (
                        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 mb-1">
                          <CardContent className="p-2">
                            <div className="flex flex-col gap-2">
                              {/* Header */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="size-3.5 text-blue-400 flex-shrink-0" />
                                  <h3 className="font-semibold text-blue-300 text-xs">
                                    TOTAL GERAL
                                  </h3>
                                </div>
                                <Badge variant="outline" className="border-blue-500 text-blue-300 text-[9px] px-1.5 py-0">
                                  {totalSummary.totalRegions} {totalSummary.totalRegions === 1 ? 'região' : 'regiões'}
                                </Badge>
                              </div>

                              {/* Statistics */}
                              <div className="grid grid-cols-5 gap-1 text-[10px]">
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-blue-500/10 border border-blue-500/30">
                                  <MapIcon className="size-3 text-blue-400" />
                                  <span className="text-gray-400">Áreas</span>
                                  <span className="font-semibold text-blue-200">{totalSummary.totalAreas}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-purple-500/10 border border-purple-500/30">
                                  <Target className="size-3 text-purple-400" />
                                  <span className="text-gray-400">Shrines</span>
                                  <span className="font-semibold text-purple-200">{totalSummary.totalShrines}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-red-500/10 border border-red-500/30">
                                  <Ghost className="size-3 text-red-400" />
                                  <span className="text-gray-400">Spawns</span>
                                  <span className="font-semibold text-red-200">{totalSummary.totalSpawns}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-green-500/10 border border-green-500/30">
                                  <TrendingUp className="size-3 text-green-400" />
                                  <span className="text-gray-400">Espécies</span>
                                  <span className="font-semibold text-green-200">{totalSummary.totalUniqueMonsters}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-emerald-500/10 border border-emerald-500/30">
                                  <Hammer className="size-3 text-emerald-400" />
                                  <span className="text-gray-400">Crafts</span>
                                  <span className="font-semibold text-emerald-200">{totalSummary.totalAvailableCrafts}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {filteredRegions.map((region) => {
                        const isSelected = selectedRegion?.name === region.name;

                        return (
                          <Card
                            key={region.name}
                            className={`cursor-pointer transition-all bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 ${
                              isSelected ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20' : ''
                            }`}
                            onClick={() => handleSelectRegion(region)}
                            data-panel-id={`map-monsters-region-${region.name}`}
                          >
                            <CardContent className="p-2">
                              <div className="flex flex-col gap-2">
                                {/* Header da região */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <MapPin className="size-3 text-blue-400 flex-shrink-0" />
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <h3 className="font-medium text-gray-100 text-xs truncate">
                                        {region.name}
                                      </h3>
                                      {region.recommendedLevel && (
                                        <span className="text-[10px] text-gray-500">
                                          Lv {region.recommendedLevel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="border-gray-600 text-gray-400 text-[9px] px-1.5 py-0 flex-shrink-0">
                                    {region.regionVarLevel > 0 ? `+${region.regionVarLevel}` : region.regionVarLevel}%
                                  </Badge>
                                </div>

                                {/* Statistics */}
                                <div className="grid grid-cols-5 gap-1 text-[10px]">
                                  <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-gray-900/80 border border-gray-700/50">
                                    <MapIcon className="size-3 text-blue-400" />
                                    <span className="text-gray-500">Áreas</span>
                                    <span className="font-semibold text-gray-200">{region.totalAreas}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-gray-900/80 border border-gray-700/50">
                                    <Target className="size-3 text-purple-400" />
                                    <span className="text-gray-500">Shrines</span>
                                    <span className="font-semibold text-gray-200">{region.totalShrines || 0}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-gray-900/80 border border-gray-700/50">
                                    <Ghost className="size-3 text-red-400" />
                                    <span className="text-gray-500">Spawns</span>
                                    <span className="font-semibold text-gray-200">{region.totalSpawns}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-gray-900/80 border border-gray-700/50">
                                    <TrendingUp className="size-3 text-green-400" />
                                    <span className="text-gray-500">Espécies</span>
                                    <span className="font-semibold text-gray-200">{region.totalUniqueMonsters}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-gray-900/80 border border-gray-700/50">
                                    <Hammer className="size-3 text-emerald-400" />
                                    <span className="text-gray-500">Crafts</span>
                                    <span className="font-semibold text-gray-200">{region.availablePrimaryCrafts || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {filteredRegions.length === 0 && !loading && (
                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-8">
                            <p className="text-center text-gray-400 text-sm">
                              {selectedMonsters.length > 0
                                ? 'Nenhuma região com os monstros filtrados'
                                : 'Nenhuma região encontrada'}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Painel 2 - Detalhes da Região (41%) */}
            <div className="w-[41%] min-w-[300px] h-full" data-panel-id="map-monsters-region-details">
              <Card className="h-full flex flex-col bg-gray-900 border-gray-700">
                <CardHeader className="py-2.5 flex-shrink-0 border-b border-gray-700">
                  <CardHeading>
                    <span className="text-sm font-medium text-gray-200">Detalhes da Região</span>
                  </CardHeading>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {!selectedRegion ? (
                    <div className="h-full flex items-center justify-center p-6">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                          <MapPin className="size-8 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-300 font-medium mb-1">Nenhuma região selecionada</p>
                          <p className="text-xs text-gray-500">
                            Selecione uma região para visualizar<br/>suas áreas e shrines
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="flex flex-col gap-2 p-3">
                        {/* Header da Região Selecionada */}
                        <Card className="border-blue-500/50 bg-blue-500/5">
                          <CardContent className="p-3">
                            <div className="flex flex-col gap-2">
                              {/* Header com título e botão */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="size-3.5 text-blue-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-sm font-semibold text-blue-400 truncate">
                                        {selectedRegion.name}
                                      </h3>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        {selectedRegion.recommendedLevel && (
                                          <span className="text-[10px] text-gray-500">
                                            Lv {selectedRegion.recommendedLevel}
                                          </span>
                                        )}
                                        <Badge variant="outline" className="border-gray-600 text-gray-400 text-[9px] px-1.5 py-0">
                                          {selectedRegion.regionVarLevel > 0 ? `+${selectedRegion.regionVarLevel}` : selectedRegion.regionVarLevel}%
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSpeciesModalOpen(true)}
                                  className="px-2 py-1 text-[10px] font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 hover:border-gray-500 transition-colors flex-shrink-0"
                                >
                                  Ver Espécies
                                </button>
                              </div>

                              {/* Estatísticas em grid */}
                              <div className="grid grid-cols-5 gap-1 text-[10px]">
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-blue-500/10 border border-blue-500/20">
                                  <MapIcon className="size-3 text-blue-400" />
                                  <span className="text-gray-400">Áreas</span>
                                  <span className="font-semibold text-gray-100">{selectedRegion.totalAreas}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-blue-500/10 border border-blue-500/20">
                                  <Target className="size-3 text-purple-400" />
                                  <span className="text-gray-400">Shrines</span>
                                  <span className="font-semibold text-gray-100">{selectedRegion.totalShrines || 0}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-blue-500/10 border border-blue-500/20">
                                  <Ghost className="size-3 text-red-400" />
                                  <span className="text-gray-400">Spawns</span>
                                  <span className="font-semibold text-gray-100">{selectedRegion.totalSpawns}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-blue-500/10 border border-blue-500/20">
                                  <TrendingUp className="size-3 text-green-400" />
                                  <span className="text-gray-400">Espécies</span>
                                  <span className="font-semibold text-gray-100">{selectedRegion.totalUniqueMonsters}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-center p-1 rounded bg-blue-500/10 border border-blue-500/20">
                                  <Hammer className="size-3 text-emerald-400" />
                                  <span className="text-gray-400">Crafts</span>
                                  <span className="font-semibold text-gray-100">{selectedRegion.availablePrimaryCrafts || 0}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Lista de Áreas */}
                        {selectedRegion.areas?.sort((a, b) => (b.availablePrimaryCrafts || 0) - (a.availablePrimaryCrafts || 0)).map((area) => {
                          const uniqueMonsters = new Set(area.monsters.map(m => m.name)).size;
                          const totalSpawns = area.monsters.reduce((sum, m) => sum + m.count, 0);
                          const isSelected = selectedArea?.areaId === area.areaId;

                          return (
                            <Card
                              key={area.areaId}
                              className={`cursor-pointer transition-all bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 ${
                                isSelected ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20' : ''
                              }`}
                              onClick={() => handleSelectArea(area)}
                            >
                              <CardContent className="py-2 px-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <MapIcon className="size-3 text-blue-400 flex-shrink-0" />
                                    <span className="text-xs font-medium text-gray-100 truncate">{area.areaName}</span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 text-[9px]">
                                    <Badge variant="outline" className="border-gray-600 text-gray-400 px-1.5 py-0">
                                      {area.areaVarLevel > 0 ? `+${area.areaVarLevel}` : area.areaVarLevel}%
                                    </Badge>
                                    <Badge variant="outline" className="border-gray-600 text-gray-500 px-1.5 py-0 flex items-center gap-0.5">
                                      <TrendingUp className="size-2.5" />
                                      {uniqueMonsters}
                                    </Badge>
                                    <Badge variant="outline" className="border-gray-600 text-gray-500 px-1.5 py-0 flex items-center gap-0.5">
                                      <Ghost className="size-2.5" />
                                      {totalSpawns}
                                    </Badge>
                                    {area.availablePrimaryCrafts > 0 && (
                                      <Badge variant="outline" className="border-emerald-600 text-emerald-400 px-1.5 py-0">
                                        <Hammer className="size-2 mr-0.5" />
                                        {area.availablePrimaryCrafts}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}

                        {/* Lista de Shrines */}
                        {selectedRegion.shrines?.sort((a, b) => (b.availablePrimaryCrafts || 0) - (a.availablePrimaryCrafts || 0)).map((shrine) => {
                          const uniqueMonsters = new Set(shrine.monsters.map(m => m.name)).size;
                          const totalSpawns = shrine.monsters.reduce((sum, m) => sum + m.count, 0);
                          const isSelected = selectedArea?.areaId === shrine.areaId;

                          return (
                            <Card
                              key={shrine.areaId}
                              className={`cursor-pointer transition-all bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 ${
                                isSelected ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/20' : ''
                              }`}
                              onClick={() => handleSelectArea(shrine)}
                            >
                              <CardContent className="py-2 px-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Target className="size-3 text-purple-400 flex-shrink-0" />
                                    <span className="text-xs font-medium text-gray-100 truncate">{shrine.areaName}</span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 text-[9px]">
                                    <Badge variant="outline" className="border-gray-600 text-gray-400 px-1.5 py-0">
                                      {shrine.areaVarLevel > 0 ? `+${shrine.areaVarLevel}` : shrine.areaVarLevel}%
                                    </Badge>
                                    <Badge variant="outline" className="border-gray-600 text-gray-500 px-1.5 py-0 flex items-center gap-0.5">
                                      <TrendingUp className="size-2.5" />
                                      {uniqueMonsters}
                                    </Badge>
                                    <Badge variant="outline" className="border-gray-600 text-gray-500 px-1.5 py-0 flex items-center gap-0.5">
                                      <Ghost className="size-2.5" />
                                      {totalSpawns}
                                    </Badge>
                                    {shrine.availablePrimaryCrafts > 0 && (
                                      <Badge variant="outline" className="border-emerald-600 text-emerald-400 px-1.5 py-0">
                                        <Hammer className="size-2 mr-0.5" />
                                        {shrine.availablePrimaryCrafts}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}

                        {(!selectedRegion.areas || selectedRegion.areas.length === 0) && (!selectedRegion.shrines || selectedRegion.shrines.length === 0) && (
                          <Card className="bg-gray-800 border-gray-700">
                            <CardContent className="p-8">
                              <div className="flex flex-col items-center gap-3 text-center">
                                <div className="p-3 rounded-lg bg-gray-900/50">
                                  <Ghost className="size-8 text-gray-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-400 mb-0.5">
                                    Nenhuma área ou shrine encontrada
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Esta região não possui áreas mapeadas
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Painel 3 - Detalhes da Área (26%) */}
            <div className="w-[26%] min-w-[300px] h-full" data-panel-id="map-monsters-area-details">
              <Card className="h-full flex flex-col bg-gray-900 border-gray-700">
                <CardHeader className="py-2.5 flex-shrink-0 border-b border-gray-700">
                  <CardHeading>
                    <span className="text-sm font-medium text-gray-200">Detalhes da Área</span>
                  </CardHeading>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {!selectedArea ? (
                    <div className="h-full flex items-center justify-center p-6">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                          {selectedRegion ? <MapIcon className="size-8 text-gray-600" /> : <Ghost className="size-8 text-gray-600" />}
                        </div>
                        <div>
                          <p className="text-sm text-gray-300 font-medium mb-1">Nenhuma área selecionada</p>
                          <p className="text-xs text-gray-500">
                            Selecione uma área/shrine para visualizar<br/>seus monstros
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="flex flex-col gap-2 p-3">
                        {/* Header da Área Selecionada */}
                        <Card className="border-blue-500/50 bg-blue-500/5">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              {selectedArea.areaName.toUpperCase().includes('SHRINE') ? (
                                <Target className="size-3.5 text-purple-400 flex-shrink-0" />
                              ) : (
                                <MapIcon className="size-3.5 text-blue-400 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-blue-400 truncate">
                                  {selectedArea.areaName}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="border-gray-600 text-gray-400 text-[9px] px-1.5 py-0">
                                    VarLv {selectedArea.areaVarLevel > 0 ? `+${selectedArea.areaVarLevel}` : selectedArea.areaVarLevel}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Lista de Monstros */}
                        {selectedArea.monsters
                          .sort((a, b) => {
                            // First, group by craft availability
                            const aHasCraft = a.hasPrimaryCraft ? 1 : 0;
                            const bHasCraft = b.hasPrimaryCraft ? 1 : 0;
                            if (bHasCraft !== aHasCraft) return bHasCraft - aHasCraft;

                            // Then sort by spawn count
                            return b.count - a.count;
                          })
                          .map((monster, idx) => {
                            // Calculate effective level
                            const regionVarLevel = selectedRegion?.regionVarLevel || 0;
                            const areaVarLevel = selectedArea.areaVarLevel || 0;
                            const totalVarLevel = regionVarLevel + areaVarLevel;
                            const varLevelMultiplier = totalVarLevel / 100;
                            const effectiveLevel = Math.round(monster.defaultLevel * (1 + varLevelMultiplier));
                            const craftUnlocked = monster.hasPrimaryCraft && monster.primaryCraftUnlockLevel <= effectiveLevel;

                            return (
                              <div
                                key={`${selectedArea.areaId}-${monster.name}-${idx}`}
                                className={`p-1.5 rounded border ${
                                  monster.hasPrimaryCraft
                                    ? 'bg-emerald-900/10 border-emerald-700/30'
                                    : 'bg-gray-800 border-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Ghost className="size-3 text-red-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    {/* Line 1: Name, Power, Default Level */}
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-medium text-gray-100 text-[11px] truncate">
                                        {monster.name}
                                      </p>
                                      <span className="text-[9px] text-gray-600">•</span>
                                      <span className="text-[9px] text-gray-500">Power {monster.power.toFixed(1)}</span>
                                      <span className="text-[9px] text-gray-600">•</span>
                                      <span className="text-[9px] text-gray-500">Base Lv {monster.defaultLevel}</span>
                                    </div>

                                    {/* Line 2: VarLevel calculation and Effective Level */}
                                    <div className="flex items-center gap-1 text-[9px]">
                                      <span className="text-gray-600">
                                        {regionVarLevel > 0 ? `+${regionVarLevel}` : regionVarLevel}%
                                        {areaVarLevel !== 0 && (
                                          <>
                                            <span className="font-bold text-gray-300"> +</span> {areaVarLevel > 0 ? `+${areaVarLevel}` : areaVarLevel}%</>
                                        )}{' '}
                                      </span>
                                        = {totalVarLevel > 0 ? `+${totalVarLevel}` : totalVarLevel}%
                                      <span className="text-gray-600">→</span>
                                      <span className="font-semibold text-green-400">
                                        Lv {effectiveLevel}
                                      </span>
                                    </div>

                                    {/* Line 3: Craft info (if available) */}
                                    {monster.hasPrimaryCraft && (
                                      <div className="flex items-center gap-1 text-[9px] mt-0.5">
                                        <Hammer className="size-2.5 text-emerald-400" />
                                        {craftUnlocked ? (
                                          <>
                                            <span className="text-emerald-400 font-medium">
                                              Craft Lv {monster.primaryCraftUnlockLevel}
                                            </span>
                                            {monster.primaryCraftItemName && (
                                              <>
                                                <span className="text-gray-600">→</span>
                                                <span className="text-emerald-300">{monster.primaryCraftItemName}</span>
                                              </>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-gray-500">
                                              Craft Lv {monster.primaryCraftUnlockLevel} (bloqueado)
                                            </span>
                                            {monster.primaryCraftItemName && (
                                              <>
                                                <span className="text-gray-600">→</span>
                                                <span className="text-gray-600">{monster.primaryCraftItemName}</span>
                                              </>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <Badge
                                    variant="outline"
                                    className="border-gray-600 text-gray-400 text-[9px] px-1.5 py-0 flex-shrink-0 cursor-pointer hover:border-blue-500 hover:text-blue-400 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadSpawnPositions(monster.name, selectedArea.areaId);
                                    }}
                                  >
                                    {monster.count} spawn{monster.count !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Species Modal */}
        <Dialog open={speciesModalOpen} onOpenChange={setSpeciesModalOpen}>
          <DialogContent className="max-w-4xl bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-100">
                Espécies da Região - {selectedRegion?.name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[600px] mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-900 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Monstro</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Power</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Level Min</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Level Max</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Craft</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {getSortedSpecies().map((species) => {
                      const craftUnlocked = species.hasPrimaryCraft && species.primaryCraftUnlockLevel <= species.maxLevel;

                      return (
                        <tr
                          key={species.name}
                          className={`hover:bg-gray-800/50 transition-colors ${
                            craftUnlocked ? 'bg-emerald-900/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Ghost className="size-4 text-red-400 flex-shrink-0" />
                              <span className="text-sm text-gray-200">{species.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm text-gray-300">{species.power.toFixed(1)}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className="border-blue-600 text-blue-400">
                              Lv {species.minLevel}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className="border-purple-600 text-purple-400">
                              Lv {species.maxLevel}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {craftUnlocked ? (
                              <div className="flex flex-col items-center gap-1">
                                <Badge className="bg-emerald-600 text-emerald-100">
                                  <Hammer className="size-3 mr-1" />
                                  Lv {species.primaryCraftUnlockLevel}
                                </Badge>
                                {species.primaryCraftItemName && (
                                  <span className="text-xs text-gray-400">{species.primaryCraftItemName}</span>
                                )}
                              </div>
                            ) : species.hasPrimaryCraft ? (
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className="border-gray-600 text-gray-500">
                                  Lv {species.primaryCraftUnlockLevel} (bloqueado)
                                </Badge>
                                {species.primaryCraftItemName && (
                                  <span className="text-xs text-gray-600">{species.primaryCraftItemName}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Spawn Positions Modal */}
        <Dialog open={spawnPositionsModalOpen} onOpenChange={setSpawnPositionsModalOpen}>
          <DialogContent className="max-w-3xl bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-100 flex items-center gap-2">
                <MapPin className="size-5 text-blue-400" />
                Posições dos Spawns
              </DialogTitle>
            </DialogHeader>

            {loadingSpawnPositions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : spawnPositionsData?.error ? (
              <div className="py-6 text-center text-red-400">
                Erro ao carregar posições: {spawnPositionsData.error}
              </div>
            ) : spawnPositionsData ? (
              <div className="space-y-4">
                {/* Header com informações */}
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2">
                    <Ghost className="size-4 text-red-400" />
                    <span className="text-sm font-medium text-gray-200">{spawnPositionsData.monsterName}</span>
                  </div>
                  <Badge className="bg-blue-600 text-blue-100">
                    {spawnPositionsData.count} spawn{spawnPositionsData.count !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Lista de posições */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1.5">
                    {spawnPositionsData.positions?.length > 0 ? (
                      spawnPositionsData.positions.map((pos, idx) => {
                        const positionString = `{x = ${pos.x}, y = ${pos.y}, z = ${pos.z}}`;

                        const copyToClipboard = () => {
                          navigator.clipboard.writeText(positionString).then(() => {
                            toast.success('Posição copiada!', {
                              description: positionString,
                              duration: 2000,
                            });
                          }).catch(err => {
                            console.error('Failed to copy:', err);
                            toast.error('Erro ao copiar posição');
                          });
                        };

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700 hover:border-blue-500/50 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="size-3 text-blue-400 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-xs font-mono text-gray-300">
                                  Spawn #{idx + 1}
                                </span>
                                {pos.lineNumber > 0 && (
                                  <span className="text-[9px] text-gray-500">
                                    Linha {pos.lineNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-300">
                                {positionString}
                              </span>
                              <button
                                onClick={copyToClipboard}
                                className="p-1 rounded hover:bg-gray-700 transition-colors opacity-60 group-hover:opacity-100"
                                title="Copiar posição"
                              >
                                <Copy className="size-3 text-blue-400" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Nenhuma posição encontrada
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Craft Accumulation Modal */}
        <Dialog open={craftAccumulationModalOpen} onOpenChange={setCraftAccumulationModalOpen}>
          <DialogContent className="max-w-6xl bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-100 flex items-center gap-2">
                <Hammer className="size-5 text-emerald-400" />
                Primary Crafts Acumulados por Região
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[600px] mt-4">
              <Accordion type="multiple" className="w-full space-y-2">
                {getCraftAccumulationData().map((regionData, idx) => (
                  <AccordionItem
                    key={regionData.regionName}
                    value={regionData.regionName}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-blue-400" />
                          <h3 className="text-sm font-semibold text-gray-100">
                            {regionData.regionName}
                          </h3>
                          <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                            Lv {regionData.recommendedLevel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-600 text-emerald-100 text-xs">
                            {regionData.crafts.length} crafts únicos
                          </Badge>
                          {regionData.missingCrafts.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="border-orange-600 text-orange-400 text-xs cursor-help"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {regionData.missingCrafts.length} faltam
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 border-gray-700 max-w-md max-h-96 overflow-auto">
                                  <div className="text-xs space-y-1">
                                    <p className="font-semibold text-gray-200 mb-2">Crafts faltantes:</p>
                                    <div className="grid grid-cols-1 gap-1">
                                      {regionData.missingCrafts.map(itemName => (
                                        <div key={itemName} className="text-gray-300">
                                          • {itemName}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {regionData.crafts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {regionData.crafts.map(craft => (
                            <div
                              key={craft.materialName}
                              className="flex items-center justify-between p-2 rounded bg-gray-900 border border-gray-700"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Hammer className="size-3 text-emerald-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs text-gray-200 truncate block">
                                    {craft.finalItemName}
                                  </span>
                                  <span className="text-[10px] text-gray-500 truncate block">
                                    ({craft.monsterName})
                                  </span>
                                </div>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="border-blue-600 text-blue-400 text-xs flex-shrink-0 cursor-help">
                                      {craft.currentRegionSpawns} / {craft.totalSpawns} spawn{craft.totalSpawns !== 1 ? 's' : ''}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-800 border-gray-700">
                                    <div className="text-xs space-y-1">
                                      {craft.breakdown.map(item => (
                                        <div key={item.regionName} className="flex justify-between gap-4">
                                          <span className="text-gray-300">{item.regionName}:</span>
                                          <span className="text-blue-400 font-medium">{item.spawns} spawn{item.spawns !== 1 ? 's' : ''}</span>
                                        </div>
                                      ))}
                                      {craft.breakdown.length > 1 && (
                                        <>
                                          <div className="border-t border-gray-700 my-1"></div>
                                          <div className="flex justify-between gap-4 font-semibold">
                                            <span className="text-gray-200">Total:</span>
                                            <span className="text-blue-400">{craft.totalSpawns} spawn{craft.totalSpawns !== 1 ? 's' : ''}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic text-center py-2">
                          Nenhum craft disponível até esta região
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  );
}
