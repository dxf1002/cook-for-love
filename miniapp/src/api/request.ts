import { getDeviceId } from '../utils/device';
import { logger } from '../utils/logger';

/**
 * 后端地址。
 * - 本地开发：微信开发者工具勾选「不校验合法域名」后可直接连 http://127.0.0.1:3000
 * - 正式上线：改成 HTTPS + 已备案域名（如 https://api.example.com）
 */
const BASE_URL: string = 'http://127.0.0.1:3000';

export function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return BASE_URL + path;
}

/** 后端返回的相对图片路径（/api/dishes/image/x）补全为完整 URL。 */
export function resolveImageUrl(url: string): string {
  if (!url) return '';
  return resolveUrl(url);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  data?: unknown;
  header?: Record<string, string>;
}

function errorMessage(res: UniApp.RequestSuccessCallbackResult): string {
  const body = res.data as Record<string, unknown> | null;
  const err = body?.error as Record<string, unknown> | null | undefined;
  return (err?.message as string) || `请求失败 (HTTP ${res.statusCode})`;
}

/** uni.request 的 Promise 封装，自动带 x-device-id 头。 */
export function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: resolveUrl(path),
      // 说明：PATCH 不在 wx.request 的 TS 类型里，但运行时传字符串可用（透传给 HTTP 层），
      // 这里按官方类型强转以通过编译。
      method: (options.method || 'GET') as UniApp.RequestOptions['method'],
      data: options.data as UniApp.RequestOptions['data'],
      header: {
        'x-device-id': getDeviceId(),
        ...(options.header || {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          logger.error(
            `[api] ${options.method || 'GET'} ${path} ->`,
            res.statusCode,
            res.data,
          );
          reject(new Error(errorMessage(res)));
        }
      },
      fail: (err) => {
        logger.error(
          `[api] ${options.method || 'GET'} ${path} 网络失败`,
          err.errMsg,
        );
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}
