import { createSSRApp } from 'vue';
import App from './App.vue';

// uni-app 要求导出 createApp（跨端 SSR 兼容）
export function createApp() {
  const app = createSSRApp(App);
  return { app };
}
