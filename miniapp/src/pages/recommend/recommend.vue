<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="btn-back" @click="handleBack">‹</view>
      <view class="header-text">
        <text class="header-title font-handwriting">✨ 智能配餐</text>
        <text class="header-sub">选好分类，AI 为你搭配专属菜单</text>
      </view>
    </view>

    <view v-if="loading" class="state-text">加载中...</view>
    <view v-else-if="error" class="state-text">{{ error }}</view>
    <view v-else class="content">
      <!-- 分类卡片 -->
      <view class="cat-list">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="cat-card"
          :class="{ checked: cat.checked }"
        >
          <view class="cat-check" @click="handleToggleCategory(cat.id)">
            <view v-if="cat.checked" class="cat-check-inner">✓</view>
          </view>
          <view class="cat-dot" :style="{ backgroundColor: cat.color }" />
          <text class="cat-name font-handwriting">{{ cat.name }}</text>
          <text class="cat-count">（{{ catCount(cat.id) }}道）</text>
          <view v-if="cat.checked" class="stepper">
            <view
              class="step-btn"
              :class="{ disabled: cat.count <= 1 }"
              @click="handleCountChange(cat.id, -1)"
            >
              −
            </view>
            <text class="step-num">{{ cat.count }}</text>
            <view
              class="step-btn step-plus"
              :class="{ disabled: cat.count >= 5 }"
              @click="handleCountChange(cat.id, 1)"
            >
              +
            </view>
          </view>
        </view>
      </view>

      <view class="recommend-area">
        <text v-if="!canRecommend" class="tip"
          >请至少勾选 1 个分类后开始推荐</text
        >
        <view
          class="btn-recommend"
          :class="{ disabled: !canRecommend || recommending }"
          @click="handleRecommend"
        >
          {{ recommending ? '正在搭配...' : '✨ 开始推荐' }}
        </view>
      </view>

      <!-- 推荐结果 -->
      <view v-if="showResult" class="result">
        <view class="result-head">
          <text class="result-title font-handwriting">
            推荐菜单
            <text class="result-count"
              >共 {{ recommendedDishes.length }} 道</text
            >
          </text>
          <text class="result-refresh" @click="handleRecommend">⟳ 换一批</text>
        </view>
        <view class="result-grid">
          <view
            v-for="dish in recommendedDishes"
            :key="dish.id"
            class="result-cell"
          >
            <DishCard :dish="dish" variant="grid" />
          </view>
        </view>
        <view class="result-actions">
          <view class="btn-refresh" @click="handleRecommend">换一批</view>
          <view
            class="btn-add-all"
            :class="{ disabled: addingToCart }"
            @click="handleAddAllToCart"
          >
            {{ addingToCart ? '加入中...' : '🛒 全部加入菜单' }}
          </view>
        </view>
      </view>

      <view class="bottom-space" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { logger } from '../../utils/logger';
import { CATEGORIES } from '../../utils/constants';
import { getDishes, addToCart } from '../../api/dishes';
import type { Dish } from '../../../shared/api.interface';
import DishCard from '../../components/DishCard.vue';

interface CategoryConfig {
  id: string;
  name: string;
  color: string;
  checked: boolean;
  count: number;
}

