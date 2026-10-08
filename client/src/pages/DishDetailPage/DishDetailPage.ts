/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h, ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { logger } from '@client/src/utils/logger';
import {
  ChevronLeft,
  Clock,
  ChefHat,
  Tag,
  Heart,
  Plus,
  Check,
  Lightbulb,
  ShoppingCart,
  Pencil,
  Trash2,
  X,
  Image as ImageIcon,
} from 'lucide-vue-next';
import type { Dish } from '@shared/api.interface';
import {
  getDishDetail,
  getCart,
  addFavorite,
  removeFavorite,
  addToCart,
  updateDish,
  deleteDish,
  uploadImage,
} from '@/api/dishes';
import { CATEGORY_MAP, CATEGORIES } from '@/utils/constants';
import Image from '@/components/ui/Image';

export default defineComponent({
  name: 'DishDetailPage',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const dish = ref<Dish | null>(null);
    const isFavorite = ref(false);
    const isInCart = ref(false);
    const loading = ref(true);
    const cartCount = ref(0);

    const dishId = computed(() => Number(route.params.id));

    const hasImage = computed(
      () => dish.value?.imageUrl && dish.value.imageUrl.length > 0,
    );
    const firstChar = computed(() => dish.value?.name.charAt(0) ?? '');

    const categoryName = computed(() => {
      if (!dish.value) return '';
      return CATEGORY_MAP[dish.value.category]?.name ?? dish.value.category;
    });

    async function handleToggleFavorite(): Promise<void> {
      if (!dish.value) return;
      try {
        if (isFavorite.value) {
          await removeFavorite(dish.value.dishId);
          isFavorite.value = false;
        } else {
          await addFavorite(dish.value.dishId);
          isFavorite.value = true;
        }
      } catch (err) {
        logger.error('切换收藏状态失败', err);
      }
    }

    async function handleAddToCart(): Promise<void> {
      if (!dish.value || isInCart.value) return;
      try {
        await addToCart(dish.value.dishId);
        isInCart.value = true;
        cartCount.value += 1;
      } catch (err) {
        logger.error('加入购物车失败', err);
      }
    }

    // ── 编辑（全字段）/ 删除 ──────────────────────────────
    const showEditModal = ref(false);
    const savingEdit = ref(false);
    const uploadingEdit = ref(false);
    const editError = ref<string | null>(null);
    const deleting = ref(false);
    const editForm = reactive({
      name: '',
      category: '',
      difficulty: '简单',
      time: '',
      description: '',
      tags: '',
      ingredients: '',
      amounts: '',
      steps: '',
      tips: '',
      imageUrl: '',
    });

    function splitList(value: string): string[] {
      return value
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    function openEditModal(): void {
      if (!dish.value) return;
      const d = dish.value;
      editForm.name = d.name;
      editForm.category = d.category;
      editForm.difficulty = d.difficulty;
      editForm.time = d.time;
      editForm.description = d.description;
      editForm.tags = (d.tags ?? []).join(',');
      editForm.ingredients = (d.ingredients ?? []).join(',');
      editForm.amounts = (d.amounts ?? []).join(',');
      editForm.steps = (d.steps ?? []).join('\n');
      editForm.tips = d.tips;
      editForm.imageUrl = d.imageUrl;
      editError.value = null;
      showEditModal.value = true;
    }

    function closeEditModal(): void {
      if (savingEdit.value) return;
      showEditModal.value = false;
    }

    async function handleEditUploadImage(
      file: File | undefined,
    ): Promise<void> {
      if (!file || uploadingEdit.value) return;
      uploadingEdit.value = true;
      editError.value = null;
      try {
        editForm.imageUrl = await uploadImage(file);
      } catch (err) {
        logger.error('上传图片失败', err);
        editError.value = '图片上传失败，请重试';
      } finally {
        uploadingEdit.value = false;
      }
    }

    async function handleEditSubmit(): Promise<void> {
      if (!dish.value || savingEdit.value) return;
      if (!editForm.name.trim()) {
        editError.value = '名称不能为空';
        return;
      }
      savingEdit.value = true;
      editError.value = null;
      try {
        const tags = splitList(editForm.tags);
        const ingredients = splitList(editForm.ingredients);
        const amounts = splitList(editForm.amounts);
        const steps = editForm.steps
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const res = await updateDish(dish.value.dishId, {
          name: editForm.name.trim(),
          category: editForm.category,
          difficulty: editForm.difficulty,
          time: editForm.time.trim() || undefined,
          description: editForm.description.trim() || undefined,
          tags: tags.length ? tags : undefined,
          ingredients: ingredients.length ? ingredients : undefined,
          amounts: amounts.length ? amounts : undefined,
          steps: steps.length ? steps : undefined,
          tips: editForm.tips.trim() || undefined,
          imageUrl: editForm.imageUrl.trim() || undefined,
        });
        dish.value = res.dish;
        showEditModal.value = false;
      } catch (err) {
        logger.error('更新菜品失败', err);
        editError.value = '保存失败，请重试';
      } finally {
        savingEdit.value = false;
      }
    }

    async function handleDelete(): Promise<void> {
      if (!dish.value || deleting.value) return;
      if (!window.confirm(`确定删除「${dish.value.name}」吗？`)) return;
      deleting.value = true;
      try {
        await deleteDish(dish.value.dishId);
        router.replace('/menu');
      } catch (err) {
        logger.error('删除菜品失败', err);
        window.alert('删除失败，请重试');
      } finally {
        deleting.value = false;
      }
    }

    onMounted(async () => {
      if (!dishId.value || Number.isNaN(dishId.value)) return;
      try {
        loading.value = true;
        const [detail, cartData] = await Promise.all([
          getDishDetail(dishId.value),
          getCart(),
        ]);
        dish.value = detail.dish;
        isFavorite.value = detail.isFavorite;
        isInCart.value = detail.isInCart;
        cartCount.value = cartData.items.length;
      } catch (err) {
        logger.error('加载菜品详情失败', err);
      } finally {
        loading.value = false;
      }
    });

    return () => {
      // Loading state
      if (loading.value) {
        return h(
          'div',
          { class: 'flex min-h-[60vh] items-center justify-center' },
          [h('div', { class: 'text-muted-foreground' }, '加载中...')],
        );
      }

      // Not found state
      if (!dish.value) {
        return h(
          'div',
          {
            class: 'flex min-h-[60vh] flex-col items-center justify-center p-6',
          },
          [
            h('p', { class: 'text-muted-foreground' }, '菜品不存在'),
            h(
              'button',
              {
                onClick: () => router.back(),
                class: 'mt-4 text-primary underline',
              },
              '返回',
            ),
          ],
        );
      }

      const d = dish.value;

      // Top bar with back + favorite
      const topBar = h(
        'div',
        {
          class:
            'fixed top-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 px-4 pt-3',
          style: {
            background:
              'linear-gradient(to bottom, rgba(74,55,40,0.25) 0%, rgba(74,55,40,0) 100%)',
            paddingBottom: '20px',
          },
        },
        [
          h('div', { class: 'flex items-center justify-between' }, [
            h(
              'button',
              {
                onClick: () => router.back(),
                class:
                  'flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur-sm transition-all active:scale-95',
                ariaLabel: '返回',
              },
              [h(ChevronLeft, { class: 'h-5 w-5' })],
            ),
            h(
              'button',
              {
                onClick: handleToggleFavorite,
                class:
                  'flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur-sm transition-all active:scale-95',
                ariaLabel: isFavorite.value ? '取消收藏' : '收藏',
              },
              [
                isFavorite.value
                  ? h(Heart, { class: 'h-5 w-5 fill-primary text-primary' })
                  : h(Heart, { class: 'h-5 w-5 text-foreground/70' }),
              ],
            ),
          ]),
        ],
      );

      // Hero image / placeholder
      const heroImage = h('div', { class: 'relative w-full' }, [
        hasImage.value
          ? h(Image, {
              src: d.imageUrl,
              alt: d.name,
              class: 'w-full object-cover',
              style: { height: '280px' },
            })
          : h(
              'div',
              {
                class:
                  'flex w-full items-center justify-center font-handwriting text-6xl text-white',
                style: { backgroundColor: d.color, height: '280px' },
              },
              firstChar.value,
            ),
      ]);

      // Basic info card
      const infoCard = h(
        'div',
        {
          class: 'bg-card rounded-2xl shadow-sm p-5',
        },
        [
          h(
            'h1',
            { class: 'font-handwriting text-2xl text-foreground' },
            d.name,
          ),
          h(
            'p',
            { class: 'mt-2 text-sm text-muted-foreground leading-relaxed' },
            d.description,
          ),
          h('div', { class: 'mt-4 flex flex-wrap gap-2' }, [
            h(
              'span',
              {
                class:
                  'inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground',
              },
              [h(ChefHat, { class: 'h-3.5 w-3.5' }), d.difficulty],
            ),
            h(
              'span',
              {
                class:
                  'inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground',
              },
              [h(Clock, { class: 'h-3.5 w-3.5' }), d.time],
            ),
            h(
              'span',
              {
                class:
                  'inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground',
              },
              [h(Tag, { class: 'h-3.5 w-3.5' }), categoryName.value],
            ),
          ]),
          h('div', { class: 'mt-4 flex items-center gap-3' }, [
            h(
              'button',
              {
                type: 'button',
                onClick: openEditModal,
                class:
                  'flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 text-xs text-foreground transition-all active:scale-95',
              },
              [h(Pencil, { class: 'h-3 w-3' }), '编辑'],
            ),
            h(
              'button',
              {
                type: 'button',
                onClick: handleDelete,
                disabled: deleting.value,
                class:
                  'flex items-center gap-1 rounded-full bg-red-50 px-4 py-1.5 text-xs text-red-500 transition-all active:scale-95',
              },
              [
                h(Trash2, { class: 'h-3 w-3' }),
                deleting.value ? '删除中...' : '删除',
              ],
            ),
          ]),
        ],
      );

      // Ingredients card
      const ingredientsCard = h(
        'div',
        {
          class: 'bg-card rounded-2xl shadow-sm p-5',
        },
        [
          h(
            'h2',
            { class: 'font-handwriting text-xl text-foreground mb-4' },
            '食材清单',
          ),
          h(
            'div',
            { class: 'grid grid-cols-2 gap-y-3 gap-x-4' },
            d.ingredients.map((ingredient: string, index: number) =>
              h(
                'div',
                {
                  key: `${ingredient}-${index}`,
                  class: 'flex items-center justify-between text-sm',
                },
                [
                  h(
                    'div',
                    { class: 'flex items-center gap-2 text-foreground' },
                    [
                      h('span', {
                        class: 'h-1.5 w-1.5 rounded-full bg-primary/60',
                      }),
                      h('span', ingredient),
                    ],
                  ),
                  h(
                    'span',
                    { class: 'text-xs text-muted-foreground' },
                    d.amounts[index] ?? '',
                  ),
                ],
              ),
            ),
          ),
        ],
      );

      // Steps card
      const stepsCard = h(
        'div',
        {
          class: 'bg-card rounded-2xl shadow-sm p-5',
        },
        [
          h(
            'h2',
            { class: 'font-handwriting text-xl text-foreground mb-4' },
            '烹饪步骤',
          ),
          h(
            'div',
            { class: 'space-y-4' },
            d.steps.map((step: string, index: number) =>
              h('div', { key: index, class: 'flex gap-3' }, [
                h('div', { class: 'flex-shrink-0' }, [
                  h(
                    'div',
                    {
                      class:
                        'flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-medium text-white',
                    },
                    String(index + 1),
                  ),
                ]),
                h(
                  'div',
                  {
                    class:
                      'flex-1 pt-1 text-sm text-foreground leading-relaxed',
                  },
                  step,
                ),
              ]),
            ),
          ),
        ],
      );

      // Tips card (only if tips exist)
      const tipsCard =
        d.tips && d.tips.length > 0
          ? h('div', { class: 'rounded-2xl shadow-sm p-5 bg-accent/30' }, [
              h('div', { class: 'flex items-center gap-2 mb-2' }, [
                h(Lightbulb, { class: 'h-5 w-5 text-warning' }),
                h(
                  'h2',
                  { class: 'font-handwriting text-xl text-foreground' },
                  '小贴士',
                ),
              ]),
              h(
                'p',
                { class: 'text-sm text-foreground/80 leading-relaxed' },
                d.tips,
              ),
            ])
          : null;

      // Content area
      const content = h(
        'div',
        { class: 'px-4 -mt-6 relative z-10 space-y-4' },
        [infoCard, ingredientsCard, stepsCard, tipsCard],
      );

      // Bottom bar
      const bottomBar = h(
        'div',
        {
          class:
            'fixed bottom-16 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3',
        },
        [
          h('div', { class: 'flex items-center justify-between gap-3' }, [
            h(
              RouterLink,
              {
                to: '/cart',
                class:
                  'flex flex-col items-start text-xs text-muted-foreground',
              },
              [
                h(
                  'span',
                  { class: 'flex items-center gap-1 text-foreground' },
                  [
                    h(ShoppingCart, { class: 'h-4 w-4' }),
                    h(
                      'span',
                      { class: 'font-medium' },
                      `已选 ${cartCount.value} 道`,
                    ),
                  ],
                ),
                h(
                  'span',
                  { class: 'mt-0.5 underline underline-offset-2' },
                  '查看菜单',
                ),
              ],
            ),
            h(
              'button',
              {
                onClick: handleAddToCart,
                disabled: isInCart.value,
                class: [
                  'flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-medium transition-all active:scale-95',
                  isInCart.value
                    ? 'bg-secondary/80 text-white'
                    : 'bg-primary text-white shadow-md hover:bg-primary/90',
                ],
              },
              isInCart.value
                ? [h(Check, { class: 'h-4 w-4' }), '已加入']
                : [h(Plus, { class: 'h-4 w-4' }), '加入菜单'],
            ),
          ]),
        ],
      );

      // 编辑弹窗（全字段，含步骤/图片）
      const editModal = showEditModal.value
        ? h(
            'div',
            {
              class:
                'fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center',
              onClick: closeEditModal,
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
                      h(
                        'h2',
                        { class: 'font-handwriting text-xl text-foreground' },
                        '编辑菜品',
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          onClick: closeEditModal,
                          class:
                            'flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-all active:scale-95',
                        },
                        [h(X, { size: 16 })],
                      ),
                    ],
                  ),
                  h('div', { class: 'space-y-3' }, [
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '名称 *',
                      ),
                      h('input', {
                        type: 'text',
                        value: editForm.name,
                        onInput: (e: Event) => {
                          editForm.name = (e.target as HTMLInputElement).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('div', { class: 'grid grid-cols-2 gap-3' }, [
                      h('label', { class: 'block' }, [
                        h(
                          'span',
                          { class: 'mb-1 block text-sm text-foreground' },
                          '分类',
                        ),
                        h(
                          'select',
                          {
                            value: editForm.category,
                            onInput: (e: Event) => {
                              editForm.category = (
                                e.target as HTMLSelectElement
                              ).value;
                            },
                            class:
                              'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                          },
                          CATEGORIES.map((cat) =>
                            h(
                              'option',
                              { key: cat.id, value: cat.id },
                              cat.name,
                            ),
                          ),
                        ),
                      ]),
                      h('label', { class: 'block' }, [
                        h(
                          'span',
                          { class: 'mb-1 block text-sm text-foreground' },
                          '难度',
                        ),
                        h(
                          'select',
                          {
                            value: editForm.difficulty,
                            onInput: (e: Event) => {
                              editForm.difficulty = (
                                e.target as HTMLSelectElement
                              ).value;
                            },
                            class:
                              'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                          },
                          ['简单', '中等', '困难'].map((d) =>
                            h('option', { key: d, value: d }, d),
                          ),
                        ),
                      ]),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '用时',
                      ),
                      h('input', {
                        type: 'text',
                        value: editForm.time,
                        placeholder: '如：20分钟',
                        onInput: (e: Event) => {
                          editForm.time = (e.target as HTMLInputElement).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '描述',
                      ),
                      h('textarea', {
                        value: editForm.description,
                        rows: 2,
                        onInput: (e: Event) => {
                          editForm.description = (
                            e.target as HTMLTextAreaElement
                          ).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '标签',
                      ),
                      h('input', {
                        type: 'text',
                        value: editForm.tags,
                        placeholder: '逗号分隔，如：下饭,快手',
                        onInput: (e: Event) => {
                          editForm.tags = (e.target as HTMLInputElement).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '食材',
                      ),
                      h('input', {
                        type: 'text',
                        value: editForm.ingredients,
                        placeholder: '逗号分隔，如：鸡翅,可乐',
                        onInput: (e: Event) => {
                          editForm.ingredients = (
                            e.target as HTMLInputElement
                          ).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '用量',
                      ),
                      h('input', {
                        type: 'text',
                        value: editForm.amounts,
                        placeholder: '与食材一一对应，逗号分隔',
                        onInput: (e: Event) => {
                          editForm.amounts = (
                            e.target as HTMLInputElement
                          ).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '烹饪步骤',
                      ),
                      h('textarea', {
                        value: editForm.steps,
                        placeholder: '每行一步',
                        rows: 4,
                        onInput: (e: Event) => {
                          editForm.steps = (
                            e.target as HTMLTextAreaElement
                          ).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '小贴士',
                      ),
                      h('textarea', {
                        value: editForm.tips,
                        rows: 2,
                        onInput: (e: Event) => {
                          editForm.tips = (
                            e.target as HTMLTextAreaElement
                          ).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '菜品图片',
                      ),
                      h('div', { class: 'flex items-center gap-3' }, [
                        editForm.imageUrl
                          ? h('img', {
                              src: editForm.imageUrl,
                              alt: '菜品图片',
                              class:
                                'h-14 w-14 flex-shrink-0 rounded-lg border border-border object-cover',
                            })
                          : h(
                              'div',
                              {
                                class:
                                  'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
                              },
                              [h(ImageIcon, { size: 18 })],
                            ),
                        h('div', { class: 'flex-1 space-y-2' }, [
                          h('input', {
                            type: 'text',
                            value: editForm.imageUrl,
                            placeholder: '粘贴图片链接，或点下方上传',
                            onInput: (e: Event) => {
                              editForm.imageUrl = (
                                e.target as HTMLInputElement
                              ).value;
                            },
                            class:
                              'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                          }),
                          h(
                            'label',
                            {
                              class:
                                'inline-flex cursor-pointer items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs text-foreground transition-all active:scale-95',
                            },
                            [
                              uploadingEdit.value ? '上传中...' : '本地上传',
                              h('input', {
                                type: 'file',
                                accept: 'image/*',
                                class: 'hidden',
                                onChange: (e: Event) => {
                                  const el = e.target as HTMLInputElement;
                                  void handleEditUploadImage(el.files?.[0]);
                                  el.value = '';
                                },
                              }),
                            ],
                          ),
                        ]),
                      ]),
                    ]),
                  ]),
                  editError.value
                    ? h(
                        'p',
                        { class: 'mt-3 text-sm text-red-500' },
                        editError.value,
                      )
                    : null,
                  h('div', { class: 'mt-5 flex gap-3' }, [
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: closeEditModal,
                        class:
                          'flex-1 rounded-full py-2.5 font-handwriting text-base bg-card border border-border text-foreground transition-all active:scale-[0.98]',
                      },
                      '取消',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: handleEditSubmit,
                        disabled: savingEdit.value,
                        class: [
                          'flex-1 rounded-full py-2.5 font-handwriting text-base shadow-md transition-all active:scale-[0.98]',
                          savingEdit.value
                            ? 'bg-primary/70 text-white cursor-wait'
                            : 'bg-primary text-white hover:bg-primary/90',
                        ],
                      },
                      savingEdit.value ? '保存中...' : '保存',
                    ),
                  ]),
                ],
              ),
            ],
          )
        : null;

      return h(
        'div',
        { class: 'relative min-h-screen bg-background pb-[140px]' },
        [topBar, heroImage, content, bottomBar, editModal],
      );
    };
  },
});
