const DEVICE_ID_KEY = 'device_id';

function generateRandomId(): string {
  const timestamp: number = Date.now();
  const random: string = Math.random().toString(36).slice(2, 10);
  return `guest_${timestamp}_${random}`;
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return generateRandomId();
  }

  let deviceId: string | null = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateRandomId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
