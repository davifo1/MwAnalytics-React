import { Demo6Layout } from '@/layouts/demo6/layout';
import { ItemsPage } from '@/modules/items/ItemsPage';
import { MonsterLootItemsPage } from '@/modules/items/MonsterLootItemsPage';
import { MapItemsPage } from '@/modules/items/MapItemsPage';
import { ItemValidatorPage } from '@/modules/items/ItemValidatorPage';
import { MonstersPage } from '@/modules/monsters/MonstersPage';
import MonstersMetricsPage from '@/modules/monsters/MonstersMetricsPage';
import { MonsterValidatorPage } from '@/modules/monsters/MonsterValidatorPage';
import { ClassesPage } from '@/modules/classes/ClassesPage';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { HealthCheckPage } from '@/modules/utils/HealthCheckPage';
import { RegionsPage } from '@/modules/map/RegionsPage';
import { MonstersByRegionsPage } from '@/modules/map/MonstersByRegionsPage';
import { CoreCurvesPage } from '@/modules/game-design/CoreCurvesPage';
import { Navigate, Route, Routes } from 'react-router';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<Demo6Layout />}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/items" element={<ItemsPage viewType="all" />} />
        <Route path="/items/equipment" element={<ItemsPage viewType="equipment" />} />
        <Route path="/items/monster-loot" element={<MonsterLootItemsPage />} />
        <Route path="/items/map-items" element={<MapItemsPage />} />
        <Route path="/items/validator" element={<ItemValidatorPage />} />
        <Route path="/monsters" element={<MonstersPage />} />
        <Route path="/monsters/metrics" element={<MonstersMetricsPage />} />
        <Route path="/monsters/validator" element={<MonsterValidatorPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/utils/health-check" element={<HealthCheckPage />} />
        <Route path="/map/gathering-by-regions" element={<RegionsPage />} />
        <Route path="/map/monsters-by-regions" element={<MonstersByRegionsPage />} />
        <Route path="/game-design/core-curves" element={<CoreCurvesPage />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Route>
    </Routes>
  );
}