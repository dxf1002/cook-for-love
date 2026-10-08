/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h, ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { logger } from '@client/src/utils/logger';
import { Sparkles, Plus, X, Image as ImageIcon } from 'lucide-vue-next';
import type { Dish } from '@shared/api.interface';
import { getDishes, createDish, uploadImage } from '@/api/dishes';
import { CATEGORIES } from '@/utils/constants';
import DishCard from '@/components/DishCard';

interface CategoryItem {
  id: string;
  name: string;
  color: string;
}

const DIFFICULTIES = ['简单', '中等', '困难'];

function splitList(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default defineComponent({
  name: 'MenuPage',
  setup() {
    const router = useRouter();
    const dishes = ref<Dish[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const activeCategory = ref('all');

    // ── 新增菜品弹窗状态 ──────────────────────────────
    const showAddModal = ref(false);
    const submitting = ref(false);
    const uploading = ref(false);
    const formError = ref<string | null>(null);
    const form = reactive({
      name: '',
      category: CATEGORIES[0].id,
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

    const categories = computed<CategoryItem[]>(() => [
      { id: 'all', name: '全部', color: '#FF8A7A' },
      ...CATEGORIES,
    ]);

    const activeCategoryInfo = computed(() =>
      categories.value.find((c) => c.id === activeCategory.value),
    );

    const filteredDishes = computed(() => {
      if (activeCategory.value === 'all') return dishes.value;
      return dishes.value.filter((d) => d.category === activeCategory.value);
    });

    async function fetchDishes(): Promise<void> {
      try {
        loading.value = true;
        error.value = null;
        dishes.value = await getDishes();
      } catch (err) {
        logger.error('菜单页加载失败', err);
        error.value = '加载失败，请稍后重试';
      } finally {
        loading.value = false;
      }
    }

    function openAddModal(): void {
      form.name = '';
      form.category = CATEGORIES[0].id;
      form.difficulty = '简单';
      form.time = '';
      form.description = '';
      form.tags = '';
      form.ingredients = '';
      form.amounts = '';
      form.steps = '';
      form.tips = '';
      form.imageUrl = '';
      formError.value = null;
      showAddModal.value = true;
    }

    function closeAddModal(): void {
      if (submitting.value) return;
      showAddModal.value = false;
    }

    async function handleUploadImage(file: File | undefined): Promise<void> {
      if (!file || uploading.value) return;
      uploading.value = true;
      formError.value = null;
      try {
        form.imageUrl = await uploadImage(file);
      } catch (err) {
        logger.error('上传图片失败', err);
        formError.value = '图片上传失败，请重试';
      } finally {
        uploading.value = false;
      }
    }

    async function handleSubmit(): Promise<void> {
      if (!form.name.trim()) {
        formError.value = '请填写菜品名称';
        return;
      }
      if (!form.category) {
        formError.value = '请选择分类';
        return;
      }
      submitting.value = true;
      formError.value = null;
      try {
        const tags = splitList(form.tags);
        const ingredients = splitList(form.ingredients);
        const amounts = splitList(form.amounts);
        const steps = form.steps
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        await createDish({
          name: form.name.trim(),
          category: form.category,
          difficulty: form.difficulty,
          time: form.time.trim() || undefined,
          description: form.description.trim() || undefined,
          tags: tags.length ? tags : undefined,
          ingredients: ingredients.length ? ingredients : undefined,
          amounts: amounts.length ? amounts : undefined,
          steps: steps.length ? steps : undefined,
          tips: form.tips.trim() || undefined,
          imageUrl: form.imageUrl.trim() || undefined,
        });
        showAddModal.value = false;
        await fetchDishes();
      } catch (err) {
        logger.error('新增菜品失败', err);
        formError.value = '保存失败，请重试';
      } finally {
        submitting.value = false;
      }
    }

    onMounted(() => {
      fetchDishes();
    });

    // ── 新增菜品弹窗 ──────────────────────────────────────
    // 注意：必须放在渲染函数里按需调用（每次渲染重算），
    // 否则 setup 只执行一次，showAddModal 变化后弹窗不会出现。
    const renderAddModal = () =>
      showAddModal.value
        ? h(
            'div',
            {
              class:
                'fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center',
              onClick: closeAddModal,
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
                        '新增菜品',
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          onClick: closeAddModal,
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
                        value: form.name,
                        placeholder: '如：可乐鸡翅',
                        onInput: (e: Event) => {
                          form.name = (e.target as HTMLInputElement).value;
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
                          '分类 *',
                        ),
                        h(
                          'select',
                          {
                            value: form.category,
                            onInput: (e: Event) => {
                              form.category = (
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
                            value: form.difficulty,
                            onInput: (e: Event) => {
                              form.difficulty = (
                                e.target as HTMLSelectElement
                              ).value;
                            },
                            class:
                              'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                          },
                          DIFFICULTIES.map((d) =>
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
                        value: form.time,
                        placeholder: '如：20分钟',
                        onInput: (e: Event) => {
                          form.time = (e.target as HTMLInputElement).value;
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
                        value: form.description,
                        placeholder: '一句话介绍这道菜',
                        onInput: (e: Event) => {
                          form.description = (
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
                        value: form.tags,
                        placeholder: '逗号分隔，如：下饭,快手',
                        onInput: (e: Event) => {
                          form.tags = (e.target as HTMLInputElement).value;
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
                        value: form.ingredients,
                        placeholder: '逗号分隔，如：鸡翅,可乐',
                        onInput: (e: Event) => {
                          form.ingredients = (
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
                        value: form.amounts,
                        placeholder: '与食材一一对应，逗号分隔',
                        onInput: (e: Event) => {
                          form.amounts = (e.target as HTMLInputElement).value;
                        },
                        class:
                          'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary',
                      }),
                    ]),
                    h('label', { class: 'block' }, [
                      h(
                        'span',
                        { class: 'mb-1 block text-sm text-foreground' },
                        '步骤',
                      ),
                      h('textarea', {
                        value: form.steps,
                        placeholder: '每行一步',
                        rows: 3,
                        onInput: (e: Event) => {
                          form.steps = (e.target as HTMLTextAreaElement).value;
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
                        value: form.tips,
                        placeholder: '烹饪小技巧（可选）',
                        rows: 2,
                        onInput: (e: Event) => {
                          form.tips = (e.target as HTMLTextAreaElement).value;
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
                        form.imageUrl
                          ? h('img', {
                              src: form.imageUrl,
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
                            value: form.imageUrl,
                            placeholder: '粘贴图片链接，或点下方上传',
                            onInput: (e: Event) => {
                              form.imageUrl = (
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
                              uploading.value ? '上传中...' : '本地上传',
                              h('input', {
                                type: 'file',
                                accept: 'image/*',
                                class: 'hidden',
                                onChange: (e: Event) => {
                                  const el = e.target as HTMLInputElement;
                                  void handleUploadImage(el.files?.[0]);
                                  el.value = '';
                                },
                              }),
                            ],
                          ),
                        ]),
                      ]),
                    ]),
                  ]),
                  formError.value
                    ? h(
                        'p',
                        { class: 'mt-3 text-sm text-red-500' },
                        formError.value,
                      )
                    : null,
                  h('div', { class: 'mt-5 flex gap-3' }, [
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: closeAddModal,
                        class:
                          'flex-1 rounded-full py-2.5 font-handwriting text-base bg-card border border-border text-foreground transition-all active:scale-[0.98]',
                      },
                      '取消',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: handleSubmit,
                        disabled: submitting.value,
                        class: [
                          'flex-1 rounded-full py-2.5 font-handwriting text-base shadow-md transition-all active:scale-[0.98]',
                          submitting.value
                            ? 'bg-primary/70 text-white cursor-wait'
                            : 'bg-primary text-white hover:bg-primary/90',
                        ],
                      },
                      submitting.value ? '保存中...' : '保存',
                    ),
                  ]),
                ],
              ),
            ],
          )
        : null;

    return () => {
      // Sidebar
      const sidebar = h(
        'aside',
        {
          class: 'w-20 flex-shrink-0 bg-muted/30 py-4 overflow-y-auto',
        },
        [
          h(
            'div',
            { class: 'space-y-1' },
            categories.value.map((cat: CategoryItem) =>
              h(
                'button',
                {
                  key: cat.id,
                  type: 'button',
                  onClick: () => {
                    activeCategory.value = cat.id;
                  },
                  class: [
                    'w-full px-3 py-4 text-center transition-all',
                    activeCategory.value === cat.id
                      ? 'bg-card text-primary font-medium shadow-sm'
                      : 'text-foreground/70 hover:text-foreground',
                  ],
                },
                [
                  h('div', {
                    class: 'mx-auto mb-1.5 h-2 w-2 rounded-full',
                    style: {
                      backgroundColor:
                        activeCategory.value === cat.id
                          ? cat.color
                          : 'transparent',
                    },
                  }),
                  h('span', { class: 'text-sm font-handwriting' }, cat.name),
                ],
              ),
            ),
          ),
        ],
      );

      // Main content
      let mainContent;
      if (loading.value) {
        mainContent = h(
          'div',
          { class: 'p-4 text-center text-muted-foreground' },
          '加载中...',
        );
      } else if (error.value) {
        mainContent = h(
          'div',
          { class: 'p-4 text-center text-muted-foreground' },
          error.value,
        );
      } else {
        mainContent = h(
          'div',
          { class: 'px-4 pb-4 grid grid-cols-2 gap-3' },
          filteredDishes.value.map((dish: Dish) =>
            h(DishCard, { key: dish.id, dish, variant: 'grid' }),
          ),
        );
      }

      const main = h('main', { class: 'flex-1 overflow-y-auto pb-20' }, [
        h(
          'div',
          {
            class:
              'sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-4',
          },
          [
            h('div', { class: 'flex items-start justify-between gap-2' }, [
              h('div', [
                h(
                  'h1',
                  { class: 'font-handwriting text-2xl text-foreground' },
                  activeCategoryInfo.value?.name || '全部菜品',
                ),
                h(
                  'p',
                  { class: 'text-sm text-muted-foreground mt-1' },
                  `共 ${filteredDishes.value.length} 道菜`,
                ),
              ]),
              h('div', { class: 'flex items-center gap-2' }, [
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: openAddModal,
                    class:
                      'flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-2 text-sm font-handwriting text-foreground shadow-sm transition-all active:scale-95 whitespace-nowrap',
                  },
                  [h(Plus, { size: 14, class: 'text-primary' }), '管理'],
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: () => router.push('/recommend'),
                    class:
                      'flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-sm font-handwriting text-foreground shadow-sm transition-all active:scale-95 whitespace-nowrap',
                  },
                  [
                    h(Sparkles, { size: 14, class: 'text-primary' }),
                    '智能推荐',
                  ],
                ),
              ]),
            ]),
          ],
        ),
        mainContent,
      ]);

      return h('div', { class: 'flex min-h-screen bg-background' }, [
        sidebar,
        main,
        renderAddModal(),
      ]);
    };
  },
});
