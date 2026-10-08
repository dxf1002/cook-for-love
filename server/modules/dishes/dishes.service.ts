import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, asc, inArray, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import {
  DATABASE,
  type AppDatabase,
} from '@server/modules/database/database.module';
import {
  dish,
  cartItem,
  favorite,
  savedMenu,
  savedMenuItem,
  type DishSelect,
  type CartItemSelect,
  type FavoriteSelect,
  type SavedMenuSelect,
  type SavedMenuItemSelect,
} from '@server/database/schema.sqlite';
import { CATEGORY_COLORS, getDishImageUrl } from '@server/database/seed-dishes';
import type {
  Dish,
  CartItem,
  FavoriteItem,
  DishListResponse,
  DishDetailResponse,
  CartResponse,
  FavoritesResponse,
  CreateDishRequest,
  UpdateDishRequest,
  SavedMenu,
  SavedMenuDetail,
  SavedMenuItem,
  SavedMenuListResponse,
} from '@shared/api.interface';

@Injectable()
export class DishesService {
  private readonly logger = new Logger(DishesService.name);

  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  // ── field mapping helpers ───────────────────────────────

  private mapDish(row: DishSelect): Dish {
    return {
      id: row.id,
      dishId: row.dishId,
      name: row.name,
      category: row.category,
      tags: row.tags ?? [],
      difficulty: row.difficulty,
      time: row.time,
      description: row.description,
      ingredients: row.ingredients ?? [],
      amounts: row.amounts ?? [],
      steps: row.steps ?? [],
      tips: row.tips,
      imageUrl: row.imageUrl,
      color: row.color,
    };
  }

  private mapCartItem(row: CartItemSelect): CartItem {
    return {
      id: row.id,
      dishId: row.dishId,
    };
  }

  private mapFavoriteItem(row: FavoriteSelect): FavoriteItem {
    return {
      id: row.id,
      dishId: row.dishId,
    };
  }

  // ── dish list / detail ──────────────────────────────────

