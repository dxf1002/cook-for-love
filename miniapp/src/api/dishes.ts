import { request, resolveUrl } from './request';
import { getDeviceId } from '../utils/device';
import { logger } from '../utils/logger';
import type {
  Dish,
  DishListResponse,
  DishDetailResponse,
  CartResponse,
  FavoritesResponse,
  CreateDishRequest,
  UpdateDishRequest,
  SavedMenuDetail,
  SavedMenuListResponse,
} from '../../../shared/api.interface';

/** 获取菜品列表（可传分类 id 过滤） */
export function getDishes(category?: string): Promise<Dish[]> {
  return request<DishListResponse>(
    category ? `/api/dishes?category=${category}` : '/api/dishes',
  ).then((res) => res.items);
}

/** 获取菜品详情（含收藏/在菜单状态） */
export function getDishDetail(dishId: number): Promise<DishDetailResponse> {
  return request<DishDetailResponse>(`/api/dishes/${dishId}`);
}

/** 获取当前菜单（购物车） */
export function getCart(): Promise<CartResponse> {
  return request<CartResponse>('/api/dishes/cart/list');
}

/** 加入菜单 */
export function addToCart(dishId: number): Promise<CartResponse> {
  return request<CartResponse>('/api/dishes/cart/add', {
    method: 'POST',
    data: { dishId },
  });
}

/** 移出菜单 */
export function removeFromCart(dishId: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/dishes/cart/remove', {
    method: 'POST',
    data: { dishId },
  });
}

/** 清空菜单 */
export function clearCart(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/dishes/cart/clear', {
    method: 'POST',
  });
}

/** 获取收藏列表 */
export function getFavorites(): Promise<FavoritesResponse> {
  return request<FavoritesResponse>('/api/dishes/favorites/list');
}

/** 收藏菜品 */
export function addFavorite(dishId: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/dishes/favorites/add', {
    method: 'POST',
    data: { dishId },
  });
}

/** 取消收藏 */
export function removeFavorite(dishId: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/dishes/favorites/remove', {
    method: 'POST',
    data: { dishId },
  });
}

/** 新增菜品 */
export function createDish(
  data: CreateDishRequest,
): Promise<DishDetailResponse> {
  return request<DishDetailResponse>('/api/dishes', { method: 'POST', data });
}

/** 修改菜品（含改分类/步骤/图片等任意字段） */
export function updateDish(
  dishId: number,
  data: UpdateDishRequest,
): Promise<DishDetailResponse> {
  return request<DishDetailResponse>(`/api/dishes/${dishId}`, {
    method: 'PATCH',
    data,
  });
}

/** 删除菜品 */
export function deleteDish(dishId: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/dishes/${dishId}`, {
    method: 'DELETE',
  });
}

/** 上传菜品图片（filePath 由 uni.chooseImage 得到），返回可访问 URL */
export function uploadImage(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    uni.uploadFile({
      url: resolveUrl('/api/dishes/upload'),
      filePath,
      name: 'file',
      header: { 'x-device-id': getDeviceId() },
      success: (res) => {
        try {
          const data = JSON.parse(res.data as string) as { url: string };
          resolve(data.url);
        } catch (err) {
          logger.error('上传图片解析失败', res.data);
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: (err) => {
        logger.error('上传图片失败', err.errMsg);
        reject(new Error(err.errMsg || '上传失败'));
      },
    });
  });
}

/** 保存当前菜单为历史菜单 */
export function saveMenu(name?: string): Promise<SavedMenuDetail> {
  return request<SavedMenuDetail>('/api/dishes/menus/save', {
    method: 'POST',
    data: { name },
  });
}

/** 历史菜单列表 */
export function listMenus(): Promise<SavedMenuListResponse> {
  return request<SavedMenuListResponse>('/api/dishes/menus/list');
}

/** 历史菜单详情 */
export function getMenu(menuId: string): Promise<SavedMenuDetail> {
  return request<SavedMenuDetail>(`/api/dishes/menus/${menuId}`);
}

/** 删除历史菜单 */
export function deleteMenu(menuId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/dishes/menus/${menuId}`, {
    method: 'DELETE',
  });
}
