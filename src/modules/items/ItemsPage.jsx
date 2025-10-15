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
  Terminal,
  Info,
  ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AttributeLabel } from '@/components/AttributeLabel';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ItemsService } from '@/services/itemsService';
import { loadBuildableItems, findBuildableItem } from '@/services/baldurService';
import { useItemAttributes } from '@/hooks/useItemAttributes';
import ItemBulkActionsModal from './ItemBulkActionsModal';
import equipGoldValueService from '@/services/equipGoldValueService';

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
        // Para lootCategory, acessar em attributes
        const lootCat = item.attributes.lootCategory;
        counts[lootCat] = (counts[lootCat] || 0) + 1;
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

const ItemsPage = ({ viewType = 'all' }) => {
  const pageTitle = viewType === 'equipment' ? 'Equipment Items' : 'All Items';
  usePageTitle(pageTitle);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlyPickupable, setOnlyPickupable] = useState(true); // Default ativado
  const [selectedItem, setSelectedItem] = useState(null); // Item selecionado para detalhes
  const [editingItem, setEditingItem] = useState(null); // Item sendo visualizado
  const [buildableItems, setBuildableItems] = useState([]); // BuildableItems do baldur
  const [equipGoldValue, setEquipGoldValue] = useState(null); // Cálculo do valor em gold do equipamento
  const [itemsWithGoldValues, setItemsWithGoldValues] = useState([]); // Items com valores de gold pré-calculados

  // Bulk actions state
  const [isBulkActionsModalOpen, setIsBulkActionsModalOpen] = useState(false);

  // Hook para carregar item_attributes.json
  const {
    groupAttributesByCategory,
    getCategoryLabel,
    categoryOrder,
    getAttributeInfo,
    loading: attributesLoading
  } = useItemAttributes();
  // Estados independentes para cada view
  const [viewStates, setViewStates] = useState({
    'all': {
      columnVisibility: {
        select: true,
        weight: false,
        categories: false,
        slotType: false,
        tier: false,
        price: false,
        sellingPrice: false,
        valuation: false,
        passive: false
      },
      sorting: [{ id: 'id', desc: false }],
      pagination: { pageIndex: 0, pageSize: 50 },
      rowSelection: {}
    },
    'equipment': {
      columnVisibility: {
        select: true,
        weight: false,
        categories: false,
        slotType: true,
        tier: true,
        price: false,
        sellingPrice: false,
        valuation: false,
        equipGoldValue: true,
        passive: false
      },
      sorting: [{ id: 'tier', desc: false }],
      pagination: { pageIndex: 0, pageSize: 50 },
      rowSelection: {}
    },
    'monster-loot': {
      columnVisibility: {
        select: true,
        weight: false,
        categories: false,
        slotType: false,
        tier: false,
        price: false,
        sellingPrice: true,
        valuation: true,
        passive: false
      },
      sorting: [{ id: 'name', desc: false }],
      pagination: { pageIndex: 0, pageSize: 50 },
      rowSelection: {}
    }
  });

  // Estados ativos baseados no viewType
  const currentViewState = viewStates[viewType] || viewStates['all'];

  const updateViewState = (key, value) => {
    setViewStates(prev => ({
      ...prev,
      [viewType]: {
        ...prev[viewType],
        [key]: typeof value === 'function' ? value(prev[viewType][key]) : value
      }
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSlotTypes, setSelectedSlotTypes] = useState([]);
  const [selectedTiers, setSelectedTiers] = useState([]);
  const [selectedLootCategories, setSelectedLootCategories] = useState([]);

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

  // Limpa seleções quando viewType mudar
  useEffect(() => {
    setSelectedItem(null);
    setEditingItem(null);
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedSlotTypes([]);
    setSelectedTiers([]);
    setSelectedLootCategories([]);
  }, [viewType]);

  // Carregar gold values e calcular para todos os items
  useEffect(() => {
    const calculateGoldValuesForAllItems = async () => {
      await equipGoldValueService.loadGoldValues();

      // Calcular gold value para cada item
      const itemsWithGold = items.map(item => {
        const goldValueData = equipGoldValueService.calculateEquipmentGoldValue(
          item.attributes || {},
          item
        );

        return {
          ...item,
          equipGoldValue: goldValueData.hasValidAttributes ? goldValueData.totalGold : 0
        };
      });

      setItemsWithGoldValues(itemsWithGold);
    };

    if (items.length > 0) {
      calculateGoldValuesForAllItems();
    }
  }, [items]);

  // Carregar gold values e calcular quando item for selecionado
  useEffect(() => {
    const loadGoldValues = async () => {
      await equipGoldValueService.loadGoldValues();

      if (editingItem) {
        // Passa os atributos E o item completo para permitir lógicas customizadas
        const goldValueData = equipGoldValueService.calculateEquipmentGoldValue(
          editingItem.attributes || {},
          editingItem
        );
        setEquipGoldValue(goldValueData);
      } else {
        setEquipGoldValue(null);
      }
    };

    loadGoldValues();
  }, [editingItem]);

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

  const filteredData = useMemo(() => {
    // Usa items com gold values se disponível, senão usa items normais
    let filtered = itemsWithGoldValues.length > 0 ? itemsWithGoldValues : items;

    // Filtro Only Pickupable
    if (onlyPickupable) {
      filtered = filtered.filter(item => item.weight > 0);
    }

    // Filtro de busca (suporta múltiplos termos separados por vírgula)
    if (searchQuery) {
      const searchTerms = searchQuery
        .split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        filtered = filtered.filter((item) => {
          const itemId = item.id.toLowerCase();
          const itemName = item.name.toLowerCase();

          return searchTerms.some(term =>
            itemId.includes(term) || itemName.includes(term)
          );
        });
      }
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

    return filtered;
  }, [searchQuery, items, itemsWithGoldValues, onlyPickupable, selectedCategories, selectedSlotTypes, selectedTiers, selectedLootCategories]);

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
        id: 'id',
        accessorFn: (row) => parseInt(row.id),
        header: ({ column }) => (
          <DataGridColumnHeader title="ID" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-gray-300">
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
          <span className="text-gray-200 font-medium">
            {row.original.name}
          </span>
        ),
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
        accessorFn: (row) => row.tier,
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
        id: 'price',
        accessorFn: (row) => row.attributes?.price || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Price" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-400">
            {row.original.attributes?.price ? `${row.original.attributes.price} gp` : '-'}
          </span>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'sellingPrice',
        accessorFn: (row) => row.attributes?.sellingPrice || row.sellPrice || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Selling Price" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-400">
            {(row.original.attributes?.sellingPrice || row.original.sellPrice) ? `${row.original.attributes?.sellingPrice || row.original.sellPrice} gp` : '-'}
          </span>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'valuation',
        accessorFn: (row) => row.valuation || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Valuation" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-400">
            {row.original.valuation ? `${row.original.valuation} gp` : '-'}
          </span>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'equipGoldValue',
        accessorFn: (row) => row.equipGoldValue || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Valor Gold Equip" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-green-400 font-semibold">
            {row.original.equipGoldValue ? `${Math.round(row.original.equipGoldValue).toLocaleString('pt-BR')}g` : '-'}
          </span>
        ),
        enableSorting: true,
        size: 140,
      },
      {
        id: 'passive',
        accessorFn: (row) => row.attributes?.passive || '',
        header: ({ column }) => (
          <DataGridColumnHeader title="Passive" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-purple-400 font-medium">
            {row.original.attributes?.passive || '-'}
          </span>
        ),
        enableSorting: true,
        size: 150,
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
  };

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / currentViewState.pagination.pageSize),
    getRowId: (row) => row.id,
    enableRowSelection: true,
    state: {
      pagination: currentViewState.pagination,
      sorting: currentViewState.sorting,
      rowSelection: currentViewState.rowSelection,
      columnVisibility: currentViewState.columnVisibility,
    },
    onPaginationChange: (value) => updateViewState('pagination', value),
    onSortingChange: (value) => updateViewState('sorting', value),
    onRowSelectionChange: (value) => updateViewState('rowSelection', value),
    onColumnVisibilityChange: (value) => updateViewState('columnVisibility', value),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });


  // Exporta função e estado para o contexto global
  useEffect(() => {
    window.reloadItemsFunction = loadItems;
    return () => {
      delete window.reloadItemsFunction;
      delete window.itemsLoading;
      delete window.listFilteredItems;
    };
  }, []);

  // Atualiza estado de loading separadamente
  useEffect(() => {
    window.itemsLoading = loading;
  }, [loading]);

  // Exporta função para listar items filtrados no console
  useEffect(() => {
    window.listFilteredItems = () => {
      const itemNames = filteredData.map(item => item.name);
      console.log('Filtered Items (' + itemNames.length + '):');
      console.log(itemNames);
      return itemNames;
    };
  }, [filteredData]);

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

  // Get selected items from row selection
  const selectedItemsForBulkAction = useMemo(() => {
    return Object.keys(currentViewState.rowSelection)
      .map(id => filteredData.find(item => item.id.toString() === id))
      .filter(Boolean);
  }, [currentViewState.rowSelection, filteredData]);

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
                  <span className="text-xs text-gray-400">Items filtrados para que tem categoria 'monsterLoot'</span>
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
              {/* Console Command Info */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7">
                    <Terminal className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-blue-400" />
                      <h4 className="text-sm font-semibold text-gray-200">Console Command</h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">
                        Para listar todos os itens filtrados na tabela, digite no console do navegador:
                      </p>
                      <div className="bg-gray-900 border border-gray-700 rounded p-2">
                        <code className="text-xs text-green-400 font-mono">
                          listFilteredItems()
                        </code>
                      </div>
                      <p className="text-xs text-gray-500">
                        Isso irá exibir os nomes de todos os itens que estão sendo mostrados na tabela atual, considerando os filtros aplicados.
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
                    placeholder="Search items by ID or name (comma-separated)..."
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
                {viewType !== 'monster-loot' && (
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
                        title="Loot Category"
                        items={items}
                        field="lootCategory"
                        values={[...new Set(items.filter(i => i.attributes?.lootCategory).map(i => i.attributes.lootCategory))].sort()}
                        selected={selectedLootCategories}
                        onSelectionChange={setSelectedLootCategories}
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
                          checked={onlyPickupable}
                          onCheckedChange={setOnlyPickupable}
                        />
                        <Label htmlFor="only-pickupable" className="text-sm text-gray-300 cursor-pointer">
                          Only Pickupable
                        </Label>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Lado direito - Contador */}
              <FilterCounter
                data-panel-id="items-filters-counter"
                loading={loading}
                filteredCount={filteredData.length}
                totalCount={items.length}
                itemType="items"
              />
            </div>
          </CardContent>
        </Card>

        {/* Painéis Principais */}
        <div className="flex gap-4 h-[calc(100vh-180px)]" data-panel-id="items-main-layout">
          {/* Tabela de Items - 30% da largura */}
          <div className="w-[30%] min-w-[400px] h-full" data-panel-id="items-list-panel">
            <DataGrid table={table} recordCount={filteredData?.length || 0} data-panel-id="items-grid" className="h-full">
              <Card className="h-full flex flex-col">
                <CardHeader className="py-2 flex-shrink-0">
              <CardHeading>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {viewType === 'equipment' ? 'Equipment List' :
                       viewType === 'monster-loot' ? 'Monster Loot List' :
                       'Items List'}
                    </span>
                    {Object.keys(currentViewState.rowSelection).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => setIsBulkActionsModalOpen(true)}
                      >
                        <ListChecks className="h-3 w-3 mr-1" />
                        <span className="text-xs">
                          {Object.keys(currentViewState.rowSelection).length} selected
                        </span>
                      </Button>
                    )}
                  </div>
                  <DataGridColumnVisibility
                    table={table}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-7 -mr-2">
                        <Settings2 className="h-3 w-3" />
                      </Button>
                    }
                  />
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
                    {table.getRowModel().rows.map((row) => (
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
                    ))}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
                <CardFooter className="flex-shrink-0 border-t border-gray-700">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
      </div>

      {/* Painel de Detalhes - 70% da largura */}
      <div className="flex-1 h-full" data-panel-id="items-details-panel">
        <Card className="h-full flex flex-col" data-panel-id="items-details-card">
          <CardHeader className="py-3 flex flex-row items-center justify-between flex-shrink-0" data-panel-id="items-details-header">
            <CardHeading>
              <div className="flex items-center gap-2">
                {selectedItem ? (
                  <>
                    <span className="text-lg font-semibold">Item #{selectedItem.id}</span>
                    <span className="text-sm text-gray-400">- {selectedItem.name}</span>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">Select an item to view details</span>
                )}
              </div>
            </CardHeading>
            {selectedItem && (
              <div className="flex items-center gap-2">
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
                  }}
                  className="h-7"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardTable className="p-4 flex-1 overflow-hidden" data-panel-id="items-details-content">
            {editingItem ? (
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
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                        />
                      </div>
                      <div className="w-[80px]">
                        <Label className="text-xs text-gray-400">Article</Label>
                        <Input
                          value={editingItem.article || ''}
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="a, an"
                          maxLength={5}
                        />
                      </div>
                      <div className="w-[80px]">
                        <Label className="text-xs text-gray-400">Plural</Label>
                        <Input
                          value={editingItem.plural || ''}
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          maxLength={5}
                        />
                      </div>
                    </div>

                    {/* Weight, Price, Selling Price, Valuation - Same Line */}
                    <div className="flex gap-3 items-end mt-3">
                      <div className="flex-1">
                        <div className="mb-1">
                          <AttributeLabel attributeName="weight" label="Weight (oz)" getAttributeInfo={getAttributeInfo} />
                        </div>
                        <Input
                          type="number"
                          value={editingItem.weight ? (editingItem.weight / 100).toFixed(2) : ''}
                          onChange={(e) => {
                            const ozValue = parseFloat(e.target.value);
                            handleFieldChange('weight', isNaN(ozValue) ? null : Math.round(ozValue * 100));
                          }}
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1">
                          <AttributeLabel attributeName="price" label="Price (gps)" getAttributeInfo={getAttributeInfo} />
                        </div>
                        <Input
                          type="number"
                          value={editingItem.attributes?.price || ''}
                          onChange={(e) => handleAttributeChange('price', e.target.value)}
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1">
                          <AttributeLabel attributeName="sellingPrice" label="Selling Price (gps)" getAttributeInfo={getAttributeInfo} />
                        </div>
                        <Input
                          type="number"
                          value={editingItem.sellPrice || editingItem.attributes?.sellingPrice || ''}
                          onChange={(e) => handleFieldChange('sellPrice', e.target.value ? Number(e.target.value) : null)}
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1">
                          <AttributeLabel attributeName="valuation" label="Valuation (gps)" getAttributeInfo={getAttributeInfo} />
                        </div>
                        <Input
                          type="number"
                          value={editingItem.valuation || editingItem.attributes?.valuation || ''}
                          onChange={(e) => handleFieldChange('valuation', e.target.value ? Number(e.target.value) : null)}
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Descriptions - Side by Side */}
                    <div className="flex gap-3 mt-3">
                      <div className="w-1/2">
                        <div className="mb-1">
                          <AttributeLabel attributeName="descPtBr" label="Description (PT-BR)" getAttributeInfo={getAttributeInfo} />
                        </div>
                        <RichTextArea
                          value={editingItem.attributes?.descPtBr || ''}
                          onChange={(e) => handleAttributeChange('descPtBr', e.target.value)}
                          disabled={true}
                          className="mt-1 text-sm min-h-[80px]"
                          placeholder="Descrição em português..."
                        />
                      </div>
                      <div className="w-1/2">
                        <div className="mb-1">
                          <AttributeLabel attributeName="descEnUs" label="Description (EN-US)" getAttributeInfo={getAttributeInfo} />
                        </div>
                        <RichTextArea
                          value={editingItem.attributes?.descEnUs || ''}
                          onChange={(e) => handleAttributeChange('descEnUs', e.target.value)}
                          disabled={true}
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
                        <div className="mb-1">
                          <AttributeLabel attributeName="categories" label="Categories" getAttributeInfo={getAttributeInfo} />
                        </div>
                        <Input
                          value={editingItem.categories || ''}
                          onChange={(e) => handleFieldChange('categories', e.target.value)}
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="tool;weapon;armor"
                        />
                      </div>
                      <div>
                        <div className="mb-1">
                          <AttributeLabel attributeName="tier" label="Tier" getAttributeInfo={getAttributeInfo} />
                        </div>
                        <Input
                          value={editingItem.tier || ''}
                          onChange={(e) => handleFieldChange('tier', e.target.value)}
                          disabled={true}
                          className="mt-1 bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                          placeholder="common, rare, epic..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Attribute Sections - Grouped by category from item_attributes.json */}
                  {(() => {
                    if (!editingItem.attributes) return null;

                    // Atributos a excluir do agrupamento (já estão em Basic Info ou Categorization)
                    const excludeAttributes = [
                      'descPtBr',
                      'descEnUs',
                      'weight',
                      'categories',
                      'tier',
                      'price',
                      'sellingPrice',
                      'valuation'
                    ];

                    // Agrupar atributos por categoria
                    const groupedAttributes = groupAttributesByCategory(
                      editingItem.attributes,
                      excludeAttributes
                    );

                    // Renderizar seções na ordem das categorias
                    return categoryOrder.map(categoryKey => {
                      const attributes = groupedAttributes[categoryKey];

                      if (!attributes || attributes.length === 0) return null;

                      const categoryLabel = getCategoryLabel(categoryKey);
                      const panelId = `items-details-${categoryKey}-attributes`;

                      return (
                        <div key={categoryKey} data-panel-id={panelId}>
                          <h3 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                            {categoryLabel}
                          </h3>
                          <div className="bg-gray-800 rounded-lg p-3">
                            <div className="space-y-2">
                              {attributes.map(([key, value]) => (
                                <div key={key} className="grid grid-cols-3 gap-2 items-center">
                                  <AttributeLabel attributeName={key} label={`${key}:`} getAttributeInfo={getAttributeInfo} />
                                  <Input
                                    value={value || ''}
                                    onChange={(e) => handleAttributeChange(key, e.target.value)}
                                    disabled={true}
                                    className="col-span-2 bg-gray-900 border-gray-700 text-gray-200 h-7 text-sm font-mono"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* Other Attributes - Para atributos não mapeados */}
                  {(() => {
                    if (!editingItem.attributes) return null;

                    const excludeAttributes = [
                      'descPtBr',
                      'descEnUs',
                      'weight',
                      'categories',
                      'tier',
                      'price',
                      'sellingPrice',
                      'valuation'
                    ];

                    const groupedAttributes = groupAttributesByCategory(
                      editingItem.attributes,
                      excludeAttributes
                    );

                    const otherAttributes = groupedAttributes['other'];

                    if (!otherAttributes || otherAttributes.length === 0) return null;

                    return (
                      <div data-panel-id="items-details-other-attributes">
                        <h3 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                          Other Attributes
                        </h3>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="space-y-2">
                            {otherAttributes.map(([key, value]) => (
                              <div key={key} className="grid grid-cols-3 gap-2 items-center">
                                <AttributeLabel attributeName={key} label={`${key}:`} getAttributeInfo={getAttributeInfo} />
                                <Input
                                  value={value || ''}
                                  onChange={(e) => handleAttributeChange(key, e.target.value)}
                                  disabled={true}
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

                  {/* Equipment Gold Value - Mostra se tiver atributos válidos */}
                  {(() => {
                    if (!equipGoldValue || !equipGoldValue.hasValidAttributes) return null;

                    const { totalGold, breakdown } = equipGoldValue;

                    return (
                      <div data-panel-id="items-details-equipment-gold-value">
                        <h3 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                          Valor em Gold do Equipamento
                        </h3>
                        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-lg p-4">
                          <div className="space-y-3">
                            {/* Total Value */}
                            <div className="flex items-center justify-between pb-3 border-b border-green-700/30">
                              <span className="text-sm text-gray-400">Valor Total Estimado:</span>
                              <span className="text-2xl font-bold text-green-400">
                                {Math.round(totalGold).toLocaleString('pt-BR')}g
                              </span>
                            </div>

                            {/* Breakdown */}
                            <div className="space-y-2">
                              <div className="text-xs text-gray-400 mb-2">Detalhamento por atributo:</div>
                              {breakdown.map((attr, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded p-2">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-sm text-gray-300 min-w-[180px]">
                                      {attr.displayName}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono">
                                      {attr.value} × {attr.goldPerPoint}g
                                    </span>
                                  </div>
                                  <span className="text-sm font-semibold text-green-300">
                                    {Math.round(attr.totalGold).toLocaleString('pt-BR')}g
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 pt-3 border-t border-green-700/30 space-y-2">
                              <div className="text-xs text-gray-400">
                                💰 A tabela de preços baseadas em League of Legends em: <code className="text-gray-300 bg-gray-900/50 px-1 rounded">equip_attribute_gold_values.json</code>.
                              </div>
                              <div className="text-xs text-gray-400 flex items-start gap-1">
                                <span>⚙️</span>
                                <span>O total pode diferir da soma simples devido a lógicas customizadas em <code className="text-gray-300 bg-gray-900/50 px-1 rounded">equipmentGoldCalculations.js</code></span>
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

      {/* Bulk Actions Modal */}
      <ItemBulkActionsModal
        isOpen={isBulkActionsModalOpen}
        onClose={() => setIsBulkActionsModalOpen(false)}
        selectedItems={selectedItemsForBulkAction}
      />
    </Fragment>
  );
};

export { ItemsPage };