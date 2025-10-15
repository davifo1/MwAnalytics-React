import React, { Fragment, useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
import { Settings2, AlertCircle, Loader2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, ArrowUpDown, Filter, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTable } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { loadAllMonsters, saveMonster } from '@/services/monsterService';
import { loadItemsForAutocomplete } from '@/services/monsterItemService';
import { calculateBaseStatsRole } from '@/utils/baseStatsRoleCalculator';
import { useAttributeFormulas } from '@/hooks/useAttributeFormulas';
import { MonsterFilters } from './components/MonsterFilters';
import { ValidationSummaryCards } from './components/ValidationSummaryCards';
import { ValidationDetailsModal } from './components/ValidationDetailsModal';
import { validateMonster, calculateValidationStats, enrichMonsterWithValidationData } from '@/validators/monsterValidator';

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

// Unlock level cell component (memoized)
const UnlockLevelCell = React.memo(({ loot, defaultLevel }) => {
  if (!loot || loot.length === 0) {
    return <span className="font-mono text-sm text-gray-500">-</span>;
  }

  const unlockLevels = loot
    .filter(item => item.unlockLevel !== undefined && item.unlockLevel !== null)
    .map(item => item.unlockLevel);
  const maxLevel = unlockLevels.length > 0 ? Math.max(...unlockLevels) : 0;

  const minRequired = Math.ceil(defaultLevel * 1.4);
  const isInsufficient = maxLevel < minRequired;
  const difference = minRequired - maxLevel;

  if (isInsufficient) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
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
});
UnlockLevelCell.displayName = 'UnlockLevelCell';

const MonsterValidatorPage = () => {
  usePageTitle('Monsters Validator');

  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { calculateRecommendedAttributes } = useAttributeFormulas();

  // Validation state
  const [monstersWithValidation, setMonstersWithValidation] = useState([]);

  // Filtros - Load from localStorage
  const [powerRange, setPowerRange] = useState(() => {
    const saved = localStorage.getItem('validation-filter-powerRange');
    return saved ? JSON.parse(saved) : [0, 15];
  });
  const [selectedMapRoles, setSelectedMapRoles] = useState(() => {
    const saved = localStorage.getItem('validation-filter-mapRoles');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedBaseStatsRoles, setSelectedBaseStatsRoles] = useState(() => {
    const saved = localStorage.getItem('validation-filter-baseStatsRoles');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedRaces, setSelectedRaces] = useState(() => {
    const saved = localStorage.getItem('validation-filter-races');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMiscFilter, setSelectedMiscFilter] = useState(() => {
    const saved = localStorage.getItem('validation-filter-misc');
    return saved || '';
  });

  // Validation status filter - Default to 'critical' only
  const [validationStatusFilter, setValidationStatusFilter] = useState('critical');

  // Issue Types filter - Load from cookie
  const [enabledIssueTypes, setEnabledIssueTypes] = useState(() => {
    const saved = localStorage.getItem('validator-enabledIssueTypes');
    return saved ? JSON.parse(saved) : {};
  });

  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalSeverity, setDetailsModalSeverity] = useState(null);

  const [sorting, setSorting] = useState([
    { id: 'severity', desc: true }, // Critical first by default
  ]);

  const [expanded, setExpanded] = useState({});

  // Column visibility - Load from localStorage
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem('validation-columnVisibility');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved column visibility:', e);
      }
    }
    return {};
  });

  const loadMonsters = async () => {
    setLoading(true);
    try {
      // Load items for autocomplete
      const items = await loadItemsForAutocomplete();

      // Load from XML files
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
        toast.info('No monsters found');
      }
    } catch (error) {
      console.error('Error loading monsters:', error);
      toast.error('Error loading monsters');
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

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('validation-columnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  // Validate all monsters and group by issue type
  useEffect(() => {
    if (monsters.length === 0) {
      setMonstersWithValidation([]);
      return;
    }

    // Process all monsters: enrich + validate
    const validated = monsters.map(monster => {
      // 1. Enrich monster with recommended values and deviations
      const enrichedMonster = enrichMonsterWithValidationData(monster, calculateRecommendedAttributes);

      // 2. Validate enriched monster
      const validation = validateMonster(enrichedMonster);

      return {
        ...enrichedMonster,
        validation
      };
    });

    // Group by issue type (field + message = unique issue type)
    const issueGroups = {};

    validated.forEach(monster => {
      if (monster.validation.issues && monster.validation.issues.all && monster.validation.issues.all.length > 0) {
        monster.validation.issues.all.forEach(issue => {
          // Include severity in the key so critical and warning of same field appear separately
          const issueKey = `${issue.field}::${issue.severity}::${issue.label || issue.message || 'Unknown'}`;

          if (!issueGroups[issueKey]) {
            issueGroups[issueKey] = {
              field: issue.field,
              message: issue.label || issue.message || 'Unknown issue',
              severity: issue.severity,
              monsters: []
            };
          }

          issueGroups[issueKey].monsters.push({
            name: monster.monsterName,
            power: monster.power,
            defaultLevel: monster.defaultLevel,
            xmlFileName: monster.xmlFileName,
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
      // Sort monsters by power (descending)
      monsters: group.monsters.sort((a, b) => (b.power || 0) - (a.power || 0)),
      affectedCount: group.monsters.length,
      // For sorting: xmlFormat always first, requiredFields second, xmlFileName third, then critical > warning, then by affected count
      sortPriority: (group.field === 'xmlFormat' ? 10000000 : 0) +
                   (group.field === 'requiredFields' ? 8000000 : 0) +
                   (group.field === 'xmlFileName' ? 5000000 : 0) +
                   (group.severity === 'critical' ? 1000000 : 0) +
                   group.monsters.length
    })).sort((a, b) => b.sortPriority - a.sortPriority);

    setMonstersWithValidation(issueTypesArray);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monsters]); // Only re-validate when monsters list changes

  // Save enabled issue types to localStorage
  useEffect(() => {
    localStorage.setItem('validator-enabledIssueTypes', JSON.stringify(enabledIssueTypes));
  }, [enabledIssueTypes]);

  const filteredData = useMemo(() => {
    if (monstersWithValidation.length === 0) {
      return [];
    }

    let filtered = monstersWithValidation;

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

    // Filtros de monster properties - filtrar issue types que têm pelo menos um monster que atende aos critérios
    // Filtro por power range (sempre ativo)
    filtered = filtered.map(issueType => {
      const matchingMonsters = issueType.monsters.filter(m => {
        const power = parseFloat(m.power) || 0;
        return power >= powerRange[0] && power <= powerRange[1];
      });
      return matchingMonsters.length > 0 ? { ...issueType, monsters: matchingMonsters, affectedCount: matchingMonsters.length } : null;
    }).filter(Boolean);

    // Filtro por Map Role - não aplicável diretamente aos issue types sem dados completos de monster
    // Mantém todos os issue types se houver filtro selecionado (não temos acesso aos dados completos de monster aqui)

    // Filtro por Base Stats Role - não aplicável
    // Filtro por Race - não aplicável
    // Filtro MISC - não aplicável

    // Filtro por Validation Status (severity)
    if (validationStatusFilter !== 'all') {
      filtered = filtered.filter(issueType => issueType.severity === validationStatusFilter);
    }

    return filtered;
  }, [monstersWithValidation, searchQuery, powerRange, validationStatusFilter, enabledIssueTypes]);

  // Calculate UNFILTERED validation stats (for header cards - always shows total)
  const unfilteredValidationStats = useMemo(() => {
    if (monstersWithValidation.length === 0) {
      return {
        totalIssueTypes: 0,
        totalAffectedMonsters: 0,
        totalCriticalIssues: 0,
        totalWarningIssues: 0,
        criticalIssueTypes: 0,
        warningIssueTypes: 0,
      };
    }

    const stats = {
      totalIssueTypes: monstersWithValidation.length,
      totalAffectedMonsters: 0,
      totalCriticalIssues: 0,
      totalWarningIssues: 0,
      criticalIssueTypes: 0,
      warningIssueTypes: 0,
    };

    // Count unique monsters and issue types by severity
    const uniqueMonsters = new Set();
    monstersWithValidation.forEach(issueType => {
      if (issueType.severity === 'critical') {
        stats.criticalIssueTypes++;
        stats.totalCriticalIssues += issueType.monsters.length;
      } else if (issueType.severity === 'warning') {
        stats.warningIssueTypes++;
        stats.totalWarningIssues += issueType.monsters.length;
      }

      // Add all affected monsters to the set
      issueType.monsters.forEach(monster => {
        uniqueMonsters.add(monster.name);
      });
    });

    stats.totalAffectedMonsters = uniqueMonsters.size;

    return stats;
  }, [monstersWithValidation]);

  // Calculate validation stats from filtered monsters (respects all filters)
  const validationStats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalIssueTypes: 0,
        totalAffectedMonsters: 0,
        totalCriticalIssues: 0,
        totalWarningIssues: 0,
        criticalIssueTypes: 0,
        warningIssueTypes: 0,
        criticalPercent: 0,
        warningPercent: 0,
      };
    }

    const stats = {
      totalIssueTypes: filteredData.length,
      totalAffectedMonsters: 0,
      totalCriticalIssues: 0,
      totalWarningIssues: 0,
      criticalIssueTypes: 0,
      warningIssueTypes: 0,
      criticalPercent: 0,
      warningPercent: 0,
    };

    // Count unique monsters and issue types by severity
    const uniqueMonsters = new Set();
    filteredData.forEach(issueType => {
      if (issueType.severity === 'critical') {
        stats.criticalIssueTypes++;
        stats.totalCriticalIssues += issueType.monsters.length; // Count total critical issues
      } else if (issueType.severity === 'warning') {
        stats.warningIssueTypes++;
        stats.totalWarningIssues += issueType.monsters.length; // Count total warning issues
      }

      // Add all affected monsters to the set
      issueType.monsters.forEach(monster => {
        uniqueMonsters.add(monster.name);
      });
    });

    stats.totalAffectedMonsters = uniqueMonsters.size;
    stats.criticalPercent = ((stats.criticalIssueTypes / stats.totalIssueTypes) * 100).toFixed(1);
    stats.warningPercent = ((stats.warningIssueTypes / stats.totalIssueTypes) * 100).toFixed(1);

    return stats;
  }, [filteredData]);


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
            <span>Affected Monsters</span>
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
          // Check if any monster in this group has a fix function
          const hasFixFn = row.original.monsters.some(m => m.issue && m.issue.fixFn);

          return (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 hover:bg-blue-500/20 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => executeBulkFix(row.original)}
                      disabled={!hasFixFn}
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      Fix All
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {hasFixFn ? (
                    <p className="text-xs">Apply fix to all {row.original.affectedCount} monsters</p>
                  ) : (
                    <div className="text-xs">
                      <p className="font-semibold mb-1">Auto-fix não disponível</p>
                      <p className="text-gray-400">Este tipo de issue requer correção manual.</p>
                      <p className="text-gray-400">A função de fix automático ainda não foi implementada.</p>
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
    [monsters] // Add monsters as dependency
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

  const handleShowDetails = (severity) => {
    setDetailsModalSeverity(severity);
    setDetailsModalOpen(true);
  };

  // Execute fix for a single monster and single issue
  const executeFix = async (monsterToFix, issue) => {
    try {
      // 1. Find the original monster data (with all properties)
      const originalMonster = monsters.find(m => m.xmlFileName === monsterToFix.xmlFileName);

      if (!originalMonster) {
        throw new Error('Original monster data not found');
      }

      // 2. Create a deep copy to avoid mutating the original
      const monsterCopy = JSON.parse(JSON.stringify(originalMonster));

      // Store the original xmlFileName before applying fix
      const originalXmlFileName = monsterCopy.xmlFileName;

      // 3. Apply the fix
      if (issue.fixFn) {
        issue.fixFn(monsterCopy);
      } else {
        throw new Error('No fix function available for this issue');
      }

      // If the fix modified xmlFileName, restore the original for saveMonster to work
      // The _renameFile object will handle the actual rename
      if (monsterCopy._renameFile) {
        monsterCopy.xmlFileName = originalXmlFileName;
      }

      // 4. Save to XML
      await saveMonster(monsterCopy);

      toast.success(`Fixed ${issue.label} for ${monsterToFix.name}`);

      // 5. Reload and revalidate
      await loadMonsters();
    } catch (error) {
      console.error('Error executing fix:', error);
      toast.error(`Failed to fix: ${error.message}`);
    }
  };

  // Execute bulk fix for all monsters with the same issue type
  const executeBulkFix = async (issueType) => {
    try {
      const fixes = [];

      // Process each monster with this issue
      for (const monsterInfo of issueType.monsters) {
        // Use the issue already attached to monsterInfo
        if (!monsterInfo.issue || !monsterInfo.issue.fixFn) {
          continue;
        }

        // Find the original monster data
        const originalMonster = monsters.find(m => m.xmlFileName === monsterInfo.xmlFileName);

        if (!originalMonster) {
          console.warn(`Skipping ${monsterInfo.name}: original data not found`);
          continue;
        }

        // Create a deep copy
        const monsterCopy = JSON.parse(JSON.stringify(originalMonster));

        // Store the original xmlFileName before applying fix
        const originalXmlFileName = monsterCopy.xmlFileName;

        // Apply fix directly using the stored issue
        monsterInfo.issue.fixFn(monsterCopy);

        // If the fix modified xmlFileName, restore the original for saveMonster to work
        // The _renameFile object will handle the actual rename
        if (monsterCopy._renameFile) {
          monsterCopy.xmlFileName = originalXmlFileName;
        }

        fixes.push({ monster: monsterCopy, name: monsterInfo.name });
      }

      if (fixes.length === 0) {
        toast.info('No fixes to apply');
        return;
      }

      // Detect collisions: group monsters by their target name
      const collisionGroups = {};
      fixes.forEach(fix => {
        if (fix.monster._renameFile) {
          const targetName = fix.monster._renameFile.newName;
          if (!collisionGroups[targetName]) {
            collisionGroups[targetName] = [];
          }
          collisionGroups[targetName].push(fix);
        }
      });

      // Assign suffixes only when there are collisions (2+ files → same target name)
      Object.entries(collisionGroups).forEach(([targetName, group]) => {
        if (group.length > 1) {
          // Multiple files → add suffixes: _1, _2, _3...
          group.forEach((fix, index) => {
            const suffixedName = `${targetName}_${index + 1}`;
            fix.monster._renameFile.newName = suffixedName;
            console.log(`[Collision Fix] ${fix.monster._renameFile.oldName} → ${suffixedName} (collision group ${index + 1}/${group.length})`);
          });
        }
        // If group.length === 1, keep original name (no suffix needed)
      });

      // Save all fixed monsters
      toast.info(`Saving ${fixes.length} monsters...`);

      for (const fix of fixes) {
        await saveMonster(fix.monster);
      }

      // After all renames, check if any _1 suffixed files can be cleaned up
      // (i.e., if black_griffin_1.xml exists but no other black_griffin_*.xml, rename to black_griffin.xml)
      toast.info('Checking for unnecessary suffixes...');

      // Reload to get current file list
      const currentMonsters = await loadAllMonsters();
      const cleanupRenames = [];

      currentMonsters.forEach(monster => {
        const fileName = monster.xmlFileName;

        // Check if filename ends with _1
        const match = fileName.match(/^(.+)_1$/);
        if (match) {
          const baseName = match[1]; // e.g., "black_griffin" from "black_griffin_1"

          // Check if there are other numbered variants
          const hasOtherVariants = currentMonsters.some(m => {
            const otherName = m.xmlFileName;
            // Check for _2, _3, etc. with the same base
            return otherName !== fileName && otherName.match(new RegExp(`^${baseName}_\\d+$`));
          });

          // Check if base name (without suffix) exists
          const baseExists = currentMonsters.some(m => m.xmlFileName === baseName);

          // If no other variants and base doesn't exist, we can remove the _1 suffix
          if (!hasOtherVariants && !baseExists) {
            cleanupRenames.push({
              oldName: fileName,
              newName: baseName,
              monster: monster
            });
          }
        }
      });

      if (cleanupRenames.length > 0) {
        toast.info(`Cleaning up ${cleanupRenames.length} unnecessary suffixes...`);

        for (const cleanup of cleanupRenames) {
          const monsterCopy = JSON.parse(JSON.stringify(cleanup.monster));
          monsterCopy._renameFile = {
            oldName: cleanup.oldName,
            newName: cleanup.newName
          };
          // Keep xmlFileName as the old name for saveMonster to find the file
          monsterCopy.xmlFileName = cleanup.oldName;

          await saveMonster(monsterCopy);
          console.log(`[Cleanup] ${cleanup.oldName}.xml → ${cleanup.newName}.xml (removed unnecessary suffix)`);
        }
      }

      toast.success(`Fixed ${issueType.message} for ${fixes.length} monsters`);

      // Reload and revalidate
      await loadMonsters();
    } catch (error) {
      console.error('Error executing bulk fix:', error);
      toast.error(`Failed to execute bulk fix: ${error.message}`);
    }
  };

  // Filter monsters that have the requested validation status
  const monstersForDetailsModal = useMemo(() => {
    if (!detailsModalSeverity || !filteredData) return [];

    return filteredData.filter(monster => {
      if (!monster.validation) return false;
      return monster.validation.status === detailsModalSeverity;
    });
  }, [filteredData, detailsModalSeverity]);

  return (
    <Fragment>
      <Container className="max-w-full" data-panel-id="validation-page">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Monster Validator</h1>
              <p className="text-sm text-gray-400 mt-1">
                Validação de configurações e integridade dos monstros
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading monsters...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && (
          <ValidationSummaryCards
            stats={unfilteredValidationStats}
            onFilterByStatus={handleFilterByStatus}
            onShowDetails={handleShowDetails}
          />
        )}

        {/* Painel de Filtros */}
        <MonsterFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          powerRange={powerRange}
          onPowerRangeChange={setPowerRange}
          selectedMapRoles={selectedMapRoles}
          onMapRolesChange={setSelectedMapRoles}
          selectedBaseStatsRoles={selectedBaseStatsRoles}
          onBaseStatsRolesChange={setSelectedBaseStatsRoles}
          selectedRaces={selectedRaces}
          onRacesChange={setSelectedRaces}
          selectedMiscFilter={selectedMiscFilter}
          onMiscFilterChange={setSelectedMiscFilter}
          monsters={monsters}
          filteredMonsters={filteredData}
          loading={loading}
          storagePrefix="validation"
        />

        {/* Lista de Issue Types - Full Width */}
        <Card className="h-[calc(100vh-400px)] flex flex-col" data-panel-id="validation-issue-types-list">
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
                            monstersWithValidation.forEach(issueType => {
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
                            monstersWithValidation.forEach(issueType => {
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
                        {monstersWithValidation.map((issueType, idx) => {
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
                              <h5 className="text-sm font-semibold text-gray-300 mb-3">Affected Monsters ({row.original.monsters.length})</h5>
                              <div className="space-y-2">
                                {row.original.monsters.map((monster, idx) => {
                                  // Calculate deviation percentage
                                  let deviationPercent = null;
                                  let percentColor = 'text-gray-400';
                                  if (monster.currentValue !== undefined && monster.recommendedValue !== undefined && monster.recommendedValue !== 0) {
                                    const current = parseFloat(monster.currentValue) || 0;
                                    const recommended = parseFloat(monster.recommendedValue) || 0;
                                    deviationPercent = ((current - recommended) / recommended) * 100;

                                    // Color based on severity (same as issue severity)
                                    const absDeviation = Math.abs(deviationPercent);
                                    if (absDeviation > 30) {
                                      percentColor = 'text-red-400'; // critical
                                    } else if (absDeviation > 10) {
                                      percentColor = 'text-yellow-400'; // warning
                                    }
                                  }

                                  return (
                                    <div key={idx} className="flex flex-col gap-1 text-xs py-2 px-3 bg-gray-800/50 rounded hover:bg-gray-800">
                                      <div className="flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                          <span className="text-gray-200 font-medium">{monster.name}</span>
                                          {monster.xmlFileName && (
                                            <span className="text-gray-500 ml-2">({monster.xmlFileName})</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-400">
                                          <span>
                                            <span className="text-gray-500">Power:</span> {monster.power?.toFixed(2) || 'N/A'}
                                          </span>
                                          <span>
                                            <span className="text-gray-500">Default Level:</span> {monster.defaultLevel || 'N/A'}
                                          </span>
                                          {monster.currentValue !== undefined && (
                                            <span>
                                              <span className="text-gray-500">Current:</span> <span className="text-red-400">{monster.currentValue}</span>
                                            </span>
                                          )}
                                          {monster.recommendedValue !== undefined && (
                                            <span>
                                              <span className="text-gray-500">Recommended:</span> <span className="text-green-400">{monster.recommendedValue}</span>
                                            </span>
                                          )}
                                          {deviationPercent !== null && !isNaN(deviationPercent) && isFinite(deviationPercent) && (
                                            <span className={percentColor}>
                                              ({deviationPercent > 0 ? '+' : ''}{deviationPercent.toFixed(1)}%)
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
                                                onClick={() => executeFix(monster, monster.issue)}
                                                disabled={!monster.issue || !monster.issue.fixFn}
                                              >
                                                <Wrench className="h-3 w-3" />
                                              </Button>
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {monster.issue && monster.issue.fixFn ? (
                                              <p className="text-xs">Fix this issue for {monster.name}</p>
                                            ) : (
                                              <div className="text-xs">
                                                <p className="font-semibold mb-1">Auto-fix não disponível</p>
                                                <p className="text-gray-400">Este issue requer correção manual.</p>
                                              </div>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      {monster.issue && monster.issue.extra && (
                                        <div className="text-xs text-amber-400/80 ml-2">
                                          ℹ️ {monster.issue.extra}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
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

      {/* Validation Details Modal */}
      <ValidationDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        monsters={monstersForDetailsModal}
        severity={detailsModalSeverity}
      />
    </Fragment>
  );
};

export { MonsterValidatorPage };

// Keep old export name for backwards compatibility
export { MonsterValidatorPage as MonsterValidationPage };
