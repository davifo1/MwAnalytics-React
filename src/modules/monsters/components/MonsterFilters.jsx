import { useMemo, useState, useEffect } from 'react';
import { Search, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FilterCounter } from '@/components/ui/filter-counter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

/**
 * Reusable monster filters component
 * @param {Object} props
 * @param {string} props.searchQuery - Current search query
 * @param {Function} props.onSearchChange - Callback for search query changes
 * @param {Array<number>} props.powerRange - Current power range [min, max]
 * @param {Function} props.onPowerRangeChange - Callback for power range changes
 * @param {Array<string>} props.selectedMapRoles - Currently selected map roles
 * @param {Function} props.onMapRolesChange - Callback for map roles changes
 * @param {Array<string>} props.selectedBaseStatsRoles - Currently selected base stats roles
 * @param {Function} props.onBaseStatsRolesChange - Callback for base stats roles changes
 * @param {Array<string>} props.selectedRaces - Currently selected races
 * @param {Function} props.onRacesChange - Callback for races changes
 * @param {string} props.selectedMiscFilter - Currently selected misc filter
 * @param {Function} props.onMiscFilterChange - Callback for misc filter changes
 * @param {Array} props.monsters - All monsters (for counting)
 * @param {Array} props.filteredMonsters - Filtered monsters (for counting)
 * @param {boolean} props.loading - Loading state
 * @param {string} props.storagePrefix - Prefix for localStorage keys (default: 'monsters')
 */
