import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { __express as hbsExpressEngine } from 'hbs';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
  });

  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST || '0.0.0.0';
  const port = Number(process.env.SERVER_PORT || '3000');
  const clientOrigin = process.env.CLIENT_ORIGIN || '*';

  // 全局路由前缀（沙箱/预览环境下为 /app/<app_id>）
  const globalPrefix =
    process.env.GLOBAL_API_PREFIX || process.env.CLIENT_BASE_PATH;
  if (globalPrefix) {
    const prefix = globalPrefix.replace(/\/$/, ''); // 去掉末尾的 /
    app.setGlobalPrefix(prefix, { exclude: ['health'] });
    logger.log(`Global prefix set: ${prefix}`);
  }

  app.enableCors({
    origin: clientOrigin,
    credentials: true,
  });

  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '10mb' });

  app.setBaseViewsDir(join(process.cwd(), 'dist/client'));
  app.setViewEngine('html');
  app.engine('html', hbsExpressEngine);

  // 生产模式：静态资源（vite 构建产物 assets/*）由本进程同源服务，
  // 未命中文件的 SPA 路由走 ViewController 兜底渲染 index.html。
  app.useStaticAssets(join(process.cwd(), 'dist/client'), { prefix: '/' });

  await app.listen(port, host);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints ready at http://${host}:${port}/api`);
}

bootstrap();
