<template>
  <view class="page">
    <!-- Top bar -->
    <view class="topbar">
      <view class="topbar-btn" @click="goBack">‹</view>
      <view class="topbar-btn" @click="handleToggleFavorite">
        <text :class="isFavorite ? 'fav-on' : 'fav-off'">♥</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-text">加载中...</view>

    <!-- 未找到 -->
    <view v-else-if="!dish" class="notfound">
      <text class="notfound-text">菜品不存在</text>
      <text class="notfound-back" @click="goBack">返回</text>
    </view>

    <template v-else>
      <!-- Hero -->
      <view class="hero">
        <image
          v-if="hasImage"
          :src="resolveImageUrl(dish.imageUrl)"
          mode="aspectFill"
          class="hero-img"
        />
        <view
          v-else
          class="hero-fallback"
          :style="{ backgroundColor: dish.color }"
        >
          <text class="hero-char font-handwriting">{{ firstChar }}</text>
        </view>
      </view>

      <view class="content">
        <!-- 信息卡 -->
        <view class="card">
          <text class="dish-name font-handwriting">{{ dish.name }}</text>
          <text class="dish-desc">{{ dish.description }}</text>
          <view class="tags">
            <text class="tag">👨‍🍳 {{ dish.difficulty }}</text>
            <text class="tag">⏱ {{ dish.time }}</text>
            <text class="tag">🏷 {{ categoryName }}</text>
          </view>
          <view class="card-actions">
            <view class="btn-edit" @click="openEdit">✎ 编辑</view>
            <view class="btn-delete" @click="handleDelete">
              {{ deleting ? '删除中...' : '🗑 删除' }}
            </view>
          </view>
        </view>

        <!-- 食材 -->
        <view class="card">
          <text class="card-title font-handwriting">食材清单</text>
          <view
            v-for="(ingredient, index) in dish.ingredients"
            :key="`${ingredient}-${index}`"
            class="ingredient"
          >
            <view class="ingredient-left">
              <view class="ingredient-dot" />
              <text class="ingredient-name">{{ ingredient }}</text>
            </view>
            <text class="ingredient-amount">
              {{ dish.amounts[index] ?? '' }}
            </text>
          </view>
        </view>

        <!-- 步骤 -->
        <view class="card">
          <text class="card-title font-handwriting">烹饪步骤</text>
          <view v-for="(step, index) in dish.steps" :key="index" class="step">
            <view class="step-num">{{ index + 1 }}</view>
            <text class="step-text">{{ step }}</text>
          </view>
        </view>

        <!-- 小贴士 -->
        <view v-if="dish.tips && dish.tips.length" class="card tips-card">
          <text class="card-title font-handwriting">💡 小贴士</text>
          <text class="tips-text">{{ dish.tips }}</text>
        </view>

        <view class="bottom-space" />
      </view>

      <!-- 底部栏 -->
      <view class="bottom-bar">
        <view class="cart-info" @click="goCart">
          <text class="cart-icon">🛒</text>
          <text class="cart-text">
            已选 <text class="cart-num">{{ cartCount }}</text> 道 · 查看菜单
          </text>
        </view>
        <view
          class="btn-add"
          :class="{ added: isInCart }"
          @click="handleAddToCart"
        >
          {{ isInCart ? '✓ 已加入' : '＋ 加入菜单' }}
        </view>
      </view>

      <!-- 编辑弹窗 -->
      <view v-if="showEditModal" class="modal-mask" @click="closeEdit">
        <view class="modal" @click.stop>
          <view class="modal-head">
            <text class="modal-title font-handwriting">编辑菜品</text>
            <text class="modal-close" @click="closeEdit">✕</text>
          </view>
          <scroll-view scroll-y class="modal-body">
            <view class="field">
              <text class="label">名称 *</text>
              <input v-model="editForm.name" class="input" />
            </view>
            <view class="field-row">
              <view class="field half">
                <text class="label">分类</text>
                <picker :range="categoryNames" @change="onEditCategory">
                  <view class="picker">{{ editCategoryName }}</view>
                </picker>
              </view>
              <view class="field half">
                <text class="label">难度</text>
                <picker :range="difficulties" @change="onEditDifficulty">
                  <view class="picker">{{ editForm.difficulty }}</view>
                </picker>
              </view>
            </view>
            <view class="field">
              <text class="label">用时</text>
              <input v-model="editForm.time" class="input" />
            </view>
            <view class="field">
              <text class="label">描述</text>
              <textarea v-model="editForm.description" class="textarea" />
            </view>
            <view class="field">
              <text class="label">标签</text>
              <input
                v-model="editForm.tags"
                class="input"
                placeholder="逗号分隔"
              />
            </view>
            <view class="field">
              <text class="label">食材</text>
              <input
                v-model="editForm.ingredients"
                class="input"
                placeholder="逗号分隔"
              />
            </view>
            <view class="field">
              <text class="label">用量</text>
              <input
                v-model="editForm.amounts"
                class="input"
                placeholder="逗号分隔"
              />
            </view>
            <view class="field">
              <text class="label">烹饪步骤</text>
              <textarea
                v-model="editForm.steps"
                class="textarea"
                placeholder="每行一步"
              />
            </view>
            <view class="field">
              <text class="label">小贴士</text>
              <textarea v-model="editForm.tips" class="textarea" />
            </view>
            <view class="field">
              <text class="label">菜品图片</text>
              <view class="img-row">
                <image
                  v-if="editForm.imageUrl"
                  :src="resolveImageUrl(editForm.imageUrl)"
                  mode="aspectFill"
                  class="img-preview"
                />
                <view v-else class="img-placeholder">图</view>
                <view class="img-actions">
                  <input
                    v-model="editForm.imageUrl"
                    class="input"
                    placeholder="粘贴链接或本地上传"
                  />
                  <view class="btn-upload" @click="chooseEditImage">
                    {{ uploadingEdit ? '上传中...' : '本地上传' }}
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
          <text v-if="editError" class="form-error">{{ editError }}</text>
          <view class="modal-foot">
            <view class="btn-cancel" @click="closeEdit">取消</view>
            <view
              class="btn-save2"
              :class="{ disabled: savingEdit }"
              @click="handleEditSubmit"
            >
              {{ savingEdit ? '保存中...' : '保存' }}
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { logger } from '../../utils/logger';
import { CATEGORY_MAP, CATEGORIES } from '../../utils/constants';
import {
  getDishDetail,
  getCart,
  addFavorite,
  removeFavorite,
  addToCart,
  updateDish,
  deleteDish,
  uploadImage,
} from '../../api/dishes';
import { resolveImageUrl } from '../../api/request';
import type { Dish } from '../../../shared/api.interface';

