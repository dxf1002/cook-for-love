import { defineComponent, h, ref, computed } from 'vue';

interface ImageProps {
  src: string;
  alt?: string;
  class?: string;
  style?: Record<string, string>;
  sizes?: string;
  width?: number | string;
}

export default defineComponent({
  name: 'Image',
  props: {
    src: { type: String, required: true },
    alt: { type: String, default: '' },
    class: { type: String, default: '' },
    style: { type: Object, default: () => ({}) },
    sizes: { type: String, default: undefined },
    width: { type: [Number, String], default: undefined },
  },
  setup(props: ImageProps) {
    const loaded = ref(false);
    const error = ref(false);

    const handleLoad = () => {
      loaded.value = true;
    };

    const handleError = () => {
      error.value = true;
    };

    const imgClass = computed(() =>
      [
        'transition-opacity duration-300',
        loaded.value ? 'opacity-100' : 'opacity-0',
        props.class,
      ].filter(Boolean).join(' '),
    );

    return () => {
      if (error.value || !props.src) {
        return h('div', {
          class: ['bg-muted flex items-center justify-center', props.class],
          style: props.style,
        }, [
          h('span', { class: 'text-xs text-muted-foreground' }, '加载失败'),
        ]);
      }
      return h('img', {
        src: props.src,
        alt: props.alt,
        class: imgClass.value,
        style: props.style,
        onLoad: handleLoad,
        onError: handleError,
        loading: 'lazy',
      });
    };
  },
});
