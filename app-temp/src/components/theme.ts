import type { ElementCategory } from '../data/elements';

export const categoryColors: Record<ElementCategory, string> = {
  'alkali-metal': '#00b4ff',
  'alkaline-earth': '#00ff88',
  'transition-metal': '#00e5ff',
  'post-transition': '#ffd600',
  metalloid: '#ff9800',
  nonmetal: '#76ff03',
  halogen: '#ff4081',
  'noble-gas': '#e040fb',
  lanthanide: '#ff6e40',
  actinide: '#ff1744',
  unknown: '#8ea3b9',
};

export const categoryLabels: Record<ElementCategory, string> = {
  'alkali-metal': 'Alcalinos',
  'alkaline-earth': 'Alcalinotérreos',
  'transition-metal': 'Transición',
  'post-transition': 'Post-transición',
  metalloid: 'Metaloides',
  nonmetal: 'No metales',
  halogen: 'Halógenos',
  'noble-gas': 'Gases nobles',
  lanthanide: 'Lantánidos',
  actinide: 'Actínidos',
  unknown: 'Desconocido',
};
