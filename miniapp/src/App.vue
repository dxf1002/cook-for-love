<script setup lang="ts">
// 应用入口组件（uni-app 全局样式在 onLaunch / App.vue style 中）
</script>

<style>
/* 全局样式：适配点菜 App 的暖色家庭厨房风格 */
page {
  background-color: #f8f5f0;
  color: #3e3a33;
  font-family:
    -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue',
    sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
}

/* 通用工具类 */
.font-handwriting {
  font-family: 'PingFang SC', 'STKaiti', 'Kaiti', serif;
}

.card {
  background-color: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(74, 55, 40, 0.06);
}

.btn-primary {
  background: linear-gradient(135deg, #ff8a7a, #ff7a6b);
  color: #ffffff;
  border-radius: 999rpx;
}

.text-muted {
  color: #9a928a;
}
</style>
