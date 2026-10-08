<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <text class="header-title font-handwriting">为爱下厨</text>
      <text class="header-sub">选好菜品，我们一起做饭～</text>
    </view>

    <!-- 套餐选择 -->
    <view class="combo-row">
      <scroll-view scroll-x class="combo-scroll">
        <view class="combo-inner">
          <view
            v-for="c in COMBOS"
            :key="c.id"
            class="combo-item"
            :class="{ active: combo.id === c.id }"
            @click="handleComboChange(c)"
          >
            <text class="combo-name font-handwriting">{{ c.name }}</text>
            <text class="combo-desc">{{ c.desc }}</text>
          </view>
          <view class="combo-item combo-smart" @click="goRecommend">
            <text class="combo-name font-handwriting">✨ 智能推荐</text>
            <text class="combo-desc">AI 搭菜单</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 进度 -->
    <view v-if="combo.rules && progressList.length" class="progress-wrap">
      <view class="progress-card">
        <view class="progress-grid">
          <view v-for="cat in progressList" :key="cat.id" class="progress-item">
            <view
              class="progress-badge"
              :style="{ backgroundColor: cat.done ? '#8BA888' : cat.color }"
            >
              <text class="progress-badge-text">{{
                cat.done ? '✓' : cat.total
              }}</text>
            </view>
            <view class="progress-main">
              <view class="progress-row">
                <text class="progress-name" :class="{ done: cat.done }">{{
                  cat.name
                }}</text>
                <text class="progress-count"
                  >{{ cat.selected }}/{{ cat.total }}</text
                >
              </view>
              <view class="progress-track">
                <view
                  class="progress-fill"
                  :style="{
                    width:
                      Math.min((cat.selected / cat.total) * 100, 100) + '%',
                    backgroundColor: cat.done ? '#8BA888' : cat.color,
                  }"
                />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 分类菜品 -->
    <view v-if="loading" class="state-text">加载中...</view>
    <view v-else class="category-sections">
      <view v-for="cat in visibleCategories" :key="cat.id" class="category">
        <view class="category-head">
          <view class="category-title">
            <view
              class="category-dot"
              :style="{ backgroundColor: cat.color }"
            />
            <text class="category-name font-handwriting">{{ cat.name }}</text>
          </view>
          <text
            v-if="combo.rules && getLimit(cat.id) !== undefined"
            class="category-remain"
            :class="{ full: isCategoryFull(cat.id) }"
          >
            {{
              isCategoryFull(cat.id)
                ? '✓ 已选齐'
                : `还差 ${getRemaining(cat.id)} 道`
            }}
          </text>
        </view>
        <view class="dish-grid">
          <view
            v-for="dish in dishesByCategory[cat.id] || []"
            :key="dish.dishId"
            class="dish-cell"
            :class="{ dimmed: disabledDish(dish) }"
          >
            <DishCard
              :dish="dish"
              variant="grid"
              :is-selected="selectedIds.has(dish.dishId)"
              selectable
              @toggle-select="handleToggle(dish)"
            />
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-space" />

    <!-- 底部栏 -->
    <view class="bottom-bar">
      <view class="bottom-left">
        <text class="bottom-emoji">🍳</text>
        <view>
          <text class="bottom-count">
            已选 <text class="bottom-count-num">{{ totalSelected }}</text> 道菜
          </text>
          <text v-if="combo.rules" class="bottom-combo">
            {{ combo.name }} · {{ combo.desc }}
          </text>
        </view>
      </view>
      <view
        class="btn-confirm"
        :class="{ disabled: totalSelected === 0 }"
        @click="goCart"
      >
        确认菜单
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { logger } from '../../utils/logger';
import { CATEGORIES, COMBOS } from '../../utils/constants';
import {
  getDishes,
  getCart,
  addToCart,
  removeFromCart,
} from '../../api/dishes';
import type { Dish, Combo } from '../../../shared/api.interface';
import DishCard from '../../components/DishCard.vue';

