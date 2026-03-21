import mongoose from 'mongoose';

const EntrySchema = new mongoose.Schema({
  id: String,
  amount: Number,
  timestamp: String,
});

const DailyLogSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  logged: { type: Number, default: 0 },
  entries: [EntrySchema],
});

const UserSchema = new mongoose.Schema({
  name: String,
  age: Number,
  weightKg: Number,
  heightCm: Number,
  bmi: Number,
  activityLevel: String,
  wakeTime: String,
  sleepTime: String,
  dailyGoal: Number,
  unit: { type: String, default: 'metric' },
  reminderInterval: { type: Number, default: 60 },
  cupSizes: { type: [Number], default: [100, 250, 500] },
  notificationsEnabled: { type: Boolean, default: false },
  telegramChatId: { type: String, default: null },
  phoneNumber: { type: String, default: null },
  notificationPreference: { 
    type: String, 
    enum: ['browser', 'telegram', 'twilio', 'none'], 
    default: 'browser' 
  },
  lastRemindedAt: { type: Date, default: null },
  logs: [DailyLogSchema],
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