const dishId = ref(0);
const dish = ref<Dish | null>(null);
const isFavorite = ref(false);
const isInCart = ref(false);
const loading = ref(true);
const cartCount = ref(0);
const deleting = ref(false);

const showEditModal = ref(false);
const savingEdit = ref(false);
const uploadingEdit = ref(false);
const editError = ref<string | null>(null);

const difficulties = ['简单', '中等', '困难'];
const categoryNames = CATEGORIES.map((c) => c.name);

const editForm = reactive({
  name: '',
  category: '',
  difficulty: '简单',
  time: '',
  description: '',
  tags: '',
  ingredients: '',
  amounts: '',
  steps: '',
  tips: '',
  imageUrl: '',
});

const hasImage = computed(
  () => !!(dish.value?.imageUrl && dish.value.imageUrl.length > 0),
);
const firstChar = computed(() => dish.value?.name.charAt(0) ?? '');
const categoryName = computed(() => {
  if (!dish.value) return '';
  return CATEGORY_MAP[dish.value.category]?.name ?? dish.value.category;
});
const editCategoryName = computed(
  () => CATEGORIES.find((c) => c.id === editForm.category)?.name ?? '',
);

function splitList(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function fetchDetail(): Promise<void> {
  try {
    loading.value = true;
    const [detail, cartData] = await Promise.all([
      getDishDetail(dishId.value),
      getCart(),
    ]);
    dish.value = detail.dish;
    isFavorite.value = detail.isFavorite;
    isInCart.value = detail.isInCart;
    cartCount.value = cartData.items.length;
  } catch (err) {
    logger.error('加载菜品详情失败', err);
  } finally {
    loading.value = false;
  }
}

async function handleToggleFavorite(): Promise<void> {
  if (!dish.value) return;
  try {
    if (isFavorite.value) {
      await removeFavorite(dish.value.dishId);
      isFavorite.value = false;
    } else {
      await addFavorite(dish.value.dishId);
      isFavorite.value = true;
    }
  } catch (err) {
    logger.error('切换收藏状态失败', err);
  }
}

async function handleAddToCart(): Promise<void> {
  if (!dish.value || isInCart.value) return;
  try {
    await addToCart(dish.value.dishId);
    isInCart.value = true;
    cartCount.value += 1;
    uni.showToast({ title: '已加入菜单', icon: 'success' });
  } catch (err) {
    logger.error('加入购物车失败', err);
  }
}

function goBack(): void {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/menu/menu' }),
  });
}
function goCart(): void {
  uni.switchTab({ url: '/pages/cart/cart' });
}

