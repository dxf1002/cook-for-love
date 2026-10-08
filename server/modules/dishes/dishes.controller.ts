import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Headers,
  Res,
  BadRequestException,
  NotFoundException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import type { Request, Response } from 'express';
import { DishesService } from './dishes.service';
import type {
  DishListResponse,
  DishDetailResponse,
  CartResponse,
  FavoritesResponse,
  AddCartRequest,
  RemoveCartRequest,
  AddFavoriteRequest,
  RemoveFavoriteRequest,
  CreateDishRequest,
  UpdateDishRequest,
  SaveMenuRequest,
  SavedMenuDetail,
  SavedMenuListResponse,
} from '@shared/api.interface';

/** 本地图片上传目录（data/uploads，随数据目录一起自动创建）。 */
const UPLOADS_DIR = join(process.cwd(), 'data', 'uploads');

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

@Controller('api/dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  // ── dish list / detail ──────────────────────────────────

  @Get()
  async listDishes(
    @Query('category') category?: string,
  ): Promise<DishListResponse> {
    return this.dishesService.listDishes(category);
  }

  @Get('cart/list')
  async getCart(
    @Headers('x-device-id') deviceId?: string,
  ): Promise<CartResponse> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    return this.dishesService.getCart(deviceId);
  }

  @Get('favorites/list')
  async getFavorites(
    @Headers('x-device-id') deviceId?: string,
  ): Promise<FavoritesResponse> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    return this.dishesService.getFavorites(deviceId);
  }

  @Get(':id')
  async getDishDetail(
    @Param('id') id: string,
    @Headers('x-device-id') deviceId?: string,
  ): Promise<DishDetailResponse> {
    const dishId: number = parseInt(id, 10);
    if (isNaN(dishId)) {
      throw new BadRequestException('无效的菜品 ID');
    }
    return this.dishesService.getDishDetail(dishId, deviceId);
  }

  // ── dish management (新增 / 修改 / 删除) ─────────────────

  @Post()
  async createDish(
    @Body() body: CreateDishRequest,
  ): Promise<DishDetailResponse> {
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('菜品名称不能为空');
    }
    if (typeof body.category !== 'string' || !body.category.trim()) {
      throw new BadRequestException('请选择分类');
    }
    return this.dishesService.createDish(body);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok: boolean = IMAGE_EXT_RE.test(file.originalname);
        cb(ok ? null : new BadRequestException('仅支持图片文件'), ok);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }
    // 走 /api 前缀：dev 下被 Vite 代理到后端，prod 下与页面同源。
    return { url: `/api/dishes/image/${file.filename}` };
  }

  @Get('image/:filename')
  async getImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const safe: string = join(UPLOADS_DIR, filename).startsWith(UPLOADS_DIR)
      ? filename
      : '';
    const filePath: string = join(UPLOADS_DIR, safe);
    if (!safe || !existsSync(filePath)) {
      throw new NotFoundException('图片不存在');
    }
    res.sendFile(filePath);
  }

  @Patch(':id')
  async updateDish(
    @Param('id') id: string,
    @Body() body: UpdateDishRequest,
  ): Promise<DishDetailResponse> {
    const dishId: number = parseInt(id, 10);
    if (isNaN(dishId)) {
      throw new BadRequestException('无效的菜品 ID');
    }
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('没有可更新的字段');
    }
    return this.dishesService.updateDish(dishId, body);
  }

  @Delete(':id')
  async deleteDish(@Param('id') id: string): Promise<{ success: boolean }> {
    const dishId: number = parseInt(id, 10);
    if (isNaN(dishId)) {
      throw new BadRequestException('无效的菜品 ID');
    }
    return this.dishesService.deleteDish(dishId);
  }

  // ── 历史菜单（保存 / 列表 / 详情 / 删除） ───────────────

  @Post('menus/save')
  async saveMenu(
    @Headers('x-device-id') deviceId: string | undefined,
    @Body() body: SaveMenuRequest,
  ): Promise<SavedMenuDetail> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    return this.dishesService.saveMenu(deviceId, body?.name);
  }

  @Get('menus/list')
  async listMenus(
    @Headers('x-device-id') deviceId: string | undefined,
  ): Promise<SavedMenuListResponse> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    return this.dishesService.listMenus(deviceId);
  }

  @Get('menus/:id')
  async getMenu(
    @Headers('x-device-id') deviceId: string | undefined,
    @Param('id') id: string,
  ): Promise<SavedMenuDetail> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    if (!id) {
      throw new BadRequestException('无效的菜单 ID');
    }
    return this.dishesService.getMenu(deviceId, id);
  }

  @Delete('menus/:id')
  async deleteMenu(
    @Headers('x-device-id') deviceId: string | undefined,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    if (!id) {
      throw new BadRequestException('无效的菜单 ID');
    }
    return this.dishesService.deleteMenu(deviceId, id);
  }

  // ── cart ────────────────────────────────────────────────

  @Post('cart/add')
  async addToCart(
    @Headers('x-device-id') deviceId: string | undefined,
    @Body() body: AddCartRequest,
  ): Promise<{ success: boolean } & CartResponse> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    const dishId: number = Number(body.dishId);
    if (isNaN(dishId) || dishId <= 0) {
      throw new BadRequestException('无效的 dishId');
    }
    return this.dishesService.addToCart(deviceId, dishId);
  }

  @Post('cart/remove')
  async removeFromCart(
    @Headers('x-device-id') deviceId: string | undefined,
    @Body() body: RemoveCartRequest,
  ): Promise<{ success: boolean } & CartResponse> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    const dishId: number = Number(body.dishId);
    if (isNaN(dishId) || dishId <= 0) {
      throw new BadRequestException('无效的 dishId');
    }
    return this.dishesService.removeFromCart(deviceId, dishId);
  }

  @Post('cart/clear')
  async clearCart(
    @Headers('x-device-id') deviceId: string | undefined,
  ): Promise<{ success: boolean } & CartResponse> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    return this.dishesService.clearCart(deviceId);
  }

  // ── favorites ───────────────────────────────────────────

  @Post('favorites/add')
  async addFavorite(
    @Headers('x-device-id') deviceId: string | undefined,
    @Body() body: AddFavoriteRequest,
  ): Promise<{ success: boolean } & FavoritesResponse> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    const dishId: number = Number(body.dishId);
    if (isNaN(dishId) || dishId <= 0) {
      throw new BadRequestException('无效的 dishId');
    }
    return this.dishesService.addFavorite(deviceId, dishId);
  }

  @Post('favorites/remove')
  async removeFavorite(
    @Headers('x-device-id') deviceId: string | undefined,
    @Body() body: RemoveFavoriteRequest,
  ): Promise<{ success: boolean } & FavoritesResponse> {
    if (!deviceId) {
      throw new BadRequestException('缺少 x-device-id header');
    }
    const dishId: number = Number(body.dishId);
    if (isNaN(dishId) || dishId <= 0) {
      throw new BadRequestException('无效的 dishId');
    }
    return this.dishesService.removeFavorite(deviceId, dishId);
  }
}
