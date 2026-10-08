import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  customType,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

/**
 * JSON-array custom type for SQLite.
 *
 * SQLite does not have a native array type, so we serialise `string[]` values
 * to JSON text on write and parse them back on read.
 */
const jsonTextArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'text';
  },
  toDriver(value: string[]): string {
    return JSON.stringify(value ?? []);
  },
  fromDriver(value: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
});

/**
 * ISO timestamp custom type for SQLite.
 *
 * Stores timestamps as ISO-8601 strings in TEXT columns. Values are always
 * plain strings at runtime (no Date wrapping).
 */
const isoTimestamp = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'text';
  },
  toDriver(value: string): string {
    return value;
  },
  fromDriver(value: string): string {
    return value;
  },
});

// ── tables ───────────────────────────────────────────────────────────────

export const dish = sqliteTable(
  'dish',
  {
    id: text('id').primaryKey(),
    dishId: integer('dish_id').notNull(),
    name: text('name', { length: 100 }).notNull(),
    category: text('category', { length: 50 }).notNull(),
    tags: jsonTextArray('tags')
      .notNull()
      .default(sql`'[]'`),
    difficulty: text('difficulty', { length: 20 }).notNull(),
    time: text('time', { length: 20 }).notNull(),
    description: text('description').notNull(),
    ingredients: jsonTextArray('ingredients')
      .notNull()
      .default(sql`'[]'`),
    amounts: jsonTextArray('amounts')
      .notNull()
      .default(sql`'[]'`),
    steps: jsonTextArray('steps')
      .notNull()
      .default(sql`'[]'`),
    tips: text('tips').notNull(),
    imageUrl: text('image_url').notNull(),
    color: text('color', { length: 20 }).notNull().default('#FF8A7A'),
    createdAt: isoTimestamp('_created_at').notNull(),
    createdBy: text('_created_by'),
    updatedAt: isoTimestamp('_updated_at').notNull(),
    updatedBy: text('_updated_by'),
  },
  (table) => [uniqueIndex('dish_dish_id_key').on(table.dishId)],
);

export const cartItem = sqliteTable(
  'cart_item',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id', { length: 100 }).notNull(),
    dishId: integer('dish_id').notNull(),
    createdAt: isoTimestamp('_created_at').notNull(),
    createdBy: text('_created_by'),
    updatedAt: isoTimestamp('_updated_at').notNull(),
    updatedBy: text('_updated_by'),
  },
  (table) => [
    uniqueIndex('idx_cart_device_dish').on(table.deviceId, table.dishId),
  ],
);

export const favorite = sqliteTable(
  'favorite',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id', { length: 100 }).notNull(),
    dishId: integer('dish_id').notNull(),
    createdAt: isoTimestamp('_created_at').notNull(),
    createdBy: text('_created_by'),
    updatedAt: isoTimestamp('_updated_at').notNull(),
    updatedBy: text('_updated_by'),
  },
  (table) => [
    uniqueIndex('idx_fav_device_dish').on(table.deviceId, table.dishId),
  ],
);

export const guestUser = sqliteTable(
  'guest_user',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id', { length: 100 }).notNull(),
    createdAt: isoTimestamp('_created_at').notNull(),
    createdBy: text('_created_by'),
    updatedAt: isoTimestamp('_updated_at').notNull(),
    updatedBy: text('_updated_by'),
  },
  (table) => [uniqueIndex('guest_user_device_id_key').on(table.deviceId)],
);

export const savedMenu = sqliteTable(
  'saved_menu',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id', { length: 100 }).notNull(),
    name: text('name', { length: 100 }).notNull(),
    createdAt: isoTimestamp('_created_at').notNull(),
    createdBy: text('_created_by'),
    updatedAt: isoTimestamp('_updated_at').notNull(),
    updatedBy: text('_updated_by'),
  },
  (table) => [index('idx_saved_menu_device').on(table.deviceId)],
);

export const savedMenuItem = sqliteTable(
  'saved_menu_item',
  {
    id: text('id').primaryKey(),
    menuId: text('menu_id')
      .notNull()
      .references(() => savedMenu.id, { onDelete: 'cascade' }),
    dishId: integer('dish_id').notNull(),
    name: text('name', { length: 100 }).notNull(),
    category: text('category', { length: 50 }).notNull(),
    color: text('color', { length: 20 }).notNull().default('#FF8A7A'),
    imageUrl: text('image_url').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: isoTimestamp('_created_at').notNull(),
    createdBy: text('_created_by'),
    updatedAt: isoTimestamp('_updated_at').notNull(),
    updatedBy: text('_updated_by'),
  },
  (table) => [index('idx_saved_menu_item_menu').on(table.menuId)],
);

// ── type helpers ─────────────────────────────────────────────────────────

export type DishInsert = typeof dish.$inferInsert;
export type DishSelect = typeof dish.$inferSelect;
export type CartItemInsert = typeof cartItem.$inferInsert;
export type CartItemSelect = typeof cartItem.$inferSelect;
export type FavoriteInsert = typeof favorite.$inferInsert;
export type FavoriteSelect = typeof favorite.$inferSelect;
export type SavedMenuInsert = typeof savedMenu.$inferInsert;
export type SavedMenuSelect = typeof savedMenu.$inferSelect;
export type SavedMenuItemInsert = typeof savedMenuItem.$inferInsert;
export type SavedMenuItemSelect = typeof savedMenuItem.$inferSelect;

// table aliases (keep parity with pg schema)
export const cartItemTable = cartItem;
export const dishTable = dish;
export const favoriteTable = favorite;
export const guestUserTable = guestUser;
export const savedMenuTable = savedMenu;
export const savedMenuItemTable = savedMenuItem;
