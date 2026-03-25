import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { WaterSettings, WaterEntry, DayRecord, WaterState } from '@/types/water';
import { getUserId, fetchUserAndLog, createOrUpdateUser, logWaterAPI, clearAllData, getLocalToday, getLocalDateString } from '@/utils/storage';

const DEFAULT_SETTINGS: WaterSettings = {
  dailyGoal: 3000,
  reminderInterval: 60,
  cupSizes: [100, 250, 500],
  unit: 'ml',
  wakeTime: '07:00',
  sleepTime: '23:00',
  notificationsEnabled: false,
  telegramChatId: null,
  phoneNumber: null,
  notificationPreference: 'browser'
};

// Helper: convert "HH:MM" to minutes since midnight
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Check if current time is past sleep time
function isPastSleepTime(sleepTime: string): boolean {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= timeToMinutes(sleepTime);
}

// Check if current time is within wake-sleep window
function isWithinWakeSleepWindow(wakeTime: string, sleepTime: string): boolean {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const wake = timeToMinutes(wakeTime);
  const sleep = timeToMinutes(sleepTime);
  return nowMins >= wake && nowMins < sleep;
}

function getToday(): string {
  return getLocalToday();
}

interface WaterContextType {
  userName: string;
  settings: WaterSettings;
  updateSettings: (s: Partial<WaterSettings>) => Promise<void>;
  todayRecord: DayRecord;
  addWater: (amount: number) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  resetToday: () => Promise<void>;
  weekData: { day: string; total: number; goal: number }[];
  streak: number;
  resetAllData: () => Promise<void>;
  loading: boolean;
}

const WaterContext = createContext<WaterContextType | null>(null);

