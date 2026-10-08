/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h, computed, type PropType } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Check } from 'lucide-vue-next';
import type { Dish } from '@shared/api.interface';
import Image from './ui/Image';

export default defineComponent({
  name: 'DishCard',
  props: {
    dish: { type: Object as PropType<Dish>, required: true },
    variant: { type: String as PropType<'default' | 'compact' | 'grid'>, default: 'default' },
    isSelected: { type: Boolean, default: false },
    showAddButton: { type: Boolean, default: false },
    selectable: { type: Boolean, default: false },
  },
  emits: ['toggle-select', 'add-to-cart'],
  setup(props, { emit }) {
    const router = useRouter();

    const hasImage = computed(() => props.dish.imageUrl && props.dish.imageUrl.length > 0);
    const firstChar = computed(() => props.dish.name.charAt(0));

    const imageHeight = computed(() => {
      if (props.variant === 'grid') return '100px';
      if (props.variant === 'compact') return '80px';
      return '140px';
    });

    function handleCardClick() {
      if (props.selectable) {
        emit('toggle-select');
        return;
      }
      if (props.showAddButton || props.isSelected) return;
      router.push(`/dish/${props.dish.dishId}`);
    }

    return () => {
      const dish = props.dish;
      const cardChildren: any[] = [
        h('div', { class: 'relative overflow-hidden rounded-xl' }, [
          hasImage.value
            ? h(Image, {
                src: dish.imageUrl,
                alt: dish.name,
                class: 'w-full object-cover',
                style: { height: imageHeight.value },
              })
            : h('div', {
                class: 'w-full flex items-center justify-center text-white font-bold text-3xl font-handwriting',
                style: { backgroundColor: dish.color, height: imageHeight.value },
              }, firstChar.value),
          props.isSelected
            ? h('div', {
                class: 'absolute inset-0 bg-black/30 flex items-center justify-center',
              }, [
                h('div', { class: 'w-10 h-10 rounded-full bg-primary flex items-center justify-center' }, [
                  h(Check, { class: 'w-6 h-6 text-white' }),
                ]),
              ])
            : null,
          props.variant === 'default' && dish.tags.length > 0
            ? h('div', { class: 'absolute top-2 left-2 flex gap-1 flex-wrap' },
                dish.tags.slice(0, 2).map((tag: string) =>
                  h('span', {
                    key: tag,
                    class: 'text-xs px-2 py-0.5 rounded-full bg-white/90 text-foreground/70 backdrop-blur-sm',
                  }, tag),
                ),
              )
            : null,
        ]),
        h('div', { class: 'p-3' }, [
          h('h3', {
            class: 'font-handwriting text-lg font-medium text-foreground truncate',
          }, dish.name),
          props.variant !== 'grid'
            ? h('p', { class: 'text-sm text-muted-foreground mt-1 line-clamp-2' },
                dish.description,
              )
            : null,
          props.variant === 'default'
            ? h('div', {
                class: 'flex items-center gap-2 mt-2 text-xs text-muted-foreground',
              }, [
                h('span', dish.difficulty),
                h('span', '·'),
                h('span', dish.time),
              ])
            : null,
        ]),
      ];

      if (props.showAddButton) {
        cardChildren.push(
          h('button', {
            type: 'button',
            onClick: (e: Event) => {
              e.stopPropagation();
              emit('add-to-cart');
            },
            class: 'absolute bottom-3 right-3 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 active:scale-95 transition-all',
          }, [h(Plus, { class: 'w-5 h-5' })]),
        );
      }

      return h('div', {
        onClick: handleCardClick,
        class: [
          'bg-card rounded-2xl shadow-sm overflow-hidden relative transition-all cursor-pointer',
          props.isSelected ? 'ring-2 ring-primary' : '',
        ],
      }, cardChildren);
    };
  },
});
