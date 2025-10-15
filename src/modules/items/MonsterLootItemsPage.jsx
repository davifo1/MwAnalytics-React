import { Fragment, useEffect, useMemo, useState } from 'react';
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
  Filter,
  ChartBar,
  Database,
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
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RichTextArea } from '@/components/ui/rich-text-area';
import { FilterCounter } from '@/components/ui/filter-counter';
import { Save, RotateCcw, Edit2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ItemsService } from '@/services/itemsService';
import { loadBuildableItems, findBuildableItem } from '@/services/baldurService';
import { loadAllMonsters } from '@/services/monsterService';
import { loadSpawnCounts, getSpawnCount } from '@/services/spawnService';
import { getTierColor, getTierOrder, tierNameSortingFn } from '@/utils/tierUtils';

// Componente para mostrar monstros que dropam o item
const MonsterDropTable = ({ item, allMonsters, spawnCounts }) => {
  // Encontra todos os monstros que dropam este item e calcula estatísticas
  const { monstersWithDrop, stats } = useMemo(() => {
    if (!item || !allMonsters || allMonsters.length === 0) {
      return { monstersWithDrop: [], stats: null };
    }

    const monsters = allMonsters.filter(monster => {
      if (!monster.loot || !Array.isArray(monster.loot)) return false;

      // Verifica se o monstro dropa este item
      return monster.loot.some(lootItem => {
        // Compara pelo nome do item (loot usa name, não id)
        return lootItem.name && lootItem.name.toLowerCase() === item.name.toLowerCase();
      });
    }).map(monster => {
      // Encontra o item de loot específico
      const lootItem = monster.loot.find(l =>
        l.name && l.name.toLowerCase() === item.name.toLowerCase()
      );

      const spawnCount = getSpawnCount(monster.monsterName, spawnCounts);

      return {
        name: monster.monsterName,
        power: monster.power || 0,
        maxCount: lootItem?.countMax || 1,  // countMax com M maiúsculo
        chance: lootItem?.chance || 0,
        // Adiciona mais informações úteis
        mapRole: monster.mapRole || 'None',
        baseStatsRole: monster.baseStatsRole || 'None',
        spawnCount
      };
    }).sort((a, b) => {
      // Ordena por chance (maior primeiro)
      if (b.chance !== a.chance) return b.chance - a.chance;
      // Se chance igual, ordena por power
      return b.power - a.power;
    });

    // Calcular estatísticas
    let stats = null;
    let totalSpawns = 0;
    if (monsters.length > 0) {
      const powers = monsters.map(m => m.power);
      const chances = monsters.map(m => m.chance);
      totalSpawns = monsters.reduce((sum, monster) => sum + (monster.spawnCount || 0), 0);

      stats = {
        minPower: Math.min(...powers),
        avgPower: powers.reduce((sum, p) => sum + p, 0) / powers.length,
        avgDropChance: chances.reduce((sum, c) => sum + c, 0) / chances.length,
        maxDrop: Math.max(...chances),
        totalSpawns
      };
    }

    return { monstersWithDrop: monsters, stats };
  }, [item, allMonsters, spawnCounts]);

  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select an item to view drop sources
      </div>
    );
  }

  if (monstersWithDrop.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-sm">No monsters drop this item</p>
        <p className="text-xs text-gray-600 mt-1">Item: {item.name}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-900 z-10">
            {/* Linha de estatísticas */}
            {stats && (
              <tr className="bg-gradient-to-r from-gray-800/60 to-gray-800/40 border-b border-gray-700/50">
                <th className="text-left py-2 px-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Total:</span>
                    <span className="text-gray-300 font-semibold">{monstersWithDrop.length}</span>
                  </div>
                </th>
                <th className="text-center py-2 px-3 text-xs">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-gray-500">Range:</span>
                    <span className="text-gray-300 font-medium">{stats.minPower}-{stats.avgPower.toFixed(0)}</span>
                  </div>
                </th>
                <th className="text-center py-2 px-3 text-xs">
                  {/* Map Role - vazio */}
                </th>
                <th className="text-center py-2 px-3 text-xs">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-gray-500">Total:</span>
                    <span className="text-blue-400 font-semibold">{stats.totalSpawns}</span>
                  </div>
                </th>
                <th className="text-center py-2 px-3 text-xs">
                  {/* Max Count - vazio */}
                </th>
                <th className="text-center py-2 px-3 text-xs">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-gray-500">Avg:</span>
                    <span className="text-gray-300 font-medium">{stats.avgDropChance.toFixed(1)}%</span>
                  </div>
                </th>
              </tr>
            )}
            {/* Linha de cabeçalhos */}
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Monster Name</th>
              <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Power</th>
              <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Map Role</th>
              <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Spawn Count</th>
              <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Max Count</th>
              <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Drop Chance</th>
            </tr>
          </thead>
          <tbody>
            {monstersWithDrop.map((monster, index) => (
              <tr
                key={`${monster.name}-${index}`}
                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-2 px-3 text-sm text-gray-200">{monster.name}</td>
                <td className="py-2 px-3 text-sm text-center text-gray-300">{monster.power}</td>
                <td className="py-2 px-3 text-xs text-center">
                  <Badge variant="outline" className="text-xs">
                    {monster.mapRole}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-sm text-center text-gray-300">
                  {monster.spawnCount > 0 ? (
                    <span className="font-medium text-blue-400">{monster.spawnCount}</span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="py-2 px-3 text-sm text-center text-gray-300">{monster.maxCount}</td>
                <td className="py-2 px-3 text-sm text-center">
                  <span className={cn(
                    "font-medium",
                    monster.chance >= 10 ? "text-green-400" :
                    monster.chance >= 5 ? "text-yellow-400" :
                    monster.chance >= 1 ? "text-orange-400" :
                    "text-red-400"
                  )}>
                    {monster.chance.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrollArea>
  );
};

// Componente de filtro reutilizável
const FilterPopover = ({ title, values, selected, onSelectionChange, items, field }) => {
  const handleChange = (checked, value) => {
    if (checked) {
      onSelectionChange([...selected, value]);
    } else {
      onSelectionChange(selected.filter(v => v !== value));
    }
  };

  // Calcula valores únicos e suas contagens
  const valuesCounts = useMemo(() => {
    const counts = {};

    items.forEach(item => {
      if (field === 'categories' && item.categories) {
        // Para categorias, split por ponto e vírgula
        const cats = item.categories.split(';').filter(Boolean);
        cats.forEach(cat => {
          counts[cat] = (counts[cat] || 0) + 1;
        });
      } else if (field === 'lootCategory' && item.attributes?.lootCategory) {
        // Para lootCategory dentro de attributes
        counts[item.attributes.lootCategory] = (counts[item.attributes.lootCategory] || 0) + 1;
      } else if (item[field]) {
        // Para outros campos
        counts[item[field]] = (counts[item[field]] || 0) + 1;
      }
    });

    return counts;
  }, [items, field]);

  const uniqueValues = Object.keys(valuesCounts).sort();

  return (
    <Popover data-panel-id={`items-filter-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-3 w-3" />
          {title}
          {selected.length > 0 && (
            <Badge size="sm" variant="outline" className="ml-2">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 max-h-96 overflow-auto">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">
            {title} Filter
          </div>
          <div className="space-y-2">
            {uniqueValues.map((value) => (
              <div key={value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`${title}-${value}`}
                  checked={selected.includes(value)}
                  onCheckedChange={(checked) => handleChange(checked === true, value)}
                />
                <Label
                  htmlFor={`${title}-${value}`}
                  className="text-sm font-normal cursor-pointer flex-1 flex items-center justify-between"
                >
                  <span>{value}</span>
                  <span className="text-xs text-gray-500">({valuesCounts[value]})</span>
                </Label>
              </div>
            ))}
          </div>
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onSelectionChange([])}
            >
              Clear All
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const MonsterLootItemsPage = () => {
  usePageTitle('Monster Loot Items');

  const viewType = 'monster-loot';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // Item selecionado para detalhes
  const [editingItem, setEditingItem] = useState(null); // Item sendo editado
  const [isEditing, setIsEditing] = useState(false); // Modo de edição
  const [buildableItems, setBuildableItems] = useState([]); // BuildableItems do baldur
  const [allMonsters, setAllMonsters] = useState([]); // Todos os monstros para drop table
  const [spawnCounts, setSpawnCounts] = useState(new Map()); // Contagem de spawns por monstro

  // Estados para atualização do lootFrom
  const [isUpdateLootFromDialogOpen, setIsUpdateLootFromDialogOpen] = useState(false);
  const [ignoreFilters, setIgnoreFilters] = useState(true);
  const [isUpdatingLootFrom, setIsUpdatingLootFrom] = useState(false);

  // Estados independentes para cada view
  const [viewStates, setViewStates] = useState({
    'all': {
      columnVisibility: {
        select: false,
        weight: false,
        categories: false,
        slotType: false,
        tier: false,
        sellPrice: false,
        valuation: false
      },
      sorting: [{ id: 'id', desc: false }],
      pagination: { pageIndex: 0, pageSize: 50 },
      rowSelection: {}
    },
    'equipment': {
      columnVisibility: {
        select: false,
        weight: false,
        categories: false,
        slotType: true,
        tier: true,
        sellPrice: false,
        valuation: false
      },
      sorting: [{ id: 'tier', desc: false }],
      pagination: { pageIndex: 0, pageSize: 50 },
      rowSelection: {}
    },
    'monster-loot': {
      columnVisibility: {
        select: false,
        weight: false,
        categories: false,
        slotType: false,
        tier: false,
        valuation: true,
        sellPrice: true,
        totalSpawns: true,
        powerRange: true,
        avgDropChance: true,
        maxDropChance: true
      },
      sorting: [{ id: 'tier', desc: true }, { id: 'name', desc: false }],
      pagination: { pageIndex: 0, pageSize: 999999 },
      rowSelection: {}
    }
  });

  // Estados ativos baseados no viewType
  const currentViewState = viewStates[viewType] || viewStates['all'];

  const updateViewState = (key, value) => {
    console.log('[MonsterLootItems] updateViewState:', key, value);
    setViewStates(prev => {
      const newValue = typeof value === 'function' ? value(prev[viewType][key]) : value;
      console.log('[MonsterLootItems] New state value:', newValue);
      return {
        ...prev,
        [viewType]: {
          ...prev[viewType],
          [key]: newValue
        }
      };
    });
  };

  // Filtros com localStorage
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const saved = localStorage.getItem('monster-loot-filter-categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedSlotTypes, setSelectedSlotTypes] = useState(() => {
    const saved = localStorage.getItem('monster-loot-filter-slotTypes');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedTiers, setSelectedTiers] = useState(() => {
    const saved = localStorage.getItem('monster-loot-filter-tiers');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedLootCategories, setSelectedLootCategories] = useState(() => {
    const saved = localStorage.getItem('monster-loot-filter-lootCategories');
    return saved ? JSON.parse(saved) : [];
  });
  const [onlyPickupableState, setOnlyPickupableState] = useState(() => {
    const saved = localStorage.getItem('monster-loot-filter-onlyPickupable');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    let mounted = true;
    let loadingInProgress = false;

    const loadInitialItems = async () => {
      if (loadingInProgress || !mounted) return;

      loadingInProgress = true;
      console.log('Loading items - started');
      setLoading(true);

      try {
        const loadedItems = await ItemsService.loadItemsFromXML(viewType);
        if (mounted) {
          setItems(loadedItems);
          const message = viewType === 'equipment'
            ? `Carregados ${loadedItems.length} equipamentos`
            : viewType === 'monster-loot'
            ? `Carregados ${loadedItems.length} items de monster loot`
            : `Carregados ${loadedItems.length} items do XML`;
          toast.success(message);
          console.log('Loading items - completed:', loadedItems.length, 'viewType:', viewType);
        }
      } catch (error) {
        console.error('Erro ao carregar items:', error);
        if (mounted) {
          toast.error('Erro ao carregar items');
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialItems();

    // Carregar buildable items
    loadBuildableItems().then(items => {
      if (mounted) {
        setBuildableItems(items);
        console.log(`Loaded ${items.length} buildable items`);
      }
    }).catch(error => {
      console.error('Error loading buildable items:', error);
    });

    return () => {
      mounted = false;
    };
  }, [viewType]); // Recarrega quando viewType mudar

  // Limpa seleções quando viewType mudar e carrega monstros se for monster-loot
  useEffect(() => {
    setSelectedItem(null);
    setEditingItem(null);
    setIsEditing(false);
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedSlotTypes([]);
    setSelectedTiers([]);

    // Carrega monstros e spawn counts apenas quando for monster-loot
    if (viewType === 'monster-loot') {
      if (allMonsters.length === 0) {
        loadAllMonsters().then(monsters => {
          setAllMonsters(monsters);
          console.log(`Loaded ${monsters.length} monsters for drop table`);
        }).catch(err => {
          console.error('Error loading monsters:', err);
        });
      }

      // Sempre recarrega spawn counts
      loadSpawnCounts().then(counts => {
        setSpawnCounts(counts);
        console.log(`Loaded spawn counts for ${counts.size} unique monsters`);
        // Log some examples to verify
        const examples = Array.from(counts.entries()).slice(0, 5);
        console.log('Spawn count examples:', examples);
      }).catch(err => {
        console.error('Error loading spawn counts:', err);
      });
    }
  }, [viewType]);

  const loadItems = async () => {
    console.log('Manual reload triggered for viewType:', viewType);
    setLoading(true);
    try {
      const loadedItems = await ItemsService.loadItemsFromXML(viewType);
      setItems(loadedItems);
      const message = viewType === 'equipment'
        ? `Carregados ${loadedItems.length} equipamentos`
        : viewType === 'monster-loot'
        ? `Carregados ${loadedItems.length} items de monster loot`
        : `Carregados ${loadedItems.length} items do XML`;
      toast.success(message);
    } catch (error) {
      console.error('Erro ao carregar items:', error);
      toast.error('Erro ao carregar items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('monster-loot-filter-categories', JSON.stringify(selectedCategories));
  }, [selectedCategories]);

  useEffect(() => {
    localStorage.setItem('monster-loot-filter-slotTypes', JSON.stringify(selectedSlotTypes));
  }, [selectedSlotTypes]);

  useEffect(() => {
    localStorage.setItem('monster-loot-filter-tiers', JSON.stringify(selectedTiers));
  }, [selectedTiers]);

  useEffect(() => {
    localStorage.setItem('monster-loot-filter-lootCategories', JSON.stringify(selectedLootCategories));
  }, [selectedLootCategories]);

  useEffect(() => {
    localStorage.setItem('monster-loot-filter-onlyPickupable', JSON.stringify(onlyPickupableState));
  }, [onlyPickupableState]);

  // Função para atualizar lootFrom de todos os itens
  const handleUpdateLootFrom = async () => {
    try {
      setIsUpdatingLootFrom(true);

      // 1. Ler todos os monstros e seus loots
      const monsters = await loadAllMonsters();
      console.log(`Loaded ${monsters.length} monsters for lootFrom update`);

      // 2. Construir mapa: itemName -> [monsterNames]
      const itemToMonstersMap = new Map();

      monsters.forEach(monster => {
        if (!monster.loot || !Array.isArray(monster.loot)) return;

        monster.loot.forEach(lootItem => {
          if (!lootItem.name) return;

          const itemName = lootItem.name.toLowerCase();
          if (!itemToMonstersMap.has(itemName)) {
            itemToMonstersMap.set(itemName, []);
          }

          // Adicionar o nome do monstro se ainda não está na lista
          const monsterList = itemToMonstersMap.get(itemName);
          if (!monsterList.includes(monster.monsterName)) {
            monsterList.push(monster.monsterName);
          }
        });
      });

      console.log(`Built map for ${itemToMonstersMap.size} items`);

      // 3. Determinar quais itens atualizar
      let itemsToUpdate = items;

      if (ignoreFilters) {
        // Ignorar filtros da tela, mas manter filtro de lootCategory não vazio
        itemsToUpdate = items.filter(item =>
          item.attributes?.lootCategory &&
          item.attributes.lootCategory.trim() !== ''
        );
      } else {
        // Aplicar filtros da tela
        itemsToUpdate = filteredData.filter(item =>
          item.attributes?.lootCategory &&
          item.attributes.lootCategory.trim() !== ''
        );
      }

      console.log(`Will update ${itemsToUpdate.length} items`);

      // 4. Construir mapa de items que precisam de update: itemName -> newLootFrom
      const itemUpdatesMap = new Map();

      for (const item of itemsToUpdate) {
        const itemNameLower = item.name.toLowerCase();
        const monsterNames = itemToMonstersMap.get(itemNameLower) || [];
        const newLootFrom = monsterNames.join(', '); // Espaço após vírgula

        // Usar o nome exato do item (não lowercase) como chave
        itemUpdatesMap.set(item.name, newLootFrom);
      }

      console.log(`Will update lootFrom for ${itemUpdatesMap.size} items`);

      // 5. Enviar para API processar
      const saveResponse = await fetch('/api/items/update-loot-from', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: Array.from(itemUpdatesMap.entries()).map(([name, lootFrom]) => ({ name, lootFrom }))
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'Failed to update lootFrom');
      }

      const result = await saveResponse.json();
      const updatedCount = result.updatedCount || 0;

      // 7. Recarregar itens
      const loadedItems = await ItemsService.loadItemsFromXML(viewType);
      setItems(loadedItems);

      // 8. Feedback
      toast.success(`✅ ${updatedCount} items atualizados, ${monsters.length} monstros processados`);

      setIsUpdateLootFromDialogOpen(false);
    } catch (error) {
      console.error('Error updating lootFrom:', error);
      toast.error(`Erro ao atualizar lootFrom: ${error.message}`);
    } finally {
      setIsUpdatingLootFrom(false);
    }
  };

  const filteredData = useMemo(() => {
    // Não precisa mais do filtro base pois já vem filtrado do serviço
    let filtered = items;

    // Filtro Only Pickupable
    if (onlyPickupableState) {
      filtered = filtered.filter(item => item.weight > 0);
    }

    // Filtro de busca
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.id.toLowerCase().includes(searchLower) ||
        item.name.toLowerCase().includes(searchLower)
      );
    }

    // Filtros de categorias
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.categories) return false;
        const itemCategories = item.categories.split(';');
        return selectedCategories.some(cat => itemCategories.includes(cat));
      });
    }

    // Filtros de slotType
    if (selectedSlotTypes.length > 0) {
      filtered = filtered.filter(item =>
        item.slotType && selectedSlotTypes.includes(item.slotType)
      );
    }

    // Filtros de tier
    if (selectedTiers.length > 0) {
      filtered = filtered.filter(item =>
        item.tier && selectedTiers.includes(item.tier)
      );
    }

    // Filtros de lootCategory
    if (selectedLootCategories.length > 0) {
      filtered = filtered.filter(item =>
        item.attributes?.lootCategory && selectedLootCategories.includes(item.attributes.lootCategory)
      );
    }

    // Calcular estatísticas de drop para monster-loot
    if (viewType === 'monster-loot' && allMonsters.length > 0) {
      filtered = filtered.map(item => {
        const monstersWithDrop = allMonsters.filter(monster => {
          if (!monster.loot || !Array.isArray(monster.loot)) return false;
          return monster.loot.some(lootItem =>
            lootItem.name && lootItem.name.toLowerCase() === item.name.toLowerCase()
          );
        });

        if (monstersWithDrop.length === 0) {
          return {
            ...item,
            totalSpawns: 0,
            powerRange: '-',
            avgDropChance: 0,
            maxDropChance: 0
          };
        }

        const powers = monstersWithDrop.map(m => m.power || 0);
        const chances = monstersWithDrop.map(m => {
          const lootItem = m.loot.find(l =>
            l.name && l.name.toLowerCase() === item.name.toLowerCase()
          );
          return lootItem?.chance || 0;
        });

        // Calcular total de spawns somando os spawn counts de todos os monstros que dropam
        const totalSpawns = monstersWithDrop.reduce((sum, m) => {
          return sum + getSpawnCount(m.monsterName, spawnCounts);
        }, 0);

        return {
          ...item,
          totalSpawns,
          powerRange: `${Math.min(...powers)}-${Math.max(...powers)}`,
          avgDropChance: chances.reduce((sum, c) => sum + c, 0) / chances.length,
          maxDropChance: Math.max(...chances)
        };
      });
    }

    return filtered;
  }, [searchQuery, items, onlyPickupableState, selectedCategories, selectedSlotTypes, selectedTiers, selectedLootCategories, viewType, allMonsters, spawnCounts]);

  // Placeholder para groupedData - será calculado depois da tabela com ordenação correta
  const [groupedData, setGroupedData] = useState(null);

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false,
        enableHiding: true,
        enableResizing: false,
        size: 46,
      },
      {
        id: 'id',
        accessorFn: (row) => parseInt(row.id),
        header: ({ column }) => (
          <DataGridColumnHeader title="ID" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-200 font-medium">
            {row.original.id}
          </span>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Nome do Item" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-200 font-medium">
              {row.original.name}
            </span>
            {row.original.tier && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs px-1.5 py-0",
                  getTierColor(row.original.tier)
                )}
              >
                {row.original.tier}
              </Badge>
            )}
          </div>
        ),
        sortingFn: tierNameSortingFn,
        enableSorting: true,
        size: 300,
      },
      {
        id: 'weight',
        accessorFn: (row) => row.weight,
        header: ({ column }) => (
          <DataGridColumnHeader title="Weight" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-gray-400">
            {row.original.weight || '-'}
          </span>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'categories',
        accessorFn: (row) => row.categories,
        header: ({ column }) => (
          <DataGridColumnHeader title="Categories" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-400">
            {row.original.categories || '-'}
          </span>
        ),
        enableSorting: true,
        size: 200,
      },
      {
        id: 'slotType',
        accessorFn: (row) => row.slotType,
        header: ({ column }) => (
          <DataGridColumnHeader title="Slot Type" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-400">
            {row.original.slotType || '-'}
          </span>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'tier',
        accessorFn: (row) => getTierOrder(row.tier),
        header: ({ column }) => (
          <DataGridColumnHeader title="Tier" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-400">
            {row.original.tier || '-'}
          </span>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'valuation',
        accessorFn: (row) => {
          const val = row.valuation;
          return val ? parseFloat(val) : 0;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title="Valuation" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-400 font-mono">
            {row.original.valuation || '-'}
          </span>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'sellPrice',
        accessorFn: (row) => {
          const price = row.sellPrice;
          return price ? parseFloat(price) : 0;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title="Sell Price" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-400 font-mono">
            {row.original.sellPrice || '-'}
          </span>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'totalSpawns',
        accessorFn: (row) => row.totalSpawns || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Total Spawns" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-200 font-medium">
            {row.original.totalSpawns || '-'}
          </span>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'powerRange',
        accessorFn: (row) => row.powerRange || '-',
        header: ({ column }) => (
          <DataGridColumnHeader title="Power Range" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-200 font-medium">
            {row.original.powerRange || '-'}
          </span>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'avgDropChance',
        accessorFn: (row) => row.avgDropChance || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Avg Drop %" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-200 font-medium">
            {row.original.avgDropChance ? `${row.original.avgDropChance.toFixed(2)}%` : '-'}
          </span>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'maxDropChance',
        accessorFn: (row) => row.maxDropChance || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Max Drop %" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-200 font-medium">
            {row.original.maxDropChance ? `${row.original.maxDropChance.toFixed(2)}%` : '-'}
          </span>
        ),
        enableSorting: true,
        size: 120,
      },
    ],
    [],
  );

  // Seleção de linha única para mostrar detalhes
  const handleRowClick = (item) => {
    // Update URL with selected item
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('selected', item.name || item.id);
    setSearchParams(newSearchParams);

    setSelectedItem(item);
    setEditingItem(item);
    setIsEditing(false);
  };

  // Funções de edição
  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingItem(selectedItem);
    setIsEditing(false);
  };

  const handleSave = () => {
    // Atualiza o item na lista
    const updatedItems = items.map(item =>
      item.id === editingItem.id ? editingItem : item
    );
    setItems(updatedItems);
    setSelectedItem(editingItem);
    setIsEditing(false);
    toast.success(`Item ${editingItem.name} updated successfully`);
  };

  const handleFieldChange = (field, value) => {
    setEditingItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAttributeChange = (key, value) => {
    setEditingItem(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value
      }
    }));
  };

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / currentViewState.pagination.pageSize),
    getRowId: (row) => row.id,
    state: {
      pagination: currentViewState.pagination,
      sorting: currentViewState.sorting,
      rowSelection: currentViewState.rowSelection,
      columnVisibility: currentViewState.columnVisibility,
    },
    onPaginationChange: (value) => updateViewState('pagination', value),
    onSortingChange: (value) => {
      console.log('[MonsterLootItems] onSortingChange called with:', value);
      updateViewState('sorting', value);
    },
    onRowSelectionChange: (value) => updateViewState('rowSelection', value),
    onColumnVisibilityChange: (value) => updateViewState('columnVisibility', value),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Debug: Log sorting state
  useEffect(() => {
    console.log('[MonsterLootItems] Current sorting state:', currentViewState.sorting);
  }, [currentViewState.sorting]);

  // Agrupar por lootCategory quando for monster-loot (após ordenação da tabela)
  useEffect(() => {
    if (viewType !== 'monster-loot') {
      setGroupedData(null);
      return;
    }

    // Usar dados já ordenados da tabela (getSortedRowModel já aplica a ordenação do usuário)
    const sortedData = table.getSortedRowModel().rows.map(row => row.original);

    const grouped = {};
    sortedData.forEach(item => {
      const category = item.attributes?.lootCategory || 'uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Ordenar categorias (consumables primeiro)
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === 'consumables') return -1;
      if (b === 'consumables') return 1;
      return a.localeCompare(b);
    });

    // Construir array final com estatísticas
    const result = sortedCategories.map(category => {
      const items = grouped[category];

      // Calcular contagens por tier
      const tierCounts = {};
      items.forEach(item => {
        const tier = item.tier?.toLowerCase() || 'none';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      return {
        category,
        totalCount: items.length,
        tierCounts,
        items // Items já vêm ordenados do getSortedRowModel, mantém a ordem
      };
    });

    setGroupedData(result);
  }, [viewType, table, currentViewState.sorting, filteredData]);


  // Exporta função e estado para o contexto global
  useEffect(() => {
    window.reloadItemsFunction = loadItems;
    return () => {
      delete window.reloadItemsFunction;
      delete window.itemsLoading;
    };
  }, []);

  // Atualiza estado de loading separadamente
  useEffect(() => {
    window.itemsLoading = loading;
  }, [loading]);

  // Load selected item from URL when items are loaded
  useEffect(() => {
    if (items.length > 0) {
      const selectedParam = searchParams.get('selected');
      if (selectedParam && !selectedItem) {
        const itemToSelect = items.find(i =>
          i.name === selectedParam || i.id === parseInt(selectedParam)
        );
        if (itemToSelect) {
          handleRowClick(itemToSelect);
        }
      }
    }
  }, [items, searchParams]);

  return (
    <Fragment>
      <Container className="max-w-full pb-4" data-panel-id="items-page">
        {/* Page Headers */}
        {viewType === 'equipment' && (
          <div className="mb-2 py-1" data-panel-id="equipment-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Breadcrumb */}
                <nav className="flex items-center text-xs text-gray-400">
                  <span>Items</span>
                  <span className="mx-1">/</span>
                  <span className="text-gray-200">Equipment</span>
                </nav>
                <span className="text-gray-500 mx-2">•</span>
                {/* Title and Description */}
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold text-gray-100">Equipment Database</h1>
                  <span className="text-xs text-gray-400">Gerenciamento de equipamentos - Items com Tier & SlotType</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewType === 'monster-loot' && (
          <div className="mb-2" data-panel-id="monster-loot-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Breadcrumb */}
                <nav className="flex items-center text-xs text-gray-400">
                  <span>Items</span>
                  <span className="mx-1">/</span>
                  <span className="text-gray-200">Monster Loot</span>
                </nav>
                <span className="text-gray-500 mx-2">•</span>
                {/* Title and Description */}
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold text-gray-100">Monster Loot Items</h1>
                  <span className="text-xs text-gray-400">Items filtrados por 'lootCategory'</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {viewType === 'all' && (
          <div className="mb-2" data-panel-id="all-items-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Title and Description */}
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold text-gray-100">All Items</h1>
                  <span className="text-xs text-gray-400">Complete item database</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Painel de Filtros Superior */}
        <Card className="mb-4" data-panel-id="items-filters-card">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Lado esquerdo - Busca e Filtros */}
              <div className="flex items-center gap-3 flex-1">
                {/* Busca */}
                <div className="relative w-64" data-panel-id="items-filters-search">
                  <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search items by ID or name..."
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

                {/* Filtros condicionais baseados no viewType */}
                {viewType === 'monster-loot' ? (
                  <div className="flex items-center gap-2" data-panel-id="items-filters-group">
                    <FilterPopover
                      title="Loot Category"
                      items={items}
                      field="lootCategory"
                      values={[...new Set(items.filter(i => i.attributes?.lootCategory).map(i => i.attributes.lootCategory))].sort()}
                      selected={selectedLootCategories}
                      onSelectionChange={setSelectedLootCategories}
                    />

                    <FilterPopover
                      title="Tier"
                      items={items}
                      field="tier"
                      values={[...new Set(items.filter(i => i.tier).map(i => i.tier))].sort()}
                      selected={selectedTiers}
                      onSelectionChange={setSelectedTiers}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2" data-panel-id="items-filters-group">
                      <FilterPopover
                        title="Categories"
                        items={items}
                        field="categories"
                        values={[...new Set(items.filter(i => i.categories).map(i => i.categories.split(';')).flat())].sort()}
                        selected={selectedCategories}
                        onSelectionChange={setSelectedCategories}
                      />

                      <FilterPopover
                        title="Slot Type"
                        items={items}
                        field="slotType"
                        values={[...new Set(items.filter(i => i.slotType).map(i => i.slotType))].sort()}
                        selected={selectedSlotTypes}
                        onSelectionChange={setSelectedSlotTypes}
                      />

                      <FilterPopover
                        title="Tier"
                        items={items}
                        field="tier"
                        values={[...new Set(items.filter(i => i.tier).map(i => i.tier))].sort()}
                        selected={selectedTiers}
                        onSelectionChange={setSelectedTiers}
                      />
                    </div>

                    {/* Switch Pickupable - Não mostrar em Equipment */}
                    {viewType !== 'equipment' && (
                      <div className="flex items-center gap-2 ml-2" data-panel-id="items-filters-pickupable">
                        <Switch
                          size="sm"
                          id="only-pickupable"
                          checked={onlyPickupableState}
                          onCheckedChange={setOnlyPickupableState}
                        />
                        <Label htmlFor="only-pickupable" className="text-sm text-gray-300 cursor-pointer">
                          Only Pickupable
                        </Label>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Lado direito - Contador e botão de update */}
              <div className="flex items-center gap-3">
                <FilterCounter
                  data-panel-id="items-filters-counter"
                  loading={loading}
                  filteredCount={filteredData.length}
                  totalCount={items.length}
                  itemType="items"
                />

                {/* Botão de atualizar lootFrom */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => setIsUpdateLootFromDialogOpen(true)}
                >
                  <Database className="h-4 w-4" />
                  Update LootFrom
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painéis Principais */}
        <div className="flex gap-4 h-[calc(100vh-180px)]" data-panel-id="items-main-layout">
          {/* Tabela de Items - 65% da largura para monster-loot, 30% para outros */}
          <div className={cn(
            "h-full",
            viewType === 'monster-loot' ? "w-[65%] min-w-[600px]" : "w-[30%] min-w-[400px]"
          )} data-panel-id="items-list-panel">
            <DataGrid table={table} recordCount={filteredData?.length || 0} data-panel-id="items-grid" className="h-full">
              <Card className="h-full flex flex-col">
                <CardHeader className="py-2 flex-shrink-0">
              <CardHeading>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {viewType === 'equipment' ? 'Equipment List' :
                     viewType === 'monster-loot' ? 'Monster Loot List' :
                     'Items List'}
                  </span>
                  {viewType === 'all' && (
                    <DataGridColumnVisibility
                      table={table}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-7 -mr-2">
                          <Settings2 className="h-3 w-3" />
                        </Button>
                      }
                    />
                  )}
                </div>
              </CardHeading>
            </CardHeader>
            <CardTable className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-900 z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th key={header.id} className="text-left p-2 text-gray-400 text-sm">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {viewType === 'monster-loot' && groupedData ? (
                      // Renderização agrupada para monster-loot
                      groupedData.map((group) => (
                        <Fragment key={group.category}>
                          {/* Header da categoria */}
                          <tr className="bg-gradient-to-r from-blue-900/20 via-blue-800/15 to-blue-900/20 border-t-2 border-b border-blue-700/40">
                            <td colSpan={table.getAllColumns().length} className="px-4 py-4">
                              <div className="flex items-center justify-between">
                                {/* Lado esquerdo - Info da categoria */}
                                <div className="flex items-center gap-4">
                                  {/* Nome da categoria */}
                                  <span className="text-base font-bold text-blue-300 capitalize tracking-wide">
                                    {group.category}
                                  </span>

                                  <Badge variant="secondary" className="bg-blue-900/40 text-blue-200 border-blue-700/40">
                                    {group.totalCount} items
                                  </Badge>
                                </div>

                                {/* Lado direito - Tier counts */}
                                <div className="flex items-center gap-3 text-xs">
                                  {Object.entries(group.tierCounts)
                                    .sort(([tierA], [tierB]) => {
                                      const orderA = getTierOrder(tierA);
                                      const orderB = getTierOrder(tierB);
                                      return orderB - orderA;
                                    })
                                    .map(([tier, count]) => (
                                      <div key={tier} className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800/50">
                                        <span className="text-gray-400 capitalize font-medium">{tier}</span>
                                        <span className="text-blue-300 font-semibold">{count}</span>
                                      </div>
                                    ))
                                  }
                                </div>
                              </div>
                            </td>
                          </tr>
                          {/* Items da categoria */}
                          {group.items.map((item) => {
                            const row = table.getRowModel().rows.find(r => r.original.id === item.id);
                            if (!row) return null;
                            return (
                              <tr
                                key={row.id}
                                onClick={() => handleRowClick(row.original)}
                                className={cn(
                                  "cursor-pointer hover:bg-gray-800 transition-colors",
                                  selectedItem?.id === row.original.id && "bg-gray-800"
                                )}
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <td key={cell.id} className="p-2 text-sm">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))
                    ) : (
                      // Renderização normal para outros tipos
                      table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => handleRowClick(row.original)}
                          className={cn(
                            "cursor-pointer hover:bg-gray-800 transition-colors",
                            selectedItem?.id === row.original.id && "bg-gray-800"
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="p-2 text-sm">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
              </Card>
            </DataGrid>
      </div>

      {/* Painel de Detalhes - 35% para monster-loot, 70% para outros */}
      <div className="flex-1 h-full" data-panel-id="items-details-panel">
        <Card className="h-full flex flex-col" data-panel-id="items-details-card">
          <CardHeader className="py-3 flex flex-row items-center justify-between flex-shrink-0" data-panel-id="items-details-header">
            <CardHeading>
              <div className="flex items-center gap-2">
                {selectedItem ? (
                  <>
                    {viewType === 'monster-loot' ? (
                      <>
                        <span className="text-lg font-semibold">Drop Sources</span>
                        <span className="text-sm text-gray-400">- {selectedItem.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-semibold">Item #{selectedItem.id}</span>
                        <span className="text-sm text-gray-400">- {selectedItem.name}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">
                    {viewType === 'monster-loot' ? 'Select an item to view drop sources' : 'Select an item to view details'}
                  </span>
                )}
              </div>
            </CardHeading>
            {selectedItem && (
              <div className="flex items-center gap-2">
                {viewType === 'monster-loot' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implementar simulação
                      toast.info('Simulação em desenvolvimento');
                    }}
                    className="h-7"
                  >
                    <ChartBar className="h-3 w-3 mr-1" />
                    Simulação
                  </Button>
                ) : !isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="h-7"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="h-7"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="h-7 bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Clear URL parameter
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.delete('selected');
                    setSearchParams(newSearchParams);

                    setSelectedItem(null);
                    setEditingItem(null);
                    setIsEditing(false);
                  }}
                  className="h-7"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardTable className="p-4 flex-1 overflow-hidden" data-panel-id="items-details-content">
            {viewType === 'monster-loot' && selectedItem ? (
              // Painel de Drop Sources para Monster Loot
              <MonsterDropTable
                item={selectedItem}
                allMonsters={allMonsters}
                spawnCounts={spawnCounts}
              />
            ) : editingItem ? (
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-3 pb-6">
                  {/* Informações Básicas */}
                  <div data-panel-id="items-details-basic">
                    <h3 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">Basic Information</h3>
                    <div className="flex gap-3 items-end">
                      <div className="w-[15%]">
                        <Label className="text-xs text-gray-400">Item ID</Label>
                        <Input
                          value={editingItem.id}
                          disabled
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-400">Name *</Label>
                        <Input
                          value={editingItem.name || ''}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                        />
                      </div>
                      <div className="w-[80px]">
                        <Label className="text-xs text-gray-400">Article</Label>
                        <Input
                          value={editingItem.article || ''}
                          onChange={(e) => handleFieldChange('article', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="a, an"
                          maxLength={5}
                        />
                      </div>
                      <div className="w-[80px]">
                        <Label className="text-xs text-gray-400">Plural</Label>
                        <Input
                          value={editingItem.plural || ''}
                          onChange={(e) => handleFieldChange('plural', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          maxLength={5}
                        />
                      </div>
                    </div>

                    {/* Weight, Price, Selling Price, Valuation - Same Line */}
                    <div className="flex gap-3 items-end mt-3">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-400">Weight (oz)</Label>
                        <Input
                          type="number"
                          value={editingItem.weight ? (editingItem.weight / 100).toFixed(2) : ''}
                          onChange={(e) => {
                            const ozValue = parseFloat(e.target.value);
                            handleFieldChange('weight', isNaN(ozValue) ? null : Math.round(ozValue * 100));
                          }}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-400">Price (gps)</Label>
                        <Input
                          type="number"
                          value={editingItem.attributes?.price || ''}
                          onChange={(e) => handleAttributeChange('price', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-400">Selling Price (gps)</Label>
                        <Input
                          type="number"
                          value={editingItem.sellPrice || editingItem.attributes?.sellingPrice || ''}
                          onChange={(e) => handleFieldChange('sellPrice', e.target.value ? Number(e.target.value) : null)}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-400">Valuation (gps)</Label>
                        <Input
                          type="number"
                          value={editingItem.valuation || editingItem.attributes?.valuation || ''}
                          onChange={(e) => handleFieldChange('valuation', e.target.value ? Number(e.target.value) : null)}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Descriptions - Side by Side */}
                    <div className="flex gap-3 mt-3">
                      <div className="w-1/2">
                        <Label className="text-xs text-gray-400">Description (PT-BR)</Label>
                        <RichTextArea
                          value={editingItem.attributes?.descPtBr || ''}
                          onChange={(e) => handleAttributeChange('descPtBr', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 text-sm min-h-[80px]"
                          placeholder="Descrição em português..."
                        />
                      </div>
                      <div className="w-1/2">
                        <Label className="text-xs text-gray-400">Description (EN-US)</Label>
                        <RichTextArea
                          value={editingItem.attributes?.descEnUs || ''}
                          onChange={(e) => handleAttributeChange('descEnUs', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 text-sm min-h-[80px]"
                          placeholder="Description in English..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Categorização */}
                  <div data-panel-id="items-details-categorization">
                    <h3 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">Categorization</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-400">Categories</Label>
                        <Input
                          value={editingItem.categories || ''}
                          onChange={(e) => handleFieldChange('categories', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="tool;weapon;armor"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Tier</Label>
                        <Input
                          value={editingItem.tier || ''}
                          onChange={(e) => handleFieldChange('tier', e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="common, rare, epic..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Equipment Attributes - Para atributos com prefixo equipatt_, slotType e passive */}
                  {(() => {
                    const allAttrs = editingItem.attributes || {};

                    // Coletar slotType, passive e atributos com prefixo equipatt_
                    const equipmentAttrs = [];

                    // Adicionar slotType primeiro se existir
                    if (allAttrs.slotType) {
                      equipmentAttrs.push(['slotType', allAttrs.slotType]);
                    }

                    // Adicionar passive se existir
                    if (allAttrs.passive) {
                      equipmentAttrs.push(['passive', allAttrs.passive]);
                    }

                    // Adicionar todos os atributos com prefixo equipatt_
                    Object.entries(allAttrs).forEach(([key, value]) => {
                      if (key.startsWith('equipatt_')) {
                        equipmentAttrs.push([key, value]);
                      }
                    });

                    if (equipmentAttrs.length === 0) return null;

                    return (
                      <div data-panel-id="items-details-equipment-attributes">
                        <h3 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">Equipment Attributes</h3>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="space-y-2">
                            {equipmentAttrs.map(([key, value]) => (
                              <div key={key} className="grid grid-cols-3 gap-2 items-center">
                                <Label className="text-xs text-gray-400">{key}:</Label>
                                <Input
                                  value={value || ''}
                                  onChange={(e) => handleAttributeChange(key, e.target.value)}
                                  disabled={!isEditing}
                                  className="col-span-2 bg-gray-900 border-gray-700 text-gray-200 h-7 text-sm font-mono"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Other Attributes - Para atributos SEM prefixo equipatt_ e excluindo atributos especiais */}
                  {(() => {
                    const regularAttrs = editingItem.attributes
                      ? Object.entries(editingItem.attributes).filter(([key]) =>
                          !key.startsWith('equipatt_') &&
                          key !== 'descPtBr' &&
                          key !== 'descEnUs' &&
                          key !== 'weight' &&
                          key !== 'categories' &&
                          key !== 'tier' &&
                          key !== 'slotType' &&
                          key !== 'passive' &&
                          key !== 'price'
                        )
                      : [];

                    if (regularAttrs.length === 0) return null;

                    return (
                      <div data-panel-id="items-details-attributes">
                        <h3 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">Other Attributes</h3>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="space-y-2">
                            {regularAttrs.map(([key, value]) => (
                              <div key={key} className="grid grid-cols-3 gap-2 items-center">
                                <Label className="text-xs text-gray-400">{key}:</Label>
                                <Input
                                  value={value || ''}
                                  onChange={(e) => handleAttributeChange(key, e.target.value)}
                                  disabled={!isEditing}
                                  className="col-span-2 bg-gray-900 border-gray-700 text-gray-200 h-7 text-sm font-mono"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Build Requirements - Para items lendários que são equipamentos */}
                  {(() => {
                    // Verificar se é um equipamento e lendário (tier 4)
                    const isLegendaryEquipment = editingItem.tier === 'legendary' && editingItem.slotType && editingItem.slotType !=="";
                    console.log(editingItem)
                    if (!isLegendaryEquipment) return null;

                    // Buscar o buildable item correspondente
                    const buildableItem = findBuildableItem(buildableItems, editingItem.name);

                    if (!buildableItem || !buildableItem.build || buildableItem.build.length === 0) {
                      return null;
                    }

                    return (
                      <div data-panel-id="items-details-build-requirements">
                        <h3 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                          Build Requirements (Legendary)
                        </h3>
                        <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-700/30 rounded-lg p-4">
                          <div className="space-y-3">
                            <div className="text-xs text-gray-400 mb-2">
                              Required items to build <span className="text-yellow-300 font-semibold">{editingItem.name?.toLowerCase()}</span>:
                            </div>
                            {buildableItem.build.map((requirement, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded p-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-300">
                                    {requirement.itemName?.toLowerCase()}
                                  </span>
                                  {requirement.fusionLevel && (
                                    <Badge variant="outline" className="text-xs bg-yellow-900/30 border-yellow-600/50 text-yellow-200">
                                      Fusion +{requirement.fusionLevel}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Qty:</span>
                                  <Badge variant="secondary" className="text-xs bg-amber-900/30 text-amber-200">
                                    {requirement.count}x
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            <div className="mt-3 pt-3 border-t border-yellow-700/50">
                              <div className="text-xs text-amber-400">
                                ⚔️ This legendary item can be crafted at Baldur NPC
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-300px)] text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No item selected</p>
                  <p className="text-sm">Click on an item in the table to view its details</p>
                </div>
              </div>
            )}
          </CardTable>
        </Card>
      </div>
    </div>
      </Container>

      {/* Dialog de confirmação para atualização do lootFrom */}
      <Dialog open={isUpdateLootFromDialogOpen} onOpenChange={setIsUpdateLootFromDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update LootFrom Attributes</DialogTitle>
            <DialogDescription>
              Esta operação irá atualizar o atributo <code className="bg-gray-800 px-1 rounded">lootFrom</code> de todos os itens
              com base nos loots dos monstros XMLs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Explicação */}
            <div className="text-sm text-gray-400 space-y-2">
              <p>O processo irá:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ler todos os arquivos XML de monstros</li>
                <li>Identificar quais monstros dropam cada item</li>
                <li>Atualizar o atributo <code className="bg-gray-800 px-1 rounded">lootFrom</code> com a lista de monstros</li>
                <li>Formato: <code className="bg-gray-800 px-1 rounded">Monster1, Monster2, Monster3</code></li>
              </ul>
            </div>

            {/* Switch ignore filters */}
            <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ignore-filters" className="text-sm font-medium">
                  Ignore Filters
                </Label>
                <p className="text-xs text-gray-400">
                  Se ativo, atualiza todos os itens com <code className="bg-gray-800 px-1 rounded">lootCategory</code> não vazio,
                  ignorando os filtros da tela (lootCategory, tier, etc.)
                </p>
              </div>
              <Switch
                id="ignore-filters"
                checked={ignoreFilters}
                onCheckedChange={setIgnoreFilters}
              />
            </div>

            {/* Info sobre o que será atualizado */}
            <div className="rounded-lg bg-blue-900/20 border border-blue-700/40 p-3">
              <p className="text-sm text-blue-300">
                {ignoreFilters ? (
                  <>
                    Serão atualizados <strong>todos os itens</strong> que possuem <code className="bg-gray-800 px-1 rounded">lootCategory</code> não vazio
                  </>
                ) : (
                  <>
                    Serão atualizados apenas os itens <strong>filtrados na tela atual</strong> que possuem <code className="bg-gray-800 px-1 rounded">lootCategory</code> não vazio
                  </>
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsUpdateLootFromDialogOpen(false)}
              disabled={isUpdatingLootFrom}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLootFrom}
              disabled={isUpdatingLootFrom}
            >
              {isUpdatingLootFrom ? (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Update LootFrom
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
};

export { MonsterLootItemsPage };