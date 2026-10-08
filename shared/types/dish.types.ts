/**
 * Shared dish-related business types.
 *
 * These interfaces are independent of any specific database driver so that
 * service layers can rely on pure data contracts rather than Drizzle inferred
 * schema types.
 */

export interface DishEntity {
  id: string;
  dishId: number;
  name: string;
  category: string;
  tags: string[];
  difficulty: string;
  time: string;
  description: string;
  ingredients: string[];
  amounts: string[];
  steps: string[];
  tips: string;
  imageUrl: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CartItemEntity {
  id: string;
  deviceId: string;
  dishId: number;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteItemEntity {
  id: string;
  deviceId: string;
  dishId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuestUserEntity {
  id: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
}