  async listDishes(category?: string): Promise<DishListResponse> {
    try {
      const baseQuery = this.db.select().from(dish);
      const query = category
        ? baseQuery.where(eq(dish.category, category))
        : baseQuery;
      const rows: DishSelect[] = query.orderBy(asc(dish.dishId)).all();
      const items: Dish[] = rows.map((row: DishSelect) => this.mapDish(row));
      return { items };
    } catch (error) {
      this.logger.error(`获取菜品列表失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async getDishDetail(
    dishId: number,
    deviceId?: string,
  ): Promise<DishDetailResponse> {
    try {
      const row: DishSelect | undefined = this.db
        .select()
        .from(dish)
        .where(eq(dish.dishId, dishId))
        .limit(1)
        .get();

      if (!row) {
        throw new NotFoundException('菜品不存在');
      }

      const dishData: Dish = this.mapDish(row);
      let isFavorite = false;
      let isInCart = false;

      if (deviceId) {
        const favRow = this.db
          .select({ id: favorite.id })
          .from(favorite)
          .where(
            and(eq(favorite.deviceId, deviceId), eq(favorite.dishId, dishId)),
          )
          .limit(1)
          .get();
        isFavorite = Boolean(favRow);

        const cartRow = this.db
          .select({ id: cartItem.id })
          .from(cartItem)
          .where(
            and(eq(cartItem.deviceId, deviceId), eq(cartItem.dishId, dishId)),
          )
          .limit(1)
          .get();
        isInCart = Boolean(cartRow);
      }

      return { dish: dishData, isFavorite, isInCart };
    } catch (error) {
      this.logger.error(
        `获取菜品详情失败 dishId=${dishId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  // ── dish management (新增 / 修改 / 删除) ─────────────────

  async createDish(data: CreateDishRequest): Promise<DishDetailResponse> {
    try {
      const name: string = data.name.trim();
      const category: string = data.category.trim();
      if (!name) {
        throw new BadRequestException('菜品名称不能为空');
      }
      if (!(category in CATEGORY_COLORS)) {
        throw new BadRequestException('无效的分类');
      }

      const latest = this.db
        .select({ dishId: dish.dishId })
        .from(dish)
        .orderBy(desc(dish.dishId))
        .limit(1)
        .get();
      const nextDishId: number = (latest?.dishId ?? 0) + 1;
      const now: string = new Date().toISOString();

      const values: typeof dish.$inferInsert = {
        id: randomUUID(),
        dishId: nextDishId,
        name,
        category,
        tags: data.tags ?? [],
        difficulty: data.difficulty ?? '简单',
        time: data.time ?? '10分钟',
        description: data.description ?? '',
        ingredients: data.ingredients ?? [],
        amounts: data.amounts ?? [],
        steps: data.steps ?? [],
        tips: data.tips ?? '',
        imageUrl: data.imageUrl?.trim() || getDishImageUrl(nextDishId),
        color: CATEGORY_COLORS[category],
        createdAt: now,
        updatedAt: now,
      };
      this.db.insert(dish).values(values).run();

      return {
        dish: this.mapDish(values as DishSelect),
        isFavorite: false,
        isInCart: false,
      };
    } catch (error) {
      this.logger.error(`新增菜品失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async updateDish(
    dishId: number,
    data: UpdateDishRequest,
  ): Promise<DishDetailResponse> {
    try {
      const existing: DishSelect | undefined = this.db
        .select()
        .from(dish)
        .where(eq(dish.dishId, dishId))
        .limit(1)
        .get();
      if (!existing) {
        throw new NotFoundException('菜品不存在');
      }

      const patch: Partial<typeof dish.$inferInsert> = {};
      if (data.name !== undefined) {
        const name: string = data.name.trim();
        if (!name) throw new BadRequestException('菜品名称不能为空');
        patch.name = name;
      }
      if (data.category !== undefined) {
        const category: string = data.category.trim();
        if (!(category in CATEGORY_COLORS)) {
          throw new BadRequestException('无效的分类');
        }
        patch.category = category;
        patch.color = CATEGORY_COLORS[category];
      }
      if (data.difficulty !== undefined) patch.difficulty = data.difficulty;
      if (data.time !== undefined) patch.time = data.time;
      if (data.description !== undefined) patch.description = data.description;
      if (data.tags !== undefined) patch.tags = data.tags;
      if (data.ingredients !== undefined) patch.ingredients = data.ingredients;
      if (data.amounts !== undefined) patch.amounts = data.amounts;
      if (data.steps !== undefined) patch.steps = data.steps;
      if (data.tips !== undefined) patch.tips = data.tips;
      if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl.trim();
      patch.updatedAt = new Date().toISOString();

      this.db.update(dish).set(patch).where(eq(dish.dishId, dishId)).run();

      const updated: DishSelect | undefined = this.db
        .select()
        .from(dish)
        .where(eq(dish.dishId, dishId))
        .limit(1)
        .get();
      return {
        dish: this.mapDish(updated as DishSelect),
        isFavorite: false,
        isInCart: false,
      };
    } catch (error) {
      this.logger.error(
        `修改菜品失败 dishId=${dishId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async deleteDish(dishId: number): Promise<{ success: boolean }> {
    try {
      const existing = this.db
        .select({ id: dish.id })
        .from(dish)
        .where(eq(dish.dishId, dishId))
        .limit(1)
        .get();
      if (!existing) {
        throw new NotFoundException('菜品不存在');
      }
      this.db.delete(dish).where(eq(dish.dishId, dishId)).run();
      this.db.delete(cartItem).where(eq(cartItem.dishId, dishId)).run();
      this.db.delete(favorite).where(eq(favorite.dishId, dishId)).run();
      return { success: true };
    } catch (error) {
      this.logger.error(
        `删除菜品失败 dishId=${dishId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  // ── 历史菜单（保存 / 列表 / 详情 / 删除） ───────────────

  async saveMenu(deviceId: string, name?: string): Promise<SavedMenuDetail> {
    try {
      const cartRows: CartItemSelect[] = this.db
        .select()
        .from(cartItem)
        .where(eq(cartItem.deviceId, deviceId))
        .all();
      if (cartRows.length === 0) {
        throw new BadRequestException('当前菜单为空，无法保存');
      }

      const dishIds: number[] = cartRows.map((row) => row.dishId);
      const dishMap = new Map<number, DishSelect>();
      if (dishIds.length > 0) {
        const rows = this.db
          .select()
          .from(dish)
          .where(inArray(dish.dishId, dishIds))
          .all();
        for (const row of rows) dishMap.set(row.dishId, row);
      }

      const now: string = new Date().toISOString();
      const menuId: string = randomUUID();
      const menuName: string =
        (name ?? '').trim() ||
        `菜单 · ${new Date().toLocaleString('zh-CN', { hour12: false })}`;

      this.db.transaction((tx) => {
        tx.insert(savedMenu)
          .values({
            id: menuId,
            deviceId,
            name: menuName,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        cartRows.forEach((row, index) => {
          const d: DishSelect | undefined = dishMap.get(row.dishId);
          tx.insert(savedMenuItem)
            .values({
              id: randomUUID(),
              menuId,
              dishId: row.dishId,
              name: d?.name ?? `已删除菜品 #${row.dishId}`,
              category: d?.category ?? 'other',
              color: d?.color ?? '#FF8A7A',
              imageUrl: d?.imageUrl ?? '',
              position: index,
              createdAt: now,
              updatedAt: now,
            })
            .run();
        });
      });

      return this.buildMenuDetail(menuId, menuName, now);
    } catch (error) {
      this.logger.error(`保存历史菜单失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async listMenus(deviceId: string): Promise<SavedMenuListResponse> {
    try {
      const menus: SavedMenuSelect[] = this.db
        .select()
        .from(savedMenu)
        .where(eq(savedMenu.deviceId, deviceId))
        .orderBy(desc(savedMenu.createdAt))
        .all();

      const items: SavedMenuItemSelect[] =
        menus.length > 0
          ? this.db
              .select()
              .from(savedMenuItem)
              .where(
                inArray(
                  savedMenuItem.menuId,
                  menus.map((m) => m.id),
                ),
              )
              .all()
          : [];
      const countByMenu = new Map<string, number>();
      for (const item of items) {
        countByMenu.set(item.menuId, (countByMenu.get(item.menuId) ?? 0) + 1);
      }

      return {
        items: menus.map((m) => ({
          id: m.id,
          name: m.name,
          createdAt: m.createdAt,
          itemCount: countByMenu.get(m.id) ?? 0,
        })),
      };
    } catch (error) {
      this.logger.error(`获取历史菜单列表失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async getMenu(deviceId: string, menuId: string): Promise<SavedMenuDetail> {
    try {
      const menu: SavedMenuSelect | undefined = this.db
        .select()
        .from(savedMenu)
        .where(and(eq(savedMenu.id, menuId), eq(savedMenu.deviceId, deviceId)))
        .limit(1)
        .get();
      if (!menu) {
        throw new NotFoundException('历史菜单不存在');
      }
      return this.buildMenuDetail(menu.id, menu.name, menu.createdAt);
    } catch (error) {
      this.logger.error(
        `获取历史菜单详情失败 menuId=${menuId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async deleteMenu(
    deviceId: string,
    menuId: string,
  ): Promise<{ success: boolean }> {
    try {
      const menu: SavedMenuSelect | undefined = this.db
        .select()
        .from(savedMenu)
        .where(and(eq(savedMenu.id, menuId), eq(savedMenu.deviceId, deviceId)))
        .limit(1)
        .get();
      if (!menu) {
        throw new NotFoundException('历史菜单不存在');
      }
      this.db.delete(savedMenu).where(eq(savedMenu.id, menuId)).run();
      this.db
        .delete(savedMenuItem)
        .where(eq(savedMenuItem.menuId, menuId))
        .run();
      return { success: true };
    } catch (error) {
      this.logger.error(
        `删除历史菜单失败 menuId=${menuId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  private buildMenuDetail(
    menuId: string,
    name: string,
    createdAt: string,
  ): SavedMenuDetail {
    const itemRows: SavedMenuItemSelect[] = this.db
      .select()
      .from(savedMenuItem)
      .where(eq(savedMenuItem.menuId, menuId))
      .orderBy(asc(savedMenuItem.position))
      .all();
    const items: SavedMenuItem[] = itemRows.map((row) => ({
      id: row.id,
      dishId: row.dishId,
      name: row.name,
      category: row.category,
      color: row.color,
      imageUrl: row.imageUrl,
      position: row.position,
    }));
    return { id: menuId, name, createdAt, items };
  }

  // ── cart ────────────────────────────────────────────────

  async getCart(deviceId: string): Promise<CartResponse> {
    try {
      const cartRows: CartItemSelect[] = this.db
        .select()
        .from(cartItem)
        .where(eq(cartItem.deviceId, deviceId))
        .orderBy(asc(cartItem.dishId))
        .all();

      const items: CartItem[] = cartRows.map((row: CartItemSelect) =>
        this.mapCartItem(row),
      );

      const dishes: Dish[] = this.getDishesByDishIds(
        items.map((it: CartItem) => it.dishId),
      );

      return { items, dishes };
    } catch (error) {
      this.logger.error(`获取购物车失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async addToCart(
    deviceId: string,
    dishId: number,
  ): Promise<{ success: boolean } & CartResponse> {
    try {
      const now: string = new Date().toISOString();
      this.db
        .insert(cartItem)
        .values({
          id: randomUUID(),
          deviceId,
          dishId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: [cartItem.deviceId, cartItem.dishId] })
        .run();

      const cart: CartResponse = await this.getCart(deviceId);
      return { success: true, ...cart };
    } catch (error) {
      this.logger.error(`添加购物车失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async removeFromCart(
    deviceId: string,
    dishId: number,
  ): Promise<{ success: boolean } & CartResponse> {
    try {
      this.db
        .delete(cartItem)
        .where(
          and(eq(cartItem.deviceId, deviceId), eq(cartItem.dishId, dishId)),
        )
        .run();

      const cart: CartResponse = await this.getCart(deviceId);
      return { success: true, ...cart };
    } catch (error) {
      this.logger.error(`移除购物车失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async clearCart(
    deviceId: string,
  ): Promise<{ success: boolean } & CartResponse> {
    try {
      this.db.delete(cartItem).where(eq(cartItem.deviceId, deviceId)).run();
      return { success: true, items: [], dishes: [] };
    } catch (error) {
      this.logger.error(`清空购物车失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  // ── favorites ───────────────────────────────────────────

  async getFavorites(deviceId: string): Promise<FavoritesResponse> {
    try {
      const favRows: FavoriteSelect[] = this.db
        .select()
        .from(favorite)
        .where(eq(favorite.deviceId, deviceId))
        .orderBy(asc(favorite.dishId))
        .all();

      const items: FavoriteItem[] = favRows.map((row: FavoriteSelect) =>
        this.mapFavoriteItem(row),
      );

      const dishes: Dish[] = this.getDishesByDishIds(
        items.map((it: FavoriteItem) => it.dishId),
      );

      return { items, dishes };
    } catch (error) {
      this.logger.error(`获取收藏列表失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async addFavorite(
    deviceId: string,
    dishId: number,
  ): Promise<{ success: boolean } & FavoritesResponse> {
    try {
      const now: string = new Date().toISOString();
      this.db
        .insert(favorite)
        .values({
          id: randomUUID(),
          deviceId,
          dishId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({
          target: [favorite.deviceId, favorite.dishId],
        })
        .run();

      const favs: FavoritesResponse = await this.getFavorites(deviceId);
      return { success: true, ...favs };
    } catch (error) {
      this.logger.error(`添加收藏失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async removeFavorite(
    deviceId: string,
    dishId: number,
  ): Promise<{ success: boolean } & FavoritesResponse> {
    try {
      this.db
        .delete(favorite)
        .where(
          and(eq(favorite.deviceId, deviceId), eq(favorite.dishId, dishId)),
        )
        .run();

      const favs: FavoritesResponse = await this.getFavorites(deviceId);
      return { success: true, ...favs };
    } catch (error) {
      this.logger.error(`移除收藏失败: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  // ── private: batch dish lookup ──────────────────────────

  private getDishesByDishIds(dishIds: number[]): Dish[] {
    if (dishIds.length === 0) return [];

    const rows: DishSelect[] = this.db
      .select()
      .from(dish)
      .where(inArray(dish.dishId, dishIds))
      .orderBy(asc(dish.dishId))
      .all();

    return rows.map((row: DishSelect) => this.mapDish(row));
  }
}
