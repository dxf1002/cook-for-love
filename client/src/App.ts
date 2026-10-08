/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h, computed, type Component } from 'vue';
import { useRoute, RouterLink, RouterView } from 'vue-router';
import { Home, UtensilsCrossed, ChefHat, Heart } from 'lucide-vue-next';

const navItems = [
  { path: '/', label: '首页', icon: Home as Component, exact: true },
  { path: '/menu', label: '菜单', icon: UtensilsCrossed as Component },
  { path: '/order', label: '点菜', icon: ChefHat as Component },
  { path: '/cart', label: '已选', icon: Heart as Component },
];

export default defineComponent({
  name: 'App',
  setup() {
    const route = useRoute();

    const isActive = (item: { path: string; exact?: boolean }) => {
      if (item.exact) return route.path === item.path;
      return route.path.startsWith(item.path);
    };

    const showNav = computed(() => {
      return !route.path.startsWith('/dish/');
    });

    return () =>
      h('div', { class: 'min-h-screen bg-background flex flex-col' }, [
        h('main', { class: 'flex-1' }, [h(RouterView)]),
        showNav.value
          ? h(
              'nav',
              {
                class:
                  'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card/95 backdrop-blur-sm border-t border-border z-40',
              },
              [
                h(
                  'div',
                  { class: 'grid grid-cols-4' },
                  navItems.map((item) =>
                    h(
                      RouterLink,
                      {
                        key: item.path,
                        to: item.path,
                        class: [
                          'flex flex-col items-center justify-center py-2.5 transition-colors',
                          isActive(item)
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground',
                        ],
                      },
                      [
                        h(item.icon, { size: 20, strokeWidth: 2 }),
                        h(
                          'span',
                          { class: 'text-xs mt-1 font-handwriting' },
                          item.label,
                        ),
                      ],
                    ),
                  ),
                ),
                h('div', {
                  class: 'h-[env(safe-area-inset-bottom)] w-full',
                  'aria-hidden': 'true',
                }),
              ],
            )
          : null,
      ]);
  },
});