function openEdit(): void {
  if (!dish.value) return;
  const d = dish.value;
  editForm.name = d.name;
  editForm.category = d.category;
  editForm.difficulty = d.difficulty;
  editForm.time = d.time;
  editForm.description = d.description;
  editForm.tags = (d.tags ?? []).join(',');
  editForm.ingredients = (d.ingredients ?? []).join(',');
  editForm.amounts = (d.amounts ?? []).join(',');
  editForm.steps = (d.steps ?? []).join('\n');
  editForm.tips = d.tips;
  editForm.imageUrl = d.imageUrl;
  editError.value = null;
  showEditModal.value = true;
}
function closeEdit(): void {
  if (savingEdit.value) return;
  showEditModal.value = false;
}
function onEditCategory(e: { detail: { value: string | number } }): void {
  editForm.category = CATEGORIES[Number(e.detail.value)].id;
}
function onEditDifficulty(e: { detail: { value: string | number } }): void {
  editForm.difficulty = difficulties[Number(e.detail.value)];
}
function chooseEditImage(): void {
  if (uploadingEdit.value) return;
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0];
      if (!filePath) return;
      uploadingEdit.value = true;
      editError.value = null;
      try {
        editForm.imageUrl = await uploadImage(filePath);
      } catch (err) {
        logger.error('上传图片失败', err);
        editError.value = '图片上传失败，请重试';
      } finally {
        uploadingEdit.value = false;
      }
    },
  });
}
async function handleEditSubmit(): Promise<void> {
  if (!dish.value || savingEdit.value) return;
  if (!editForm.name.trim()) {
    editError.value = '名称不能为空';
    return;
  }
  savingEdit.value = true;
  editError.value = null;
  try {
    const tags = splitList(editForm.tags);
    const ingredients = splitList(editForm.ingredients);
    const amounts = splitList(editForm.amounts);
    const steps = editForm.steps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await updateDish(dish.value.dishId, {
      name: editForm.name.trim(),
      category: editForm.category,
      difficulty: editForm.difficulty,
      time: editForm.time.trim() || undefined,
      description: editForm.description.trim() || undefined,
      tags: tags.length ? tags : undefined,
      ingredients: ingredients.length ? ingredients : undefined,
      amounts: amounts.length ? amounts : undefined,
      steps: steps.length ? steps : undefined,
      tips: editForm.tips.trim() || undefined,
      imageUrl: editForm.imageUrl.trim() || undefined,
    });
    dish.value = res.dish;
    showEditModal.value = false;
    uni.showToast({ title: '已保存', icon: 'success' });
  } catch (err) {
    logger.error('更新菜品失败', err);
    editError.value = '保存失败，请重试';
  } finally {
    savingEdit.value = false;
  }
}
async function handleDelete(): Promise<void> {
  if (!dish.value || deleting.value) return;
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '提示',
      content: `确定删除「${dish.value?.name}」吗？`,
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    });
  });
  if (!res) return;
  deleting.value = true;
  try {
    await deleteDish(dish.value.dishId);
    uni.showToast({ title: '已删除', icon: 'success' });
    setTimeout(() => goBack(), 500);
  } catch (err) {
    logger.error('删除菜品失败', err);
    uni.showToast({ title: '删除失败', icon: 'none' });
  } finally {
    deleting.value = false;
  }
}

