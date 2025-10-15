import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTierColor } from '@/utils/tierUtils';

const LootCategoryItemsCloud = ({
  lootCategory,
  allMonsters = [],
  raceDrops = {},
  availableItems = [],
  lootCategoryTiers = {},
  powerRange = [2, 15],
  ignoreCustomMapRole = true,
  loading = false,
  groupBy = 'race' // 'race' or 'baseStatsRole'
}) => {
  // Calculate items cloud (item -> monster count) grouped by tier
  const itemsCloud = useMemo(() => {
    if (allMonsters.length === 0 || Object.keys(raceDrops).length === 0 || availableItems.length === 0 || Object.keys(lootCategoryTiers).length === 0) {
      return {};
    }

    // Filter monsters based on current filters
    const filteredMonsters = allMonsters.filter(monster => {
      const power = monster.power || 0;
      const powerInRange = power >= powerRange[0] && power <= powerRange[1];
      const notCustom = ignoreCustomMapRole ? (monster.mapRole !== 'Custom') : true;
      return powerInRange && notCustom;
    });

    // Get ALL items for this lootCategory
    const categoryItems = availableItems.filter(item => item.lootCategory === lootCategory);

    // Count how many monsters would receive each item
    const itemCounts = {};

    categoryItems.forEach(item => {
      itemCounts[item.name] = {
        name: item.name,
        tier: item.tier || 'common',
        count: 0
      };
    });

    // For each filtered monster, count which items it would receive
    filteredMonsters.forEach(monster => {
      const monsterPower = monster.power || 0;

      // Get groups based on groupBy parameter
      let groups = [];
      if (groupBy === 'baseStatsRole') {
        // For baseStatsRole, it's a single value (not semicolon-separated)
        groups = [monster.baseStatsRole || 'None'];
      } else {
        // For race, it's semicolon-separated
        groups = (monster.race || 'None').split(';').map(r => r.trim()).filter(r => r);
      }

      groups.forEach(group => {
        const itemsForGroup = raceDrops[group]?.[lootCategory] || [];

        itemsForGroup.forEach(itemName => {
          if (!itemCounts[itemName]) return;

          const itemTier = itemCounts[itemName].tier;
          const tierConfig = lootCategoryTiers[lootCategory]?.[itemTier];

          if (!tierConfig) return;

          const { powerMin, powerMax } = tierConfig;

          // Only count if monster power is in range for this tier
          if (monsterPower >= powerMin && monsterPower <= powerMax) {
            itemCounts[itemName].count++;
          }
        });
      });
    });

    // Group by tier
    const groupedByTier = {
      legendary: [],
      epic: [],
      basic: [],
      common: []
    };

    Object.values(itemCounts).forEach(item => {
      const tier = item.tier || 'common';
      if (groupedByTier[tier]) {
        groupedByTier[tier].push(item);
      }
    });

    // Sort items within each tier by count (desc) then name (asc)
    Object.keys(groupedByTier).forEach(tier => {
      groupedByTier[tier].sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.name.localeCompare(b.name);
      });
    });

    return groupedByTier;
  }, [lootCategory, allMonsters, raceDrops, availableItems, lootCategoryTiers, powerRange, ignoreCustomMapRole, groupBy]);

  if (loading || Object.keys(itemsCloud).length === 0) {
    return null;
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 mb-4">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          {lootCategory.charAt(0).toUpperCase() + lootCategory.slice(1)} Items
        </h3>
        <div className="space-y-3">
          {['legendary', 'epic', 'basic', 'common'].map(tier => {
            const items = itemsCloud[tier] || [];
            if (items.length === 0) return null;

            return (
              <div key={tier}>
                <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase">
                  {tier} ({items.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <Badge
                      key={item.name}
                      className={`${getTierColor(item.tier)} px-3 py-1.5 text-sm font-medium ${item.count === 0 ? 'opacity-50' : ''}`}
                    >
                      {item.name}
                      <span className="ml-2 bg-black/30 px-2 py-0.5 rounded-full text-xs">
                        {item.count}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default LootCategoryItemsCloud;
