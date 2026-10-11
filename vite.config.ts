import path from 'path';
import fs from 'fs';
import { defineConfig } from '@lark-apaas/fullstack-vite-preset';
import type { Plugin, ViteDevServer } from 'vite';

// 本项目仅本地部署（NestJS 静态托管 dist/client），不走妙搭平台部署。
// 强制 standalone 构建目标：跳过 og-meta / view-context 等平台插件的
// {{appName}} 等占位符注入，标题保持 client/index.html 原样。
// 平台流水线若显式设置了该变量，仍以平台值为准（??= 不覆盖已有值）。
process.env.MIAODA_BUILD_TARGET ??= 'standalone';

/**
 * 本地 dev：拦截 HTML 页面请求，由 Vite 直接服务源码版 client/index.html（带 HMR）。
 *
 * 背景：preset 会在 dev 下把 HTML 请求转发给 NestJS（后端静态返回 dist/client
 * 构建产物），产物里引用的 /assets/*.js 在 Vite dev 服务器上不存在，导致 404
 * 白屏。此插件 enforce: 'pre'，其中间件先于 preset 的转发中间件注册，直接
 * 短路返回 transformIndexHtml 处理后的源码页面，dev 下不再依赖构建产物。
 */
function localDevHtmlPlugin(): Plugin {
  return {
    name: 'local-dev-html-override',
    enforce: 'pre',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const accept = req.headers.accept || '';
        const pathname = (req.url || '').split('?')[0] || '/';
        const isHtmlRequest = accept.includes('text/html');
        // API 类路径仍走 preset 的转发逻辑，保持后端调试行为不变
        const isApiPath = /^\/(api|openapi|__innerapi__)\b/.test(pathname);
        if (!isHtmlRequest || isApiPath) {
          next();
          return;
        }
        const templatePath = path.resolve(__dirname, 'client/index.html');
        fs.readFile(templatePath, 'utf8', (err, html) => {
          if (err) {
            next();
            return;
          }
          server
            .transformIndexHtml(pathname, html, req.originalUrl)
            .then((transformed) => {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(transformed);
            })
            .catch(() => {
              next();
            });
        });
      });
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
  plugins: [localDevHtmlPlugin()],
});