export function WaterProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(getUserId());
  
  // Local state mirrored from db
  const [userName, setUserName] = useState<string>('');
  const [settings, setSettings] = useState<WaterSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<Record<string, DayRecord>>({});

  // Sync from backend on mount or profileId change
  useEffect(() => {
    const id = getUserId();
    if (!id) {
      setLoading(false);
      return;
    }
    
    setProfileId(id);
    fetchUserAndLog(id).then(({ profile }) => {
      setUserName(profile.name || '');
      // Map MongoDB user to settings
      setSettings({
        dailyGoal: profile.dailyGoal || DEFAULT_SETTINGS.dailyGoal,
        reminderInterval: profile.reminderInterval || DEFAULT_SETTINGS.reminderInterval,
        cupSizes: profile.cupSizes?.length ? profile.cupSizes : DEFAULT_SETTINGS.cupSizes,
        unit: profile.unit || DEFAULT_SETTINGS.unit,
        wakeTime: profile.wakeTime || DEFAULT_SETTINGS.wakeTime,
        sleepTime: profile.sleepTime || DEFAULT_SETTINGS.sleepTime,
        notificationsEnabled: profile.notificationsEnabled || false,
        notificationPreference: profile.notificationPreference || 'browser',
        telegramChatId: profile.telegramChatId || null,
        phoneNumber: profile.phoneNumber || null,
      });

      // Reconstruct history dictionary from logs array
      const hist: Record<string, DayRecord> = {};
      (profile.logs || []).forEach((log: any) => {
        hist[log.date] = {
          date: log.date,
          total: log.logged || 0,
          entries: log.entries || [],
        };
      });
      setHistory(hist);
    }).catch(e => {
      console.error("Failed to load user from DB", e);
      if (e.message === 'User not found') {
        clearAllData();
        window.location.href = '/onboarding';
      }
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const todayKey = getToday();

  // activeDayKey: after sleep time, switch to tomorrow's key so dashboard resets to 0
  const activeDayKey = useMemo(() => {
    if (isPastSleepTime(settings.sleepTime)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return getLocalDateString(tomorrow);
    }
    return todayKey;
  }, [todayKey, settings.sleepTime]);

  // todayRecord for dashboard uses activeDayKey (resets after sleep)
  const todayRecord: DayRecord = history[activeDayKey] || {
    date: activeDayKey,
    entries: [],
    total: 0,
  };

  const addWater = useCallback(async (amount: number) => {
    if (!profileId) return;

    const entry: WaterEntry = {
      id: crypto.randomUUID(),
      amount,
      timestamp: new Date().toISOString(),
    };

    const newEntries = [...todayRecord.entries, entry];
    const newTotal = todayRecord.total + amount;

    // Optimistic update
    setHistory(prev => ({
      ...prev,
      [activeDayKey]: { ...todayRecord, entries: newEntries, total: newTotal }
    }));

    try {
      await logWaterAPI(profileId, activeDayKey, newTotal, newEntries);
    } catch (e) {
      console.error("Failed to log water to backend", e);
    }
  }, [profileId, todayRecord, activeDayKey]);

  const removeEntry = useCallback(async (id: string) => {
    if (!profileId) return;

    const entryToRemove = todayRecord.entries.find(e => e.id === id);
    if (!entryToRemove) return;

    const newEntries = todayRecord.entries.filter(e => e.id !== id);
    const newTotal = todayRecord.total - entryToRemove.amount;

    // Optimistic update
    setHistory(prev => ({
      ...prev,
      [activeDayKey]: { ...todayRecord, entries: newEntries, total: newTotal }
    }));

    try {
      await logWaterAPI(profileId, activeDayKey, newTotal, newEntries);
    } catch (e) {
      console.error("Failed to remove water from backend", e);
    }
  }, [profileId, todayRecord, activeDayKey]);

  const resetToday = useCallback(async () => {
    if (!profileId) return;

    // Optimistic update — set active day to 0
    setHistory(prev => ({
      ...prev,
      [activeDayKey]: { date: activeDayKey, entries: [], total: 0 }
    }));

    try {
      await logWaterAPI(profileId, activeDayKey, 0, []);
    } catch (e) {
      console.error("Failed to reset today's water log", e);
    }
  }, [profileId, activeDayKey]);

  const updateSettings = useCallback(async (partial: Partial<WaterSettings>) => {
    if (!profileId) return;
    
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings); // Optimistically

    // Strip telegramChatId — it's managed exclusively by the Telegram bot's /start handler.
    // Sending null from the frontend would overwrite the value the bot saved.
    const { telegramChatId, ...profileToSave } = newSettings;

    try {
      await createOrUpdateUser(profileToSave, null, profileId);
    } catch (e) {
      console.error("Failed to update settings in backend", e);
    }
  }, [settings, profileId]);

  const resetAllData = useCallback(async () => {
    // Stop external notifications before wiping local data
    if (profileId) {
      try {
        await createOrUpdateUser({ notificationPreference: 'none', notificationsEnabled: false }, null, profileId);
      } catch (e) {
        console.error("Failed to disable notifications on reset", e);
      }
    }
    clearAllData();
    window.location.href = '/';
  }, [profileId]);

  // Compute week data
  const weekData = useMemo(() => {
    const days: { day: string; total: number; goal: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getLocalDateString(d);
      const shortDay = d.toLocaleDateString('en', { weekday: 'short' });
      days.push({
        day: shortDay,
        total: history[key]?.total || 0,
        goal: settings.dailyGoal,
      });
    }
    return days;
  }, [history, settings.dailyGoal]);

  // Compute streak
  const streak = useMemo(() => {
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getLocalDateString(d);
      const rec = history[key];
      if (rec && rec.total >= settings.dailyGoal) {
        count++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
    return count;
  }, [history, settings.dailyGoal]);

  // Track whether we've already sent the goal-completed browser notification for the current active day
  const goalNotifiedDayRef = useRef<string | null>(null);

  // Notifications logic
  useEffect(() => {
    if (!settings.notificationsEnabled || typeof window === 'undefined') return;
    if (settings.notificationPreference !== 'browser') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const currentRemaining = Math.max(0, settings.dailyGoal - todayRecord.total);

    // ── Goal completed notification (one-time) ──
    if (currentRemaining <= 0 && goalNotifiedDayRef.current !== activeDayKey) {
      goalNotifiedDayRef.current = activeDayKey;
      new Notification('🎉 Goal Completed!', {
        body: `You've reached your daily goal of ${settings.dailyGoal}${settings.unit}! Amazing work!`,
        icon: '/vite.svg',
      });
      return; // No interval needed — goal met
    }

    // If goal already met, don't set up reminders
    if (currentRemaining <= 0) return;

    // ── Periodic reminders (only within wake–sleep window) ──
    const intervalMs = settings.reminderInterval * 60 * 1000;

    const intervalId = setInterval(() => {
      if (!isWithinWakeSleepWindow(settings.wakeTime, settings.sleepTime)) return;

      const remaining = Math.max(0, settings.dailyGoal - todayRecord.total);
      if (remaining > 0) {
        new Notification('💧 Time to Hydrate!', {
          body: `You still have ${remaining}${settings.unit} left to reach your daily goal. Take a sip!`,
          icon: '/vite.svg',
        });
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [settings.notificationsEnabled, settings.notificationPreference, settings.reminderInterval, settings.dailyGoal, todayRecord.total, settings.unit, settings.wakeTime, settings.sleepTime, activeDayKey]);

  return (
    <WaterContext.Provider
      value={{
        userName,
        settings,
        updateSettings,
        todayRecord,
        addWater,
        removeEntry,
        resetToday,
        weekData,
        streak,
        resetAllData,
        loading
      }}
    >
      {children}
    </WaterContext.Provider>
  );
}

export function useWater() {
  const ctx = useContext(WaterContext);
  if (!ctx) throw new Error('useWater must be used within WaterProvider');
  return ctx;
}
