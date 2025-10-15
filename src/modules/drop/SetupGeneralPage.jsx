import React, { Fragment, useEffect, useState } from 'react';
import { Container } from '@/components';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { loadAllMonsters } from '@/services/monsterService';
import { Loader2, Target, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SetupGeneralPage = () => {
  usePageTitle('Setup General');

  const [loading, setLoading] = useState(true);
  const [allMonsters, setAllMonsters] = useState([]);
  const [powerRange, setPowerRange] = useState([2, 15]);
  const [ignoreCustomMapRole, setIgnoreCustomMapRole] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [onlyWithoutOrigin, setOnlyWithoutOrigin] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load all monsters
        const monsters = await loadAllMonsters();
        setAllMonsters(monsters);

        console.log(`Loaded ${monsters.length} monsters`);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load monster data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle clear all monster loot
  const handleClearAllLoot = async () => {
    try {
      setClearing(true);

      // Filter monsters based on current filters
      const filteredMonsters = allMonsters.filter(monster => {
        const power = monster.power || 0;
        const powerInRange = power >= powerRange[0] && power <= powerRange[1];
        const notCustom = ignoreCustomMapRole ? (monster.mapRole !== 'Custom') : true;
        return powerInRange && notCustom;
      });

      const monsterFiles = filteredMonsters.map(m => m.fileName);

      const response = await fetch('/api/monsters/clear-loot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monsterFiles,
          onlyWithoutOrigin
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear loot');
      }

      const result = await response.json();
      toast.success(`Loot limpo de ${result.updated} monstros`);

      // Reload monsters
      const monsters = await loadAllMonsters();
      setAllMonsters(monsters);
    } catch (error) {
      console.error('Error clearing loot:', error);
      toast.error('Erro ao limpar loot: ' + error.message);
    } finally {
      setClearing(false);
      setShowClearDialog(false);
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
              <h1 className="text-2xl font-bold text-gray-100">Setup General</h1>
              <p className="text-sm text-gray-400 mt-1">
                Operações gerais de configuração de monstros
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
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  {allMonsters.length} Monsters
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <Card className="bg-gray-900/50 border-gray-800 mb-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Filtros</h3>
            <div className="flex gap-6 items-center">
              {/* Power Range */}
              <div className="flex items-center gap-4">
                <Label className="text-sm text-gray-400 min-w-[80px]">Power Range:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={powerRange[0]}
                    onChange={(e) => setPowerRange([parseInt(e.target.value), powerRange[1]])}
                    className="w-20 bg-gray-800 border-gray-700 text-gray-200"
                  />
                  <span className="text-gray-500">-</span>
                  <Input
                    type="number"
                    value={powerRange[1]}
                    onChange={(e) => setPowerRange([powerRange[0], parseInt(e.target.value)])}
                    className="w-20 bg-gray-800 border-gray-700 text-gray-200"
                  />
                </div>
              </div>

              {/* Ignore Custom */}
              <div className="flex items-center gap-3">
                <Switch
                  id="ignore-custom"
                  checked={ignoreCustomMapRole}
                  onCheckedChange={setIgnoreCustomMapRole}
                />
                <Label htmlFor="ignore-custom" className="text-sm text-gray-400 cursor-pointer">
                  Ignorar Custom Map Role
                </Label>
              </div>

              {/* Filtered Count */}
              <div className="ml-auto">
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  <Target className="h-3 w-3 mr-1" />
                  {filteredMonsterCount} filtrados
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  disabled={loading || filteredMonsterCount === 0}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear all monster loot
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clear Loot Confirmation Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-100">
                Limpar loot de todos os monstros?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                <div className="space-y-4">
                  <div>
                    Esta ação irá limpar o conteúdo de <code className="text-yellow-500">&lt;loot&gt;</code> de{' '}
                    <strong className="text-white">{filteredMonsterCount} monstros</strong> filtrados.
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-md border border-gray-700">
                    <Switch
                      id="only-without-origin"
                      checked={onlyWithoutOrigin}
                      onCheckedChange={setOnlyWithoutOrigin}
                    />
                    <Label
                      htmlFor="only-without-origin"
                      className="text-sm text-gray-300 cursor-pointer flex-1"
                    >
                      Limpar apenas items sem <code className="text-yellow-500">bko_origin</code> ou com <code className="text-yellow-500">bko_origin="None"</code>
                    </Label>
                  </div>

                  <div>
                    <span className="text-red-400">Esta operação não pode ser desfeita.</span>
                  </div>

                  <div>
                    <strong className="text-gray-300">Filtros aplicados:</strong>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      <li>Power Range: {powerRange[0]} - {powerRange[1]}</li>
                      <li>Ignore Custom: {ignoreCustomMapRole ? 'Sim' : 'Não'}</li>
                    </ul>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAllLoot}
                disabled={clearing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {clearing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Limpando...
                  </>
                ) : (
                  'Confirmar e limpar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Container>
    </Fragment>
  );
};

export { SetupGeneralPage };