interface ProgressItem {
  id: string;
  name: string;
  color: string;
  selected: number;
  total: number;
  done: boolean;
}

const dishes = ref<Dish[]>([]);
const selectedIds = ref<Set<number>>(new Set());
const combo = ref<Combo>(COMBOS[0]);
const loading = ref(true);
const syncing = ref(false);

const dishesByCategory = computed(() => {
  const map: Record<string, Dish[]> = {};
  for (const dish of dishes.value) {
    if (!map[dish.category]) map[dish.category] = [];
    map[dish.category].push(dish);
  }
  return map;
});

function getSelectedCount(categoryId: string): number {
  const list = dishesByCategory.value[categoryId] ?? [];
  return list.filter((d) => selectedIds.value.has(d.dishId)).length;
}

function isCategoryFull(categoryId: string): boolean {
  if (!combo.value.rules) return false;
  const limit = combo.value.rules[categoryId];
  if (!limit) return true;
  return getSelectedCount(categoryId) >= limit;
}

function isCategoryInCombo(categoryId: string): boolean {
  if (!combo.value.rules) return true;
  return categoryId in combo.value.rules;
}

function getLimit(categoryId: string): number | undefined {
  if (!combo.value.rules) return undefined;
  return combo.value.rules[categoryId];
}

function getRemaining(categoryId: string): number {
  const limit = getLimit(categoryId);
  if (limit === undefined) return 0;
  return Math.max(limit - getSelectedCount(categoryId), 0);
}

function disabledDish(dish: Dish): boolean {
  const selected = selectedIds.value.has(dish.dishId);
  return (
    !selected && isCategoryFull(dish.category) && combo.value.rules !== null
  );
}

const visibleCategories = computed(() =>
  CATEGORIES.filter((cat) => {
    const list = dishesByCategory.value[cat.id] ?? [];
    if (list.length === 0) return false;
    if (combo.value.rules && !isCategoryInCombo(cat.id)) return false;
    return true;
  }),
);

const totalSelected = computed(() => selectedIds.value.size);

const progressList = computed<ProgressItem[]>(() => {
  if (!combo.value.rules) return [];
  return CATEGORIES.filter(
    (cat) => cat.id in (combo.value.rules as Record<string, number>),
  ).map((cat) => {
    const selected = getSelectedCount(cat.id);
    const total = combo.value.rules![cat.id];
    return {
      ...cat,
      selected,
      total,
      done: selected >= total,
    };
  });
});

async function handleComboChange(newCombo: Combo): Promise<void> {
  if (newCombo.id === combo.value.id) return;
  combo.value = newCombo;
  const prev = Array.from(selectedIds.value);
  selectedIds.value = new Set();
  try {
    syncing.value = true;
    await Promise.all(prev.map((id) => removeFromCart(id)));
  } catch (err) {
    logger.error('切换套餐清空购物车失败', err);
    selectedIds.value = new Set(prev);
  } finally {
    syncing.value = false;
  }
}

async function handleToggle(dish: Dish): Promise<void> {
  if (syncing.value) return;
  const isSelected = selectedIds.value.has(dish.dishId);

  if (!isSelected && combo.value.rules) {
    const limit = combo.value.rules[dish.category];
    if (!limit) return;
    const current = getSelectedCount(dish.category);
    if (current >= limit) return;
  }

  const next = new Set(selectedIds.value);
  if (isSelected) {
    next.delete(dish.dishId);
  } else {
    next.add(dish.dishId);
  }
  const prev = selectedIds.value;
  selectedIds.value = next;

  try {
    syncing.value = true;
    if (isSelected) {
      await removeFromCart(dish.dishId);
    } else {
      await addToCart(dish.dishId);
    }
  } catch (err) {
    logger.error(
      `${isSelected ? '移除' : '添加'}购物车失败 dishId=${dish.dishId}`,
      err,
    );
    selectedIds.value = prev;
  } finally {
    syncing.value = false;
  }
}

