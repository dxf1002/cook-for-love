<template>
  <view class="page">
    <view class="header">
      <text class="header-title font-handwriting">我的菜单</text>
      <text v-if="totalCount > 0" class="header-sub">
        已选 {{ totalCount }} 道菜，共 {{ totalCategories }} 个分类
      </text>
      <view class="header-actions">
        <view v-if="totalCount > 0" class="btn-save" @click="openSave">
          💾 保存菜单
        </view>
        <view class="btn-history" @click="openHistory">🕘 历史菜单</view>
      </view>
    </view>

    <view v-if="!loading && totalCount === 0" class="empty">
      <text class="empty-emoji">🧑‍🍳</text>
      <text class="empty-title font-handwriting">还没有选菜呢</text>
      <text class="empty-desc">快去挑几道喜欢的菜吧～</text>
      <view class="btn-go" @click="goOrder">去点菜</view>
    </view>

    <view v-else-if="!loading" class="content">
      <view v-for="cat in visibleCategories" :key="cat.id" class="category">
        <view class="category-head">
          <view class="category-title">
            <view
              class="category-dot"
              :style="{ backgroundColor: cat.color }"
            />
            <text class="category-name font-handwriting">{{ cat.name }}</text>
            <text class="category-count">({{ catCount(cat.id) }})</text>
          </view>
        </view>
        <view class="dish-grid">
          <view
            v-for="dish in dishesByCategory[cat.id] || []"
            :key="dish.dishId"
            class="dish-cell"
          >
            <DishCard
              :dish="dish"
              variant="grid"
              :is-selected="true"
              selectable
              @toggle-select="handleRemove(dish)"
            />
          </view>
        </view>
      </view>

      <view class="stats-card">
        <text class="stats-title font-handwriting">菜品统计</text>
        <view v-for="cat in categoryStats" :key="cat.id" class="stats-row">
          <view class="stats-name">
            <view class="stats-dot" :style="{ backgroundColor: cat.color }" />
            <text>{{ cat.name }}</text>
          </view>
          <text class="stats-count">{{ cat.count }} 道</text>
        </view>
        <view class="stats-total">
          <text>合计</text>
          <text class="stats-total-num">{{ totalCount }} 道菜</text>
        </view>
      </view>
      <view class="btn-clear" @click="handleClearAll">清空菜单</view>
    </view>
    <view v-else class="state-text">加载中...</view>

    <view class="bottom-space" />

    <!-- 保存菜单弹窗 -->
    <view v-if="showSaveModal" class="modal-mask" @click="closeSave">
      <view class="modal" @click.stop>
        <text class="modal-title font-handwriting">保存历史菜单</text>
        <text class="modal-desc"
          >将当前 {{ totalCount }} 道菜保存为历史菜单</text
        >
        <input
          v-model="saveName"
          class="modal-input"
          placeholder="给菜单起个名（留空自动命名）"
        />
        <view class="modal-foot">
          <view class="btn-cancel" @click="closeSave">取消</view>
          <view
            class="btn-save2"
            :class="{ disabled: saving }"
            @click="handleSave"
          >
            {{ saving ? '保存中...' : '保存' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 历史菜单弹窗 -->
    <view v-if="showHistory" class="modal-mask" @click="closeHistory">
      <view class="modal history-modal" @click.stop>
        <view class="modal-head">
          <view class="modal-head-left">
            <view v-if="historyDetail" class="btn-back" @click="backToList"
              >‹</view
            >
            <text class="modal-title font-handwriting">
              {{ historyDetail ? '菜单详情' : '历史菜单' }}
            </text>
          </view>
          <text class="modal-close" @click="closeHistory">✕</text>
        </view>

        <scroll-view
          v-if="!loadingHistory && !historyError"
          scroll-y
          class="history-body"
        >
          <!-- 详情 -->
          <view v-if="historyDetail" class="history-detail">
            <text class="history-time"
              >🕘 {{ formatTime(historyDetail.createdAt) }}</text
            >
            <view
              v-for="cat in detailCategories"
              :key="cat.id"
              class="detail-cat"
            >
              <view class="detail-cat-head">
                <view
                  class="detail-dot"
                  :style="{ backgroundColor: cat.color }"
                />
                <text class="detail-cat-name font-handwriting">{{
                  cat.name
                }}</text>
              </view>
              <view
                v-for="item in detailItemsOf(cat.id)"
                :key="item.id"
                class="detail-item"
              >
                <image
                  v-if="item.imageUrl"
                  :src="resolveImageUrl(item.imageUrl)"
                  mode="aspectFill"
                  class="detail-img"
                />
                <view
                  v-else
                  class="detail-img detail-img-fallback"
                  :style="{ backgroundColor: item.color }"
                >
                  {{ item.name.charAt(0) }}
                </view>
                <text class="detail-name">{{ item.name }}</text>
                <text class="detail-id">#{{ item.dishId }}</text>
              </view>
            </view>
            <view v-if="otherItems.length" class="detail-cat">
              <view class="detail-cat-head">
                <view class="detail-dot" style="background-color: #9a928a" />
                <text class="detail-cat-name font-handwriting">其他</text>
              </view>
              <view
                v-for="item in otherItems"
                :key="item.id"
                class="detail-item"
              >
                <text class="detail-name">{{ item.name }}</text>
                <text class="detail-id">#{{ item.dishId }}</text>
              </view>
            </view>
            <view class="detail-actions">
              <view
                class="btn-restore"
                :class="{ disabled: restoring }"
                @click="handleRestore"
              >
                {{ restoring ? '还原中...' : '⟲ 还原到当前菜单' }}
              </view>
              <view class="btn-del" @click="handleDelete(historyDetail.id)"
                >删除</view
              >
            </view>
          </view>

          <!-- 列表 -->
          <view v-else-if="historyMenus.length === 0" class="history-empty">
            还没有保存过菜单
          </view>
          <view v-else class="history-list">
            <view v-for="m in historyMenus" :key="m.id" class="history-item">
              <view class="history-item-main" @click="openMenuDetail(m.id)">
                <text class="history-item-name">{{ m.name }}</text>
                <text class="history-item-meta">
                  🕘 {{ formatTime(m.createdAt) }} · {{ m.itemCount }} 道
                </text>
              </view>
              <text class="history-item-del" @click="handleDelete(m.id)"
                >🗑</text
              >
            </view>
          </view>
        </scroll-view>
        <view v-else-if="loadingHistory" class="history-state">加载中...</view>
        <view v-else class="history-state">{{ historyError }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { logger } from '../../utils/logger';
import { CATEGORIES } from '../../utils/constants';
import {
  getCart,
  removeFromCart,
  clearCart,
  saveMenu,
  listMenus,
  getMenu,
  deleteMenu,
  addToCart,
} from '../../api/dishes';
import { resolveImageUrl } from '../../api/request';
import type {
  Dish,
  SavedMenu,
  SavedMenuDetail,
} from '../../../shared/api.interface';
import DishCard from '../../components/DishCard.vue';

const dishes = ref<Dish[]>([]);
const loading = ref(true);
const clearing = ref(false);

const showSaveModal = ref(false);
const saveName = ref('');
const saving = ref(false);
const showHistory = ref(false);
const loadingHistory = ref(false);
const historyError = ref<string | null>(null);
const historyMenus = ref<SavedMenu[]>([]);
const historyDetail = ref<SavedMenuDetail | null>(null);
const restoring = ref(false);
const deleting = ref(false);

const dishesByCategory = computed(() => {
  const map: Record<string, Dish[]> = {};
  for (const dish of dishes.value) {
    if (!map[dish.category]) map[dish.category] = [];
    map[dish.category].push(dish);
  }
  return map;
});

const totalCount = computed(() => dishes.value.length);
const totalCategories = computed(
  () => Object.keys(dishesByCategory.value).length,
);

const visibleCategories = computed(() =>
  CATEGORIES.filter((cat) => (dishesByCategory.value[cat.id]?.length ?? 0) > 0),
);

const categoryStats = computed(() =>
  visibleCategories.value.map((cat) => ({
    ...cat,
    count: dishesByCategory.value[cat.id]?.length ?? 0,
  })),
);

function catCount(categoryId: string): number {
  return dishesByCategory.value[categoryId]?.length ?? 0;
}

const detailCategories = computed(() =>
  CATEGORIES.filter((cat) =>
    historyDetail.value?.items.some((it) => it.category === cat.id),
  ),
);
const otherItems = computed(
  () =>
    historyDetail.value?.items.filter(
      (it) => !CATEGORIES.some((c) => c.id === it.category),
    ) ?? [],
);

function detailItemsOf(categoryId: string) {
  return (
    historyDetail.value?.items.filter((it) => it.category === categoryId) ?? []
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

async function fetchCart(): Promise<void> {
  try {
    loading.value = true;
    const cart = await getCart();
    dishes.value = cart.dishes;
  } catch (err) {
    logger.error('加载购物车失败', err);
  } finally {
    loading.value = false;
  }
}

async function handleRemove(dish: Dish): Promise<void> {
  try {
    await removeFromCart(dish.dishId);
    dishes.value = dishes.value.filter((d) => d.dishId !== dish.dishId);
  } catch (err) {
    logger.error('移除菜品失败', err);
  }
}

async function handleClearAll(): Promise<void> {
  if (clearing.value) return;
  try {
    clearing.value = true;
    await clearCart();
    dishes.value = [];
  } catch (err) {
    logger.error('清空购物车失败', err);
  } finally {
    clearing.value = false;
  }
}

function openSave(): void {
  saveName.value = '';
  showSaveModal.value = true;
}
function closeSave(): void {
  if (saving.value) return;
  showSaveModal.value = false;
}
async function handleSave(): Promise<void> {
  if (saving.value || totalCount.value === 0) return;
  saving.value = true;
  try {
    await saveMenu(saveName.value.trim() || undefined);
    showSaveModal.value = false;
    uni.showToast({ title: '已保存', icon: 'success' });
  } catch (err) {
    logger.error('保存历史菜单失败', err);
    uni.showToast({ title: '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

async function loadHistoryList(): Promise<void> {
  loadingHistory.value = true;
  historyError.value = null;
  try {
    historyMenus.value = (await listMenus()).items;
  } catch (err) {
    logger.error('加载历史菜单列表失败', err);
    historyError.value = '加载失败，请稍后重试';
  } finally {
    loadingHistory.value = false;
  }
}

function openHistory(): void {
  showHistory.value = true;
  historyDetail.value = null;
  void loadHistoryList();
}
function closeHistory(): void {
  if (restoring.value || deleting.value) return;
  showHistory.value = false;
}
async function openMenuDetail(menuId: string): Promise<void> {
  loadingHistory.value = true;
  historyError.value = null;
  try {
    historyDetail.value = await getMenu(menuId);
  } catch (err) {
    logger.error(`加载历史菜单详情失败 menuId=${menuId}`, err);
    historyError.value = '加载失败，请稍后重试';
  } finally {
    loadingHistory.value = false;
  }
}
function backToList(): void {
  historyDetail.value = null;
}
async function handleDelete(menuId: string): Promise<void> {
  if (deleting.value) return;
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '提示',
      content: '确定删除这份历史菜单吗？',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    });
  });
  if (!res) return;
  deleting.value = true;
  try {
    await deleteMenu(menuId);
    if (historyDetail.value && historyDetail.value.id === menuId) {
      historyDetail.value = null;
    }
    await loadHistoryList();
  } catch (err) {
    logger.error(`删除历史菜单失败 menuId=${menuId}`, err);
    uni.showToast({ title: '删除失败', icon: 'none' });
  } finally {
    deleting.value = false;
  }
}
async function handleRestore(): Promise<void> {
  if (restoring.value || !historyDetail.value) return;
  restoring.value = true;
  try {
    await clearCart();
    const results = await Promise.allSettled(
      historyDetail.value.items.map((item) => addToCart(item.dishId)),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const total = historyDetail.value.items.length;
    await fetchCart();
    showHistory.value = false;
    uni.showToast({
      title:
        ok < total
          ? `已还原 ${ok} 道（${total - ok} 道已删除）`
          : `已还原 ${ok} 道菜`,
      icon: 'none',
    });
  } catch (err) {
    logger.error('还原历史菜单失败', err);
    uni.showToast({ title: '还原失败', icon: 'none' });
  } finally {
    restoring.value = false;
  }
}

function goOrder(): void {
  uni.switchTab({ url: '/pages/order/order' });
}

onMounted(() => {
  fetchCart();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f8f5f0;
  padding-bottom: 120rpx;
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
.header-actions {
  margin-top: 20rpx;
  display: flex;
  gap: 20rpx;
}
.btn-save {
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  border-radius: 999rpx;
  padding: 14rpx 32rpx;
  font-size: 26rpx;
}
.btn-history {
  background: #fff;
  border: 1rpx solid #e3dccd;
  color: #3e3a33;
  border-radius: 999rpx;
  padding: 14rpx 32rpx;
  font-size: 26rpx;
}
.empty {
  padding: 160rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-emoji {
  font-size: 120rpx;
}
.empty-title {
  font-size: 40rpx;
  color: #3e3a33;
  margin-top: 24rpx;
}
.empty-desc {
  font-size: 26rpx;
  color: #9a928a;
  margin-top: 16rpx;
}
.btn-go {
  margin-top: 48rpx;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  border-radius: 999rpx;
  padding: 20rpx 80rpx;
  font-size: 32rpx;
}
.content {
  padding: 0 32rpx;
}
.category {
  margin-bottom: 40rpx;
}
.category-head {
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
.category-count {
  font-size: 24rpx;
  color: #9a928a;
}
.dish-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}
.dish-cell {
  width: calc((100% - 24rpx) / 2);
}
.stats-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(74, 55, 40, 0.06);
  margin: 8rpx 0 32rpx;
}
.stats-title {
  font-size: 32rpx;
  color: #3e3a33;
}
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  font-size: 26rpx;
}
.stats-name {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: #3e3a33;
}
.stats-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
}
.stats-count {
  color: #9a928a;
}
.stats-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #ece7de;
  font-size: 28rpx;
  color: #3e3a33;
}
.stats-total-num {
  color: #ff7a6b;
  font-weight: 700;
  font-size: 34rpx;
}
.btn-clear {
  width: 100%;
  background: #fff;
  border: 1rpx solid #e3dccd;
  border-radius: 999rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #9a928a;
  box-sizing: border-box;
  margin-bottom: 24rpx;
}
.state-text {
  padding: 80rpx 0;
  text-align: center;
  color: #9a928a;
  font-size: 28rpx;
}
.bottom-space {
  height: 40rpx;
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
.modal-title {
  font-size: 36rpx;
  color: #3e3a33;
}
.modal-desc {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #9a928a;
}
.modal-input {
  background: #f5f2ec;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  color: #3e3a33;
  margin-top: 24rpx;
}
.modal-foot {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
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
.btn-save2.disabled,
.btn-restore.disabled {
  opacity: 0.6;
}
.history-modal {
  max-height: 85vh;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.modal-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.btn-back {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  background: #f5f2ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #3e3a33;
}
.modal-close {
  color: #9a928a;
  font-size: 32rpx;
  padding: 8rpx;
}
.history-body {
  max-height: 62vh;
}
.history-time {
  font-size: 24rpx;
  color: #9a928a;
  margin-bottom: 24rpx;
  display: block;
}
.detail-cat {
  margin-bottom: 24rpx;
}
.detail-cat-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.detail-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
}
.detail-cat-name {
  font-size: 30rpx;
  color: #3e3a33;
}
.detail-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #f5f2ec;
  border-radius: 16rpx;
  padding: 12rpx;
  margin-bottom: 12rpx;
}
.detail-img {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.detail-img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
}
.detail-name {
  flex: 1;
  font-size: 26rpx;
  color: #3e3a33;
}
.detail-id {
  font-size: 22rpx;
  color: #9a928a;
}
.detail-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.btn-restore {
  flex: 1;
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #fff;
  border-radius: 999rpx;
  padding: 22rpx;
  text-align: center;
  font-size: 26rpx;
}
.btn-del {
  background: #fdecec;
  color: #e5484d;
  border-radius: 999rpx;
  padding: 22rpx 40rpx;
  font-size: 26rpx;
}
.history-empty {
  padding: 80rpx 0;
  text-align: center;
  color: #9a928a;
  font-size: 28rpx;
}
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f5f2ec;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.history-item-main {
  flex: 1;
}
.history-item-name {
  font-size: 30rpx;
  color: #3e3a33;
}
.history-item-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9a928a;
}
.history-item-del {
  font-size: 32rpx;
  padding: 8rpx 8rpx 8rpx 24rpx;
}
.history-state {
  padding: 80rpx 0;
  text-align: center;
  color: #9a928a;
  font-size: 28rpx;
}
</style>
