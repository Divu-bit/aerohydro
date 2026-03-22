const STORAGE_KEYS = {
  USER_ID: 'aerohydro_userid',
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/user';

export function saveUserId(id) {
  localStorage.setItem(STORAGE_KEYS.USER_ID, id);
}

export function getUserId() {
  return localStorage.getItem(STORAGE_KEYS.USER_ID);
}

export function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.USER_ID);
}

// ==========================================
// API Calls
// ==========================================

export async function createOrUpdateUser(profile, log = null, id = null) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, profile, log })
  });
  if (!res.ok) throw new Error('Failed to save user');
  const data = await res.json();
  if (!id && data._id) saveUserId(data._id);
  return data;
}

export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalToday() {
  return getLocalDateString(new Date());
}

export async function fetchUserAndLog(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (res.status === 404) {
    throw new Error('User not found');
  }
  if (!res.ok) throw new Error('Failed to fetch user');
  const user = await res.json();
  
  // Find today's log or return null using local timezone
  const today = getLocalToday();
  const log = user.logs?.find(l => l.date === today) || null;
  
  return { profile: user, log };
}

export async function logWaterAPI(id, date, total, entries) {
  const res = await fetch(`${API_URL}/${id}/logWater`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, total, entries })
  });
  if (!res.ok) throw new Error('Failed to log water');
  return res.json();
}
