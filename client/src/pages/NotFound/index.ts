/* eslint-disable react-hooks/rules-of-hooks */
import { defineComponent, h } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'NotFound',
  setup() {
    const router = useRouter();
    return () =>
      h('div', { class: 'flex min-h-[60vh] flex-col items-center justify-center p-6 bg-background' }, [
        h('h2', { class: 'font-handwriting text-2xl text-foreground' }, '页面走丢了'),
        h('p', { class: 'mt-2 text-sm text-muted-foreground' }, '找不到你要的页面'),
        h('button', {
          onClick: () => router.push('/'),
          class: 'mt-6 text-primary underline',
        }, '返回首页'),
      ]);
  },
});
