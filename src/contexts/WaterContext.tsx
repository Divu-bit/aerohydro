import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { WaterSettings, WaterEntry, DayRecord, WaterState } from '@/types/water';
import { getUserId, fetchUserAndLog, createOrUpdateUser, logWaterAPI, clearAllData } from '@/utils/storage';

const DEFAULT_SETTINGS: WaterSettings = {
  dailyGoal: 3000,
  reminderInterval: 60,
  cupSizes: [100, 250, 500],
  unit: 'ml',
  notificationsEnabled: false,
  telegramChatId: null,
  phoneNumber: null,
  notificationPreference: 'browser'
};

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

interface WaterContextType {
  userName: string;
  settings: WaterSettings;
  updateSettings: (s: Partial<WaterSettings>) => Promise<void>;
  todayRecord: DayRecord;
  addWater: (amount: number) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
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
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const todayKey = getToday();
  const todayRecord: DayRecord = history[todayKey] || {
    date: todayKey,
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
      [todayKey]: { ...todayRecord, entries: newEntries, total: newTotal }
    }));

    try {
      await logWaterAPI(profileId, todayKey, newTotal, newEntries);
    } catch (e) {
      console.error("Failed to log water to backend", e);
    }
  }, [profileId, todayRecord, todayKey]);

  const removeEntry = useCallback(async (id: string) => {
    if (!profileId) return;

    const entryToRemove = todayRecord.entries.find(e => e.id === id);
    if (!entryToRemove) return;

    const newEntries = todayRecord.entries.filter(e => e.id !== id);
    const newTotal = todayRecord.total - entryToRemove.amount;

    // Optimistic update
    setHistory(prev => ({
      ...prev,
      [todayKey]: { ...todayRecord, entries: newEntries, total: newTotal }
    }));

    try {
      await logWaterAPI(profileId, todayKey, newTotal, newEntries);
    } catch (e) {
      console.error("Failed to remove water from backend", e);
    }
  }, [profileId, todayRecord, todayKey]);

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
    clearAllData();
    window.location.href = '/';
  }, []);

  // Compute week data
  const weekData = useMemo(() => {
    const days: { day: string; total: number; goal: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
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
      const key = d.toISOString().slice(0, 10);
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

  // Notifications logic
  useEffect(() => {
    if (!settings.notificationsEnabled || typeof window === 'undefined') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Check every X minutes
    const intervalMs = settings.reminderInterval * 60 * 1000;
    
    const intervalId = setInterval(() => {
      // Using dependency array means this timer resets every time the user logs water!
      const currentRemaining = Math.max(0, settings.dailyGoal - todayRecord.total);
      
      if (currentRemaining > 0) {
        console.log(`[Notification] Firing hydration reminder! Remaining: ${currentRemaining}${settings.unit}`);
        new Notification('💧 Time to Hydrate!', {
          body: `You still have ${currentRemaining}${settings.unit} left to reach your daily goal. Take a sip!`,
          icon: '/vite.svg',
        });
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [settings.notificationsEnabled, settings.reminderInterval, settings.dailyGoal, todayRecord.total, settings.unit]);

  return (
    <WaterContext.Provider
      value={{
        userName,
        settings,
        updateSettings,
        todayRecord,
        addWater,
        removeEntry,
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
