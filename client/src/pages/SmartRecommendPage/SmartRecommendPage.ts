/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { logger } from '@client/src/utils/logger';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Minus,
  Check,
  ArrowLeft,
  ShoppingCart,
} from 'lucide-vue-next';
import type { Dish } from '@shared/api.interface';
import { CATEGORIES } from '@/utils/constants';
import { getDishes, addToCart } from '@/api/dishes';
import DishCard from '@/components/DishCard';

interface CategoryConfig {
  id: string;
  name: string;
  color: string;
  checked: boolean;
  count: number;
}

export default defineComponent({
  name: 'SmartRecommendPage',
  setup() {
    const router = useRouter();
    const dishes = ref<Dish[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const recommending = ref(false);
    const addingToCart = ref(false);
    const recommendedDishes = ref<Dish[]>([]);
    const showResult = ref(false);
    const addSuccessToast = ref(false);

    const categories = ref<CategoryConfig[]>(
      CATEGORIES.map((cat) => ({
        ...cat,
        checked: false,
        count: 1,
      })),
    );

    const dishesByCategory = computed(() => {
      const map: Record<string, Dish[]> = {};
      for (const dish of dishes.value) {
        if (!map[dish.category]) map[dish.category] = [];
        map[dish.category].push(dish);
      }
      return map;
    });

    const selectedCategories = computed(() =>
      categories.value.filter((c) => c.checked),
    );

    const canRecommend = computed(() => selectedCategories.value.length > 0);

    function shuffleArray<T>(arr: T[]): T[] {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    function handleToggleCategory(catId: string): void {
      const cat = categories.value.find((c) => c.id === catId);
      if (cat) {
        cat.checked = !cat.checked;
        if (cat.checked && cat.count === 0) cat.count = 1;
      }
    }

    function handleCountChange(catId: string, delta: number): void {
      const cat = categories.value.find((c) => c.id === catId);
      if (cat) {
        const next = Math.min(5, Math.max(1, cat.count + delta));
        cat.count = next;
      }
    }

    function handleRecommend(): void {
      if (!canRecommend.value) return;
      recommending.value = true;
      showResult.value = false;

      setTimeout(() => {
        const result: Dish[] = [];
        for (const cat of selectedCategories.value) {
          const catDishes = dishesByCategory.value[cat.id] || [];
          const shuffled = shuffleArray(catDishes);
          const pick = shuffled.slice(0, Math.min(cat.count, shuffled.length));
          result.push(...pick);
        }
        recommendedDishes.value = result;
        showResult.value = true;
        recommending.value = false;
      }, 400);
    }

    function handleRefresh(): void {
      handleRecommend();
    }

    async function handleAddAllToCart(): Promise<void> {
      if (recommendedDishes.value.length === 0) return;
      if (addingToCart.value) return;

      addingToCart.value = true;
      try {
        await Promise.all(
          recommendedDishes.value.map((d) => addToCart(d.dishId)),
        );
        addSuccessToast.value = true;
        setTimeout(() => {
          addSuccessToast.value = false;
        }, 2000);
      } catch (err) {
        logger.error('全部加入菜单失败', err);
      } finally {
        addingToCart.value = false;
      }
    }

    function handleDishClick(dish: Dish): void {
      router.push(`/dish/${dish.dishId}`);
    }

    function handleBack(): void {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    }

    async function fetchDishes(): Promise<void> {
      try {
        loading.value = true;
        error.value = null;
        dishes.value = await getDishes();
      } catch (err) {
        logger.error('智能推荐页加载菜品失败', err);
        error.value = '加载失败，请稍后重试';
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      fetchDishes();
    });

    return () => {
      const header = h('div', {
        class:
          'sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-4 pt-6 pb-3 backdrop-blur-sm',
      }, [
        h(
          'button',
          {
            type: 'button',
            onClick: handleBack,
            class:
              'flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm transition-all active:scale-95',
          },
          [h(ArrowLeft, { size: 18, class: 'text-foreground' })],
        ),
        h('div', { class: 'flex-1' }, [
          h('h1', { class: 'font-handwriting text-2xl text-foreground' }, [
            h(Sparkles, {
              size: 20,
              class: 'mr-1 inline -mt-1 text-primary',
            }),
            '智能配餐',
          ]),
          h(
            'p',
            { class: 'mt-0.5 text-sm text-muted-foreground' },
            '选好分类，AI 为你搭配专属菜单',
          ),
        ]),
      ]);

      let content;
      if (loading.value) {
        content = h(
          'div',
          { class: 'flex items-center justify-center py-20' },
          '加载中...',
        );
      } else if (error.value) {
        content = h(
          'div',
          { class: 'py-20 text-center text-muted-foreground' },
          error.value,
        );
      } else {
        const categoryCards = h('div', { class: 'space-y-3' },
          categories.value.map((cat: CategoryConfig) =>
            h('div', {
              key: cat.id,
              class: [
                'flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm transition-all',
                cat.checked ? 'ring-2 ring-primary/30' : '',
              ],
            }, [
              h('button', {
                type: 'button',
                onClick: () => handleToggleCategory(cat.id),
                class: [
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all',
                  cat.checked
                    ? 'border-primary bg-primary'
                    : 'border-border bg-background',
                ],
              }, [
                cat.checked
                  ? h(Check, { size: 14, class: 'text-white' })
                  : null,
              ]),
              h('div', {
                class: 'h-3 w-3 flex-shrink-0 rounded-full',
                style: { backgroundColor: cat.color },
              }),
              h('span', { class: 'font-handwriting text-lg text-foreground' },
                cat.name),
              h('span', { class: 'text-xs text-muted-foreground' },
                `（${(dishesByCategory.value[cat.id] || []).length}道）`),
              cat.checked
                ? h('div', { class: 'ml-auto flex items-center gap-2' }, [
                    h('button', {
                      type: 'button',
                      onClick: () => handleCountChange(cat.id, -1),
                      disabled: cat.count <= 1,
                      class: [
                        'flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-all active:scale-95',
                        cat.count <= 1 ? 'opacity-40' : '',
                      ],
                    }, [h(Minus, { size: 16, class: 'text-foreground' })]),
                    h(
                      'span',
                      { class: 'w-6 text-center font-bold text-foreground' },
                      String(cat.count),
                    ),
                    h('button', {
                      type: 'button',
                      onClick: () => handleCountChange(cat.id, 1),
                      disabled: cat.count >= 5,
                      class: [
                        'flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition-all active:scale-95',
                        cat.count >= 5 ? 'opacity-50' : '',
                      ],
                    }, [h(Plus, { size: 16 })]),
                  ])
                : null,
            ]),
          ),
        );

        const recommendBtn = h('button', {
          type: 'button',
          onClick: handleRecommend,
          disabled: !canRecommend.value || recommending.value,
          class: [
            'flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-handwriting text-lg shadow-md transition-all',
            canRecommend.value && !recommending.value
              ? 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          ],
        }, [
          recommending.value
            ? h(RefreshCw, { size: 18, class: 'animate-spin' })
            : h(Sparkles, { size: 18 }),
          recommending.value ? '正在搭配...' : '开始推荐',
        ]);

        const resultSection = showResult.value
          ? h('div', { class: 'mt-6' }, [
              h('div', { class: 'mb-3 flex items-center justify-between' }, [
                h('h2', { class: 'font-handwriting text-xl text-foreground' }, [
                  '推荐菜单',
                  h(
                    'span',
                    { class: 'ml-2 text-sm text-muted-foreground' },
                    `共 ${recommendedDishes.value.length} 道`,
                  ),
                ]),
                h('button', {
                  type: 'button',
                  onClick: handleRefresh,
                  class:
                    'flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80',
                }, [
                  h(RefreshCw, { size: 14 }),
                  '换一批',
                ]),
              ]),
              h('div', { class: 'grid grid-cols-2 gap-3' },
                recommendedDishes.value.map((dish: Dish) =>
                  h('div', { key: dish.id, class: 'transition-all' }, [
                    h(DishCard, {
                      dish,
                      variant: 'grid',
                      onClick: () => handleDishClick(dish),
                    }),
                  ]),
                ),
              ),
              h('div', { class: 'mt-5 flex gap-3' }, [
                h('button', {
                  type: 'button',
                  onClick: handleRefresh,
                  class:
                    'flex-1 rounded-full py-3 font-handwriting text-base bg-card border border-border text-foreground shadow-sm transition-all active:scale-[0.98]',
                }, '换一批'),
                h('button', {
                  type: 'button',
                  onClick: handleAddAllToCart,
                  disabled: addingToCart.value,
                  class: [
                    'flex-1 flex items-center justify-center gap-1.5 rounded-full py-3 font-handwriting text-base shadow-md transition-all',
                    addingToCart.value
                      ? 'bg-primary/70 text-white cursor-wait'
                      : 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]',
                  ],
                }, [
                  h(ShoppingCart, { size: 16 }),
                  addingToCart.value ? '加入中...' : '全部加入菜单',
                ]),
              ]),
            ])
          : null;

        const tipText = !canRecommend.value
          ? h('p', { class: 'mb-3 text-center text-xs text-muted-foreground' },
              '请至少勾选 1 个分类后开始推荐')
          : null;

        content = h('div', { class: 'px-4 pb-40' }, [
          categoryCards,
          h('div', { class: 'mt-6' }, [tipText, recommendBtn]),
          resultSection,
        ]);
      }

      const successToast = addSuccessToast.value
        ? h('div', {
            class:
              'fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-secondary px-5 py-3 text-white shadow-lg flex items-center gap-2',
          }, [
            h(Check, { size: 18 }),
            '已加入菜单',
            h(
              'button',
              {
                type: 'button',
                onClick: () => router.push('/cart'),
                class: 'ml-2 underline underline-offset-2',
              },
              '查看菜单',
            ),
          ])
        : null;

      return h('div', { class: 'min-h-screen bg-background' }, [
        header,
        content,
        successToast,
      ]);
    };
  },
});
