const DEVICE_ID_KEY = 'device_id';

function generateRandomId(): string {
  const timestamp: number = Date.now();
  const random: string = Math.random().toString(36).slice(2, 10);
  return `guest_${timestamp}_${random}`;
}

/**
 * 游客身份：小程序端用 uni storage 持久化 deviceId，
 * 与 Web 端 localStorage 的 getDeviceId() 语义一致，随请求以 x-device-id 头传给后端。
 */
export function getDeviceId(): string {
  let deviceId: string = uni.getStorageSync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateRandomId();
    uni.setStorageSync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
