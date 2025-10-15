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
  X,
  Filter,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  CardTable,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FilterCounter } from '@/components/ui/filter-counter';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ItemsService } from '@/services/itemsService';
import { Progress } from '@/components/ui/progress';
import { getTierColor, getTierOrder } from '@/utils/tierUtils';

// Componente para mostrar detalhes do item no mapa
const MapItemDetailsPanel = ({ item, regionData, allRegions }) => {
  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select an item to view map details
      </div>
    );
  }

  // Pega dados de região para este item
  const itemRegionData = regionData?.[item.id] || {};

  // Função para extrair o nível mínimo de recommended-level
  const getMinLevel = (recommendedLevel) => {
    if (!recommendedLevel) return 999999;
    const match = recommendedLevel.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 999999;
  };

  // Combina todas as regiões com seus counts, ordenado por nível recomendado
  const regionsWithCounts = allRegions.map(region => ({
    name: region.description,
    recommendedLevel: region.recommendedLevel,
    count: itemRegionData[region.description] || 0,
    minLevel: getMinLevel(region.recommendedLevel)
  })).sort((a, b) => a.minLevel - b.minLevel);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Item Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Item ID:</span>
              <span className="text-gray-200">{item.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="text-gray-200">{item.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total on Map:</span>
              <span className="text-blue-400 font-semibold">
                {item.mapOccurrences || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            By Region
          </h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Region</th>
                <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Level</th>
                <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {regionsWithCounts.map((region, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-b border-gray-800 hover:bg-gray-800/50 transition-colors",
                    region.count === 0 && "opacity-50"
                  )}
                >
                  <td className="py-2 px-3 text-sm text-gray-200">{region.name}</td>
                  <td className="py-2 px-3 text-sm text-center text-gray-400">
                    {region.recommendedLevel}
                  </td>
                  <td className={cn(
                    "py-2 px-3 text-sm text-center font-semibold",
                    region.count > 0 ? "text-blue-400" : "text-gray-600"
                  )}>
                    {region.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      if (field === 'lootCategory' && item.attributes?.lootCategory) {
        counts[item.attributes.lootCategory] = (counts[item.attributes.lootCategory] || 0) + 1;
      } else if (item[field]) {
        counts[item[field]] = (counts[item[field]] || 0) + 1;
      }
    });

    return counts;
  }, [items, field]);

  const uniqueValues = Object.keys(valuesCounts).sort();

  return (
    <Popover data-panel-id={`map-items-filter-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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

const MapItemsPage = () => {
  usePageTitle('Map Items');

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  // Estados para loading de incidências
  const [loadingIncidences, setLoadingIncidences] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [itemsWithIncidences, setItemsWithIncidences] = useState([]);
  const [regionData, setRegionData] = useState({});
  const [regions, setRegions] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLootCategories, setSelectedLootCategories] = useState([]);
  const [selectedTiers, setSelectedTiers] = useState([]);

  const [columnVisibility, setColumnVisibility] = useState({
    select: false,
  });
  const [sorting, setSorting] = useState([{ id: 'mapOccurrences', desc: true }, { id: 'name', desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 999999 });
  const [rowSelection, setRowSelection] = useState({});

  // Carrega regiões
  useEffect(() => {
    let mounted = true;

    const loadRegions = async () => {
      try {
        const response = await fetch('/api/map/regions');
        const data = await response.json();

        if (data.success && mounted) {
          setRegions(data.regions);
        }
      } catch (error) {
        console.error('Error loading regions:', error);
      }
    };

    loadRegions();

    return () => {
      mounted = false;
    };
  }, []);

  // Carrega items com categories=collectible
  useEffect(() => {
    let mounted = true;

    const loadCollectibleItems = async () => {
      console.log('Loading collectible items - started');
      setLoading(true);

      try {
        // Carrega todos os items
        const allItems = await ItemsService.loadItemsFromXML('all');

        // Filtra apenas items com categories contendo 'collectible'
        const collectibleItems = allItems.filter(item => {
          if (!item.categories) return false;
          const cats = item.categories.split(';').map(c => c.trim());
          return cats.includes('collectible');
        });

        if (mounted) {
          setItems(collectibleItems);
          toast.success(`Carregados ${collectibleItems.length} items colecionáveis`);
          console.log('Loading collectible items - completed:', collectibleItems.length);
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

    loadCollectibleItems();

    return () => {
      mounted = false;
    };
  }, []);

  // Carrega incidências em background
  useEffect(() => {
    if (items.length === 0 || loadingIncidences) return;

    const loadIncidences = async () => {
      setLoadingIncidences(true);
      setLoadingProgress(0);

      try {
        // Pega todos os IDs dos items
        const itemIds = items.map(item => parseInt(item.id));

        console.log(`Loading incidences for ${itemIds.length} items...`);

        // 1. Chama API para análise total do mapa
        setLoadingProgress(10);
        const totalResponse = await fetch(`/api/map/analyze?ids=${itemIds.join(',')}`);
        const totalData = await totalResponse.json();

        if (!totalData.success) {
          throw new Error(totalData.error || 'Failed to analyze map totals');
        }

        // Mapeia items com suas incidências totais
        const itemsWithCounts = items.map(item => ({
          ...item,
          mapOccurrences: totalData.results[item.id] || 0
        }));

        setItemsWithIncidences(itemsWithCounts);
        setLoadingProgress(50);

        console.log(`Total incidences loaded. Map analyzed ${totalData.tilesAnalyzed} tiles.`);

        // 2. Chama API para análise por região
        setLoadingProgress(60);
        const regionResponse = await fetch(`/api/map/analyze-by-region?ids=${itemIds.join(',')}`);
        const regionDataResponse = await regionResponse.json();

        if (!regionDataResponse.success) {
          throw new Error(regionDataResponse.error || 'Failed to analyze map by region');
        }

        // Armazena dados de região
        setRegionData(regionDataResponse.results || {});
        setLoadingProgress(100);

        console.log(`Region analysis completed. Tiles with region: ${regionDataResponse.tilesWithRegion}`);
        toast.success('Map analysis completed!');
      } catch (error) {
        console.error('Error loading incidences:', error);
        toast.error(`Failed to load map data: ${error.message}`);
        // Usa items sem incidências
        setItemsWithIncidences(items.map(item => ({ ...item, mapOccurrences: 0 })));
        setRegionData({});
      } finally {
        setLoadingIncidences(false);
      }
    };

    // Delay para começar carregamento
    const timer = setTimeout(() => {
      loadIncidences();
    }, 500);

    return () => clearTimeout(timer);
  }, [items]);

  const filteredData = useMemo(() => {
    // Usa items com incidências se disponível, senão usa items normais
    const sourceData = itemsWithIncidences.length > 0 ? itemsWithIncidences : items;
    let filtered = sourceData;

    // Filtro de busca
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.id.toLowerCase().includes(searchLower) ||
        item.name.toLowerCase().includes(searchLower)
      );
    }

    // Filtros de lootCategory
    if (selectedLootCategories.length > 0) {
      filtered = filtered.filter(item =>
        item.attributes?.lootCategory && selectedLootCategories.includes(item.attributes.lootCategory)
      );
    }

    // Filtros de tier
    if (selectedTiers.length > 0) {
      filtered = filtered.filter(item =>
        item.tier && selectedTiers.includes(item.tier)
      );
    }

    return filtered;
  }, [searchQuery, items, itemsWithIncidences, selectedLootCategories, selectedTiers]);

  // Agrupar por lootCategory
  const groupedData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      const category = item.attributes?.lootCategory || 'uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Ordenar categorias
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === 'consumables') return -1;
      if (b === 'consumables') return 1;
      return a.localeCompare(b);
    });

    return sortedCategories.map(category => {
      const items = grouped[category];

      // Calcular contagens por tier
      const tierCounts = {};
      items.forEach(item => {
        const tier = item.tier?.toLowerCase() || 'none';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      // Aplicar sorting do tanstack table aos items
      let sortedItems = [...items];
      if (sorting.length > 0) {
        const sortConfig = sorting[0];
        sortedItems.sort((a, b) => {
          let aValue, bValue;

          if (sortConfig.id === 'id') {
            aValue = parseInt(a.id);
            bValue = parseInt(b.id);
          } else if (sortConfig.id === 'name') {
            aValue = a.name;
            bValue = b.name;
          } else if (sortConfig.id === 'mapOccurrences') {
            aValue = a.mapOccurrences || 0;
            bValue = b.mapOccurrences || 0;
          }

          if (typeof aValue === 'string') {
            return sortConfig.desc
              ? bValue.localeCompare(aValue)
              : aValue.localeCompare(bValue);
          } else {
            return sortConfig.desc ? bValue - aValue : aValue - bValue;
          }
        });
      }

      return {
        category,
        totalCount: items.length,
        tierCounts,
        items: sortedItems
      };
    });
  }, [filteredData, sorting]);

  const columns = useMemo(
    () => [
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
        enableSorting: true,
        size: 300,
      },
      {
        id: 'mapOccurrences',
        accessorFn: (row) => row.mapOccurrences || 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Total no Mapa" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-blue-400 font-semibold">
            {row.original.mapOccurrences !== undefined ? row.original.mapOccurrences : (
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            )}
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
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('selected', item.name || item.id);
    setSearchParams(newSearchParams);

    setSelectedItem(item);
  };

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row) => row.id,
    state: {
      pagination,
      sorting,
      rowSelection,
      columnVisibility,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
      <Container className="max-w-full pb-4" data-panel-id="map-items-page">
        {/* Page Header */}
        <div className="mb-2" data-panel-id="map-items-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Breadcrumb */}
              <nav className="flex items-center text-xs text-gray-400">
                <span>Items</span>
                <span className="mx-1">/</span>
                <span className="text-gray-200">Gathering Items</span>
              </nav>
              <span className="text-gray-500 mx-2">•</span>
              {/* Title and Description */}
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-gray-100">Gathering Items</h1>
                <span className="text-xs text-gray-400">Items coletáveis encontrados no mapa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar - Mostra enquanto carrega incidências */}
        {loadingIncidences && (
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center gap-4">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">Analyzing map occurrences...</span>
                    <span className="text-xs text-gray-500">{loadingProgress}%</span>
                  </div>
                  <Progress value={loadingProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Painel de Filtros Superior */}
        <Card className="mb-4" data-panel-id="map-items-filters-card">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Lado esquerdo - Busca e Filtros */}
              <div className="flex items-center gap-3 flex-1">
                {/* Busca */}
                <div className="relative w-64" data-panel-id="map-items-filters-search">
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

                {/* Filtros */}
                <div className="flex items-center gap-2" data-panel-id="map-items-filters-group">
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
              </div>

              {/* Lado direito - Contador */}
              <FilterCounter
                data-panel-id="map-items-filters-counter"
                loading={loading}
                filteredCount={filteredData.length}
                totalCount={items.length}
                itemType="items"
              />
            </div>
          </CardContent>
        </Card>

        {/* Painéis Principais */}
        <div className="flex gap-4 h-[calc(100vh-240px)]" data-panel-id="map-items-main-layout">
          {/* Tabela de Items - 50% */}
          <div className="w-[50%] min-w-[600px] h-full" data-panel-id="map-items-list-panel">
            <DataGrid table={table} recordCount={filteredData?.length || 0} data-panel-id="map-items-grid" className="h-full">
              <Card className="h-full flex flex-col">
                <CardHeader className="py-2 flex-shrink-0">
                  <CardHeading>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Map Items List</span>
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
                        {groupedData.map((group) => (
                          <Fragment key={group.category}>
                            {/* Header da categoria */}
                            <tr className="bg-gray-800/30 border-t border-gray-700/50">
                              <td colSpan={table.getAllColumns().length} className="px-4 py-3">
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-medium text-gray-200 capitalize tracking-wide">
                                    {group.category}
                                  </span>
                                  <div className="h-4 w-px bg-gray-700/50" />
                                  <span className="text-xs text-gray-500 font-normal">
                                    {group.totalCount} items
                                  </span>
                                  <div className="h-4 w-px bg-gray-700/50" />
                                  <div className="flex items-center gap-4 text-xs text-gray-500 font-normal">
                                    {Object.entries(group.tierCounts)
                                      .sort(([tierA], [tierB]) => {
                                        const orderA = getTierOrder(tierA);
                                        const orderB = getTierOrder(tierB);
                                        return orderB - orderA;
                                      })
                                      .map(([tier, count]) => (
                                        <span key={tier} className="flex items-center gap-1.5">
                                          <span className="text-gray-600 capitalize">{tier}</span>
                                          <span className="text-gray-400 font-medium">{count}</span>
                                        </span>
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
                        ))}
                      </tbody>
                    </table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
              </Card>
            </DataGrid>
          </div>

          {/* Painel de Detalhes - 50% */}
          <div className="flex-1 h-full" data-panel-id="map-items-details-panel">
            <Card className="h-full flex flex-col" data-panel-id="map-items-details-card">
              <CardHeader className="py-3 flex flex-row items-center justify-between flex-shrink-0">
                <CardHeading>
                  <div className="flex items-center gap-2">
                    {selectedItem ? (
                      <>
                        <span className="text-lg font-semibold">Detalhes do Item no Mapa</span>
                        <span className="text-sm text-gray-400">- {selectedItem.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-500 text-sm">
                        Select an item to view map details
                      </span>
                    )}
                  </div>
                </CardHeading>
                {selectedItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newSearchParams = new URLSearchParams(searchParams);
                      newSearchParams.delete('selected');
                      setSearchParams(newSearchParams);
                      setSelectedItem(null);
                    }}
                    className="h-7"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </CardHeader>
              <CardTable className="p-0 flex-1 overflow-hidden">
                <MapItemDetailsPanel item={selectedItem} regionData={regionData} allRegions={regions} />
              </CardTable>
            </Card>
          </div>
        </div>
      </Container>
    </Fragment>
  );
};

export { MapItemsPage };
