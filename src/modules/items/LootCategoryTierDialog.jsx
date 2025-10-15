import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';
import { TIER_LIST } from '@/utils/tierUtils';
import { MonsterStageSelect } from '@/components/MonsterStageSelect';
import { ItemsService } from '@/services/itemsService';

/**
 * Dialog para editar configurações de tiers por loot category
 * @param {Object} props
 * @param {string} props.lootCategory - Nome da loot category (ex: "consumables")
 * @param {boolean} props.open - Se o dialog está aberto
 * @param {Function} props.onOpenChange - Callback para controlar abertura
 * @param {Function} props.onSave - Callback chamado após salvar com sucesso
 */
export function LootCategoryTierDialog({ lootCategory, open, onOpenChange, onSave }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [tierConfigs, setTierConfigs] = useState({});
  const [originalConfigs, setOriginalConfigs] = useState({});
  const [currentPriority, setCurrentPriority] = useState(0); // Para preservar ao salvar
  const [monsterStages, setMonsterStages] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [validatingItems, setValidatingItems] = useState(false);

  // Carregar monster stages
  useEffect(() => {
    fetch('/data/monsterStages.json')
      .then(res => res.json())
      .then(data => setMonsterStages(data))
      .catch(err => console.error('Error loading monster stages:', err));
  }, []);

  // Estrutura padrão para um tier
  const getDefaultTierConfig = () => ({
    valuation: 0,
    sellingPrice: 0,
    chance: 0.000,
    powerMin: 0,
    powerMax: 0,
    monsterDropStage: '',
  });

  // Carregar configurações quando o dialog abrir
  useEffect(() => {
    if (open && lootCategory) {
      loadConfigs();
    }
  }, [open, lootCategory]);

  // Validar items quando configs mudarem
  useEffect(() => {
    if (open && lootCategory && Object.keys(tierConfigs).length > 0) {
      validateItems();
    }
  }, [open, lootCategory, tierConfigs]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/loot-category-tiers');
      if (!response.ok) throw new Error('Failed to load configs');

      const allConfigs = await response.json();

      // Pegar configs desta loot category ou criar vazio
      const categoryConfigs = allConfigs[lootCategory] || {};

      // Extrair priority para preservar ao salvar
      const categoryPriority = categoryConfigs.priority !== undefined ? categoryConfigs.priority : 0;
      setCurrentPriority(categoryPriority);

      // Garantir que todos os tiers existam e migrar formato antigo
      const fullConfigs = {};
      TIER_LIST.forEach(tier => {
        const tierConfig = categoryConfigs[tier] || getDefaultTierConfig();

        // Migrar formatos antigos
        const migratedConfig = { ...getDefaultTierConfig() };

        // Migrar valuation
        migratedConfig.valuation = tierConfig.valuation || 0;

        // Migrar sellingPrice (novo campo)
        migratedConfig.sellingPrice = tierConfig.sellingPrice || 0;

        // Migrar chance (formato antigo usava chanceMin/chanceMax)
        if (tierConfig.chanceMin !== undefined || tierConfig.chanceMax !== undefined) {
          migratedConfig.chance = tierConfig.chanceMin || tierConfig.chanceMax || 0;
        } else {
          migratedConfig.chance = tierConfig.chance || 0;
        }

        // Migrar power
        migratedConfig.powerMin = tierConfig.powerMin || 0;
        migratedConfig.powerMax = tierConfig.powerMax || 0;

        // Migrar monsterDropStage (formato antigo usava stageMin/stageMax/stage, novo usa monsterDropStage)
        if (tierConfig.monsterDropStage) {
          migratedConfig.monsterDropStage = tierConfig.monsterDropStage;
        } else if (tierConfig.stageMax) {
          migratedConfig.monsterDropStage = tierConfig.stageMax;
        } else if (tierConfig.stageMin) {
          migratedConfig.monsterDropStage = tierConfig.stageMin;
        } else if (tierConfig.stage) {
          migratedConfig.monsterDropStage = tierConfig.stage;
        } else {
          migratedConfig.monsterDropStage = '';
        }

        fullConfigs[tier] = migratedConfig;
      });

      setTierConfigs(fullConfigs);
      setOriginalConfigs(JSON.parse(JSON.stringify(fullConfigs)));
    } catch (error) {
      console.error('Error loading tier configs:', error);
      toast.error('Erro ao carregar configurações');

      // Criar configs padrão em caso de erro
      const defaultConfigs = {};
      TIER_LIST.forEach(tier => {
        defaultConfigs[tier] = getDefaultTierConfig();
      });
      setTierConfigs(defaultConfigs);
      setOriginalConfigs(JSON.parse(JSON.stringify(defaultConfigs)));
      setCurrentPriority(0);
    } finally {
      setLoading(false);
    }
  };

  const validateItems = async () => {
    setValidatingItems(true);
    try {
      // Carregar items de monster-loot
      const allItems = await ItemsService.loadItemsFromXML('monster-loot');

      // Filtrar apenas items da lootCategory atual
      const items = allItems.filter(item =>
        item.attributes?.lootCategory === lootCategory
      );

      const warningsMap = new Map(); // Usar Map para agrupar por item

      // Validar cada item
      items.forEach(item => {
        if (!item.tier) return; // Skip items sem tier

        const tierConfig = tierConfigs[item.tier];
        if (!tierConfig) return; // Skip se não houver config para esse tier

        const itemValuation = item.valuation || 0;
        const itemSellingPrice = item.sellPrice || item.attributes?.sellingPrice || 0;
        const itemMonsterDropStage = item.attributes?.monsterDropStage || '';
        const configValuation = tierConfig.valuation || 0;
        const configSellingPrice = tierConfig.sellingPrice || 0;
        const configMonsterDropStage = tierConfig.monsterDropStage || '';

        const differences = [];

        // Verificar diferenças
        if (itemValuation !== configValuation) {
          differences.push({
            field: 'valuation',
            expected: configValuation,
            current: itemValuation
          });
        }

        if (itemSellingPrice !== configSellingPrice) {
          differences.push({
            field: 'sellingPrice',
            expected: configSellingPrice,
            current: itemSellingPrice
          });
        }

        if (itemMonsterDropStage !== configMonsterDropStage) {
          differences.push({
            field: 'monsterDropStage',
            expected: configMonsterDropStage || 'none',
            current: itemMonsterDropStage || 'none'
          });
        }

        // Se houver diferenças, adicionar ao mapa
        if (differences.length > 0) {
          warningsMap.set(item.name, {
            itemName: item.name,
            tier: item.tier,
            differences
          });
        }
      });

      // Converter Map para Array
      setValidationWarnings(Array.from(warningsMap.values()));
    } catch (error) {
      console.error('Error validating items:', error);
    } finally {
      setValidatingItems(false);
    }
  };

  const handleFieldChange = (tier, field, value) => {
    setTierConfigs(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Carregar todas as configs existentes
      const response = await fetch('/api/loot-category-tiers');
      if (!response.ok) throw new Error('Failed to load configs');
      const allConfigs = await response.json();

      // Atualizar apenas esta loot category preservando priority
      allConfigs[lootCategory] = {
        priority: currentPriority,
        ...tierConfigs
      };

      // Salvar de volta
      const saveResponse = await fetch('/api/loot-category-tiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allConfigs),
      });

      if (!saveResponse.ok) throw new Error('Failed to save configs');

      toast.success(`Configurações de ${lootCategory} salvas com sucesso`);
      setOriginalConfigs(JSON.parse(JSON.stringify(tierConfigs)));

      // Chamar callback onSave se fornecido
      if (onSave) {
        onSave();
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving tier configs:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateValuation = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/update-items-valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lootCategory,
          tierConfigs,
          includeSellingPrice: true, // Sempre incluir selling price
        }),
      });

      if (!response.ok) throw new Error('Failed to update items');

      const result = await response.json();
      toast.success(`${result.updatedCount} items atualizados com sucesso`);

      // Revalidar items após atualização
      await validateItems();
    } catch (error) {
      console.error('Error updating items valuation:', error);
      toast.error('Erro ao atualizar valuation dos items');
    } finally {
      setUpdating(false);
    }
  };

  const hasChanges = JSON.stringify(tierConfigs) !== JSON.stringify(originalConfigs);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Configuração de Tiers - {lootCategory}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-400">
            Carregando configurações...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-4">
              Configure os valores para cada tier de <span className="text-blue-400 font-semibold">{lootCategory}</span>.
              Power: 0-15 | Chance: 0-100% com 3 casas decimais
            </div>

            {/* Tabela de Tiers */}
            <div className="border border-gray-700 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-300 w-[100px]">
                      Tier
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-300">
                      Item Valuation
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-300">
                      Selling Price
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-300">
                      Drop Chance (%)
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-300">
                      Monster Power Min
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-300">
                      Monster Power Max
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-300 w-[280px]">
                      Monster Drop Stage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_LIST.map((tier) => {
                    const config = tierConfigs[tier] || getDefaultTierConfig();
                    return (
                      <tr key={tier} className="border-t border-gray-700 hover:bg-gray-800/50">
                        <td className="p-3">
                          <span className="text-sm font-medium text-gray-200 capitalize">
                            {tier}
                          </span>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={config.valuation}
                            onChange={(e) => handleFieldChange(tier, 'valuation', Number(e.target.value))}
                            className="h-8 bg-gray-900 border-gray-700 text-gray-200"
                            min="0"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={config.sellingPrice}
                            onChange={(e) => handleFieldChange(tier, 'sellingPrice', Number(e.target.value))}
                            className="h-8 bg-gray-900 border-gray-700 text-gray-200"
                            min="0"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={config.chance}
                            onChange={(e) => handleFieldChange(tier, 'chance', Number(e.target.value))}
                            className="h-8 bg-gray-900 border-gray-700 text-gray-200"
                            min="0"
                            max="100"
                            step="0.001"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={config.powerMin}
                            onChange={(e) => handleFieldChange(tier, 'powerMin', Number(e.target.value))}
                            className="h-8 bg-gray-900 border-gray-700 text-gray-200"
                            min="0"
                            max="15"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={config.powerMax}
                            onChange={(e) => handleFieldChange(tier, 'powerMax', Number(e.target.value))}
                            className="h-8 bg-gray-900 border-gray-700 text-gray-200"
                            min="0"
                            max="15"
                          />
                        </td>
                        <td className="p-3">
                          <MonsterStageSelect
                            value={config.monsterDropStage}
                            onValueChange={(value) => handleFieldChange(tier, 'monsterDropStage', value)}
                            stages={monsterStages}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Seção de Validação */}
            <div className="mt-4 border border-gray-700 rounded-lg p-3 bg-gray-800/50">
              <h3 className="text-xs font-semibold text-gray-300 mb-2">
                Validação de Items no XML
              </h3>

              {validatingItems ? (
                <div className="text-xs text-gray-400 py-1">
                  Validando items...
                </div>
              ) : validationWarnings.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <span>✓</span>
                  <span>Todos os items atualizados</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-yellow-400">
                    <span>⚠</span>
                    <span className="font-semibold">
                      {validationWarnings.length} {validationWarnings.length === 1 ? 'item com valor diferente' : 'items com valores diferentes'}
                    </span>
                  </div>

                  <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1">
                    {validationWarnings.map((warning, index) => (
                      <div key={index} className="bg-gray-900/50 rounded px-2 py-1 text-[10px] border border-yellow-700/30">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-200">{warning.itemName}</span>
                          <span className="text-gray-500">({warning.tier})</span>
                          <span className="text-gray-600">•</span>
                          {warning.differences.map((diff, diffIndex) => {
                            // Formatar nome do campo para exibição
                            const fieldDisplay = diff.field === 'monsterDropStage' ? 'monster drop stage' : diff.field;

                            return (
                              <span key={diffIndex} className="flex items-center gap-1">
                                {diffIndex > 0 && <span className="text-gray-600">,</span>}
                                <span className="capitalize text-gray-400">{fieldDisplay}:</span>
                                <span className="text-red-400">{diff.current}</span>
                                <span className="text-gray-600">→</span>
                                <span className="text-green-400">{diff.expected}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-gray-500 pt-1.5 border-t border-gray-700">
                    Use "Atualizar Valuation" para corrigir
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="!flex !flex-row !items-center !justify-between w-full mt-6 pt-4 border-t border-gray-700">
          {/* Lado esquerdo - Atualizar Valuation */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateValuation}
              disabled={updating || saving}
              className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Atualizando...' : 'Atualizar Valuation'}
            </Button>
          </div>

          {/* Lado direito - Botões de ação do dialog */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || updating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges || updating}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
