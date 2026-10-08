/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { logger } from '@client/src/utils/logger';
import { Check, ChefHat, Sparkles } from 'lucide-vue-next';
import type { Dish, Combo } from '@shared/api.interface';
import { CATEGORIES, COMBOS } from '@/utils/constants';
import { getDishes, getCart, addToCart, removeFromCart } from '@/api/dishes';
import DishCard from '@/components/DishCard';

interface ProgressItem {
  id: string;
  name: string;
  color: string;
  selected: number;
  total: number;
  done: boolean;
}

export default defineComponent({
  name: 'OrderPage',
  setup() {
    const router = useRouter();
    const dishes = ref<Dish[]>([]);
    const selectedIds = ref<Set<number>>(new Set());
    const combo = ref<Combo>(COMBOS[0]);
    const loading = ref(true);
    const syncing = ref(false);

    const dishesByCategory = computed(() => {
      const map: Record<string, Dish[]> = {};
      for (const dish of dishes.value) {
        if (!map[dish.category]) map[dish.category] = [];
        map[dish.category].push(dish);
      }
      return map;
    });

    function getSelectedCount(categoryId: string): number {
      const list = dishesByCategory.value[categoryId] ?? [];
      return list.filter((d) => selectedIds.value.has(d.dishId)).length;
    }

    function isCategoryFull(categoryId: string): boolean {
      if (!combo.value.rules) return false;
      const limit = combo.value.rules[categoryId];
      if (!limit) return true;
      return getSelectedCount(categoryId) >= limit;
    }

    function isCategoryInCombo(categoryId: string): boolean {
      if (!combo.value.rules) return true;
      return categoryId in combo.value.rules;
    }

    function getLimit(categoryId: string): number | undefined {
      if (!combo.value.rules) return undefined;
      return combo.value.rules[categoryId];
    }

    function showCategory(categoryId: string): boolean {
      const list = dishesByCategory.value[categoryId] ?? [];
      if (list.length === 0) return false;
      if (combo.value.rules && !isCategoryInCombo(categoryId)) return false;
      return true;
    }

    function disabledDish(dish: Dish): boolean {
      const selected = selectedIds.value.has(dish.dishId);
      return !selected && isCategoryFull(dish.category) && combo.value.rules !== null;
    }

    async function handleComboChange(newCombo: Combo): Promise<void> {
      if (newCombo.id === combo.value.id) return;
      combo.value = newCombo;
      const prev = Array.from(selectedIds.value);
      selectedIds.value = new Set();
      try {
        syncing.value = true;
        await Promise.all(prev.map((id) => removeFromCart(id)));
      } catch (err) {
        logger.error('切换套餐清空购物车失败', err);
        selectedIds.value = new Set(prev);
      } finally {
        syncing.value = false;
      }
    }

    async function handleToggle(dish: Dish): Promise<void> {
      if (syncing.value) return;
      const isSelected = selectedIds.value.has(dish.dishId);

      if (!isSelected && combo.value.rules) {
        const limit = combo.value.rules[dish.category];
        if (!limit) return;
        const current = getSelectedCount(dish.category);
        if (current >= limit) return;
      }

      const next = new Set(selectedIds.value);
      if (isSelected) {
        next.delete(dish.dishId);
      } else {
        next.add(dish.dishId);
      }
      const prev = selectedIds.value;
      selectedIds.value = next;

      try {
        syncing.value = true;
        if (isSelected) {
          await removeFromCart(dish.dishId);
        } else {
          await addToCart(dish.dishId);
        }
      } catch (err) {
        logger.error(`${isSelected ? '移除' : '添加'}购物车失败 dishId=${dish.dishId}`, err);
        selectedIds.value = prev;
      } finally {
        syncing.value = false;
      }
    }

    const totalSelected = computed(() => selectedIds.value.size);

    const progressList = computed<ProgressItem[]>(() => {
      if (!combo.value.rules) return [];
      return CATEGORIES.filter((cat) => cat.id in (combo.value.rules as Record<string, number>)).map(
        (cat) => {
          const selected = getSelectedCount(cat.id);
          const total = combo.value.rules![cat.id];
          return {
            ...cat,
            selected,
            total,
            done: selected >= total,
          };
        },
      );
    });

    onMounted(async () => {
      try {
        loading.value = true;
        const [dishList, cart] = await Promise.all([getDishes(), getCart()]);
        dishes.value = dishList;
        const ids = new Set<number>(cart.dishes.map((d) => d.dishId));
        selectedIds.value = ids;
      } catch (err) {
        logger.error('初始化点菜页失败', err);
      } finally {
        loading.value = false;
      }
    });

    return () => {
      // Header
      const header = h('div', {
        class: 'sticky top-0 z-30 bg-background/95 px-4 pt-6 pb-3 backdrop-blur-sm',
      }, [
        h('h1', { class: 'font-handwriting text-3xl text-foreground' }, '为爱下厨'),
        h('p', { class: 'mt-1 text-sm text-muted-foreground' }, '选好菜品，我们一起做饭～'),
      ]);

      // Combo selector
      const comboSelector = h('div', { class: 'px-4' }, [
        h('div', { class: 'flex gap-2 overflow-x-auto pb-2 scrollbar-hide' }, [
          ...COMBOS.map((c: Combo) =>
            h('button', {
              key: c.id,
              type: 'button',
              onClick: () => handleComboChange(c),
              class: [
                'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
                c.id === combo.value.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-card text-foreground border border-border hover:border-primary/40',
              ],
            }, [
              h('span', { class: 'block text-base font-handwriting' }, c.name),
              h('span', {
                class: [
                  'block text-[11px]',
                  c.id === combo.value.id ? 'text-white/90' : 'text-muted-foreground',
                ],
              }, c.desc),
            ]),
          ),
          h('button', {
            key: 'smart',
            type: 'button',
            onClick: () => router.push('/recommend'),
            class: [
              'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
              'bg-accent text-foreground border border-primary/30 hover:border-primary',
            ],
          }, [
            h('span', { class: 'flex items-center gap-1 text-base font-handwriting' }, [
              h(Sparkles, { size: 14, class: 'text-primary' }),
              '智能推荐',
            ]),
            h('span', { class: 'block text-[11px] text-muted-foreground' }, 'AI 搭菜单'),
          ]),
        ]),
      ]);

      // Progress bar
      let progressSection = null;
      if (combo.value.rules && progressList.value.length > 0) {
        progressSection = h('div', { class: 'mt-2 px-4' }, [
          h('div', { class: 'rounded-2xl bg-card p-4 shadow-sm' }, [
            h('div', { class: 'grid grid-cols-2 gap-3' },
              progressList.value.map((cat: ProgressItem) =>
                h('div', { key: cat.id, class: 'flex items-center gap-2' }, [
                  h('div', {
                    class: [
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white',
                      cat.done ? 'bg-secondary' : '',
                    ],
                    style: cat.done ? undefined : { backgroundColor: cat.color },
                  }, [
                    cat.done ? h(Check, { size: 14 }) : String(cat.total),
                  ]),
                  h('div', { class: 'flex-1 min-w-0' }, [
                    h('div', { class: 'flex items-baseline justify-between' }, [
                      h('span', {
                        class: [
                          'text-sm',
                          cat.done ? 'text-secondary font-medium' : 'text-foreground',
                        ],
                      }, cat.name),
                      h('span', {
                        class: [
                          'text-xs font-medium',
                          cat.done ? 'text-secondary' : 'text-muted-foreground',
                        ],
                      }, `${cat.selected}/${cat.total}`),
                    ]),
                    h('div', { class: 'mt-1 h-1 overflow-hidden rounded-full bg-muted' }, [
                      h('div', {
                        class: 'h-full rounded-full transition-all',
                        style: {
                          width: `${Math.min((cat.selected / cat.total) * 100, 100)}%`,
                          backgroundColor: cat.done ? '#8BA888' : cat.color,
                        },
                      }),
                    ]),
                  ]),
                ]),
              ),
            ),
          ]),
        ]);
      }

      // Category sections
      const categorySections = h('div', { class: 'mt-4 px-4 space-y-6' },
        CATEGORIES
          .filter((cat) => showCategory(cat.id))
          .map((cat) => {
            const catDishes = dishesByCategory.value[cat.id] || [];
            const limit = getLimit(cat.id);
            const full = isCategoryFull(cat.id);
            const remaining = limit !== undefined ? limit - getSelectedCount(cat.id) : 0;

            return h('section', { key: cat.id }, [
              h('div', { class: 'mb-3 flex items-center justify-between' }, [
                h('div', { class: 'flex items-center gap-2' }, [
                  h('div', {
                    class: 'h-3 w-3 rounded-full',
                    style: { backgroundColor: cat.color },
                  }),
                  h('h2', { class: 'font-handwriting text-xl text-foreground' }, cat.name),
                ]),
                combo.value.rules && limit !== undefined
                  ? h('span', {
                      class: [
                        'text-sm font-medium',
                        full ? 'text-secondary' : 'text-muted-foreground',
                      ],
                    }, full ? '✓ 已选齐' : `还差 ${remaining} 道`)
                  : null,
              ]),
              h('div', { class: 'grid grid-cols-2 gap-3' },
                catDishes.map((dish: Dish) =>
                  h('div', {
                    key: dish.dishId,
                    class: disabledDish(dish) ? 'opacity-50 pointer-events-none' : '',
                  }, [
                    h(DishCard, {
                      dish,
                      variant: 'grid',
                      isSelected: selectedIds.value.has(dish.dishId),
                      selectable: true,
                      onToggleSelect: () => handleToggle(dish),
                    }),
                  ]),
                ),
              ),
            ]);
          }),
      );

      // Bottom bar
      const bottomBar = h('div', {
        class:
          'fixed bottom-16 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm',
      }, [
        h('div', { class: 'flex items-center justify-between gap-4' }, [
          h('div', { class: 'flex items-center gap-2' }, [
            h(ChefHat, { class: 'text-primary', size: 22 }),
            h('div', [
              h('p', { class: 'text-sm text-foreground' }, [
                '已选 ',
                h('span', { class: 'font-bold text-primary' }, String(totalSelected.value)),
                ' 道菜',
              ]),
              combo.value.rules
                ? h('p', { class: 'text-xs text-muted-foreground' },
                  `${combo.value.name} · ${combo.value.desc}`)
                : null,
            ]),
          ]),
          h('button', {
            type: 'button',
            onClick: () => router.push('/cart'),
            disabled: totalSelected.value === 0,
            class: [
              'rounded-full px-6 py-2.5 font-handwriting text-lg transition-all',
              totalSelected.value > 0
                ? 'bg-primary text-white shadow-md hover:bg-primary/90 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            ],
          }, '确认菜单'),
        ]),
      ]);

      return h('div', { class: 'flex min-h-screen flex-col bg-background pb-40' }, [
        header,
        comboSelector,
        progressSection,
        categorySections,
        bottomBar,
      ]);
    };
  },
});
