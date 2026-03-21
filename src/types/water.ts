export interface WaterEntry {
  id: string;
  amount: number; // in ml
  timestamp: string; // ISO string
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  entries: WaterEntry[];
  total: number;
}

export interface WaterSettings {
  dailyGoal: number; // ml
  reminderInterval: number; // minutes
  cupSizes: number[]; // ml
  unit: 'ml' | 'oz';
  notificationsEnabled: boolean;
}

export interface WaterState {
  settings: WaterSettings;
  history: Record<string, DayRecord>; // keyed by YYYY-MM-DD
}
