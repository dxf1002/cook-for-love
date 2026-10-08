<template>
  <view class="menu-page">
    <!-- 分类侧栏 -->
    <scroll-view scroll-y class="sidebar">
      <view
        v-for="cat in categories"
        :key="cat.id"
        class="side-item"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        <view
          class="side-dot"
          :style="{
            backgroundColor:
              activeCategory === cat.id ? cat.color : 'transparent',
          }"
        />
        <text class="side-name font-handwriting">{{ cat.name }}</text>
      </view>
    </scroll-view>

    <!-- 主区 -->
    <view class="main">
      <view class="main-header">
        <view>
          <text class="main-title font-handwriting">{{
            activeCategoryInfo?.name || '全部菜品'
          }}</text>
          <text class="main-count">共 {{ filteredDishes.length }} 道菜</text>
        </view>
        <view class="header-actions">
          <view class="btn-manage" @click="openAdd">＋ 管理</view>
          <view class="btn-recommend" @click="goRecommend">✨ 智能推荐</view>
        </view>
      </view>

      <view v-if="loading" class="state-text">加载中...</view>
      <view v-else-if="error" class="state-text">{{ error }}</view>
      <view v-else class="dish-grid">
        <DishCard
          v-for="dish in filteredDishes"
          :key="dish.id"
          :dish="dish"
          variant="grid"
        />
      </view>
    </view>

    <!-- 新增菜品弹窗 -->
    <view v-if="showAdd" class="modal-mask" @click="closeAdd">
      <view class="modal" @click.stop>
        <view class="modal-head">
          <text class="modal-title font-handwriting">新增菜品</text>
          <text class="modal-close" @click="closeAdd">✕</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view class="field">
            <text class="label">名称 *</text>
            <input
              v-model="form.name"
              class="input"
              placeholder="如：可乐鸡翅"
            />
          </view>
          <view class="field-row">
            <view class="field half">
              <text class="label">分类 *</text>
              <picker :range="categoryNames" @change="onCategoryChange">
                <view class="picker">{{ currentCategoryName }}</view>
              </picker>
            </view>
            <view class="field half">
              <text class="label">难度</text>
              <picker :range="difficulties" @change="onDifficultyChange">
                <view class="picker">{{ form.difficulty }}</view>
              </picker>
            </view>
          </view>
          <view class="field">
            <text class="label">用时</text>
            <input v-model="form.time" class="input" placeholder="如：20分钟" />
          </view>
          <view class="field">
            <text class="label">描述</text>
            <textarea
              v-model="form.description"
              class="textarea"
              placeholder="一句话介绍这道菜"
            />
          </view>
          <view class="field">
            <text class="label">标签</text>
            <input
              v-model="form.tags"
              class="input"
              placeholder="逗号分隔，如：下饭,快手"
            />
          </view>
          <view class="field">
            <text class="label">食材</text>
            <input
              v-model="form.ingredients"
              class="input"
              placeholder="逗号分隔，如：鸡翅,可乐"
            />
          </view>
          <view class="field">
            <text class="label">用量</text>
            <input
              v-model="form.amounts"
              class="input"
              placeholder="与食材一一对应，逗号分隔"
            />
          </view>
          <view class="field">
            <text class="label">步骤</text>
            <textarea
              v-model="form.steps"
              class="textarea"
              placeholder="每行一步"
            />
          </view>
          <view class="field">
            <text class="label">小贴士</text>
            <textarea
              v-model="form.tips"
              class="textarea"
              placeholder="烹饪小技巧（可选）"
            />
          </view>
          <view class="field">
            <text class="label">菜品图片</text>
            <view class="img-row">
              <image
                v-if="form.imageUrl"
                :src="resolveImageUrl(form.imageUrl)"
                mode="aspectFill"
                class="img-preview"
              />
              <view v-else class="img-placeholder">图</view>
              <view class="img-actions">
                <input
                  v-model="form.imageUrl"
                  class="input"
                  placeholder="粘贴图片链接，或点下方上传"
                />
                <view class="btn-upload" @click="chooseImage">
                  {{ uploading ? '上传中...' : '本地上传' }}
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
        <text v-if="formError" class="form-error">{{ formError }}</text>
        <view class="modal-foot">
          <view class="btn-cancel" @click="closeAdd">取消</view>
          <view
            class="btn-save"
            :class="{ disabled: submitting }"
            @click="handleSubmit"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { logger } from '../../utils/logger';
import { CATEGORIES } from '../../utils/constants';
import { getDishes, createDish, uploadImage } from '../../api/dishes';
import { resolveImageUrl } from '../../api/request';
import type { Dish } from '../../../shared/api.interface';
import DishCard from '../../components/DishCard.vue';

