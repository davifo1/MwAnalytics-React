import React, { Fragment, useEffect, useMemo, useState, useRef } from 'react';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Settings2, AlertCircle, Loader2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, ArrowUpDown, Filter, Wrench, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTable } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { ItemsService } from '@/services/itemsService';
import { validateItem, calculateValidationStats } from '@/validators/itemValidator';
import branorService from '@/services/branorService';

// Status badge component (memoized to prevent Tooltip re-creation)
const StatusBadge = React.memo(({ validation }) => {
  const { criticalCount, warningCount } = validation;
  const hasCritical = criticalCount > 0;
  const hasWarning = warningCount > 0;

  if (hasCritical || hasWarning) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            {hasCritical && <AlertCircle className="h-4 w-4 text-red-400" />}
            {!hasCritical && hasWarning && <AlertTriangle className="h-4 w-4 text-yellow-400" />}

            <div className="flex items-center gap-1">
              {hasCritical && (
                <Badge variant="destructive" className="text-xs px-1.5 min-w-[20px]">
                  {criticalCount}
                </Badge>
              )}
              {hasWarning && (
                <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/50 px-1.5 min-w-[20px]">
                  {warningCount}
                </Badge>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold mb-1">Issues</p>
            {criticalCount > 0 && <p className="text-red-400">{criticalCount} critical</p>}
            {warningCount > 0 && <p className="text-yellow-400">{warningCount} warnings</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <CheckCircle className="h-4 w-4 text-green-400" />
    </div>
  );
});
StatusBadge.displayName = 'StatusBadge';

const ItemValidatorPage = () => {
  usePageTitle('Items Validator');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Validation state
  const [itemsWithValidation, setItemsWithValidation] = useState([]);
  const [branorSellableItems, setBranorSellableItems] = useState(null);

  // Validation status filter - Default to 'critical' only
  const [validationStatusFilter, setValidationStatusFilter] = useState('critical');

  // Issue Types filter
  const [enabledIssueTypes, setEnabledIssueTypes] = useState(() => {
    const saved = localStorage.getItem('item-validator-enabledIssueTypes');
    return saved ? JSON.parse(saved) : {};
  });

  const [sorting, setSorting] = useState([
    { id: 'severity', desc: true }, // Critical first by default
  ]);

  const [expanded, setExpanded] = useState({});

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem('item-validation-columnVisibility');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved column visibility:', e);
      }
    }
    return {};
  });

  const loadItems = async () => {
    setLoading(true);
    try {
      // Load all items
      const allItems = await ItemsService.loadItemsFromXML('all');

      // Filter only items with dream="1" attribute
      const dreamItems = allItems.filter(item =>
        item.attributes?.dream === '1' || item.attributes?.dream === 1
      );

      setItems(dreamItems);

      // Load branor sellable items for validation
      try {
        const sellableItems = await branorService.loadSellableItems();
        setBranorSellableItems(sellableItems);
        console.log(`[ItemValidator] Loaded ${sellableItems.size} sellable items from branor.lua`);
      } catch (error) {
        console.error('Error loading branor sellable items:', error);
        toast.warning('Could not load branor.lua - some validations will be skipped');
      }

      toast.success(`Loaded ${dreamItems.length} items with dream="1" attribute`)
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Error loading items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Using ref to prevent double loading in StrictMode
    if (loadingRef.current) return;
    loadingRef.current = true;

    loadItems();
  }, []);

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('item-validation-columnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  // Validate all items and group by issue type
  useEffect(() => {
    if (items.length === 0) {
      setItemsWithValidation([]);
      return;
    }

    // Process all items: validate
    const validated = items.map(item => {
      const validation = validateItem(item, branorSellableItems);

      return {
        ...item,
        validation
      };
    });

    // Group by issue type (field + message = unique issue type)
    const issueGroups = {};

    validated.forEach(item => {
      if (item.validation.issues && item.validation.issues.all && item.validation.issues.all.length > 0) {
        item.validation.issues.all.forEach(issue => {
          // Include severity in the key so critical and warning of same field appear separately
          const issueKey = `${issue.field}::${issue.severity}::${issue.label || issue.message || 'Unknown'}`;

          if (!issueGroups[issueKey]) {
            issueGroups[issueKey] = {
              field: issue.field,
              message: issue.label || issue.message || 'Unknown issue',
              severity: issue.severity,
              items: []
            };
          }

          issueGroups[issueKey].items.push({
            id: item.id,
            name: item.name,
            currentValue: issue.current,
            recommendedValue: issue.recommended,
            issue: issue // Include the full issue object with fixFn
          });
        });
      }
    });

    // Convert to array and sort by severity (critical first) and then by affected count
    const issueTypesArray = Object.values(issueGroups).map(group => ({
      ...group,
      // Sort items by ID (ascending)
      items: group.items.sort((a, b) => parseInt(a.id) - parseInt(b.id)),
      affectedCount: group.items.length,
      // For sorting: critical > warning, then by affected count
      sortPriority: (group.severity === 'critical' ? 1000000 : 0) + group.items.length
    })).sort((a, b) => b.sortPriority - a.sortPriority);

    setItemsWithValidation(issueTypesArray);

    // Initialize enabled issue types if not already set
    setEnabledIssueTypes(prev => {
      const newEnabled = { ...prev };
      let hasChanges = false;

      issueTypesArray.forEach(issueType => {
        const key = `${issueType.field}::${issueType.severity}`;
        if (!(key in newEnabled)) {
          newEnabled[key] = true; // Enable by default
          hasChanges = true;
        }
      });

      return hasChanges ? newEnabled : prev;
    });
  }, [items, branorSellableItems]);

  // Save enabled issue types to localStorage
  useEffect(() => {
    localStorage.setItem('item-validator-enabledIssueTypes', JSON.stringify(enabledIssueTypes));
  }, [enabledIssueTypes]);

  const filteredData = useMemo(() => {
    if (itemsWithValidation.length === 0) {
      return [];
    }

    let filtered = itemsWithValidation;

    // Filter by enabled issue types
    filtered = filtered.filter(issueType => {
      const key = `${issueType.field}::${issueType.severity}`;
      return enabledIssueTypes[key] !== false;
    });

    // Filtro por Field (busca por nome do campo do issue)
    if (searchQuery) {
      filtered = filtered.filter(issueType =>
        issueType.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issueType.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por Validation Status (severity)
    if (validationStatusFilter !== 'all') {
      filtered = filtered.filter(issueType => issueType.severity === validationStatusFilter);
    }

    return filtered;
  }, [itemsWithValidation, searchQuery, validationStatusFilter, enabledIssueTypes]);

  // Calculate UNFILTERED validation stats (for header cards - always shows total)
  const unfilteredValidationStats = useMemo(() => {
    if (itemsWithValidation.length === 0) {
      return {
        totalIssueTypes: 0,
        totalAffectedItems: 0,
        totalCriticalIssues: 0,
        totalWarningIssues: 0,
        criticalIssueTypes: 0,
        warningIssueTypes: 0,
      };
    }

    const stats = {
      totalIssueTypes: itemsWithValidation.length,
      totalAffectedItems: 0,
      totalCriticalIssues: 0,
      totalWarningIssues: 0,
      criticalIssueTypes: 0,
      warningIssueTypes: 0,
    };

    // Count unique items and issue types by severity
    const uniqueItems = new Set();
    itemsWithValidation.forEach(issueType => {
      if (issueType.severity === 'critical') {
        stats.criticalIssueTypes++;
        stats.totalCriticalIssues += issueType.items.length;
      } else if (issueType.severity === 'warning') {
        stats.warningIssueTypes++;
        stats.totalWarningIssues += issueType.items.length;
      }

      // Add all affected items to the set
      issueType.items.forEach(item => {
        uniqueItems.add(item.id);
      });
    });

    stats.totalAffectedItems = uniqueItems.size;

    return stats;
  }, [itemsWithValidation]);

  const columns = useMemo(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          return (
            <button
              onClick={row.getToggleExpandedHandler()}
              className="cursor-pointer hover:text-gray-300"
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          );
        },
        size: 40,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'severity',
        accessorFn: (row) => row.severity === 'critical' ? 1 : 0,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Severity</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const severity = row.original.severity;
          const count = row.original.affectedCount;
          return (
            <div className="flex items-center gap-2">
              {severity === 'critical' ? (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-red-400 font-medium">Critical</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-400 font-medium">Warning</span>
                </div>
              )}
              <span className="text-xs text-gray-400">({count})</span>
            </div>
          );
        },
        enableSorting: true,
        enableHiding: false,
        size: 150,
      },
      {
        id: 'field',
        accessorFn: (row) => row.field,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Field</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-gray-300">
            {row.original.field}
          </span>
        ),
        enableSorting: true,
        enableHiding: false,
        size: 150,
      },
      {
        id: 'message',
        accessorFn: (row) => row.message,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Issue Description</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-gray-200">
            {row.original.message}
          </span>
        ),
        enableSorting: true,
        enableHiding: false,
        size: 400,
      },
      {
        id: 'affectedCount',
        accessorFn: (row) => row.affectedCount,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Affected Items</span>
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-gray-300">
            {row.original.affectedCount}
          </span>
        ),
        enableSorting: true,
        enableHiding: false,
        size: 140,
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium text-gray-400">Actions</span>,
        cell: ({ row }) => {
          // Check if any item in this group has a fix function
          const hasFixFn = row.original.items.some(i => i.issue && i.issue.fixFn);

          return (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 hover:bg-blue-500/20 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => {
                        // TODO: Implement bulk fix
                        toast.info('Bulk fix will be implemented soon');
                      }}
                      disabled={!hasFixFn}
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      Fix All
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {hasFixFn ? (
                    <p className="text-xs">Apply fix to all {row.original.affectedCount} items</p>
                  ) : (
                    <div className="text-xs">
                      <p className="font-semibold mb-1">Auto-fix não disponível</p>
                      <p className="text-gray-400">Este tipo de issue requer correção manual.</p>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 120,
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    getRowId: (row, index) => `issue-${index}`,
    state: {
      sorting,
      columnVisibility,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  const handleFilterByStatus = (status) => {
    setValidationStatusFilter(status);
  };

  return (
    <Fragment>
      <Container className="max-w-full" data-panel-id="item-validation-page">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Items Validator</h1>
              <p className="text-sm text-gray-400 mt-1">
                Validação de items com dream="1" - Total: {items.length} items
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading items...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-900/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Total Issue Types</p>
                    <p className="text-2xl font-bold text-blue-400">{unfilteredValidationStats.totalIssueTypes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-red-900/20 to-red-900/10 border-red-500/30 cursor-pointer hover:border-red-500/50 transition-colors"
              onClick={() => handleFilterByStatus('critical')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-400">{unfilteredValidationStats.totalCriticalIssues}</p>
                    <p className="text-xs text-gray-500 mt-1">{unfilteredValidationStats.criticalIssueTypes} types</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-yellow-900/20 to-yellow-900/10 border-yellow-500/30 cursor-pointer hover:border-yellow-500/50 transition-colors"
              onClick={() => handleFilterByStatus('warning')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Warning Issues</p>
                    <p className="text-2xl font-bold text-yellow-400">{unfilteredValidationStats.totalWarningIssues}</p>
                    <p className="text-xs text-gray-500 mt-1">{unfilteredValidationStats.warningIssueTypes} types</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/20 to-gray-900/10 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Affected Items</p>
                    <p className="text-2xl font-bold text-gray-300">{unfilteredValidationStats.totalAffectedItems}</p>
                    <p className="text-xs text-gray-500 mt-1">of {items.length} total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Filters Card */}
        <Card className="mb-4" data-panel-id="item-validation-filters-card">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Search */}
              <div className="relative w-64">
                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search by field or issue..."
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

              {/* Counter */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Showing</span>
                <span className="font-mono text-blue-400">{filteredData.length}</span>
                <span>of</span>
                <span className="font-mono text-gray-300">{itemsWithValidation.length}</span>
                <span>issue types</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Issue Types - Full Width */}
        <Card className="h-[calc(100vh-400px)] flex flex-col" data-panel-id="item-validation-issue-types-list">
          <CardHeader className="py-3 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-gray-300">Issue Types ({filteredData.length})</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8",
                      Object.values(enabledIssueTypes).some(enabled => enabled === false) && "border-blue-500 text-blue-400"
                    )}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter Issue Types
                    {Object.values(enabledIssueTypes).some(enabled => enabled === false) && (
                      <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/50">
                        Active
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-gray-900 border-gray-700">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-200">Issue Types</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            const newEnabled = {};
                            itemsWithValidation.forEach(issueType => {
                              const key = `${issueType.field}::${issueType.severity}`;
                              newEnabled[key] = true;
                            });
                            setEnabledIssueTypes(newEnabled);
                          }}
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            const newEnabled = {};
                            itemsWithValidation.forEach(issueType => {
                              const key = `${issueType.field}::${issueType.severity}`;
                              newEnabled[key] = false;
                            });
                            setEnabledIssueTypes(newEnabled);
                          }}
                        >
                          None
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2 pr-4">
                        {itemsWithValidation.map((issueType, idx) => {
                          const key = `${issueType.field}::${issueType.severity}`;
                          const isEnabled = enabledIssueTypes[key] !== false;

                          return (
                            <div key={idx} className="flex items-center space-x-2 py-1">
                              <Checkbox
                                id={`issue-${idx}`}
                                checked={isEnabled}
                                onCheckedChange={(checked) => {
                                  setEnabledIssueTypes(prev => ({
                                    ...prev,
                                    [key]: checked
                                  }));
                                }}
                              />
                              <Label
                                htmlFor={`issue-${idx}`}
                                className="text-xs flex-1 cursor-pointer flex items-center gap-2"
                              >
                                {issueType.severity === 'critical' ? (
                                  <AlertCircle className="h-3 w-3 text-red-400" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                                )}
                                <span className="text-gray-300">{issueType.field}</span>
                                <span className="text-gray-500 text-[10px]">({issueType.affectedCount})</span>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>

          <CardTable className="flex-1 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="text-left p-2 text-xs font-medium text-gray-400"
                          style={{ width: header.getSize() }}
                        >
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
                  {table.getRowModel().rows.map(row => (
                    <Fragment key={row.id}>
                      <tr className="border-b border-gray-800 hover:bg-gray-800/50">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="p-2 text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {row.getIsExpanded() && (
                        <tr>
                          <td colSpan={columns.length} className="p-0">
                            <div className="bg-gray-900/50 border-l-4 border-blue-500 p-4">
                              <h5 className="text-sm font-semibold text-gray-300 mb-3">Affected Items ({row.original.items.length})</h5>
                              <div className="space-y-2">
                                {row.original.items.map((item, idx) => (
                                  <div key={idx} className="flex flex-col gap-1 text-xs py-2 px-3 bg-gray-800/50 rounded hover:bg-gray-800">
                                    <div className="flex items-center gap-4">
                                      <div className="flex-1 min-w-0">
                                        <span className="text-gray-200 font-medium">{item.name}</span>
                                        <span className="text-gray-500 ml-2">(ID: {item.id})</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-gray-400">
                                        {item.currentValue !== undefined && (
                                          <span>
                                            <span className="text-gray-500">Current:</span> <span className="text-red-400">{item.currentValue}</span>
                                          </span>
                                        )}
                                        {item.recommendedValue !== undefined && (
                                          <span>
                                            <span className="text-gray-500">Recommended:</span> <span className="text-green-400">{item.recommendedValue}</span>
                                          </span>
                                        )}
                                      </div>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-block">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 px-2 hover:bg-green-500/20 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                              onClick={() => {
                                                // TODO: Implement single item fix
                                                toast.info('Single item fix will be implemented soon');
                                              }}
                                              disabled={!item.issue || !item.issue.fixFn}
                                            >
                                              <Wrench className="h-3 w-3" />
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {item.issue && item.issue.fixFn ? (
                                            <p className="text-xs">Fix this issue for {item.name}</p>
                                          ) : (
                                            <div className="text-xs">
                                              <p className="font-semibold mb-1">Auto-fix não disponível</p>
                                              <p className="text-gray-400">Este issue requer correção manual.</p>
                                            </div>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                    {item.issue && item.issue.extra && (
                                      <div className="text-xs text-amber-400/80 ml-2">
                                        ℹ️ {item.issue.extra}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
        </Card>
      </Container>
    </Fragment>
  );
};

export { ItemValidatorPage };
