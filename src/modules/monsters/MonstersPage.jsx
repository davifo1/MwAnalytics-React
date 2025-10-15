import { Fragment, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Search,
  Settings2,
  X,
  RefreshCcw,
  Save,
  RotateCcw,
  Edit2,
  Trash2,
  ListChecks,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { FilterCounter } from '@/components/ui/filter-counter';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider, SliderThumb } from '@/components/ui/slider';
import { useSliderInput } from '@/hooks/use-slider-input';
import { Plus, Trash2 as TrashIcon, Shield, Sword, Heart, Zap, Award, Settings } from 'lucide-react';
import MonsterDetailsOptimized from './MonsterDetailsOptimized';
import MonsterBulkActionsModal from './MonsterBulkActionsModal';
import { loadAllMonsters, loadMonsterFromXML } from '@/services/monsterService';
import { loadItemsForAutocomplete } from '@/services/monsterItemService';
import { calculateBaseStatsRole, baseStatsRoleColors } from '@/utils/baseStatsRoleCalculator';
import { loadSpawnCounts } from '@/services/spawnService';
import { calculateRecommendedAttributes, getRecommendedDefaultLevel } from '@/utils/attributesBaseCalculator';
import { getBaseExpByPower, getBalanceMultiplier, getGoldCoinPerKillByPower } from '@/utils/rewardsCalculator';
import { calculateMonsterUnlockLevels } from '@/utils/unlockLevelCalculator';
import { getPowerBaseByAttrPoints } from '@/utils/powerCalculator';

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

// Mock data para monstros
const mockMonsters = [
  {
    id: 1,
    monsterName: 'Demon',
    power: 5.5,
    race: 'Demon',
    hp: 8,
    atk: 7,
    satk: 6,
    def: 5,
    sdef: 4,
    experience: 1200,
    goldPerKill: 350,
    hostile: true,
    attackable: true,
    isboss: false,
    lookType: 35,
    corpse: 2916,
    speedType: 'Boot1',
    resourceBalance: 'Equals',
    baseStatsRole: 'Balanced',
    mapRole: 'Normal',
    targetdistance: 1,
    egg: null,
    eggChance: 0,
    loot: [
      { item: 'Gold Coin', chance: 100, countMin: 50, countMax: 100, ratio: 0.4 },
      { item: 'Demon Shield', chance: 10, countMin: 1, countMax: 1, ratio: 0.3 },
      { item: 'Fire Sword', chance: 5, countMin: 1, countMax: 1, ratio: 0.2 }
    ],
    autoBalancedLoot: [
      { item: 'Demon Horn', chance: 15, countMin: 1, countMax: 2, ratio: 0.1 }
    ],
    extraPhysicalPenetrationByLevel: false,
    extraMagicPenetrationByLevel: false,
    extraHealthByLevel: false,
    hostileWhenAttacked: false,
    canwalkonenergy: false,
    canwalkonfire: false,
    canwalkonpoison: false,
    extraPower: false,
    elements: {
      physicalPercent: 0,
      deathPercent: 10,
      energyPercent: -20,
      earthPercent: 0,
      icePercent: 50,
      holyPercent: -10,
      firePercent: 100
    },
    immunities: ['Fire'],
    maxSummons: 2,
    summons: [],
    targetChangeInterval: 5000,
    targetChangeChance: 20,
    staticAttack: 0,
    runonhealth: 0,
    notMove: false,
    difficultyTags: [],
    tags: 'demon, boss'
  },
  {
    id: 2,
    monsterName: 'Dragon',
    power: 8.2,
    race: 'Dragon',
    hp: 12,
    atk: 10,
    satk: 8,
    def: 7,
    sdef: 6,
    experience: 2500,
    goldPerKill: 800,
    hostile: true,
    attackable: true,
    isboss: false,
    lookType: 34,
    corpse: 3104,
    speedType: 'Boot2',
    resourceBalance: 'Exp2',
    baseStatsRole: 'Tank',
    mapRole: 'Elite'
  },
  {
    id: 3,
    monsterName: 'Orc',
    power: 2.3,
    race: 'Orc',
    hp: 4,
    atk: 3,
    satk: 1,
    def: 3,
    sdef: 2,
    experience: 300,
    goldPerKill: 80,
    hostile: true,
    attackable: true,
    isboss: false,
    lookType: 5,
    corpse: 2860,
    speedType: 'Slow',
    resourceBalance: 'Loot1',
    baseStatsRole: 'Physical',
    mapRole: 'Common'
  },
  {
    id: 4,
    monsterName: 'Rotworm',
    power: 1.5,
    race: 'Vermin',
    hp: 3,
    atk: 2,
    satk: 0,
    def: 2,
    sdef: 1,
    experience: 150,
    goldPerKill: 40,
    hostile: false,
    attackable: true,
    isboss: false,
    lookType: 26,
    corpse: 2967,
    speedType: 'Slow',
    resourceBalance: 'Equals',
    baseStatsRole: 'Weak',
    mapRole: 'Common'
  },
  {
    id: 5,
    monsterName: 'Hydra',
    power: 10.5,
    race: 'Dragon',
    hp: 15,
    atk: 12,
    satk: 10,
    def: 9,
    sdef: 8,
    experience: 4500,
    goldPerKill: 1500,
    hostile: true,
    attackable: true,
    isboss: true,
    lookType: 121,
    corpse: 4283,
    speedType: 'BOH',
    resourceBalance: 'Exp4',
    baseStatsRole: 'Magic',
    mapRole: 'Boss'
  },
];

