import {
  TrendingUp,
  Zap,
  Ghost,
  UserCheck,
  List,
  BarChart3,
  Package,
  Sword,
  Coins,
  Droplet,
  Map, Crown, Shovel,
  CheckCircle,
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
      {
        title: 'Gathering Items',
        path: '/items/map-items',
      },
      {
        title: 'Validator',
        path: '/items/validator',
        icon: CheckCircle,
      },
    ],
  },
  {
    title: 'Monstros',
    icon: Ghost,
    children: [
      {
        title: 'Listar',
        path: '/monsters',
        icon: List,
      },
      {
        title: 'Métricas',
        path: '/monsters/metrics',
        icon: BarChart3,
      },
      {
        title: 'Validator',
        path: '/monsters/validator',
        icon: CheckCircle,
      },
    ],
  },
  {
    title: 'Loot',
    icon: Crown,
    children: [
      {
        title: 'Equip Build Primary',
        path: '/drop/equip-build-primary',
        icon: Sword,
      },
      {
        title: 'Setup Drop by Races',
        path: '/drop/monster-races',
        icon: List,
      },
      {
        title: 'Setup Drop by Base Stats Role',
        path: '/drop/base-stats-role',
        icon: List,
      },
      {
        title: 'Setup General',
        path: '/drop/setup-general',
        icon: List,
      },
      {
        title: 'Categories & Priorities',
        path: '/drop/categories',
        icon: Package,
      },
    ],
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