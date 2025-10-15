import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCcw, Loader2, DollarSign, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { loadItemsForAutocomplete } from '@/services/monsterItemService';
import { calculateMonsterUnlockLevels } from '@/utils/unlockLevelCalculator';
import { getGoldPerLevelByPower, getBalanceMultiplier, getRecommendedGoldCoinsPerKill, getRecommendedBaseGoldCoinsPerKill } from '@/utils/rewardsCalculator';
import { getAllBaseAttributes } from '@/utils/attributesBaseCalculator';

export default function MonsterBulkActionsModal({ isOpen, onClose, selectedMonsters }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const [itemsMap, setItemsMap] = useState(null);

  // Load items when modal opens
  useEffect(() => {
    if (isOpen && !itemsMap) {
      loadItemsForAutocomplete().then(items => {
        const map = new Map();
        items.forEach(item => {
          map.set(item.name.toLowerCase(), item);
        });
        setItemsMap(map);
      });
    }
  }, [isOpen, itemsMap]);

  const handleUpdateUnlockLevels = async () => {
    if (!selectedMonsters || selectedMonsters.length === 0) {
      toast.error('No monsters selected');
      return;
    }

    if (!itemsMap) {
      toast.error('Items data not loaded yet. Please try again.');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedMonsters.length, currentFile: '' });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedMonsters.length; i++) {
        const monster = selectedMonsters[i];
        const fileName = monster.fileName || 'unknown';

        console.log(`[Update Unlock Levels] Processing ${i + 1}/${selectedMonsters.length}: ${fileName}`);
        setProgress({ current: i + 1, total: selectedMonsters.length, currentFile: fileName });

        try {
          // Check if monster has loot items
          if (!monster.loot || monster.loot.length === 0) {
            console.warn(`[Update Unlock Levels] Monster ${monster.monsterName} (${fileName}) has no loot items to update`);
            continue;
          }

          console.log(`[Update Unlock Levels] Calculating unlock levels for ${fileName}, loot items count: ${monster.loot.length}`);

          // Calculate unlock levels for all loot items using data from the list
          const lootWithUnlockLevels = calculateMonsterUnlockLevels(monster, itemsMap);

          console.log(`[Update Unlock Levels] Calculated ${lootWithUnlockLevels.length} unlock levels for ${fileName}`);

          if (!fileName || fileName === 'unknown') {
            throw new Error(`Filename not found for monster: ${monster.monsterName}`);
          }

          console.log(`[Update Unlock Levels] Sending API request for ${fileName}`);

          const response = await fetch('/api/monsters/update-unlock-levels', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName,
              lootItems: lootWithUnlockLevels.map(item => ({
                name: item.name,
                unlockLevel: item.unlockLevel
              }))
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update ${monster.monsterName}: ${errorText}`);
          }

          console.log(`[Update Unlock Levels] SUCCESS: ${fileName}`);
          successCount++;
        } catch (error) {
          console.error(`[Update Unlock Levels] ERROR processing monster ${monster.monsterName} (${fileName}):`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} monster(s) successfully`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to update ${errorCount} monster(s)`);
      }

      onClose();
    } catch (error) {
      console.error('[Update Unlock Levels] Error in bulk update:', error);
      toast.error(`Failed to update monsters: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0, currentFile: '' });
    }
  };

  const handleSetRecommendedGold = async () => {
    if (!selectedMonsters || selectedMonsters.length === 0) {
      toast.error('No monsters selected');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedMonsters.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedMonsters.length; i++) {
        const monster = selectedMonsters[i];
        setProgress({ current: i + 1, total: selectedMonsters.length });

        try {
          // Skip monsters with noLoot
          if (monster.noLoot === true || monster.noLoot === 1) {
            console.warn(`Monster ${monster.monsterName} has noLoot=1, skipping`);
            continue;
          }

          // Skip monsters without loot tag (goldCoinsPerKillPerLvl is undefined if no loot tag exists)
          if (monster.goldCoinsPerKillPerLvl === undefined) {
            console.warn(`Monster ${monster.monsterName} has no <loot> tag, skipping`);
            continue;
          }

          // Skip if monster has noLoot enabled
          if (monster.noLoot) {
            console.warn(`Monster ${monster.monsterName} has noLoot enabled, skipping`);
            continue;
          }

          // Calculate recommended gold coins per kill
          const power = monster.power || 0;
          const resourceBalance = monster.resourceBalance || '';

          let lootBalance = 0;
          if (resourceBalance.includes('Loot')) {
            lootBalance = parseInt(resourceBalance.replace('Loot', '')) || 0;
          }

          const budgetPerLevel = getGoldPerLevelByPower(power);
          const balanceMultiplier = getBalanceMultiplier(lootBalance);
          const budgetPerKillPerLevel = budgetPerLevel * balanceMultiplier;
          const recommendedGold = getRecommendedGoldCoinsPerKill(budgetPerKillPerLevel, power);
          const recommendedBaseGold = getRecommendedBaseGoldCoinsPerKill(power);

          // Use the fileName from the monster object (already includes .xml extension)
          const fileName = monster.fileName;

          if (!fileName) {
            throw new Error(`Filename not found for monster: ${monster.monsterName}`);
          }

          const response = await fetch('/api/monsters/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName,
              monsterData: {
                goldCoinsPerKillPerLvl: recommendedGold,
                baseGoldCoinsPerKill: recommendedBaseGold
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to update ${monster.monsterName}`);
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing monster ${monster.monsterName}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} monster(s) with recommended gold values`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to update ${errorCount} monster(s)`);
      }

      onClose();
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast.error('Failed to update monsters');
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleUpdateBaseAttributes = async () => {
    if (!selectedMonsters || selectedMonsters.length === 0) {
      toast.error('No monsters selected');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedMonsters.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedMonsters.length; i++) {
        const monster = selectedMonsters[i];
        setProgress({ current: i + 1, total: selectedMonsters.length });

        try {
          // Get base attributes using calculator
          const power = monster.power || 0;
          const speedType = monster.speedType || 'None';

          const baseAttributes = getAllBaseAttributes(power, speedType);

          // Use the fileName from the monster object (already includes .xml extension)
          const fileName = monster.fileName;

          if (!fileName) {
            throw new Error(`Filename not found for monster: ${monster.monsterName}`);
          }

          // Map field names to match API expectations
          const monsterData = {
            baseHealth: baseAttributes.health,
            baseSpeed: baseAttributes.speed,
            baseAtk: baseAttributes.atk,
            baseAtks: baseAttributes.atks,
            baseMagicPen: baseAttributes.magicPen,
            basePhysicalPen: baseAttributes.physicalPen,
            baseArmor: baseAttributes.armor,
            baseMagicResist: baseAttributes.magicResist,
          };

          const response = await fetch('/api/monsters/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName,
              monsterData
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to save monster: ${monster.monsterName}`);
          }

          successCount++;
        } catch (error) {
          console.error(`Error updating base attributes for ${monster.monsterName}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Updated base attributes for ${successCount} monster(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to update ${errorCount} monster(s)`);
      }

      // Refresh the page to show updated values
      if (successCount > 0) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error in bulk update base attributes:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Bulk Actions</DialogTitle>
          <DialogDescription className="text-gray-400">
            Perform actions on {selectedMonsters?.length || 0} selected monster(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Update Unlock Levels Action */}
          <Card className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                onClick={!isProcessing ? handleUpdateUnlockLevels : undefined}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-600/20">
                  <RefreshCcw className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-100 mb-1">
                    Update Unlock Levels
                  </h4>
                  <p className="text-xs text-gray-400">
                    Recalculate and update unlock_level for all loot items in selected monsters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Set Recommended Gold Action */}
          <Card className="bg-gray-800 border-gray-700 hover:border-yellow-500 transition-colors cursor-pointer"
                onClick={!isProcessing ? handleSetRecommendedGold : undefined}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-600/20">
                  <DollarSign className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-100 mb-1">
                    Set Recommended Gold
                  </h4>
                  <p className="text-xs text-gray-400">
                    Set goldCoinsPerKillPerLvl to recommended value (20% of Budget/Kill/Lvl) for all selected monsters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Base Attributes Action */}
          <Card className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors cursor-pointer"
                onClick={!isProcessing ? handleUpdateBaseAttributes : undefined}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-600/20">
                  <Gauge className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-100 mb-1">
                    Update Base Attributes
                  </h4>
                  <p className="text-xs text-gray-400">
                    Update attributesBase: speed from speedType, other attributes from defaults
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress indicator */}
          {isProcessing && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">
                      Processing {progress.current} of {progress.total}...
                    </p>
                    {progress.currentFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {progress.currentFile}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
