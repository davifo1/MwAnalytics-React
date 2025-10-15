import { useEffect, useState } from 'react';
import { Container } from '@/components/common/container';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Package, Settings, ChevronUp, ChevronDown, Info, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { getTierColor } from '@/utils/tierUtils';
import { LootCategoryTierDialog } from '@/modules/items/LootCategoryTierDialog';
import { MonsterStageSelect } from '@/components/MonsterStageSelect';

export function LootCategoriesPage() {
  usePageTitle('Loot Categories');

  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lootCategoryDialogOpen, setLootCategoryDialogOpen] = useState(false);
  const [selectedLootCategory, setSelectedLootCategory] = useState(null);
  const [monsterStages, setMonsterStages] = useState([]);
  const [stageInfoDialogOpen, setStageInfoDialogOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    // Carregar monster stages
    fetch('/data/monsterStages.json')
      .then(res => res.json())
      .then(data => setMonsterStages(data))
      .catch(err => console.error('Error loading monster stages:', err));
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/data/loot-monster/loot-category-tiers.json');
      if (!response.ok) {
        throw new Error('Failed to load loot categories');
      }

      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Error loading loot categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatCategoryName = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStageInfo = (stageName) => {
    return monsterStages.find(s => s.stage === stageName);
  };

  const getStageBreakdown = () => {
    const stageMap = new Map();

    // Iterar por todas as categorias
    Object.entries(categories).forEach(([categoryName, categoryData]) => {
      const { priority, ...tiers } = categoryData;

      // Iterar por todos os tiers da categoria
      Object.entries(tiers).forEach(([tierName, tierData]) => {
        // Verificar se tem monsterDropStage definido
        if (tierData.monsterDropStage !== undefined && tierData.monsterDropStage !== '') {
          const stage = tierData.monsterDropStage;

          if (!stageMap.has(stage)) {
            stageMap.set(stage, []);
          }

          stageMap.get(stage).push({
            categoryName,
            priority: priority || 0,
            tier: tierName,
            tierData
          });
        }
      });
    });

    // Converter para array e ordenar stages
    const stageArray = Array.from(stageMap.entries()).map(([stage, items]) => ({
      stage,
      items: items.sort((a, b) => {
        // Ordenar por prioridade da categoria (maior primeiro)
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        // Desempate por nome da categoria
        return a.categoryName.localeCompare(b.categoryName);
      })
    }));

    // Ordenar stages (alfabético ou por ordem customizada se necessário)
    stageArray.sort((a, b) => {
      const stageOrder = ['Low-level', 'Intermediate', 'Mid-level', 'High-level'];
      const aIndex = stageOrder.indexOf(a.stage);
      const bIndex = stageOrder.indexOf(b.stage);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      return a.stage.localeCompare(b.stage);
    });

    return stageArray;
  };

  const handleMoveCategory = async (categoryName, direction) => {
    try {
      // Pegar array ordenado de categorias
      const sortedCategories = Object.entries(categories)
        .sort(([, a], [, b]) => (b.priority || 0) - (a.priority || 0));

      // Encontrar índice atual
      const currentIndex = sortedCategories.findIndex(([name]) => name === categoryName);

      if (currentIndex === -1) return;

      // Verificar se pode mover
      if (direction === 'up' && currentIndex === 0) return; // Já está no topo
      if (direction === 'down' && currentIndex === sortedCategories.length - 1) return; // Já está no final

      // Fazer a troca
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [sortedCategories[currentIndex], sortedCategories[newIndex]] =
        [sortedCategories[newIndex], sortedCategories[currentIndex]];

      // Recalcular prioridades (topo = maior prioridade)
      const totalCategories = sortedCategories.length;
      const updatedCategories = {};

      sortedCategories.forEach(([name, data], index) => {
        updatedCategories[name] = {
          ...data,
          priority: totalCategories - index // Topo = maior número
        };
      });

      // Salvar no backend
      const response = await fetch('/api/loot-category-tiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCategories),
      });

      if (!response.ok) throw new Error('Failed to save priorities');

      toast.success('Prioridades atualizadas com sucesso');

      // Recarregar categorias
      await loadCategories();
    } catch (error) {
      console.error('Error updating priorities:', error);
      toast.error('Erro ao atualizar prioridades');
    }
  };

  return (
    <Container data-panel-id="loot-categories">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-semibold text-gray-100">Loot Categories</h1>
            <p className="text-xs text-gray-400">
              Visualize e gerencie as categorias de loot e seus tiers
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
            onClick={() => setStageInfoDialogOpen(true)}
          >
            <Info className="h-4 w-4 mr-2" />
            Monster Stage Info
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-xs text-gray-300">Carregando categorias...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="py-2">
              <p className="text-red-400 text-xs">Erro ao carregar categorias: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Categories List */}
        {!loading && !error && (
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="pr-4">
              <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(categories)
                  .sort(([, a], [, b]) => (b.priority || 0) - (a.priority || 0))
                  .map(([categoryName, categoryData], index, array) => {
                  const { priority, ...tiers } = categoryData;
                  const isFirst = index === 0;
                  const isLast = index === array.length - 1;

                  return (
                    <AccordionItem
                      key={categoryName}
                      value={categoryName}
                      className="bg-gray-900 border border-gray-700 rounded-lg"
                      data-panel-id={`loot-category-${categoryName.replace(/\s+/g, '-')}`}
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-800/50">
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex items-center gap-3">
                            {/* Botões de ordenação */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-green-800/30 hover:text-green-400 disabled:opacity-30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveCategory(categoryName, 'up');
                                }}
                                disabled={isFirst}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-green-800/30 hover:text-green-400 disabled:opacity-30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveCategory(categoryName, 'down');
                                }}
                                disabled={isLast}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="h-5 w-px bg-gray-700" />

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-blue-800/30 hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLootCategory(categoryName);
                                setLootCategoryDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <div className="h-5 w-px bg-gray-700" />
                            <Package className="size-4 text-blue-400" />
                            <span className="text-sm font-semibold text-gray-100">
                              {formatCategoryName(categoryName)}
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-blue-600 text-blue-100 text-xs px-2 py-0 mr-2">
                            Priority: {priority}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        {/* Horizontal tier display */}
                        <div className="flex flex-col gap-2 pt-2">
                          {Object.entries(tiers).map(([tier, tierData]) => (
                            <div
                              key={tier}
                              className="flex items-center gap-4 px-3 py-2.5 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 transition-colors"
                            >
                              {/* Tier badge */}
                              <Badge className={`${getTierColor(tier)} px-3 py-1 text-xs font-semibold min-w-[90px] justify-center`}>
                                {tier.toUpperCase()}
                              </Badge>

                              <div className="h-6 w-px bg-gray-700" />

                              {/* Tier data - horizontal with better spacing */}
                              <div className="flex items-center gap-6 flex-1 text-xs">
                                <div className="flex items-center gap-2 min-w-[140px]">
                                  <span className="text-gray-400 font-medium">Valuation:</span>
                                  <span className="text-gray-200 font-semibold">{tierData.valuation.toLocaleString()}</span>
                                </div>

                                {tierData.sellingPrice !== undefined && (
                                  <div className="flex items-center gap-2 min-w-[140px]">
                                    <span className="text-gray-400 font-medium">Selling Price:</span>
                                    <span className="text-gray-200 font-semibold">{tierData.sellingPrice.toLocaleString()}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 min-w-[110px]">
                                  <span className="text-gray-400 font-medium">Drop Chance:</span>
                                  <span className="text-gray-200 font-semibold">{tierData.chance}%</span>
                                </div>

                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <span className="text-gray-400 font-medium">Power:</span>
                                  <span className="text-gray-200 font-semibold">{tierData.powerMin}-{tierData.powerMax}</span>
                                </div>

                                {tierData.monsterDropStage !== undefined && (
                                  <div className="flex items-center gap-2 min-w-[180px]">
                                    <span className="text-gray-400 font-medium">Monster Stage:</span>
                                    <MonsterStageSelect
                                      value={tierData.monsterDropStage}
                                      onValueChange={() => {}}
                                      stages={monsterStages}
                                      disabled={true}
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                )}

                                {tierData.stageMin !== undefined && (
                                  <>
                                    <div className="flex items-center gap-2 min-w-[100px]">
                                      <span className="text-gray-400 font-medium">Stage Min:</span>
                                      <span className="text-gray-200 font-semibold">{tierData.stageMin || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-[100px]">
                                      <span className="text-gray-400 font-medium">Stage Max:</span>
                                      <span className="text-gray-200 font-semibold">{tierData.stageMax || 'N/A'}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Dialog de configuração de tiers */}
      <LootCategoryTierDialog
        lootCategory={selectedLootCategory}
        open={lootCategoryDialogOpen}
        onOpenChange={setLootCategoryDialogOpen}
        onSave={loadCategories}
      />

      {/* Dialog de informações por Monster Stage */}
      <Dialog open={stageInfoDialogOpen} onOpenChange={setStageInfoDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Breakdown por Monster Stage
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Visualização das categorias de loot agrupadas por Monster Stage, ordenadas por prioridade
            </div>

            {getStageBreakdown().length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                Nenhum tier com Monster Stage definido
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-2">
                {getStageBreakdown().map((stageGroup) => {
                  // Calcular estatísticas do stage
                  const uniqueCategories = new Set(stageGroup.items.map(i => i.categoryName)).size;
                  const chances = stageGroup.items.map(i => i.tierData.chance);
                  const minChance = Math.min(...chances);
                  const maxChance = Math.max(...chances);
                  const powers = stageGroup.items.flatMap(i => [i.tierData.powerMin, i.tierData.powerMax]);
                  const minPower = Math.min(...powers);
                  const maxPower = Math.max(...powers);

                  // Buscar informações do stage
                  const stageInfo = getStageInfo(stageGroup.stage);

                  return (
                    <AccordionItem
                      key={stageGroup.stage}
                      value={stageGroup.stage}
                      className="bg-gray-900 border border-gray-700 rounded-lg"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-800/50">
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex items-center gap-3">
                            <Layers className="size-5 text-indigo-400" />
                            <div className="flex flex-col items-start gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-semibold text-gray-100">
                                  {stageGroup.stage}
                                </span>
                                {stageInfo?.level_range && (
                                  <Badge variant="secondary" className="bg-purple-900/40 text-purple-200 text-xs">
                                    Lv {stageInfo.level_range}
                                  </Badge>
                                )}
                              </div>
                              {stageInfo?.description && (
                                <span className="text-xs text-gray-500 italic">
                                  {stageInfo.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <Badge variant="secondary" className="bg-gray-700 text-gray-200">
                              {stageGroup.items.length} tier{stageGroup.items.length !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="secondary" className="bg-blue-900/40 text-blue-200">
                              {uniqueCategories} categor{uniqueCategories !== 1 ? 'ias' : 'ia'}
                            </Badge>
                            <div className="h-4 w-px bg-gray-700" />
                            <div className="flex items-center gap-1 text-gray-400">
                              <span>Chance:</span>
                              <span className="text-gray-200 font-semibold">{minChance}%-{maxChance}%</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-400">
                              <span>Power:</span>
                              <span className="text-gray-200 font-semibold">{minPower}-{maxPower}</span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <div className="space-y-2 pt-2">
                          {stageGroup.items.map((item, index) => (
                            <div
                              key={`${item.categoryName}-${item.tier}-${index}`}
                              className="flex items-center justify-between p-2 rounded bg-gray-800 border border-gray-700"
                            >
                              <div className="flex items-center gap-3">
                                <Badge className={`${getTierColor(item.tier)} px-2 py-1 text-xs font-semibold min-w-[80px] justify-center`}>
                                  {item.tier.toUpperCase()}
                                </Badge>
                                <div className="h-4 w-px bg-gray-700" />
                                <span className="text-sm font-medium text-gray-200">
                                  {formatCategoryName(item.categoryName)}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-1">
                                  <span>Priority:</span>
                                  <span className="text-blue-400 font-semibold">{item.priority}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span>Chance:</span>
                                  <span className="text-gray-200 font-semibold">{item.tierData.chance}%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span>Power:</span>
                                  <span className="text-gray-200 font-semibold">
                                    {item.tierData.powerMin}-{item.tierData.powerMax}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
