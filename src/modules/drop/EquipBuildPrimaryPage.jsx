import React, { Fragment, useEffect, useState, useRef } from 'react';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import LegendaryEquipTable from '@/components/LegendaryEquipTable';
import { ItemsService } from '@/services/itemsService';
import { loadBuildableItems } from '@/services/baldurService';
import { loadAllMonsters } from '@/services/monsterService';
import { Loader2, Download, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const EquipBuildPrimaryPage = () => {
  usePageTitle('Equip Build Primary');

  const [items, setItems] = useState([]);
  const [buildableItems, setBuildableItems] = useState([]);
  const [allMonsters, setAllMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const tableRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Carregar todos os items, buildables e monstros
        const [loadedItems, loadedBuildables, loadedMonsters] = await Promise.all([
          ItemsService.loadItemsFromXML('all'),
          loadBuildableItems(),
          loadAllMonsters()
        ]);

        setItems(loadedItems);
        setBuildableItems(loadedBuildables);
        setAllMonsters(loadedMonsters);

        console.log(`Loaded ${loadedItems.length} items, ${loadedBuildables.length} buildable items and ${loadedMonsters.length} monsters`);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleExport = async () => {
    if (!tableRef.current?.exportData) {
      toast.error('Export function not available');
      return;
    }

    try {
      const data = tableRef.current.exportData();

      const response = await fetch('/api/save-equip-build-pref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast.success('Preferences saved to public/data/equip-build-primary-pref.json');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export: ' + error.message);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);

      const response = await fetch('/data/equip-build-primary-pref.json');

      if (!response.ok) {
        throw new Error('Preferences file not found');
      }

      const data = await response.json();

      if (!tableRef.current?.importData) {
        toast.error('Import function not available');
        return;
      }

      await tableRef.current.importData(data);
      toast.success('Preferences loaded and monsters updated successfully');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import: ' + error.message);
    } finally {
      setImporting(false);
      setShowImportDialog(false);
    }
  };

  return (
    <Fragment>
      <Container>
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Equip Build Primary</h1>
              <p className="text-sm text-gray-400 mt-1">
                Visualização de todos os equipamentos lendários e seus materiais de construção primários
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
                    {items.filter(item => item.tier === 'legendary' && item.slotType).length} Legendary Items
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
                  Exportar ou importar configurações de drop
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={loading}
                  className="gap-2 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowImportDialog(true)}
                  disabled={loading}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-lg"
                >
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela principal */}
        <Card className="bg-gray-950/50 border-gray-800 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-400 mt-2">Loading legendary equipment...</p>
                </div>
              </div>
            ) : (
              <LegendaryEquipTable
                ref={tableRef}
                items={items}
                buildableItems={buildableItems}
                allMonsters={allMonsters}
              />
            )}
          </CardContent>
        </Card>

        {/* Import Confirmation Dialog */}
        <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-100">
                Importar Configuração de Loot?
              </AlertDialogTitle>
              <div className="space-y-4 text-sm text-gray-400">
                <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-md">
                  <p className="text-blue-400 font-semibold mb-2">📋 Resumo</p>
                  <p className="text-sm">
                    Esta ação irá importar as configurações do arquivo{' '}
                    <code className="text-yellow-400 bg-gray-900/50 px-1 rounded">equip-build-primary-pref.json</code>
                    {' '}e aplicar nos monstros.
                  </p>
                </div>

                <div className="p-3 bg-gray-800/50 rounded-md border border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">🔄 Processo:</h4>
                  <ol className="text-sm space-y-2 list-decimal pl-5">
                    <li>
                      <strong className="text-gray-200">Limpeza:</strong> Remove items craft primary existentes dos monstros afetados
                    </li>
                    <li>
                      <strong className="text-gray-200">Importação:</strong> Adiciona novos items craft primary conforme configuração
                    </li>
                    <li>
                      <strong className="text-gray-200">Recálculo:</strong> Atualiza unlock levels de todos os items
                    </li>
                  </ol>
                </div>

                <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-md">
                  <p className="text-yellow-400 font-semibold mb-1 text-sm">⚠️ Atenção</p>
                  <p className="text-xs text-yellow-200">
                    Esta ação é irreversível. Certifique-se de que o arquivo de configuração está correto antes de prosseguir.
                  </p>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleImport}
                disabled={importing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importando...
                  </>
                ) : (
                  'Confirmar e importar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Container>
    </Fragment>
  );
};

export { EquipBuildPrimaryPage };