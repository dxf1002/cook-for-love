export const CATEGORIES = [
  { id: 'meat', name: '热菜·荤', color: '#FF8A7A' },
  { id: 'veg', name: '热菜·素', color: '#8BA888' },
  { id: 'cold', name: '凉菜', color: '#74C0FC' },
  { id: 'soup', name: '汤羹', color: '#FFA94D' },
  { id: 'staple', name: '主食', color: '#F0C040' },
  { id: 'dessert', name: '甜品', color: '#D485E8' },
  { id: 'fatLoss', name: '减脂餐', color: '#D485E8' },
];

export const COMBOS = [
  {
    id: 'simple',
    name: '简单吃',
    desc: '1荤1素',
    rules: { meat: 1, veg: 1 },
  },
  {
    id: 'normal',
    name: '两人食',
    desc: '2荤1素1汤',
    rules: { meat: 2, veg: 1, soup: 1 },
  },
  {
    id: 'rich',
    name: '丰盛点',
    desc: '3荤2素1汤1甜品',
    rules: { meat: 3, veg: 2, soup: 1, dessert: 1 },
  },
  { id: 'free', name: '自由选', desc: '想吃啥选啥', rules: null },
];

export const HERO_IMAGE = '/static/background.png';

export const CATEGORY_MAP: Record<string, { name: string; color: string }> =
  CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.id] = { name: cat.name, color: cat.color };
      return acc;
    },
    {} as Record<string, { name: string; color: string }>,
  );
