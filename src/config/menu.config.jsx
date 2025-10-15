import {
  TrendingUp,
  Ghost,
  UserCheck,
  Sword,
  Map,
  LineChart,
} from 'lucide-react';

// Menu principal do sistema Magic Wings Backoffice
export const MENU_SIDEBAR_COMPACT = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: TrendingUp,
  },
  {
    title: 'Items',
    icon: Sword,
    children: [
      {
        title: 'Todos Items',
        path: '/items',
      },
      {
        title: 'Equipamentos',
        path: '/items/equipment',
      },
      {
        title: 'Monster Loot',
        path: '/items/monster-loot',
      },
    ],
  },
  {
    title: 'Monstros',
    path: '/monsters',
    icon: Ghost,
  },
  {
    title: 'Classes',
    path: '/classes',
    icon: UserCheck,
  },
  {
    title: 'Mapa',
    icon: Map,
    children: [
      {
        title: 'Gathering by Regions',
        path: '/map/gathering-by-regions',
      },
      {
        title: 'Monsters by Regions',
        path: '/map/monsters-by-regions',
      },
    ],
  },
  {
    title: 'Game Design',
    icon: LineChart,
    children: [
      {
        title: 'Core Curves',
        path: '/game-design/core-curves',
      },
    ],
  },
];

// Mantendo estrutura original vazia para compatibilidadeo
export const MENU_SIDEBAR = [];