export const MonsterFilters = ({
  searchQuery = '',
  onSearchChange,
  powerRange = [0, 15],
  onPowerRangeChange,
  selectedMapRoles = [],
  onMapRolesChange,
  selectedBaseStatsRoles = [],
  onBaseStatsRolesChange,
  selectedRaces = [],
  onRacesChange,
  selectedMiscFilter = '',
  onMiscFilterChange,
  monsters = [],
  filteredMonsters = [],
  loading = false,
  storagePrefix = 'monsters',
}) => {
  // Calcular contagem de ocorrências para Map Roles
  const mapRoleCounts = useMemo(() => {
    const counts = {};
    monsters.forEach(monster => {
      const role = monster.mapRole || 'None';
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }, [monsters]);

  // Calcular contagem de ocorrências para Base Stats Roles
  const baseStatsRoleCounts = useMemo(() => {
    const counts = {};
    monsters.forEach(monster => {
      const role = monster.baseStatsRole || 'None';
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }, [monsters]);

  // Calcular contagem de ocorrências para Races
  const raceCounts = useMemo(() => {
    const counts = {};
    monsters.forEach(monster => {
      const races = (monster.race || 'None').split(';').map(r => r.trim()).filter(r => r);
      races.forEach(race => {
        counts[race] = (counts[race] || 0) + 1;
      });
    });
    return counts;
  }, [monsters]);

  // Save filters to localStorage when they change
  useEffect(() => {
    if (storagePrefix) {
      localStorage.setItem(`${storagePrefix}-filter-powerRange`, JSON.stringify(powerRange));
    }
  }, [powerRange, storagePrefix]);

  useEffect(() => {
    if (storagePrefix) {
      localStorage.setItem(`${storagePrefix}-filter-mapRoles`, JSON.stringify(selectedMapRoles));
    }
  }, [selectedMapRoles, storagePrefix]);

  useEffect(() => {
    if (storagePrefix) {
      localStorage.setItem(`${storagePrefix}-filter-baseStatsRoles`, JSON.stringify(selectedBaseStatsRoles));
    }
  }, [selectedBaseStatsRoles, storagePrefix]);

  useEffect(() => {
    if (storagePrefix) {
      localStorage.setItem(`${storagePrefix}-filter-races`, JSON.stringify(selectedRaces));
    }
  }, [selectedRaces, storagePrefix]);

  useEffect(() => {
    if (storagePrefix) {
      localStorage.setItem(`${storagePrefix}-filter-misc`, selectedMiscFilter);
    }
  }, [selectedMiscFilter, storagePrefix]);

  return (
    <Card className="mb-4" data-panel-id={`${storagePrefix}-filters-card`}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Lado esquerdo - Busca e Filtros */}
          <div className="flex items-center gap-3 flex-1">
            {/* Busca */}
            <div className="relative w-64" data-panel-id={`${storagePrefix}-filters-search`}>
              <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search monsters by name..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="ps-9 w-full bg-gray-900 border-gray-700 text-gray-200 h-9"
              />
              {searchQuery.length > 0 && (
                <Button
                  mode="icon"
                  variant="ghost"
                  className="absolute end-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => onSearchChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Separador */}
            <div className="h-8 w-px bg-gray-700" />

            {/* Filtros */}
            <div className="flex items-center gap-3" data-panel-id={`${storagePrefix}-filters-group`}>
              {/* Power Range Filter */}
              <div className="flex items-center gap-2" data-panel-id={`${storagePrefix}-filters-power`}>
                <Label className="text-sm text-gray-300">
                  Power
                </Label>
                <Input
                  type="number"
                  value={powerRange[0]}
                  onChange={(e) => onPowerRangeChange([parseFloat(e.target.value) || 0, powerRange[1]])}
                  className="w-14 h-8"
                  min="0"
                  max="15"
                  step="0.1"
                />
                <span className="text-xs text-gray-400">-</span>
                <Input
                  type="number"
                  value={powerRange[1]}
                  onChange={(e) => onPowerRangeChange([powerRange[0], parseFloat(e.target.value) || 15])}
                  className="w-14 h-8"
                  min="0"
                  max="15"
                  step="0.1"
                />
              </div>

              {/* Map Role Multi-Select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Map Role
                    {selectedMapRoles.length > 0 && (
                      <Badge className="ml-2 px-1 min-w-[20px] h-4 text-[10px]">
                        {selectedMapRoles.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    {['None', 'Scenery', 'Combat', 'Elite', 'Trash', 'Boss', 'Tower', 'Custom'].map((role) => {
                      const count = mapRoleCounts[role] || 0;
                      if (count === 0) return null;
                      return (
                        <Label
                          key={role}
                          className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMapRoles.includes(role)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onMapRolesChange([...selectedMapRoles, role]);
                              } else {
                                onMapRolesChange(selectedMapRoles.filter(r => r !== role));
                              }
                            }}
                          />
                          <span className="text-sm flex-1">{role}</span>
                          <span className="text-xs text-gray-400">({count})</span>
                        </Label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Race Multi-Select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Race
                    {selectedRaces.length > 0 && (
                      <Badge className="ml-2 px-1 min-w-[20px] h-4 text-[10px]">
                        {selectedRaces.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {Object.entries(raceCounts)
                      .sort(([a], [b]) => {
                        if (a === 'None') return -1;
                        if (b === 'None') return 1;
                        return a.localeCompare(b);
                      })
                      .map(([race, count]) => (
                        <Label
                          key={race}
                          className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedRaces.includes(race)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onRacesChange([...selectedRaces, race]);
                              } else {
                                onRacesChange(selectedRaces.filter(r => r !== race));
                              }
                            }}
                          />
                          <span className="text-sm flex-1">{race}</span>
                          <span className="text-xs text-gray-400">({count})</span>
                        </Label>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* MISC Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    MISC
                    {selectedMiscFilter && (
                      <Badge className="ml-2 px-1 min-w-[20px] h-4 text-[10px]">
                        1
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-400 mb-2">Special Filters</Label>
                    <RadioGroup
                      value={selectedMiscFilter}
                      onValueChange={onMiscFilterChange}
                    >
                      <Label className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer">
                        <RadioGroupItem value="" />
                        <span className="text-sm">None</span>
                      </Label>
                      <Label className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer">
                        <RadioGroupItem value="egg-drop" />
                        <span className="text-sm">Egg Drop Only</span>
                      </Label>
                      <Label className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer">
                        <RadioGroupItem value="main-mat-legendary" />
                        <span className="text-sm">craft primary</span>
                      </Label>
                      <Label className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer">
                        <RadioGroupItem value="secondary-mat-legendary" />
                        <span className="text-sm">craft secondary</span>
                      </Label>
                      <Label className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer">
                        <RadioGroupItem value="exclude-main-mat" />
                        <span className="text-sm">All except craft primary</span>
                      </Label>
                    </RadioGroup>
                    {selectedMiscFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => onMiscFilterChange('')}
                      >
                        Clear Filter
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Base Stats Role Multi-Select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    Base Stats Role
                    {selectedBaseStatsRoles.length > 0 && (
                      <Badge className="ml-2 px-1 min-w-[20px] h-4 text-[10px]">
                        {selectedBaseStatsRoles.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="space-y-1">
                    {['None', 'MixedAttacker', 'PhysicalAttacker', 'SpecialAttacker', 'PhysicalTank', 'SpecialTank', 'GlassCannon', 'Speedster', 'BulkyOffense', 'StallOrSupport'].map((role) => {
                      const count = baseStatsRoleCounts[role] || 0;
                      if (count === 0) return null;
                      return (
                        <Label
                          key={role}
                          className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedBaseStatsRoles.includes(role)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onBaseStatsRolesChange([...selectedBaseStatsRoles, role]);
                              } else {
                                onBaseStatsRolesChange(selectedBaseStatsRoles.filter(r => r !== role));
                              }
                            }}
                          />
                          <span className="text-sm flex-1">{role}</span>
                          <span className="text-xs text-gray-400">({count})</span>
                        </Label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Lado direito - Contador */}
          <FilterCounter
            loading={loading}
            filteredCount={filteredMonsters.length}
            totalCount={monsters.length}
            itemType="monsters"
          />
        </div>
      </CardContent>
    </Card>
  );
};