const dishes = ref<Dish[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const activeCategory = ref('all');

const showAdd = ref(false);
const submitting = ref(false);
const uploading = ref(false);
const formError = ref<string | null>(null);

const difficulties = ['简单', '中等', '困难'];
const categoryNames = CATEGORIES.map((c) => c.name);
const currentCategoryName = computed(
  () => CATEGORIES.find((c) => c.id === form.category)?.name ?? '',
);

const form = reactive({
  name: '',
  category: CATEGORIES[0].id,
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

const categories = computed(() => [
  { id: 'all', name: '全部', color: '#FF8A7A' },
  ...CATEGORIES,
]);

const activeCategoryInfo = computed(() =>
  categories.value.find((c) => c.id === activeCategory.value),
);

const filteredDishes = computed(() => {
  if (activeCategory.value === 'all') return dishes.value;
  return dishes.value.filter((d) => d.category === activeCategory.value);
});

async function fetchDishes(): Promise<void> {
  try {
    loading.value = true;
    error.value = null;
    dishes.value = await getDishes();
  } catch (err) {
    logger.error('菜单页加载失败', err);
    error.value = '加载失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

function goRecommend(): void {
  uni.navigateTo({ url: '/pages/recommend/recommend' });
}

function openAdd(): void {
  form.name = '';
  form.category = CATEGORIES[0].id;
  form.difficulty = '简单';
  form.time = '';
  form.description = '';
  form.tags = '';
  form.ingredients = '';
  form.amounts = '';
  form.steps = '';
  form.tips = '';
  form.imageUrl = '';
  formError.value = null;
  showAdd.value = true;
}

function closeAdd(): void {
  if (submitting.value) return;
  showAdd.value = false;
}

function onCategoryChange(e: { detail: { value: string | number } }): void {
  form.category = CATEGORIES[Number(e.detail.value)].id;
}

function onDifficultyChange(e: { detail: { value: string | number } }): void {
  form.difficulty = difficulties[Number(e.detail.value)];
}

function splitList(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function chooseImage(): void {
  if (uploading.value) return;
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0];
      if (!filePath) return;
      uploading.value = true;
      formError.value = null;
      try {
        form.imageUrl = await uploadImage(filePath);
      } catch (err) {
        logger.error('上传图片失败', err);
        formError.value = '图片上传失败，请重试';
      } finally {
        uploading.value = false;
      }
    },
  });
}

async function handleSubmit(): Promise<void> {
  if (!form.name.trim()) {
    formError.value = '请填写菜品名称';
    return;
  }
  submitting.value = true;
  formError.value = null;
  try {
    const tags = splitList(form.tags);
    const ingredients = splitList(form.ingredients);
    const amounts = splitList(form.amounts);
    const steps = form.steps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    await createDish({
      name: form.name.trim(),
      category: form.category,
      difficulty: form.difficulty,
      time: form.time.trim() || undefined,
      description: form.description.trim() || undefined,
      tags: tags.length ? tags : undefined,
      ingredients: ingredients.length ? ingredients : undefined,
      amounts: amounts.length ? amounts : undefined,
      steps: steps.length ? steps : undefined,
      tips: form.tips.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
    });
    showAdd.value = false;
    await fetchDishes();
  } catch (err) {
    logger.error('新增菜品失败', err);
    formError.value = '保存失败，请重试';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  fetchDishes();
});
</script>

<style scoped>
.menu-page {
  display: flex;
  height: 100vh;
  background-color: #f8f5f0;
}
.sidebar {
  width: 160rpx;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.03);
  height: 100%;
}
.side-item {
  padding: 36rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.side-item.active {
  background: #ffffff;
}
.side-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
  margin-bottom: 12rpx;
}
.side-name {
  font-size: 26rpx;
  color: #6b625a;
}
.side-item.active .side-name {
  color: #ff7a6b;
  font-weight: 600;
}
.main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.main-header {
  padding: 28rpx 24rpx 20rpx;
  background: #f8f5f0;
}
.main-title {
  font-size: 40rpx;
  color: #3e3a33;
}
.main-count {
  margin-left: 16rpx;
  font-size: 24rpx;
  color: #9a928a;
}
.header-actions {
  margin-top: 16rpx;
  display: flex;
  gap: 16rpx;
}
.btn-manage {
  background: #ffffff;
  border: 1rpx solid #e3dccd;
  color: #3e3a33;
  border-radius: 999rpx;
  padding: 12rpx 28rpx;
  font-size: 26rpx;
}
.btn-recommend {
  background: #f3ead9;
  color: #3e3a33;
  border-radius: 999rpx;
  padding: 12rpx 28rpx;
  font-size: 26rpx;
}
.state-text {
  padding: 80rpx 0;
  text-align: center;
  color: #9a928a;
  font-size: 28rpx;
}
.dish-grid {
  flex: 1;
  overflow-y: auto;
  padding: 0 24rpx 120rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  align-content: flex-start;
}
.dish-grid :deep(.dish-card) {
  width: calc((100% - 24rpx) / 2);
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
  background: #ffffff;
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
  flex: 1;
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
  height: 120rpx;
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
.btn-save {
  flex: 1;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #ffffff;
  border-radius: 999rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 30rpx;
}
.btn-save.disabled {
  opacity: 0.6;
}
</style>