const MonstersPage = () => {
  usePageTitle('Monsters');

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableItems, setAvailableItems] = useState([]);
  const [spawnCounts, setSpawnCounts] = useState(new Map());
  const loadingRef = useRef(false);
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [editingMonster, setEditingMonster] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => {
    const saved = localStorage.getItem('monsters-filter-searchQuery');
    return saved || '';
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('monsters-activeTab');
    return saved || 'general';
  });

  // Filtros - Load from localStorage
  const [powerRange, setPowerRange] = useState(() => {
    const saved = localStorage.getItem('monsters-filter-powerRange');
    return saved ? JSON.parse(saved) : [0, 15];
  });
  const [selectedMapRoles, setSelectedMapRoles] = useState(() => {
    const saved = localStorage.getItem('monsters-filter-mapRoles');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedBaseStatsRoles, setSelectedBaseStatsRoles] = useState(() => {
    const saved = localStorage.getItem('monsters-filter-baseStatsRoles');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedRaces, setSelectedRaces] = useState(() => {
    const saved = localStorage.getItem('monsters-filter-races');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMiscFilter, setSelectedMiscFilter] = useState(() => {
    const saved = localStorage.getItem('monsters-filter-misc');
    return saved || '';
  });

  // Bulk actions state
  const [rowSelection, setRowSelection] = useState({});
  const [isBulkActionsModalOpen, setIsBulkActionsModalOpen] = useState(false);

  // Auto-balance dialog state
  const [isAutoBalanceDialogOpen, setIsAutoBalanceDialogOpen] = useState(false);
  const [autoBalancePreview, setAutoBalancePreview] = useState(null);

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

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 100,
  });
  const [sorting, setSorting] = useState([
    { id: 'power', desc: false },
  ]);

  // Column visibility - Load from localStorage
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem('monsters-columnVisibility');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved column visibility:', e);
      }
    }
    return {
      race: false,
      mapRole: false,
      baseStatsRole: false,
      defaultLevel: false,
      lastUnlockLevel: false,
    };
  });

  const loadMonsters = async () => {
    setLoading(true);
    try {
      // Load items for autocomplete and spawn counts
      const items = await loadItemsForAutocomplete();
      setAvailableItems(items);

      const counts = await loadSpawnCounts();
      setSpawnCounts(counts);

      // Try to load from XML files first
      const xmlMonsters = await loadAllMonsters();

      if (xmlMonsters && xmlMonsters.length > 0) {
        // Add calculated baseStatsRole to each monster
        const monstersWithRole = xmlMonsters.map(m => ({
          ...m,
          baseStatsRole: m.baseStatsRole || calculateBaseStatsRole(
            m.hp || 0,
            m.atk || 0,
            m.satk || 0,
            m.def || 0,
            m.sdef || 0,
            getSpeedValue(m.speedType || 'None')
          )
        }));

        setMonsters(monstersWithRole);

        // Update power range max based on actual data (only if greater than current)
        const powers = monstersWithRole.map(m => m.power);
        const maxPower = Math.max(...powers);
        const maxPowerCeil = Math.ceil(maxPower);

        setPowerRange(prev => {
          // Keep saved min, but update max if data has higher values
          return [prev[0], Math.max(prev[1], maxPowerCeil)];
        });

        toast.success(`Loaded ${monstersWithRole.length} monsters from XML files. (${items.length} Items)`)
      } else {
        // Fallback to mock data if no XML files available
        setMonsters(mockMonsters);
        toast.info('Using mock data');
      }
    } catch (error) {
      console.error('Error loading monsters:', error);
      toast.error('Error loading monsters');
      // Fallback to mock data if loading fails
      setMonsters(mockMonsters);
      toast.info('Using mock data as fallback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Using ref to prevent double loading in StrictMode
    if (loadingRef.current) return;
    loadingRef.current = true;

    loadMonsters();
  }, []);

  // Load selected monster from URL when monsters are loaded
  useEffect(() => {
    if (monsters.length > 0) {
      const selectedParam = searchParams.get('selected');
      if (selectedParam && !selectedMonster) {
        const monsterToSelect = monsters.find(m =>
          m.monsterName === selectedParam || m.id === selectedParam
        );
        if (monsterToSelect) {
          handleRowClick(monsterToSelect);
        }
      }
    }
  }, [monsters, searchParams]);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('monsters-filter-powerRange', JSON.stringify(powerRange));
  }, [powerRange]);

  useEffect(() => {
    localStorage.setItem('monsters-filter-mapRoles', JSON.stringify(selectedMapRoles));
  }, [selectedMapRoles]);

  useEffect(() => {
    localStorage.setItem('monsters-filter-baseStatsRoles', JSON.stringify(selectedBaseStatsRoles));
  }, [selectedBaseStatsRoles]);

  useEffect(() => {
    localStorage.setItem('monsters-filter-races', JSON.stringify(selectedRaces));
  }, [selectedRaces]);

  useEffect(() => {
    localStorage.setItem('monsters-columnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem('monsters-filter-misc', selectedMiscFilter);
  }, [selectedMiscFilter]);

  // Save activeTab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('monsters-activeTab', activeTab);
  }, [activeTab]);

  // Save searchQuery to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('monsters-filter-searchQuery', searchQuery);
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    let filtered = monsters;

    // Busca por nome
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.monsterName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por power range (sempre ativo)
    filtered = filtered.filter(m => {
      const power = parseFloat(m.power) || 0;
      return power >= powerRange[0] && power <= powerRange[1];
    });

    // Filtro por Map Role
    if (selectedMapRoles.length > 0) {
      filtered = filtered.filter(m =>
        selectedMapRoles.includes(m.mapRole || 'None')
      );
    }

    // Filtro por Base Stats Role
    if (selectedBaseStatsRoles.length > 0) {
      filtered = filtered.filter(m =>
        selectedBaseStatsRoles.includes(m.baseStatsRole || 'None')
      );
    }

    // Filtro por Race
    if (selectedRaces.length > 0) {
      filtered = filtered.filter(m => {
        const races = (m.race || 'None').split(';').map(r => r.trim()).filter(r => r);
        return races.some(race => selectedRaces.includes(race));
      });
    }

    // Filtro MISC
    if (selectedMiscFilter) {
      switch (selectedMiscFilter) {
        case 'egg-drop':
          // Monstros que dropam EGG (egg-chance > 0)
          filtered = filtered.filter(m => m['egg-chance'] && m['egg-chance'] > 0);
          break;
        case 'main-mat-legendary':
          // Monstros que dropam craft primary
          filtered = filtered.filter(m => {
            if (!m.loot) return false;
            return m.loot.some(item => {
              return item.origin === 'craft primary';
            });
          });
          break;
        case 'secondary-mat-legendary':
          // Monstros que dropam craft secondary
          filtered = filtered.filter(m => {
            if (!m.loot) return false;
            return m.loot.some(item => {
              return item.origin === 'craft secondary';
            });
          });
          break;
        case 'exclude-main-mat':
          // Todos exceto craft primary
          filtered = filtered.filter(m => {
            if (!m.loot) return true;
            return !m.loot.some(item => {
              return item.origin === 'craft primary';
            });
          });
          break;
      }
    }

    return filtered;
  }, [monsters, searchQuery, powerRange, selectedMapRoles, selectedBaseStatsRoles, selectedRaces, selectedMiscFilter]);

  // Detecta monstros com nomes duplicados
  const duplicateNames = useMemo(() => {
    const nameCount = {};
    filteredData.forEach(monster => {
      const name = monster.monsterName;
      nameCount[name] = (nameCount[name] || 0) + 1;
    });
    return Object.keys(nameCount).filter(name => nameCount[name] > 1);
  }, [filteredData]);

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: 'power',
        accessorFn: (row) => row.power,
        header: ({ column }) => (
          <DataGridColumnHeader title="PW" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-gray-300">
            {row.original.power.toFixed(2)}
          </span>
        ),
        enableSorting: true,
        enableHiding: false,
        size: 64,
      },
      {
        id: 'monsterName',
        accessorFn: (row) => row.monsterName,
        header: ({ column }) => (
          <DataGridColumnHeader title="Monster Name" column={column} />
        ),
        cell: ({ row }) => {
          const isDuplicate = duplicateNames.includes(row.original.monsterName);
          return (
            <div className="flex items-center gap-1">
              <span className="text-gray-200 font-medium">
                {row.original.monsterName}
              </span>
              {isDuplicate && row.original.xmlFileName && (
                <span className="text-xs text-gray-500">
                  ({row.original.xmlFileName})
                </span>
              )}
            </div>
          );
        },
        enableSorting: true,
        enableHiding: false,
        size: 140,
      },
      {
        id: 'race',
        accessorFn: (row) => row.race,
        header: ({ column }) => (
          <DataGridColumnHeader title="Race" column={column} />
        ),
        cell: ({ row }) => {
          const races = (row.original.race || 'None').split(';').map(r => r.trim()).filter(r => r);
          return (
            <div className="flex flex-wrap gap-1">
              {races.map((race, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {race}
                </Badge>
              ))}
            </div>
          );
        },
        enableSorting: true,
        size: 100,
      },
      {
        id: 'mapRole',
        accessorFn: (row) => row.mapRole,
        header: ({ column }) => (
          <DataGridColumnHeader title="Map Role" column={column} />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {row.original.mapRole || 'None'}
          </Badge>
        ),
        enableSorting: true,
        size: 120,
      },      {
        id: 'spawnCount',
        accessorFn: (row) => spawnCounts.get(row.monsterName.toLowerCase()) || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Spawns" column={column} />
        ),
        cell: ({ row }) => {
          const count = spawnCounts.get(row.original.monsterName.toLowerCase()) || 0;
          return (
            <span className="font-mono text-sm text-gray-300">
              {count}
            </span>
          );
        },
        enableSorting: true,
        size: 80,
      },
      {
        id: 'defaultLevel',
        accessorFn: (row) => row.defaultLevel || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Level Default" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-gray-300">
            {row.original.defaultLevel || 0}
          </span>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'lastUnlockLevel',
        accessorFn: (row) => {
          if (!row.loot || row.loot.length === 0) return 0;
          const unlockLevels = row.loot
            .filter(item => item.unlockLevel !== undefined && item.unlockLevel !== null)
            .map(item => item.unlockLevel);
          return unlockLevels.length > 0 ? Math.max(...unlockLevels) : 0;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title="Last Unlock Lvl" column={column} />
        ),
        cell: ({ row }) => {
          if (!row.original.loot || row.original.loot.length === 0) {
            return <span className="font-mono text-sm text-gray-500">-</span>;
          }
          const unlockLevels = row.original.loot
            .filter(item => item.unlockLevel !== undefined && item.unlockLevel !== null)
            .map(item => item.unlockLevel);
          const maxLevel = unlockLevels.length > 0 ? Math.max(...unlockLevels) : 0;

          const defaultLevel = row.original.defaultLevel || 0;
          const minRequired = Math.ceil(defaultLevel * 1.4);
          const isInsufficient = maxLevel < minRequired;
          const difference = minRequired - maxLevel;

          if (isInsufficient) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm text-red-500">
                      {maxLevel}
                    </span>
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold mb-1">Unlock Level insuficiente</p>
                    <p>Mínimo necessário: {minRequired} (defaultLevel × 1.4)</p>
                    <p>Faltam: {difference} níveis</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <span className="font-mono text-sm text-gray-300">
              {maxLevel}
            </span>
          );
        },
        enableSorting: true,
        size: 120,
      },
      {
        id: 'baseStatsRole',
        accessorFn: (row) => row.baseStatsRole,
        header: ({ column }) => (
          <DataGridColumnHeader title="Base Stats Role" column={column} />
        ),
        cell: ({ row }) => {
          const role = row.original.baseStatsRole || 'None';
          return (
            <span className={cn("font-medium text-xs", baseStatsRoleColors[role] || 'text-gray-400')}>
              {role}
            </span>
          );
        },
        enableSorting: true,
        size: 140,
      },
    ],
    [duplicateNames, spawnCounts]
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row) => row.id.toString(),
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleRowClick = async (monster) => {
    // Update URL with selected monster
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('selected', monster.monsterName || monster.id);
    setSearchParams(newSearchParams);

    // Try to load full monster data from XML if available
    try {
      const fullMonsterData = await loadMonsterFromXML(monster.monsterName);
      if (fullMonsterData) {
        const monsterWithId = { ...fullMonsterData, id: monster.id };
        setSelectedMonster(monsterWithId);
        setEditingMonster(monsterWithId);
      } else {
        setSelectedMonster(monster);
        setEditingMonster(monster);
      }
    } catch (error) {
      console.error('Error loading monster XML:', error);
      setSelectedMonster(monster);
      setEditingMonster(monster);
    }
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingMonster(selectedMonster);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      // Get fileName - try multiple possible fields
      const fileName = editingMonster.fileName ||
                       (editingMonster.xmlFileName ? `${editingMonster.xmlFileName}.xml` : null);

      console.log('[handleSave] editingMonster:', editingMonster);
      console.log('[handleSave] fileName:', fileName);
      console.log('[handleSave] editingMonster.fileName:', editingMonster.fileName);
      console.log('[handleSave] editingMonster.xmlFileName:', editingMonster.xmlFileName);

      if (!fileName) {
        toast.error('Cannot save: monster fileName is missing');
        return;
      }

      // Call API to save monster data
      const payload = {
        fileName: fileName,
        monsterData: editingMonster,
      };

      console.log('[handleSave] Sending payload:', payload);

      const response = await fetch('/api/monsters/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save monster');
      }

      // Update local state
      const updatedMonsters = monsters.map(m =>
        m.id === editingMonster.id ? editingMonster : m
      );
      setMonsters(updatedMonsters);
      setSelectedMonster(editingMonster);
      setIsEditing(false);
      toast.success(`Monster ${editingMonster.monsterName} updated successfully`);
    } catch (error) {
      console.error('Error saving monster:', error);
      toast.error(`Failed to save monster: ${error.message}`);
    }
  };

  const handleAutoBalance = () => {
    if (!editingMonster) return;

    // Calculate recommended values
    const speedValue = getSpeedValue(editingMonster.speedType || 'None');

    // Calculate recommended power
    const recommendedPower = getPowerBaseByAttrPoints(
      editingMonster.hp || 0,
      editingMonster.atk || 0,
      editingMonster.satk || 0,
      editingMonster.def || 0,
      editingMonster.sdef || 0,
      editingMonster.hostile || false,
      editingMonster.hostileWhenAttacked || false,
      speedValue
    );

    // Calculate recommended attributes
    const recommendedAttributes = calculateRecommendedAttributes({
      hp: editingMonster.hp || 1,
      atk: editingMonster.atk || 1,
      satk: editingMonster.satk || 1,
      def: editingMonster.def || 1,
      sdef: editingMonster.sdef || 1,
      speed: speedValue,
      speedType: editingMonster.speedType || 'None',
      power: editingMonster.power || 1
    });

    // Calculate recommended default level
    const recommendedDefaultLevel = getRecommendedDefaultLevel(editingMonster.power || 0);

    // Calculate recommended XP and Class XP
    const resourceBalance = editingMonster.resourceBalance || 'Equals';
    let expBalance = 0;
    if (resourceBalance.includes('Exp')) {
      expBalance = parseInt(resourceBalance.replace('Exp', '')) || 0;
    }
    const baseExp = getBaseExpByPower(editingMonster.power || 0);
    const multiplier = getBalanceMultiplier(expBalance);
    const recommendedXP = Math.round(baseExp * multiplier);

    // Calculate recommended gold coins per kill
    const recommendedGoldPerKill = getGoldCoinPerKillByPower(editingMonster.power || 0);

    // Create items map for unlock level calculation
    const itemsMap = new Map();
    availableItems.forEach(item => {
      itemsMap.set(item.name.toLowerCase(), item);
    });

    // Calculate unlock levels
    const updatedLootWithUnlockLevels = calculateMonsterUnlockLevels(
      {
        ...editingMonster,
        loot: editingMonster.loot || []
      },
      itemsMap
    );

    // Create preview object
    const preview = {
      current: {
        power: editingMonster.power,
        defaultLevel: editingMonster.defaultLevel,
        experience: editingMonster.experience,
        classXpPerLevel: editingMonster.classXpPerLevel,
        goldPerKill: editingMonster.goldPerKill,
        healthPerLevel: editingMonster.healthPerLevel,
        maxAtkPerLevel: editingMonster.maxAtkPerLevel,
        maxAtkSPerLevel: editingMonster.maxAtkSPerLevel,
        armorPerLevel: editingMonster.armorPerLevel,
        magicResistPerLevel: editingMonster.magicResistPerLevel,
        physicalPenPerLevel: editingMonster.physicalPenPerLevel,
        magicPenPerLevel: editingMonster.magicPenPerLevel,
        baseSpeed: editingMonster.baseSpeed,
      },
      recommended: {
        power: Math.round(recommendedPower),
        defaultLevel: recommendedDefaultLevel,
        experience: recommendedXP,
        classXpPerLevel: recommendedXP,
        goldPerKill: recommendedGoldPerKill,
        healthPerLevel: recommendedAttributes.healthPerLevel,
        maxAtkPerLevel: recommendedAttributes.maxAtkPerLevel,
        maxAtkSPerLevel: recommendedAttributes.maxAtkSPerLevel,
        armorPerLevel: recommendedAttributes.armorPerLevel,
        magicResistPerLevel: recommendedAttributes.magicResistPerLevel,
        physicalPenPerLevel: recommendedAttributes.physicalPenPerLevel,
        magicPenPerLevel: recommendedAttributes.magicPenPerLevel,
        baseSpeed: recommendedAttributes.baseSpeed,
      },
      updatedLoot: updatedLootWithUnlockLevels
    };

    setAutoBalancePreview(preview);
    setIsAutoBalanceDialogOpen(true);
  };

  const handleConfirmAutoBalance = () => {
    if (!autoBalancePreview) return;

    // Apply all recommended values
    const updatedMonster = {
      ...editingMonster,
      power: autoBalancePreview.recommended.power,
      defaultLevel: autoBalancePreview.recommended.defaultLevel,
      experience: autoBalancePreview.recommended.experience,
      classXpPerLevel: autoBalancePreview.recommended.classXpPerLevel,
      vocationpoints: autoBalancePreview.recommended.classXpPerLevel, // Sync with vocationpoints
      goldPerKill: autoBalancePreview.recommended.goldPerKill,
      healthPerLevel: autoBalancePreview.recommended.healthPerLevel,
      maxAtkPerLevel: autoBalancePreview.recommended.maxAtkPerLevel,
      maxAtkSPerLevel: autoBalancePreview.recommended.maxAtkSPerLevel,
      armorPerLevel: autoBalancePreview.recommended.armorPerLevel,
      magicResistPerLevel: autoBalancePreview.recommended.magicResistPerLevel,
      physicalPenPerLevel: autoBalancePreview.recommended.physicalPenPerLevel,
      magicPenPerLevel: autoBalancePreview.recommended.magicPenPerLevel,
      baseSpeed: autoBalancePreview.recommended.baseSpeed,
      loot: autoBalancePreview.updatedLoot,
    };

    setEditingMonster(updatedMonster);
    setIsAutoBalanceDialogOpen(false);
    setAutoBalancePreview(null);
    toast.success('Auto-balance values applied successfully');
  };

  const handleFieldChange = (field, value) => {
    setEditingMonster(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchQuery('');
    setPowerRange([0, 15]);
    setSelectedMapRoles([]);
    setSelectedBaseStatsRoles([]);
    setSelectedRaces([]);
    setSelectedMiscFilter('');
  };

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return searchQuery !== '' ||
           powerRange[0] !== 0 ||
           powerRange[1] !== 15 ||
           selectedMapRoles.length > 0 ||
           selectedBaseStatsRoles.length > 0 ||
           selectedRaces.length > 0 ||
           selectedMiscFilter !== '';
  }, [searchQuery, powerRange, selectedMapRoles, selectedBaseStatsRoles, selectedRaces, selectedMiscFilter]);

  // Get selected monsters from row selection
  const selectedMonstersForBulkAction = useMemo(() => {
    return Object.keys(rowSelection)
      .map(id => filteredData.find(m => m.id.toString() === id))
      .filter(Boolean);
  }, [rowSelection, filteredData]);

  //TODO: remover linha de baixo e atalho para ver formulas > rewards e logica de auto balance loot e lendarios
  return (
    <Fragment>
      <Container className="max-w-full" data-panel-id="monsters-page">
        {/* Painel de Filtros Superior */}
        <Card className="mb-4" data-panel-id="monsters-filters-card">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Lado esquerdo - Busca e Filtros */}
              <div className="flex items-center gap-3 flex-1">
                {/* Busca */}
                <div className="relative w-64" data-panel-id="monsters-filters-search">
                  <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search monsters by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9 w-full bg-gray-900 border-gray-700 text-gray-200 h-9"
                  />
                  {searchQuery.length > 0 && (
                    <Button
                      mode="icon"
                      variant="ghost"
                      className="absolute end-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Separador */}
                <div className="h-8 w-px bg-gray-700" />

                {/* Filtros */}
                <div className="flex items-center gap-3" data-panel-id="monsters-filters-group">
                  {/* Power Range Filter */}
                  <div className="flex items-center gap-2" data-panel-id="monsters-filters-power">
                    <Label className="text-sm text-gray-300">
                      Power
                    </Label>
                    <Input
                      type="number"
                      value={powerRange[0]}
                      onChange={(e) => setPowerRange([parseFloat(e.target.value) || 0, powerRange[1]])}
                      className="w-14 h-8"
                      min="0"
                      max="15"
                      step="0.1"
                    />
                    <span className="text-xs text-gray-400">-</span>
                    <Input
                      type="number"
                      value={powerRange[1]}
                      onChange={(e) => setPowerRange([powerRange[0], parseFloat(e.target.value) || 15])}
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
                                    setSelectedMapRoles([...selectedMapRoles, role]);
                                  } else {
                                    setSelectedMapRoles(selectedMapRoles.filter(r => r !== role));
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
                                    setSelectedRaces([...selectedRaces, race]);
                                  } else {
                                    setSelectedRaces(selectedRaces.filter(r => r !== race));
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
                          onValueChange={setSelectedMiscFilter}
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
                            onClick={() => setSelectedMiscFilter('')}
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
                                    setSelectedBaseStatsRoles([...selectedBaseStatsRoles, role]);
                                  } else {
                                    setSelectedBaseStatsRoles(selectedBaseStatsRoles.filter(r => r !== role));
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

              {/* Lado direito - Contador e Limpar Filtros */}
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-gray-400 hover:text-gray-200"
                    onClick={handleClearAllFilters}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear Filters
                  </Button>
                )}
                <FilterCounter
                  loading={loading}
                  filteredCount={filteredData.length}
                  totalCount={monsters.length}
                  itemType="monsters"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Principal - 30% Lista / 70% Detalhes */}
        <div className="flex gap-4 h-[calc(100vh-180px)]">
          {/* Painel da Lista de Monstros - 30% */}
          <Card className="w-[30%] h-full flex flex-col">
            <CardHeader className="py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">Monsters List</h3>
                <div className="flex items-center gap-1">
                  {Object.keys(rowSelection).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => setIsBulkActionsModalOpen(true)}
                    >
                      <ListChecks className="h-3 w-3 mr-1" />
                      <span className="text-xs">
                        {Object.keys(rowSelection).length} selected
                      </span>
                    </Button>
                  )}
                  <DataGridColumnVisibility
                    table={table}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-7 -mr-2">
                        <Settings2 className="h-3 w-3" />
                      </Button>
                    }
                  />
                </div>
              </div>
            </CardHeader>

            <CardTable className="flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full">
                <DataGrid
                  table={table}
                  onRowClick={handleRowClick}
                >
                  <DataGridTable />
                </DataGrid>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>

            <CardFooter className="flex-shrink-0">
              <DataGrid table={table} recordCount={filteredData.length}>
                <DataGridPagination />
              </DataGrid>
            </CardFooter>
          </Card>

          {/* Painel de Detalhes do Monstro - 70% */}
          <Card className="flex-1 h-full flex flex-col">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-200">
                  {selectedMonster ? (
                    <>
                      Monster Details: {selectedMonster.monsterName}
                      <span className="text-sm font-normal text-gray-400 ml-3">
                        Power: {selectedMonster.power?.toFixed(2) || '0.00'}
                      </span>
                      <span className="text-sm font-normal text-gray-400 ml-2">
                        | Default Lvl: {selectedMonster.defaultLevel || 0}
                      </span>
                    </>
                  ) : 'Monster Details'}
                </h3>
                {selectedMonster && selectedMonster.race && (
                  <div className="flex gap-1 items-center">
                    {selectedMonster.race.split(';').filter(r => r.trim()).map((race, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs px-2 py-0.5 border-blue-500/30 bg-blue-500/10 text-blue-300"
                      >
                        {race.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardTable className="flex-1 overflow-hidden" data-panel-id="monsters-details-content">
              {selectedMonster ? (
                <div className="h-full" data-panel-id="monsters-details-wrapper">
                  <MonsterDetailsOptimized
                    editingMonster={editingMonster}
                    isEditing={isEditing}
                    handleFieldChange={handleFieldChange}
                    availableItems={availableItems}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Shield className="w-16 h-16 mb-4 opacity-30" />
                    <p>Select a monster to view details</p>
                  </div>
                </div>
              )}
            </CardTable>
          </Card>
        </div>
      </Container>

      {/* Bulk Actions Modal */}
      <MonsterBulkActionsModal
        isOpen={isBulkActionsModalOpen}
        onClose={() => setIsBulkActionsModalOpen(false)}
        selectedMonsters={selectedMonstersForBulkAction}
      />
    </Fragment>
  );
};

export { MonstersPage };