function goCart(): void {
  if (totalSelected.value === 0) return;
  uni.switchTab({ url: '/pages/cart/cart' });
}

function goRecommend(): void {
  uni.navigateTo({ url: '/pages/recommend/recommend' });
}

onMounted(async () => {
  try {
    loading.value = true;
    const [dishList, cart] = await Promise.all([getDishes(), getCart()]);
    dishes.value = dishList;
    selectedIds.value = new Set(cart.dishes.map((d) => d.dishId));
  } catch (err) {
    logger.error('初始化点菜页失败', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f8f5f0;
  padding-bottom: 200rpx;
}
.header {
  padding: 48rpx 32rpx 24rpx;
}
.header-title {
  font-size: 52rpx;
  color: #3e3a33;
}
.header-sub {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #9a928a;
}
.combo-row {
  padding: 0 32rpx;
}
.combo-scroll {
  width: 100%;
  white-space: nowrap;
}
.combo-inner {
  display: inline-flex;
  gap: 20rpx;
  padding: 4rpx 4rpx 16rpx;
}
.combo-item {
  background: #ffffff;
  border: 1rpx solid #e3dccd;
  border-radius: 999rpx;
  padding: 16rpx 32rpx;
  flex-shrink: 0;
}
.combo-item.active {
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  border-color: transparent;
}
.combo-name {
  display: block;
  font-size: 30rpx;
  color: #3e3a33;
}
.combo-item.active .combo-name {
  color: #ffffff;
}
.combo-desc {
  display: block;
  font-size: 20rpx;
  color: #9a928a;
  margin-top: 2rpx;
}
.combo-item.active .combo-desc {
  color: rgba(255, 255, 255, 0.9);
}
.combo-smart {
  background: #f3ead9;
  border-color: rgba(255, 122, 107, 0.3);
}
.progress-wrap {
  padding: 8rpx 32rpx 0;
}
.progress-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(74, 55, 40, 0.06);
}
.progress-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.progress-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: calc((100% - 24rpx) / 2);
}
.progress-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.progress-badge-text {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
}
.progress-main {
  flex: 1;
  min-width: 0;
}
.progress-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.progress-name {
  font-size: 26rpx;
  color: #3e3a33;
}
.progress-name.done {
  color: #8ba888;
}
.progress-count {
  font-size: 22rpx;
  color: #9a928a;
}
.progress-track {
  margin-top: 8rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #ece7de;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999rpx;
}
.state-text {
  padding: 80rpx 0;
  text-align: center;
  color: #9a928a;
  font-size: 28rpx;
}
.category-sections {
  padding: 24rpx 32rpx 0;
}
.category {
  margin-bottom: 40rpx;
}
.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.category-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.category-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 999rpx;
}
.category-name {
  font-size: 34rpx;
  color: #3e3a33;
}
.category-remain {
  font-size: 24rpx;
  color: #9a928a;
}
.category-remain.full {
  color: #8ba888;
}
.dish-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.dish-cell {
  width: calc((100% - 24rpx) / 2);
}
.dish-cell.dimmed {
  opacity: 0.5;
  pointer-events: none;
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
.bottom-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.bottom-emoji {
  font-size: 44rpx;
}
.bottom-count {
  font-size: 28rpx;
  color: #3e3a33;
}
.bottom-count-num {
  color: #ff7a6b;
  font-weight: 700;
  font-size: 32rpx;
}
.bottom-combo {
  display: block;
  font-size: 22rpx;
  color: #9a928a;
  margin-top: 4rpx;
}
.btn-confirm {
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #ffffff;
  border-radius: 999rpx;
  padding: 22rpx 56rpx;
  font-size: 32rpx;
  font-family: 'PingFang SC', serif;
  box-shadow: 0 6rpx 16rpx rgba(255, 122, 107, 0.4);
}
.btn-confirm.disabled {
  background: #ece7de;
  color: #9a928a;
  box-shadow: none;
}
</style>
