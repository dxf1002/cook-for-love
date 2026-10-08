export interface Dish {
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
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Combo {
  id: string;
  name: string;
  desc: string;
  rules: Record<string, number> | null;
}

export interface CartItem {
  id: string;
  dishId: number;
  dish?: Dish;
}

export interface FavoriteItem {
  id: string;
  dishId: number;
  dish?: Dish;
}

export interface ListDishesParams {
  category?: string;
}

export interface DishListResponse {
  items: Dish[];
}

export interface CartResponse {
  items: CartItem[];
  dishes: Dish[];
}

export interface FavoritesResponse {
  items: FavoriteItem[];
  dishes: Dish[];
}

export interface AddCartRequest {
  dishId: number;
}

export interface RemoveCartRequest {
  dishId: number;
}

export interface AddFavoriteRequest {
  dishId: number;
}

export interface RemoveFavoriteRequest {
  dishId: number;
}

export interface DishDetailResponse {
  dish: Dish;
  isFavorite: boolean;
  isInCart: boolean;
}

export interface CreateDishRequest {
  name: string;
  category: string;
  difficulty?: string;
  time?: string;
  description?: string;
  tags?: string[];
  ingredients?: string[];
  amounts?: string[];
  steps?: string[];
  tips?: string;
  imageUrl?: string;
}

export interface UpdateDishRequest {
  name?: string;
  category?: string;
  difficulty?: string;
  time?: string;
  description?: string;
  tags?: string[];
  ingredients?: string[];
  amounts?: string[];
  steps?: string[];
  tips?: string;
  imageUrl?: string;
}

export interface DeleteDishResponse {
  success: boolean;
}

export interface SavedMenuItem {
  id: string;
  dishId: number;
  name: string;
  category: string;
  color: string;
  imageUrl: string;
  position: number;
}

export interface SavedMenu {
  id: string;
  name: string;
  createdAt: string;
  itemCount: number;
}

export interface SavedMenuDetail {
  id: string;
  name: string;
  createdAt: string;
  items: SavedMenuItem[];
}

export interface SaveMenuRequest {
  name?: string;
}

export interface SaveMenuResponse {
  menu: SavedMenuDetail;
}

export interface SavedMenuListResponse {
  items: SavedMenu[];
}
