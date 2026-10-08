/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { logger } from '@client/src/utils/logger';
import {
  ChefHat,
  Save,
  History,
  Clock,
  ChevronLeft,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-vue-next';
import type {
  Dish,
  SavedMenu,
  SavedMenuDetail,
  SavedMenuItem,
} from '@shared/api.interface';
import { CATEGORIES } from '@/utils/constants';
import {
  getCart,
  removeFromCart,
  clearCart,
  saveMenu,
  listMenus,
  getMenu,
  deleteMenu,
  addToCart,
} from '@/api/dishes';
import DishCard from '@/components/DishCard';

interface CategoryStat {
  id: string;
  name: string;
  color: string;
  count: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

/** 渲染历史菜单里的单个菜品行（快照数据）。 */
function renderHistoryItem(it: SavedMenuItem) {
  return h(
    'div',
    {
      key: it.id,
      class: 'flex items-center gap-3 rounded-xl bg-background/60 p-2',
    },
    [
      it.imageUrl
        ? h('img', {
            src: it.imageUrl,
            alt: it.name,
            class: 'h-10 w-10 flex-shrink-0 rounded-lg object-cover',
          })
        : h(
            'div',
            {
              class:
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg font-handwriting text-lg text-white',
              style: { backgroundColor: it.color },
            },
            it.name.charAt(0),
          ),
      h('span', { class: 'flex-1 text-sm text-foreground' }, it.name),
      h('span', { class: 'text-xs text-muted-foreground' }, `#${it.dishId}`),
    ],
  );
}

export default defineComponent({
  name: 'CartPage',
  setup() {
    const router = useRouter();
    const dishes = ref<Dish[]>([]);
    const loading = ref(true);
    const clearing = ref(false);

    // ── 历史菜单状态 ─────────────────────────────────────
    const showSaveModal = ref(false);
    const saveName = ref('');
    const saving = ref(false);
    const showHistory = ref(false);
    const loadingHistory = ref(false);
    const historyError = ref<string | null>(null);
    const historyMenus = ref<SavedMenu[]>([]);
    const historyDetail = ref<SavedMenuDetail | null>(null);
    const restoring = ref(false);
    const deletingMenu = ref(false);

    const dishesByCategory = computed(() => {
      const map: Record<string, Dish[]> = {};
      for (const dish of dishes.value) {
        if (!map[dish.category]) map[dish.category] = [];
        map[dish.category].push(dish);
      }
      return map;
    });

    const totalCount = computed(() => dishes.value.length);

    const totalCategories = computed(
      () => Object.keys(dishesByCategory.value).length,
    );

    const categoryStats = computed<CategoryStat[]>(() => {
      return CATEGORIES.filter(
        (cat) => (dishesByCategory.value[cat.id]?.length ?? 0) > 0,
      ).map((cat) => ({
        ...cat,
        count: dishesByCategory.value[cat.id]?.length ?? 0,
      }));
    });

    async function fetchCart(): Promise<void> {
      try {
        loading.value = true;
        const cart = await getCart();
        dishes.value = cart.dishes;
      } catch (err) {
        logger.error('加载购物车失败', err);
      } finally {
        loading.value = false;
      }
    }

    async function handleRemove(dish: Dish): Promise<void> {
      try {
        await removeFromCart(dish.dishId);
        dishes.value = dishes.value.filter((d) => d.dishId !== dish.dishId);
      } catch (err) {
        logger.error('移除菜品失败', err);
      }
    }

    async function handleClearAll(): Promise<void> {
      if (clearing.value) return;
      try {
        clearing.value = true;
        await clearCart();
        dishes.value = [];
      } catch (err) {
        logger.error('清空购物车失败', err);
      } finally {
        clearing.value = false;
      }
    }

    // ── 保存 / 历史菜单操作 ───────────────────────────────

    function openSaveModal(): void {
      saveName.value = '';
      showSaveModal.value = true;
    }

    function closeSaveModal(): void {
      if (saving.value) return;
      showSaveModal.value = false;
    }

    async function handleSave(): Promise<void> {
      if (saving.value || totalCount.value === 0) return;
      saving.value = true;
      try {
        await saveMenu(saveName.value.trim() || undefined);
        showSaveModal.value = false;
      } catch (err) {
        logger.error('保存历史菜单失败', err);
        window.alert('保存失败，请重试');
      } finally {
        saving.value = false;
      }
    }

    async function loadHistoryList(): Promise<void> {
      loadingHistory.value = true;
      historyError.value = null;
      try {
        const res = await listMenus();
        historyMenus.value = res.items;
      } catch (err) {
        logger.error('加载历史菜单列表失败', err);
        historyError.value = '加载失败，请稍后重试';
      } finally {
        loadingHistory.value = false;
      }
    }

    function openHistory(): void {
      showHistory.value = true;
      historyDetail.value = null;
      void loadHistoryList();
    }

    function closeHistory(): void {
      if (restoring.value || deletingMenu.value) return;
      showHistory.value = false;
    }

    async function openMenuDetail(menuId: string): Promise<void> {
      loadingHistory.value = true;
      historyError.value = null;
      try {
        historyDetail.value = await getMenu(menuId);
      } catch (err) {
        logger.error(`加载历史菜单详情失败 menuId=${menuId}`, err);
        historyError.value = '加载失败，请稍后重试';
      } finally {
        loadingHistory.value = false;
      }
    }

    function backToList(): void {
      historyDetail.value = null;
    }

    async function handleDeleteMenu(menuId: string): Promise<void> {
      if (deletingMenu.value) return;
      if (!window.confirm('确定删除这份历史菜单吗？')) return;
      deletingMenu.value = true;
      try {
        await deleteMenu(menuId);
        if (historyDetail.value && historyDetail.value.id === menuId) {
          historyDetail.value = null;
        }
        await loadHistoryList();
      } catch (err) {
        logger.error(`删除历史菜单失败 menuId=${menuId}`, err);
        window.alert('删除失败，请重试');
      } finally {
        deletingMenu.value = false;
      }
    }

    async function handleRestore(): Promise<void> {
      if (restoring.value || !historyDetail.value) return;
      restoring.value = true;
      try {
        await clearCart();
        const results = await Promise.allSettled(
          historyDetail.value.items.map((item) => addToCart(item.dishId)),
        );
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        const total = historyDetail.value.items.length;
        await fetchCart();
        showHistory.value = false;
        window.alert(
          `已还原 ${ok} 道菜到当前菜单${
            ok < total ? `（${total - ok} 道菜已删除，无法还原）` : ''
          }`,
        );
      } catch (err) {
        logger.error('还原历史菜单失败', err);
        window.alert('还原失败，请重试');
      } finally {
        restoring.value = false;
      }
    }

    onMounted(() => {
      fetchCart();
    });

    return () => {
      // Header
      const header = h(
        'div',
        {
          class:
            'sticky top-0 z-30 bg-background/95 px-4 pt-6 pb-3 backdrop-blur-sm',
        },
        [
          h(
            'h1',
            { class: 'font-handwriting text-3xl text-foreground' },
            '我的菜单',
          ),
          totalCount.value > 0
            ? h(
                'p',
                { class: 'mt-1 text-sm text-muted-foreground' },
                `已选 ${totalCount.value} 道菜，共 ${totalCategories.value} 个分类`,
              )
            : null,
          h('div', { class: 'mt-3 flex items-center gap-2' }, [
            totalCount.value > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    onClick: openSaveModal,
                    class:
                      'flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-handwriting text-white shadow-sm transition-all active:scale-95',
                  },
                  [h(Save, { size: 14 }), '保存菜单'],
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                onClick: openHistory,
                class:
                  'flex items-center gap-1.5 rounded-full bg-card border border-border px-4 py-2 text-sm font-handwriting text-foreground shadow-sm transition-all active:scale-95',
              },
              [h(History, { size: 14, class: 'text-primary' }), '历史菜单'],
            ),
          ]),
        ],
      );

      // Main content
      let mainContent;
      if (loading.value) {
        mainContent = h(
          'div',
          { class: 'py-12 text-center text-muted-foreground' },
          '加载中...',
        );
      } else if (totalCount.value === 0) {
        // Empty state
        mainContent = h('div', { class: 'py-16 text-center' }, [
          h(
            'div',
            {
              class:
                'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted',
            },
            [h(ChefHat, { class: 'h-10 w-10 text-muted-foreground' })],
          ),
          h(
            'h3',
            { class: 'font-handwriting text-xl text-foreground' },
            '还没有选菜呢',
          ),
          h(
            'p',
            { class: 'mt-2 text-sm text-muted-foreground' },
            '快去挑几道喜欢的菜吧～',
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: () => router.push('/order'),
              class:
                'mt-6 rounded-full bg-primary px-8 py-2.5 font-handwriting text-lg text-white shadow-md active:scale-95 transition-all',
            },
            '去点菜',
          ),
        ]);
      } else {
        // Dish grid by category
        const categorySections = h(
          'div',
          { class: 'space-y-6' },
          CATEGORIES.filter(
            (cat) => (dishesByCategory.value[cat.id]?.length ?? 0) > 0,
          ).map((cat) => {
            const catDishes = dishesByCategory.value[cat.id];
            return h('section', { key: cat.id }, [
              h('div', { class: 'mb-3 flex items-center justify-between' }, [
                h('div', { class: 'flex items-center gap-2' }, [
                  h('div', {
                    class: 'h-3 w-3 rounded-full',
                    style: { backgroundColor: cat.color },
                  }),
                  h(
                    'h2',
                    { class: 'font-handwriting text-xl text-foreground' },
                    cat.name,
                  ),
                  h(
                    'span',
                    { class: 'text-sm text-muted-foreground' },
                    `(${catDishes.length})`,
                  ),
                ]),
              ]),
              h(
                'div',
                { class: 'grid grid-cols-2 gap-3' },
                catDishes.map((dish: Dish) =>
                  h(DishCard, {
                    key: dish.dishId,
                    dish,
                    variant: 'grid',
                    isSelected: true,
                    selectable: true,
                    onToggleSelect: () => handleRemove(dish),
                  }),
                ),
              ),
            ]);
          }),
        );

        // Stats card + clear button
        const statsSection = h('div', { class: 'mt-6 mb-8' }, [
          h('div', { class: 'rounded-2xl bg-card p-5 shadow-sm' }, [
            h(
              'h3',
              { class: 'font-handwriting text-xl text-foreground mb-4' },
              '菜品统计',
            ),
            h(
              'div',
              { class: 'space-y-3' },
              categoryStats.value.map((cat: CategoryStat) =>
                h(
                  'div',
                  {
                    key: cat.id,
                    class: 'flex items-center justify-between text-sm',
                  },
                  [
                    h('div', { class: 'flex items-center gap-2' }, [
                      h('div', {
                        class: 'h-2 w-2 rounded-full',
                        style: { backgroundColor: cat.color },
                      }),
                      h('span', { class: 'text-foreground' }, cat.name),
                    ]),
                    h(
                      'span',
                      { class: 'text-muted-foreground' },
                      `${cat.count} 道`,
                    ),
                  ],
                ),
              ),
            ),
            h(
              'div',
              {
                class:
                  'mt-4 pt-4 border-t border-border flex items-center justify-between',
              },
              [
                h('span', { class: 'text-foreground font-medium' }, '合计'),
                h(
                  'span',
                  { class: 'text-primary font-bold text-lg' },
                  `${totalCount.value} 道菜`,
                ),
              ],
            ),
          ]),
          h(
            'button',
            {
              type: 'button',
              onClick: handleClearAll,
              class:
                'mt-4 w-full rounded-full border border-border bg-card py-3 text-sm text-muted-foreground transition-colors hover:text-destructive hover:border-destructive/40',
            },
            '清空菜单',
          ),
        ]);

        mainContent = [categorySections, statsSection];
      }

      // ── 保存菜单弹窗 ───────────────────────────────────
      const saveModal = showSaveModal.value
        ? h(
            'div',
            {
              class:
                'fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center',
              onClick: closeSaveModal,
            },
            [
              h(
                'div',
                {
                  class:
                    'w-full max-w-sm rounded-t-2xl bg-card p-5 sm:rounded-2xl',
                  onClick: (e: MouseEvent) => e.stopPropagation(),
                },
                [
                  h(
                    'h2',
                    { class: 'font-handwriting text-xl text-foreground' },
                    '保存历史菜单',
                  ),
                  h(
                    'p',
                    { class: 'mt-1 text-sm text-muted-foreground' },
                    `将当前 ${totalCount.value} 道菜保存为历史菜单`,
                  ),
                  h('input', {
                    type: 'text',
                    value: saveName.value,
                    placeholder: '给菜单起个名（留空自动命名）',
                    onInput: (e: Event) => {
                      saveName.value = (e.target as HTMLInputElement).value;
                    },
                    class:
                      'mt-4 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                  }),
                  h('div', { class: 'mt-5 flex gap-3' }, [
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: closeSaveModal,
                        class:
                          'flex-1 rounded-full py-2.5 font-handwriting text-base bg-card border border-border text-foreground transition-all active:scale-[0.98]',
                      },
                      '取消',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: handleSave,
                        disabled: saving.value,
                        class: [
                          'flex-1 rounded-full py-2.5 font-handwriting text-base shadow-md transition-all active:scale-[0.98]',
                          saving.value
                            ? 'bg-primary/70 text-white cursor-wait'
                            : 'bg-primary text-white hover:bg-primary/90',
                        ],
                      },
                      saving.value ? '保存中...' : '保存',
                    ),
                  ]),
                ],
              ),
            ],
          )
        : null;

      // ── 历史菜单弹窗 ───────────────────────────────────
      const historyModal = showHistory.value
        ? h(
            'div',
            {
              class:
                'fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center',
              onClick: closeHistory,
            },
            [
              h(
                'div',
                {
                  class:
                    'w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl',
                  onClick: (e: MouseEvent) => e.stopPropagation(),
                },
                [
                  h(
                    'div',
                    { class: 'mb-4 flex items-center justify-between' },
                    [
                      h('div', { class: 'flex items-center gap-2' }, [
                        historyDetail.value
                          ? h(
                              'button',
                              {
                                type: 'button',
                                onClick: backToList,
                                class:
                                  'flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-all active:scale-95',
                              },
                              [h(ChevronLeft, { size: 16 })],
                            )
                          : null,
                        h(
                          'h2',
                          { class: 'font-handwriting text-xl text-foreground' },
                          historyDetail.value ? '菜单详情' : '历史菜单',
                        ),
                      ]),
                      h(
                        'button',
                        {
                          type: 'button',
                          onClick: closeHistory,
                          class:
                            'flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-all active:scale-95',
                        },
                        [h(X, { size: 16 })],
                      ),
                    ],
                  ),
                  loadingHistory.value
                    ? h(
                        'div',
                        { class: 'py-12 text-center text-muted-foreground' },
                        '加载中...',
                      )
                    : historyError.value
                      ? h(
                          'div',
                          { class: 'py-12 text-center text-muted-foreground' },
                          historyError.value,
                        )
                      : historyDetail.value
                        ? h('div', { class: 'space-y-4' }, [
                            h('div', { class: 'flex items-center gap-2' }, [
                              h(Clock, {
                                size: 14,
                                class: 'text-muted-foreground',
                              }),
                              h(
                                'span',
                                { class: 'text-xs text-muted-foreground' },
                                formatTime(historyDetail.value.createdAt),
                              ),
                            ]),
                            ...CATEGORIES.filter((cat) =>
                              historyDetail.value!.items.some(
                                (it) => it.category === cat.id,
                              ),
                            ).map((cat) =>
                              h('div', { key: cat.id }, [
                                h(
                                  'div',
                                  {
                                    class:
                                      'mb-2 flex items-center gap-2 font-handwriting text-lg text-foreground',
                                  },
                                  [
                                    h('div', {
                                      class: 'h-3 w-3 rounded-full',
                                      style: { backgroundColor: cat.color },
                                    }),
                                    cat.name,
                                  ],
                                ),
                                h(
                                  'div',
                                  { class: 'space-y-2' },
                                  historyDetail
                                    .value!.items.filter(
                                      (it) => it.category === cat.id,
                                    )
                                    .map((it) => renderHistoryItem(it)),
                                ),
                              ]),
                            ),
                            historyDetail.value.items.some(
                              (it) =>
                                !CATEGORIES.some((c) => c.id === it.category),
                            )
                              ? h('div', { key: 'other' }, [
                                  h(
                                    'div',
                                    {
                                      class:
                                        'mb-2 flex items-center gap-2 font-handwriting text-lg text-foreground',
                                    },
                                    [
                                      h('div', {
                                        class:
                                          'h-3 w-3 rounded-full bg-muted-foreground',
                                      }),
                                      '其他',
                                    ],
                                  ),
                                  h(
                                    'div',
                                    { class: 'space-y-2' },
                                    historyDetail.value.items
                                      .filter(
                                        (it) =>
                                          !CATEGORIES.some(
                                            (c) => c.id === it.category,
                                          ),
                                      )
                                      .map((it) => renderHistoryItem(it)),
                                  ),
                                ])
                              : null,
                            h('div', { class: 'mt-4 flex gap-3' }, [
                              h(
                                'button',
                                {
                                  type: 'button',
                                  onClick: handleRestore,
                                  disabled: restoring.value,
                                  class: [
                                    'flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 font-handwriting text-base shadow-md transition-all active:scale-[0.98]',
                                    restoring.value
                                      ? 'bg-primary/70 text-white cursor-wait'
                                      : 'bg-primary text-white hover:bg-primary/90',
                                  ],
                                },
                                [
                                  h(RotateCcw, { size: 14 }),
                                  restoring.value
                                    ? '还原中...'
                                    : '还原到当前菜单',
                                ],
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  onClick: () =>
                                    void handleDeleteMenu(
                                      historyDetail.value!.id,
                                    ),
                                  disabled: deletingMenu.value,
                                  class:
                                    'flex items-center gap-1.5 rounded-full bg-red-50 px-5 py-2.5 text-sm text-red-500 transition-all active:scale-95',
                                },
                                [h(Trash2, { size: 14 }), '删除'],
                              ),
                            ]),
                          ])
                        : historyMenus.value.length === 0
                          ? h(
                              'div',
                              {
                                class:
                                  'py-12 text-center text-muted-foreground',
                              },
                              '还没有保存过菜单',
                            )
                          : h(
                              'div',
                              { class: 'space-y-3' },
                              historyMenus.value.map((m) =>
                                h(
                                  'div',
                                  {
                                    key: m.id,
                                    class:
                                      'flex items-center justify-between rounded-2xl bg-muted/40 p-4',
                                  },
                                  [
                                    h(
                                      'button',
                                      {
                                        type: 'button',
                                        onClick: () =>
                                          void openMenuDetail(m.id),
                                        class: 'flex-1 text-left',
                                      },
                                      [
                                        h(
                                          'div',
                                          { class: 'text-foreground' },
                                          m.name,
                                        ),
                                        h(
                                          'div',
                                          {
                                            class:
                                              'mt-1 flex items-center gap-2 text-xs text-muted-foreground',
                                          },
                                          [
                                            h(Clock, { size: 12 }),
                                            formatTime(m.createdAt),
                                            `· ${m.itemCount} 道`,
                                          ],
                                        ),
                                      ],
                                    ),
                                    h(
                                      'button',
                                      {
                                        type: 'button',
                                        onClick: () =>
                                          void handleDeleteMenu(m.id),
                                        disabled: deletingMenu.value,
                                        class:
                                          'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-red-500',
                                      },
                                      [h(Trash2, { size: 16 })],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                ],
              ),
            ],
          )
        : null;

      return h('div', { class: 'min-h-screen bg-background pb-20' }, [
        header,
        h('div', { class: 'px-4' }, mainContent),
        saveModal,
        historyModal,
      ]);
    };
  },
});