onLoad((query) => {
  dishId.value = Number(query?.id ?? 0);
  if (!dishId.value || Number.isNaN(dishId.value)) {
    loading.value = false;
    return;
  }
  void fetchDetail();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f8f5f0;
  padding-bottom: 200rpx;
}
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-top: calc(24rpx + env(safe-area-inset-top));
}
.topbar-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #3e3a33;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}
.fav-on {
  color: #ff7a6b;
}
.fav-off {
  color: #9a928a;
}
.state-text {
  padding: 200rpx 0;
  text-align: center;
  color: #9a928a;
  font-size: 28rpx;
}
.notfound {
  padding: 200rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.notfound-text {
  color: #9a928a;
  font-size: 28rpx;
}
.notfound-back {
  margin-top: 24rpx;
  color: #ff7a6b;
}
.hero {
  position: relative;
  width: 100%;
  height: 480rpx;
}
.hero-img {
  width: 100%;
  height: 100%;
}
.hero-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-char {
  font-size: 160rpx;
  color: #fff;
}
.content {
  padding: 0 32rpx;
  margin-top: -40rpx;
  position: relative;
  z-index: 10;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(74, 55, 40, 0.06);
}
.dish-name {
  font-size: 44rpx;
  color: #3e3a33;
}
.dish-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #9a928a;
  line-height: 1.6;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}
.tag {
  background: #f5f2ec;
  border-radius: 999rpx;
  padding: 10rpx 24rpx;
  font-size: 24rpx;
  color: #6b625a;
}
.card-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.btn-edit {
  background: #f3ead9;
  color: #3e3a33;
  border-radius: 999rpx;
  padding: 16rpx 40rpx;
  font-size: 26rpx;
}
.btn-delete {
  background: #fdecec;
  color: #e5484d;
  border-radius: 999rpx;
  padding: 16rpx 40rpx;
  font-size: 26rpx;
}
.card-title {
  font-size: 34rpx;
  color: #3e3a33;
  margin-bottom: 20rpx;
  display: block;
}
.ingredient {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.ingredient-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ingredient-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 122, 107, 0.6);
}
.ingredient-name {
  font-size: 28rpx;
  color: #3e3a33;
}
.ingredient-amount {
  font-size: 24rpx;
  color: #9a928a;
}
.step {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.step-num {
  width: 52rpx;
  height: 52rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  font-size: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-text {
  flex: 1;
  padding-top: 8rpx;
  font-size: 28rpx;
  color: #3e3a33;
  line-height: 1.6;
}
.tips-card {
  background: #f3ead9;
}
.tips-text {
  font-size: 26rpx;
  color: #6b625a;
  line-height: 1.6;
}
.bottom-space {
  height: 40rpx;
}
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.97);
  border-top: 1rpx solid #ece7de;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 90;
}
.cart-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cart-icon {
  font-size: 40rpx;
}
.cart-text {
  font-size: 26rpx;
  color: #3e3a33;
}
.cart-num {
  color: #ff7a6b;
  font-weight: 700;
}
.btn-add {
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  border-radius: 999rpx;
  padding: 22rpx 56rpx;
  font-size: 30rpx;
}
.btn-add.added {
  background: #ece7de;
  color: #9a928a;
}
.modal-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.modal {
  width: 100%;
  max-height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.modal-title {
  font-size: 36rpx;
  color: #3e3a33;
}
.modal-close {
  color: #9a928a;
  font-size: 32rpx;
  padding: 8rpx;
}
.modal-body {
  max-height: 60vh;
}
.field {
  margin-bottom: 20rpx;
}
.field-row {
  display: flex;
  gap: 20rpx;
}
.field.half {
  flex: 1;
}
.label {
  display: block;
  font-size: 26rpx;
  color: #3e3a33;
  margin-bottom: 10rpx;
}
.input {
  background: #f5f2ec;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  color: #3e3a33;
}
.textarea {
  background: #f5f2ec;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  color: #3e3a33;
  width: 100%;
  box-sizing: border-box;
  height: 140rpx;
}
.picker {
  background: #f5f2ec;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  color: #3e3a33;
}
.img-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}
.img-preview {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}
.img-placeholder {
  width: 112rpx;
  height: 112rpx;
  border-radius: 16rpx;
  background: #f5f2ec;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9a928a;
  flex-shrink: 0;
}
.img-actions {
  flex: 1;
}
.btn-upload {
  margin-top: 12rpx;
  background: #f3ead9;
  color: #3e3a33;
  border-radius: 999rpx;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  text-align: center;
}
.form-error {
  color: #e5484d;
  font-size: 26rpx;
  margin: 12rpx 0;
}
.modal-foot {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.btn-cancel {
  flex: 1;
  background: #f5f2ec;
  color: #3e3a33;
  border-radius: 999rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 30rpx;
}
.btn-save2 {
  flex: 1;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  border-radius: 999rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 30rpx;
}
.btn-save2.disabled {
  opacity: 0.6;
}
</style>
