/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h, ref, computed, onMounted, onBeforeUnmount, type Component } from 'vue';
import { useRouter } from 'vue-router';
import { logger } from '@client/src/utils/logger';
import { ChefHat, UtensilsCrossed, Shuffle, Heart, RefreshCw, Sparkles } from 'lucide-vue-next';
import type { Dish } from '@shared/api.interface';
import { getDishes } from '@/api/dishes';
import DishCard from '@/components/DishCard';
import { HERO_IMAGE } from '@/utils/constants';
import Image from '@/components/ui/Image';

interface QuickEntry {
  title: string;
  desc: string;
  icon: Component;
  bgClass: string;
  textClass: string;
  onClick: () => void;
}

export default defineComponent({
  name: 'HomePage',
  setup() {
    const router = useRouter();
    const dishes = ref<Dish[]>([]);
    const recommendDishes = ref<Dish[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const shuffling = ref(false);
    const isMounted = ref(true);

    function shuffleArray(arr: Dish[]): Dish[] {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    async function fetchDishes(): Promise<void> {
      try {
        loading.value = true;
        error.value = null;
        const data = await getDishes();
        if (!isMounted.value) return;
        dishes.value = data;
        recommendDishes.value = shuffleArray(data).slice(0, 6);
      } catch (err) {
        logger.error('首页加载菜品失败', err);
        if (!isMounted.value) return;
        error.value = '加载失败，请稍后重试';
      } finally {
        if (isMounted.value) loading.value = false;
      }
    }

    function handleShuffleRecommend(): void {
      if (dishes.value.length === 0) return;
      shuffling.value = true;
      recommendDishes.value = shuffleArray(dishes.value).slice(0, 6);
      setTimeout(() => {
        shuffling.value = false;
      }, 400);
    }

    function handleRandomPick(): void {
      if (dishes.value.length === 0) return;
      const randomIndex = Math.floor(Math.random() * dishes.value.length);
      const randomDish = dishes.value[randomIndex];
      router.push(`/dish/${randomDish.dishId}`);
    }

    const quickEntries = computed<QuickEntry[]>(() => [
      {
        title: '智能配餐',
        desc: 'AI 为你搭配菜单',
        icon: Sparkles,
        bgClass: 'bg-primary',
        textClass: 'text-white',
        onClick: () => router.push('/recommend'),
      },
      {
        title: '开始点菜',
        desc: '套餐搭配',
        icon: ChefHat,
        bgClass: 'bg-secondary',
        textClass: 'text-white',
        onClick: () => router.push('/order'),
      },
      {
        title: '浏览菜单',
        desc: '全部分类',
        icon: UtensilsCrossed,
        bgClass: 'bg-accent',
        textClass: 'text-foreground',
        onClick: () => router.push('/menu'),
      },
      {
        title: '随机推荐',
        desc: '今天吃啥',
        icon: Shuffle,
        bgClass: 'bg-card',
        textClass: 'text-foreground',
        onClick: handleRandomPick,
      },
      {
        title: '我的菜单',
        desc: '已选菜品',
        icon: Heart,
        bgClass: 'bg-muted',
        textClass: 'text-foreground',
        onClick: () => router.push('/cart'),
      },
    ]);

    onMounted(() => {
      fetchDishes();
    });

    onBeforeUnmount(() => {
      isMounted.value = false;
    });

    return () => {
      // Hero section
      const heroSection = h('div', { class: 'relative h-56 w-full overflow-hidden' }, [
        h(Image, {
          src: HERO_IMAGE,
          alt: '温馨厨房',
          class: 'h-full w-full object-cover',
        }),
        h('div', {
          class: 'absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-background',
        }),
        h('div', {
          class: 'absolute inset-0 flex flex-col justify-end p-5 pb-6',
        }, [
          h('h1', {
            class: 'font-handwriting text-3xl text-white drop-shadow-md',
          }, '今天想做什么好吃的？'),
          h('p', {
            class: 'mt-1 text-sm text-white/90',
          }, '为爱的人，做一道菜'),
        ]),
      ]);

      // Quick entries
      const quickEntriesSection = h('div', { class: 'mt-4 grid grid-cols-3 gap-3' },
        quickEntries.value.map((entry: QuickEntry, index: number) =>
          h('button', {
            key: entry.title,
            type: 'button',
            onClick: entry.onClick,
            class: [
              entry.bgClass,
              entry.textClass,
              index === 0 ? 'col-span-2' : '',
              'rounded-2xl p-4 text-left shadow-sm transition-all active:scale-[0.97]',
            ],
          }, [
            h('div', { class: 'mb-2' }, [
              h(entry.icon, { size: 24, 'stroke-width': 2 }),
            ]),
            h('h3', { class: 'font-handwriting text-lg' }, entry.title),
            h('p', { class: 'text-xs opacity-80' }, entry.desc),
          ]),
        ),
      );

      // Recommend section content
      let recommendContent;
      if (loading.value) {
        recommendContent = h('div', { class: 'flex gap-3 overflow-x-auto pb-2' },
          [1, 2, 3].map((i: number) =>
            h('div', {
              key: i,
              class: 'h-52 w-36 flex-shrink-0 animate-pulse rounded-2xl bg-muted',
            }),
          ),
        );
      } else if (error.value) {
        recommendContent = h('div', {
          class: 'rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground shadow-sm',
        }, error.value);
      } else {
        recommendContent = h('div', { class: 'flex gap-3 overflow-x-auto pb-2 -mx-4 px-4' },
          recommendDishes.value.map((dish: Dish) =>
            h('div', {
              key: dish.id,
              class: 'w-36 flex-shrink-0 transition-opacity',
              style: { opacity: shuffling.value ? 0.6 : 1 },
            }, [
              h(DishCard, { dish, variant: 'default' }),
            ]),
          ),
        );
      }

      const recommendSection = h('div', { class: 'mt-6' }, [
        h('div', { class: 'mb-3 flex items-center justify-between' }, [
          h('h2', { class: 'font-handwriting text-xl text-foreground' }, '今日推荐'),
          h('button', {
            type: 'button',
            onClick: handleShuffleRecommend,
            disabled: loading.value || shuffling.value,
            class: 'flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-50',
          }, [
            h(RefreshCw, { size: 14, class: shuffling.value ? 'animate-spin' : '' }),
            '换一批',
          ]),
        ]),
        recommendContent,
      ]);

      return h('div', { class: 'min-h-screen bg-background' }, [
        heroSection,
        h('div', { class: 'px-4' }, [
          quickEntriesSection,
          recommendSection,
          h('div', { class: 'h-6' }),
        ]),
      ]);
    };
  },
});
