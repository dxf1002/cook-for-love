import axios from 'axios';
import { logger } from '@client/src/utils/logger';
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
} from '@shared/api.interface';
import { getDeviceId } from '@client/src/utils/device';

const axiosForBackend = axios.create({
  baseURL: '',
  timeout: 15000,
});

function getDeviceHeaders(): Record<string, string> {
  return {
    'x-device-id': getDeviceId(),
  };
}

/** 获取菜品列表 */
export async function getDishes(category?: string): Promise<Dish[]> {
  try {
    const params: Record<string, string> = {};
    if (category) {
      params.category = category;
    }
    const response = await axiosForBackend.get<DishListResponse>(
      '/api/dishes',
      {
        params,
        headers: getDeviceHeaders(),
      },
    );
    return response.data.items;
  } catch (error) {
    logger.error('获取菜品列表失败', error);
    throw error;
  }
}

/** 获取菜品详情 */
export async function getDishDetail(id: number): Promise<DishDetailResponse> {
  try {
    const response = await axiosForBackend.get<DishDetailResponse>(
      `/api/dishes/${id}`,
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error(`获取菜品详情失败 id=${id}`, error);
    throw error;
  }
}

/** 获取购物车 */
export async function getCart(): Promise<CartResponse> {
  try {
    const response = await axiosForBackend.get<CartResponse>(
      '/api/dishes/cart/list',
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error('获取购物车失败', error);
    throw error;
  }
}

/** 添加到购物车 */
export async function addToCart(dishId: number): Promise<CartResponse> {
  try {
    const response = await axiosForBackend.post<
      { success: boolean } & CartResponse
    >('/api/dishes/cart/add', { dishId }, { headers: getDeviceHeaders() });
    return { items: response.data.items, dishes: response.data.dishes };
  } catch (error) {
    logger.error(`添加购物车失败 dishId=${dishId}`, error);
    throw error;
  }
}

/** 从购物车移除 */
export async function removeFromCart(dishId: number): Promise<CartResponse> {
  try {
    const response = await axiosForBackend.post<
      { success: boolean } & CartResponse
    >('/api/dishes/cart/remove', { dishId }, { headers: getDeviceHeaders() });
    return { items: response.data.items, dishes: response.data.dishes };
  } catch (error) {
    logger.error(`移除购物车失败 dishId=${dishId}`, error);
    throw error;
  }
}

/** 清空购物车 */
export async function clearCart(): Promise<CartResponse> {
  try {
    const response = await axiosForBackend.post<
      { success: boolean } & CartResponse
    >('/api/dishes/cart/clear', {}, { headers: getDeviceHeaders() });
    return { items: response.data.items, dishes: response.data.dishes };
  } catch (error) {
    logger.error('清空购物车失败', error);
    throw error;
  }
}

/** 获取收藏列表 */
export async function getFavorites(): Promise<FavoritesResponse> {
  try {
    const response = await axiosForBackend.get<FavoritesResponse>(
      '/api/dishes/favorites/list',
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error('获取收藏列表失败', error);
    throw error;
  }
}

/** 添加收藏 */
export async function addFavorite(dishId: number): Promise<FavoritesResponse> {
  try {
    const response = await axiosForBackend.post<
      { success: boolean } & FavoritesResponse
    >('/api/dishes/favorites/add', { dishId }, { headers: getDeviceHeaders() });
    return { items: response.data.items, dishes: response.data.dishes };
  } catch (error) {
    logger.error(`添加收藏失败 dishId=${dishId}`, error);
    throw error;
  }
}

/** 取消收藏 */
export async function removeFavorite(
  dishId: number,
): Promise<FavoritesResponse> {
  try {
    const response = await axiosForBackend.post<
      { success: boolean } & FavoritesResponse
    >(
      '/api/dishes/favorites/remove',
      { dishId },
      { headers: getDeviceHeaders() },
    );
    return { items: response.data.items, dishes: response.data.dishes };
  } catch (error) {
    logger.error(`取消收藏失败 dishId=${dishId}`, error);
    throw error;
  }
}

/** 新增菜品 */
export async function createDish(
  data: CreateDishRequest,
): Promise<DishDetailResponse> {
  try {
    const response = await axiosForBackend.post<DishDetailResponse>(
      '/api/dishes',
      data,
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error('新增菜品失败', error);
    throw error;
  }
}

/** 修改菜品（含改分类） */
export async function updateDish(
  dishId: number,
  data: UpdateDishRequest,
): Promise<DishDetailResponse> {
  try {
    const response = await axiosForBackend.patch<DishDetailResponse>(
      `/api/dishes/${dishId}`,
      data,
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error(`修改菜品失败 dishId=${dishId}`, error);
    throw error;
  }
}

/** 删除菜品 */
export async function deleteDish(
  dishId: number,
): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend.delete<{ success: boolean }>(
      `/api/dishes/${dishId}`,
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error(`删除菜品失败 dishId=${dishId}`, error);
    throw error;
  }
}

/** 上传菜品图片，返回可访问的 URL（/api/dishes/image/...） */
export async function uploadImage(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosForBackend.post<{ url: string }>(
      '/api/dishes/upload',
      formData,
      { headers: getDeviceHeaders() },
    );
    return response.data.url;
  } catch (error) {
    logger.error('上传图片失败', error);
    throw error;
  }
}

/** 保存当前菜单为历史菜单 */
export async function saveMenu(name?: string): Promise<SavedMenuDetail> {
  try {
    const response = await axiosForBackend.post<SavedMenuDetail>(
      '/api/dishes/menus/save',
      { name },
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error('保存历史菜单失败', error);
    throw error;
  }
}

/** 获取历史菜单列表 */
export async function listMenus(): Promise<SavedMenuListResponse> {
  try {
    const response = await axiosForBackend.get<SavedMenuListResponse>(
      '/api/dishes/menus/list',
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error('获取历史菜单列表失败', error);
    throw error;
  }
}

/** 获取某个历史菜单详情 */
export async function getMenu(menuId: string): Promise<SavedMenuDetail> {
  try {
    const response = await axiosForBackend.get<SavedMenuDetail>(
      `/api/dishes/menus/${menuId}`,
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error(`获取历史菜单详情失败 menuId=${menuId}`, error);
    throw error;
  }
}

/** 删除历史菜单 */
export async function deleteMenu(
  menuId: string,
): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend.delete<{ success: boolean }>(
      `/api/dishes/menus/${menuId}`,
      { headers: getDeviceHeaders() },
    );
    return response.data;
  } catch (error) {
    logger.error(`删除历史菜单失败 menuId=${menuId}`, error);
    throw error;
  }
}
