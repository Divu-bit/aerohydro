const STORAGE_KEYS = {
  PROFILE: 'aerohydro_profile',
  DAILY_LOG: 'aerohydro_daily_',
};

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

export function loadProfile() {
  const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

function todayKey() {
  return STORAGE_KEYS.DAILY_LOG + new Date().toISOString().slice(0, 10);
}

export function saveDailyLog(log) {
  localStorage.setItem(todayKey(), JSON.stringify(log));
}

export function loadDailyLog() {
  const raw = localStorage.getItem(todayKey());
  return raw ? JSON.parse(raw) : null;
}

export function clearAllData() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('aerohydro_'))
    .forEach(k => localStorage.removeItem(k));
}
