<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <image :src="heroImage" mode="aspectFill" class="hero-img" />
      <view class="hero-mask" />
      <view class="hero-text">
        <text class="hero-title font-handwriting">今天想做什么好吃的？</text>
        <text class="hero-sub">为爱的人，做一道菜</text>
      </view>
    </view>

    <view class="body">
      <!-- 快捷入口 -->
      <view class="quick-grid">
        <view
          v-for="(entry, index) in quickEntries"
          :key="entry.title"
          class="quick-item"
          :class="[index === 0 ? 'quick-item-wide' : '', entry.bgClass]"
          @click="entry.onClick"
        >
          <text class="quick-icon">{{ entry.icon }}</text>
          <text class="quick-title font-handwriting">{{ entry.title }}</text>
          <text class="quick-desc">{{ entry.desc }}</text>
        </view>
      </view>

      <!-- 今日推荐 -->
      <view class="recommend">
        <view class="recommend-head">
          <text class="section-title font-handwriting">今日推荐</text>
          <text
            class="shuffle-btn"
            :class="{ spinning: shuffling }"
            @click="handleShuffleRecommend"
          >
            ⟳ 换一批
          </text>
        </view>
        <view v-if="loading" class="recommend-skeletons">
          <view v-for="i in 3" :key="i" class="skeleton" />
        </view>
        <view v-else-if="error" class="error-box">
          <text>{{ error }}</text>
        </view>
        <scroll-view v-else scroll-x class="recommend-scroll">
          <view class="recommend-row">
            <view
              v-for="dish in recommendDishes"
              :key="dish.id"
              class="recommend-item"
            >
              <DishCard :dish="dish" variant="default" />
            </view>
          </view>
        </scroll-view>
      </view>
      <view class="bottom-space" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { logger } from '../../utils/logger';
import { HERO_IMAGE } from '../../utils/constants';
import { getDishes } from '../../api/dishes';
import type { Dish } from '../../../shared/api.interface';
import DishCard from '../../components/DishCard.vue';

interface QuickEntry {
  title: string;
  desc: string;
  icon: string;
  bgClass: string;
  onClick: () => void;
}

const dishes = ref<Dish[]>([]);
const recommendDishes = ref<Dish[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const shuffling = ref(false);
let isMounted = true;

const heroImage = HERO_IMAGE;

function shuffleArray(arr: Dish[]): Dish[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function fetchDishes(): Promise<void> {
  try {
    loading.value = true;
    error.value = null;
    const data = await getDishes();
    if (!isMounted) return;
    dishes.value = data;
    recommendDishes.value = shuffleArray(data).slice(0, 6);
  } catch (err) {
    logger.error('首页加载菜品失败', err);
    if (!isMounted) return;
    error.value = '加载失败，请稍后重试';
  } finally {
    if (isMounted) loading.value = false;
  }
}

function handleShuffleRecommend(): void {
  if (dishes.value.length === 0) return;
  shuffling.value = true;
  recommendDishes.value = shuffleArray(dishes.value).slice(0, 6);
  setTimeout(() => {
    shuffling.value = false;
  }, 400);
}

function handleRandomPick(): void {
  if (dishes.value.length === 0) return;
  const randomDish =
    dishes.value[Math.floor(Math.random() * dishes.value.length)];
  uni.navigateTo({ url: `/pages/dish/dish?id=${randomDish.dishId}` });
}

function goMenu(): void {
  uni.switchTab({ url: '/pages/menu/menu' });
}
function goOrder(): void {
  uni.switchTab({ url: '/pages/order/order' });
}
function goCart(): void {
  uni.switchTab({ url: '/pages/cart/cart' });
}
function goRecommend(): void {
  uni.navigateTo({ url: '/pages/recommend/recommend' });
}

const quickEntries = computed<QuickEntry[]>(() => [
  {
    title: '智能配餐',
    desc: 'AI 为你搭配菜单',
    icon: '✨',
    bgClass: 'bg-primary',
    onClick: goRecommend,
  },
  {
    title: '开始点菜',
    desc: '套餐搭配',
    icon: '🥘',
    bgClass: 'bg-secondary',
    onClick: goOrder,
  },
  {
    title: '浏览菜单',
    desc: '全部分类',
    icon: '🍽️',
    bgClass: 'bg-accent',
    onClick: goMenu,
  },
  {
    title: '随机推荐',
    desc: '今天吃啥',
    icon: '🎲',
    bgClass: 'bg-card',
    onClick: handleRandomPick,
  },
  {
    title: '我的菜单',
    desc: '已选菜品',
    icon: '❤️',
    bgClass: 'bg-muted',
    onClick: goCart,
  },
]);

onMounted(() => {
  fetchDishes();
});

onUnmounted(() => {
  isMounted = false;
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f8f5f0;
  padding-bottom: 120rpx;
}
.hero {
  position: relative;
  height: 420rpx;
  width: 100%;
  overflow: hidden;
}
.hero-img {
  width: 100%;
  height: 100%;
}
.hero-mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.2),
    rgba(0, 0, 0, 0.05) 60%,
    #f8f5f0
  );
}
.hero-text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 40rpx;
  padding: 0 40rpx;
  display: flex;
  flex-direction: column;
}
.hero-title {
  font-size: 52rpx;
  color: #ffffff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}
.hero-sub {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}
.body {
  padding: 0 32rpx;
}
.quick-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 8rpx;
}
.quick-item {
  width: calc((100% - 40rpx) / 3);
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(74, 55, 40, 0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.quick-item-wide {
  width: calc((100% - 40rpx) / 3 * 2 + 20rpx);
}
.bg-primary {
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
}
.bg-secondary {
  background: linear-gradient(135deg, #c9a86a, #b8935a);
}
.bg-accent {
  background: #f3ead9;
}
.bg-card {
  background: #ffffff;
}
.bg-muted {
  background: #ece7de;
}
.quick-icon {
  font-size: 44rpx;
}
.quick-title {
  margin-top: 12rpx;
  font-size: 30rpx;
  color: #3e3a33;
}
.quick-desc {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9a928a;
}
.recommend {
  margin-top: 48rpx;
}
.recommend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 36rpx;
  color: #3e3a33;
}
.shuffle-btn {
  font-size: 26rpx;
  color: #9a928a;
}
.shuffle-btn.spinning {
  animation: spin 0.4s linear;
}
.recommend-scroll {
  width: 100%;
  white-space: nowrap;
}
.recommend-row {
  display: inline-flex;
  gap: 24rpx;
  padding: 4rpx 4rpx 24rpx;
}
.recommend-item {
  width: 280rpx;
  flex-shrink: 0;
}
.recommend-skeletons {
  display: flex;
  gap: 24rpx;
}
.skeleton {
  width: 280rpx;
  height: 360rpx;
  border-radius: 24rpx;
  background: #ece7de;
  flex-shrink: 0;
}
.error-box {
  border-radius: 24rpx;
  background: #ffffff;
  padding: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #9a928a;
}
.bottom-space {
  height: 40rpx;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
