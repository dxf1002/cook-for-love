<template>
  <view
    class="dish-card"
    :class="{ selected: isSelected }"
    @click="handleClick"
  >
    <view class="img-wrap">
      <image
        v-if="hasImage"
        :src="resolveImageUrl(dish.imageUrl)"
        mode="aspectFill"
        class="dish-img"
        :style="{ height: imageHeight }"
      />
      <view
        v-else
        class="dish-img no-img"
        :style="{ backgroundColor: dish.color, height: imageHeight }"
      >
        <text class="no-img-char font-handwriting">{{ firstChar }}</text>
      </view>
      <view v-if="isSelected" class="selected-mask">
        <view class="check-circle">
          <text class="check">✓</text>
        </view>
      </view>
      <view v-if="variant === 'default' && tagList.length" class="tags">
        <text v-for="tag in tagList.slice(0, 2)" :key="tag" class="tag">
          {{ tag }}
        </text>
      </view>
    </view>
    <view class="info">
      <text class="name font-handwriting">{{ dish.name }}</text>
      <text v-if="variant !== 'grid'" class="desc">{{ dish.description }}</text>
      <view v-if="variant === 'default'" class="meta">
        <text>{{ dish.difficulty }}</text>
        <text class="dot">·</text>
        <text>{{ dish.time }}</text>
      </view>
    </view>
    <view v-if="showAddButton" class="add-btn" @click.stop="emitAdd">
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Dish } from '../../../shared/api.interface';
import { resolveImageUrl } from '../api/request';

const props = withDefaults(
  defineProps<{
    dish: Dish;
    variant?: 'default' | 'compact' | 'grid';
    isSelected?: boolean;
    showAddButton?: boolean;
    selectable?: boolean;
  }>(),
  {
    variant: 'default',
    isSelected: false,
    showAddButton: false,
    selectable: false,
  },
);

const emit = defineEmits<{
  (e: 'toggleSelect'): void;
  (e: 'addToCart'): void;
}>();

const hasImage = computed(
  () => !!(props.dish.imageUrl && props.dish.imageUrl.length > 0),
);
const firstChar = computed(() => props.dish.name.charAt(0));
const tagList = computed<string[]>(() => props.dish.tags || []);
const imageHeight = computed(() => {
  if (props.variant === 'grid') return '200rpx';
  if (props.variant === 'compact') return '160rpx';
  return '280rpx';
});

function handleClick(): void {
  if (props.selectable) {
    emit('toggleSelect');
    return;
  }
  if (props.showAddButton || props.isSelected) return;
  uni.navigateTo({ url: `/pages/dish/dish?id=${props.dish.dishId}` });
}

function emitAdd(): void {
  emit('addToCart');
}
</script>

<style scoped>
.dish-card {
  position: relative;
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(74, 55, 40, 0.06);
}
.dish-card.selected {
  border: 3rpx solid #ff7a6b;
}
.img-wrap {
  position: relative;
}
.dish-img {
  width: 100%;
}
.no-img {
  display: flex;
  align-items: center;
  justify-content: center;
}
.no-img-char {
  font-size: 56rpx;
  color: #ffffff;
}
.selected-mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.check-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  display: flex;
  align-items: center;
  justify-content: center;
}
.check {
  color: #ffffff;
  font-size: 36rpx;
}
.tags {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  display: flex;
  gap: 8rpx;
}
.tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #6b625a;
}
.info {
  padding: 20rpx;
}
.name {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #3e3a33;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9a928a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #9a928a;
}
.add-btn {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(255, 122, 107, 0.4);
}
.plus {
  font-size: 40rpx;
  line-height: 1;
}
</style>