const dishes = ref<Dish[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const recommending = ref(false);
const addingToCart = ref(false);
const recommendedDishes = ref<Dish[]>([]);
const showResult = ref(false);

const categories = ref<CategoryConfig[]>(
  CATEGORIES.map((cat) => ({
    ...cat,
    checked: false,
    count: 1,
  })),
);

const dishesByCategory = computed(() => {
  const map: Record<string, Dish[]> = {};
  for (const dish of dishes.value) {
    if (!map[dish.category]) map[dish.category] = [];
    map[dish.category].push(dish);
  }
  return map;
});

const selectedCategories = computed(() =>
  categories.value.filter((c) => c.checked),
);
const canRecommend = computed(() => selectedCategories.value.length > 0);

function catCount(categoryId: string): number {
  return dishesByCategory.value[categoryId]?.length ?? 0;
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function handleToggleCategory(catId: string): void {
  const cat = categories.value.find((c) => c.id === catId);
  if (cat) {
    cat.checked = !cat.checked;
    if (cat.checked && cat.count === 0) cat.count = 1;
  }
}

function handleCountChange(catId: string, delta: number): void {
  const cat = categories.value.find((c) => c.id === catId);
  if (cat) {
    const next = Math.min(5, Math.max(1, cat.count + delta));
    cat.count = next;
  }
}

function handleRecommend(): void {
  if (!canRecommend.value || recommending.value) return;
  recommending.value = true;
  showResult.value = false;
  setTimeout(() => {
    const result: Dish[] = [];
    for (const cat of selectedCategories.value) {
      const catDishes = dishesByCategory.value[cat.id] || [];
      const shuffled = shuffleArray(catDishes);
      const pick = shuffled.slice(0, Math.min(cat.count, shuffled.length));
      result.push(...pick);
    }
    recommendedDishes.value = result;
    showResult.value = true;
    recommending.value = false;
  }, 400);
}

async function handleAddAllToCart(): Promise<void> {
  if (recommendedDishes.value.length === 0 || addingToCart.value) return;
  addingToCart.value = true;
  try {
    await Promise.all(recommendedDishes.value.map((d) => addToCart(d.dishId)));
    uni.showToast({
      title: '已加入菜单',
      icon: 'success',
      duration: 1500,
    });
  } catch (err) {
    logger.error('全部加入菜单失败', err);
    uni.showToast({ title: '加入失败', icon: 'none' });
  } finally {
    addingToCart.value = false;
  }
}

function handleBack(): void {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/index/index' }),
  });
}

async function fetchDishes(): Promise<void> {
  try {
    loading.value = true;
    error.value = null;
    dishes.value = await getDishes();
  } catch (err) {
    logger.error('智能推荐页加载菜品失败', err);
    error.value = '加载失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchDishes();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f8f5f0;
}
.header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 40rpx 32rpx 24rpx;
}
.btn-back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(74, 55, 40, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #3e3a33;
}
.header-text {
  flex: 1;
}
.header-title {
  font-size: 40rpx;
  color: #3e3a33;
}
.header-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #9a928a;
}
.state-text {
  padding: 100rpx 0;
  text-align: center;
  color: #9a928a;
  font-size: 28rpx;
}
.content {
  padding: 0 32rpx;
}
.cat-list {
}
.cat-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(74, 55, 40, 0.06);
}
.cat-card.checked {
  border: 2rpx solid rgba(255, 122, 107, 0.3);
}
.cat-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 12rpx;
  border: 3rpx solid #e3dccd;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-check-inner {
  width: 100%;
  height: 100%;
  border-radius: 10rpx;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.cat-name {
  font-size: 32rpx;
  color: #3e3a33;
}
.cat-count {
  font-size: 24rpx;
  color: #9a928a;
}
.stepper {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.step-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: #f5f2ec;
  color: #3e3a33;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}
.step-btn.step-plus {
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
}
.step-btn.disabled {
  opacity: 0.4;
}
.step-num {
  min-width: 40rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #3e3a33;
}
.recommend-area {
  margin-top: 32rpx;
}
.tip {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #9a928a;
  margin-bottom: 20rpx;
}
.btn-recommend {
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  border-radius: 999rpx;
  padding: 28rpx;
  text-align: center;
  font-size: 34rpx;
  font-family: 'PingFang SC', serif;
  box-shadow: 0 8rpx 20rpx rgba(255, 122, 107, 0.4);
}
.btn-recommend.disabled {
  background: #ece7de;
  color: #9a928a;
  box-shadow: none;
}
.result {
  margin-top: 48rpx;
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.result-title {
  font-size: 36rpx;
  color: #3e3a33;
}
.result-count {
  font-size: 26rpx;
  color: #9a928a;
  margin-left: 8rpx;
}
.result-refresh {
  font-size: 26rpx;
  color: #ff7a6b;
}
.result-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.result-cell {
  width: calc((100% - 24rpx) / 2);
}
.result-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}
.btn-refresh {
  flex: 1;
  background: #fff;
  border: 1rpx solid #e3dccd;
  color: #3e3a33;
  border-radius: 999rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 28rpx;
  font-family: 'PingFang SC', serif;
}
.btn-add-all {
  flex: 1;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  border-radius: 999rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 28rpx;
  font-family: 'PingFang SC', serif;
}
.btn-add-all.disabled {
  opacity: 0.6;
}
.bottom-space {
  height: 80rpx;
}
</style>
