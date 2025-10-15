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
import RaceTable from '@/components/RaceTable';
import LootCategoryItemsCloud from '@/components/LootCategoryItemsCloud';
import { loadAllMonsters } from '@/services/monsterService';
import { Loader2, Users, Trash2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTierColor } from '@/utils/tierUtils';

const MonsterRacesPage = () => {
  usePageTitle('Setup Drop by Races');

  const [loading, setLoading] = useState(true);
  const [allMonsters, setAllMonsters] = useState([]);
  const [uniqueRaces, setUniqueRaces] = useState([]);
  const [powerRange, setPowerRange] = useState([2, 15]);
  const [ignoreCustomMapRole, setIgnoreCustomMapRole] = useState(true);
  const [selectedLootCategory, setSelectedLootCategory] = useState(() => {
    // Load from localStorage on initial render
    const saved = localStorage.getItem('monster-races-selected-tab');
    return saved || 'imbuement';
  });

  // Add item states
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [adding, setAdding] = useState(false);

  // Items and race drops data
  const [availableItems, setAvailableItems] = useState([]);
  const [raceDrops, setRaceDrops] = useState({});
  const [lootCategoryTiers, setLootCategoryTiers] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load all monsters
        const monsters = await loadAllMonsters();
        setAllMonsters(monsters);

        // Extract unique races
        const raceSet = new Set();
        monsters.forEach(monster => {
          if (monster.race) {
            const races = monster.race.split(';').map(r => r.trim()).filter(r => r);
            races.forEach(race => raceSet.add(race));
          }
        });

        const uniqueRacesList = Array.from(raceSet).sort();
        setUniqueRaces(uniqueRacesList);

        console.log(`Loaded ${monsters.length} monsters with ${uniqueRacesList.length} unique races`);
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

  // Load race drops configuration
  const loadRaceDrops = async () => {
    try {
      const response = await fetch('/api/race-drops');
      if (response.ok) {
        const drops = await response.json();
        setRaceDrops(drops);
      }
    } catch (error) {
      console.error('Error loading race drops:', error);
    }
  };

  useEffect(() => {
    loadRaceDrops();
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
    localStorage.setItem('monster-races-selected-tab', selectedLootCategory);
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

      // Iterate through all races
      Object.values(raceDrops).forEach(raceConfig => {
        const categoryItems = raceConfig[category] || [];
        categoryItems.forEach(itemName => uniqueItems.add(itemName));
      });

      counts[category] = uniqueItems.size;
    });

    return counts;
  }, [availableLootCategories, raceDrops]);

  // Handle add items based on race configuration
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

      const response = await fetch('/api/monsters/add-race-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monsters: filteredMonsters.map(m => ({
            fileName: m.fileName,
            monsterName: m.monsterName,
            race: m.race,
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
      console.log('=== ADD RACE ITEMS SUMMARY ===');
      console.log(`Total filtered: ${result.total || 0} monsters`);
      console.log(`Step 1 - Cleaned: ${result.cleaned || 0} monsters (removed race items)`);
      console.log(`Step 2 - Updated: ${result.updated} monsters (added new race items)`);
      console.log(`Only cleaned (no items to add): ${result.onlyCleaned || 0} monsters`);

      const cleanedCount = result.cleaned || 0;
      const updatedCount = result.updated || 0;
      const onlyCleanedCount = result.onlyCleaned || 0;

      toast.success(
        `Processados ${result.total} monstros:\n` +
        `• ${cleanedCount} limpos\n` +
        `• ${updatedCount} atualizados com novos items\n` +
        `• ${onlyCleanedCount} apenas limpos (sem raça configurada)`,
        { duration: 6000 }
      );

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
              <h1 className="text-2xl font-bold text-gray-100">Setup Drop by Races</h1>
              <p className="text-sm text-gray-400 mt-1">
                Atualizar drop de monstros por raça
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
                    <Users className="h-3 w-3 mr-1" />
                    {uniqueRaces.length} Races
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
                  Apply Race Loot Config
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
                  raceDrops={raceDrops}
                  availableItems={availableItems}
                  lootCategoryTiers={lootCategoryTiers}
                  powerRange={powerRange}
                  ignoreCustomMapRole={ignoreCustomMapRole}
                  loading={loading}
                />

                {/* Main table */}
                <Card className="bg-gray-950/50 border-gray-800 overflow-hidden">
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex items-center justify-center h-[400px]">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                          <p className="text-gray-400 mt-2">Loading monster races...</p>
                        </div>
                      </div>
                    ) : (
                      <RaceTable
                        allMonsters={allMonsters}
                        powerRange={powerRange}
                        setPowerRange={setPowerRange}
                        ignoreCustomMapRole={ignoreCustomMapRole}
                        setIgnoreCustomMapRole={setIgnoreCustomMapRole}
                        onRaceDropsChange={setRaceDrops}
                        lootCategory={category}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Add Items from Race Config Dialog */}
        <AlertDialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-100">
                Aplicar Configuração de Loot por Raça
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                <div className="space-y-4">
                  <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-md">
                    <p className="text-blue-400 font-semibold mb-2">📋 Resumo</p>
                    <p className="text-sm">
                      Aplicar a configuração de loot em <strong className="text-white">{filteredMonsterCount} monstros</strong> baseado nas raças configuradas.
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
                        <strong className="text-gray-200">Seleção:</strong> Para cada monstro, identifica suas raças e busca os items configurados
                      </li>
                      <li>
                        <strong className="text-gray-200">Validação:</strong> Verifica se o power do monstro está no range do tier do item
                      </li>
                      <li>
                        <strong className="text-gray-200">Divisão de Chances:</strong> Se múltiplas raças têm items do mesmo tier, a chance é dividida automaticamente
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
                      Esta ação é irreversível. Certifique-se de que a configuração de raças está correta antes de prosseguir.
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

export { MonsterRacesPage };