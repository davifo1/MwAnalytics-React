import React, { Fragment, useEffect, useState, useMemo } from 'react';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import BaseStatsRoleTable from '@/components/BaseStatsRoleTable';
import LootCategoryItemsCloud from '@/components/LootCategoryItemsCloud';
import { loadAllMonsters } from '@/services/monsterService';
import { Loader2, Target, Trash2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const BaseStatsRoleDropPage = () => {
  usePageTitle('Setup Drop by Base Stats Role');

  const [loading, setLoading] = useState(true);
  const [allMonsters, setAllMonsters] = useState([]);
  const [uniqueBaseStatsRoles, setUniqueBaseStatsRoles] = useState([]);
  const [powerRange, setPowerRange] = useState([2, 15]);
  const [ignoreCustomMapRole, setIgnoreCustomMapRole] = useState(true);
  const [selectedLootCategory, setSelectedLootCategory] = useState(() => {
    // Load from localStorage on initial render
    const saved = localStorage.getItem('base-stats-role-selected-tab');
    return saved || 'imbuement';
  });

  // Add item states
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [adding, setAdding] = useState(false);

  // Items and base stats role drops data
  const [availableItems, setAvailableItems] = useState([]);
  const [baseStatsRoleDrops, setBaseStatsRoleDrops] = useState({});
  const [lootCategoryTiers, setLootCategoryTiers] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load all monsters
        const monsters = await loadAllMonsters();
        setAllMonsters(monsters);

        // Extract unique base stats roles
        const baseStatsRoleSet = new Set();
        monsters.forEach(monster => {
          if (monster.baseStatsRole) {
            baseStatsRoleSet.add(monster.baseStatsRole);
          }
        });

        const uniqueBaseStatsRolesList = Array.from(baseStatsRoleSet).sort();
        setUniqueBaseStatsRoles(uniqueBaseStatsRolesList);

        console.log(`Loaded ${monsters.length} monsters with ${uniqueBaseStatsRolesList.length} unique base stats roles`);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load monster data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load available items
  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch('/api/monster-loot-items');
        const items = await response.json();
        setAvailableItems(items);
      } catch (error) {
        console.error('Error loading items:', error);
      }
    };
    loadItems();
  }, []);

  // Load base stats role drops configuration
  const loadBaseStatsRoleDrops = async () => {
    try {
      const response = await fetch('/api/base-stats-role-drops');
      if (response.ok) {
        const drops = await response.json();
        setBaseStatsRoleDrops(drops);
      }
    } catch (error) {
      console.error('Error loading base stats role drops:', error);
    }
  };

  useEffect(() => {
    loadBaseStatsRoleDrops();
  }, []);

  // Load loot category tiers configuration
  useEffect(() => {
    const loadTiers = async () => {
      try {
        const response = await fetch('/api/loot-category-tiers');
        if (response.ok) {
          const tiers = await response.json();
          setLootCategoryTiers(tiers);
        }
      } catch (error) {
        console.error('Error loading loot category tiers:', error);
      }
    };
    loadTiers();
  }, []);

  // Save selected tab to localStorage
  useEffect(() => {
    localStorage.setItem('base-stats-role-selected-tab', selectedLootCategory);
  }, [selectedLootCategory]);

  // Get available loot categories from lootCategoryTiers
  const availableLootCategories = useMemo(() => {
    return Object.keys(lootCategoryTiers);
  }, [lootCategoryTiers]);

  // Calculate unique item count per category
  const categoryItemCounts = useMemo(() => {
    const counts = {};

    availableLootCategories.forEach(category => {
      const uniqueItems = new Set();

      // Iterate through all base stats roles
      Object.values(baseStatsRoleDrops).forEach(roleConfig => {
        const categoryItems = roleConfig[category] || [];
        categoryItems.forEach(itemName => uniqueItems.add(itemName));
      });

      counts[category] = uniqueItems.size;
    });

    return counts;
  }, [availableLootCategories, baseStatsRoleDrops]);

  // Handle add items based on base stats role configuration
  const handleAddItemToAll = async () => {
    try {
      setAdding(true);

      // Filter monsters based on current filters
      const filteredMonsters = allMonsters.filter(monster => {
        const power = monster.power || 0;
        const powerInRange = power >= powerRange[0] && power <= powerRange[1];
        const notCustom = ignoreCustomMapRole ? (monster.mapRole !== 'Custom') : true;
        return powerInRange && notCustom;
      });

      console.log(`[Frontend] Sending ${filteredMonsters.length} monsters to API`);
      console.log('[Frontend] First monster:', filteredMonsters[0]);

      const response = await fetch('/api/monsters/add-base-stats-role-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monsters: filteredMonsters.map(m => ({
            fileName: m.fileName,
            monsterName: m.monsterName,
            baseStatsRole: m.baseStatsRole,
            power: m.power
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add items');
      }

      const result = await response.json();

      // Log detalhado no console
      console.log('=== ADD BASE STATS ROLE ITEMS SUMMARY ===');
      console.log(`Step 1 - Cleaned: ${result.cleaned || 0} monsters`);
      console.log(`Step 2 - Updated: ${result.updated} monsters with new items`);

      toast.success(`${result.cleaned || 0} monstros limpos, ${result.updated} monstros atualizados`);

      // Reload monsters
      const monsters = await loadAllMonsters();
      setAllMonsters(monsters);
    } catch (error) {
      console.error('Error adding items:', error);
      toast.error('Erro ao adicionar items: ' + error.message);
    } finally {
      setAdding(false);
      setShowAddItemDialog(false);
    }
  };

  // Calculate filtered monster count
  const filteredMonsterCount = allMonsters.filter(monster => {
    const power = monster.power || 0;
    const powerInRange = power >= powerRange[0] && power <= powerRange[1];
    const notCustom = ignoreCustomMapRole ? (monster.mapRole !== 'Custom') : true;
    return powerInRange && notCustom;
  }).length;

  return (
    <Fragment>
      <Container>
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Setup Drop by Base Stats Role</h1>
              <p className="text-sm text-gray-400 mt-1">
                Atualizar drop de monstros por base stats role
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
              {!loading && (
                <>
                  <Badge variant="outline" className="text-gray-400 border-gray-600">
                    <Target className="h-3 w-3 mr-1" />
                    {uniqueBaseStatsRoles.length} Base Stats Roles
                  </Badge>
                  <Badge variant="outline" className="text-gray-400 border-gray-600">
                    {allMonsters.length} Monsters
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <Card className="bg-gray-900/50 border-gray-800 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-1">Actions</h3>
                <p className="text-xs text-gray-500">
                  Operações em lote nos monstros filtrados ({filteredMonsterCount} monstros)
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAddItemDialog(true)}
                  disabled={loading || filteredMonsterCount === 0}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  Apply Base Stats Role Loot Config
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Loot Categories */}
        {!loading && availableLootCategories.length > 0 && (
          <Tabs value={selectedLootCategory} onValueChange={setSelectedLootCategory}>
            <TabsList variant="line" className="mb-4">
              {availableLootCategories.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} ({categoryItemCounts[category] || 0})
                </TabsTrigger>
              ))}
            </TabsList>

            {availableLootCategories.map((category) => (
              <TabsContent key={category} value={category}>
                {/* Items Cloud for this category */}
                <LootCategoryItemsCloud
                  lootCategory={category}
                  allMonsters={allMonsters}
                  raceDrops={baseStatsRoleDrops}
                  availableItems={availableItems}
                  lootCategoryTiers={lootCategoryTiers}
                  powerRange={powerRange}
                  ignoreCustomMapRole={ignoreCustomMapRole}
                  loading={loading}
                  groupBy="baseStatsRole"
                />

                {/* Main table */}
                <Card className="bg-gray-950/50 border-gray-800 overflow-hidden">
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex items-center justify-center h-[400px]">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                          <p className="text-gray-400 mt-2">Loading monster base stats roles...</p>
                        </div>
                      </div>
                    ) : (
                      <BaseStatsRoleTable
                        allMonsters={allMonsters}
                        powerRange={powerRange}
                        setPowerRange={setPowerRange}
                        ignoreCustomMapRole={ignoreCustomMapRole}
                        setIgnoreCustomMapRole={setIgnoreCustomMapRole}
                        onBaseStatsRoleDropsChange={setBaseStatsRoleDrops}
                        lootCategory={category}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Add Items from Base Stats Role Config Dialog */}
        <AlertDialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-100">
                Aplicar Configuração de Loot por Base Stats Role
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                <div className="space-y-4">
                  <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-md">
                    <p className="text-blue-400 font-semibold mb-2">📋 Resumo</p>
                    <p className="text-sm">
                      Aplicar a configuração de loot em <strong className="text-white">{filteredMonsterCount} monstros</strong> baseado nos base stats roles configurados.
                    </p>
                  </div>

                  <div className="p-3 bg-gray-800/50 rounded-md border border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">🔄 Processo:</h4>
                    <ol className="text-sm space-y-2 list-decimal pl-5">
                      <li>
                        <strong className="text-gray-200">Limpeza:</strong> Remove items existentes das categorias{' '}
                        {availableLootCategories.map((cat, idx) => (
                          <span key={cat}>
                            <code className="text-yellow-400 text-xs bg-gray-900/50 px-1 rounded">{cat}</code>
                            {idx < availableLootCategories.length - 1 && ', '}
                          </span>
                        ))}
                      </li>
                      <li>
                        <strong className="text-gray-200">Seleção:</strong> Para cada monstro, identifica seu base stats role e busca os items configurados
                      </li>
                      <li>
                        <strong className="text-gray-200">Validação:</strong> Verifica se o power do monstro está no range do tier do item
                      </li>
                      <li>
                        <strong className="text-gray-200">Ordenação:</strong> Items salvos em ordem crescente de unlock level
                      </li>
                      <li>
                        <strong className="text-gray-200">Cálculo:</strong> Unlock levels recalculados para todos os items do loot
                      </li>
                    </ol>
                  </div>

                  <div className="p-3 bg-gray-800/50 rounded-md border border-gray-700">
                    <strong className="text-gray-300 text-sm">⚙️ Filtros ativos:</strong>
                    <ul className="list-none mt-2 text-sm space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="text-gray-500">Power:</span>
                        <code className="text-blue-400 bg-gray-900/50 px-2 py-0.5 rounded text-xs">{powerRange[0]} - {powerRange[1]}</code>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-gray-500">Ignorar Custom:</span>
                        <code className="text-blue-400 bg-gray-900/50 px-2 py-0.5 rounded text-xs">{ignoreCustomMapRole ? 'Sim' : 'Não'}</code>
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-md">
                    <p className="text-yellow-400 font-semibold mb-1 text-sm">⚠️ Atenção</p>
                    <p className="text-xs text-yellow-200">
                      Esta ação é irreversível. Certifique-se de que a configuração de base stats roles está correta antes de prosseguir.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAddItemToAll}
                disabled={adding}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adicionando...
                  </>
                ) : (
                  'Confirmar e adicionar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Container>
    </Fragment>
  );
};

export { BaseStatsRoleDropPage };
