let permissionGranted = false;

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
}

const scheduledIds = [];

/**
 * Schedule browser notifications for each milestone.
 * @param {Array<{time:string, amountMl:number}>} schedule
 */
export function scheduleNotifications(schedule) {
  clearScheduledNotifications();

  schedule.forEach(({ time, amountMl, completed }) => {
    if (completed) return;
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const delay = target - now;

    if (delay > 0) {
      const id = setTimeout(() => {
        if (permissionGranted || Notification.permission === 'granted') {
          new Notification('💧 AeroHydro Reminder', {
            body: `Time to drink ${amountMl}ml of water!`,
            icon: '/vite.svg',
          });
        }
      }, delay);
      scheduledIds.push(id);
    }
  });
}

export function clearScheduledNotifications() {
  scheduledIds.forEach(id => clearTimeout(id));
  scheduledIds.length = 0;
}
