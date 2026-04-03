import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
import { processReminders, handleUniversalWebhook } from './cronJobs.js';

dotenv.config();

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('[TEST] Connected to MongoDB');

  // 1. Create a temporary user with Universal App preference
  const testUserId = new mongoose.Types.ObjectId();
  const testUser = new User({
    _id: testUserId,
    name: 'Universal Test User',
    notificationPreference: 'universal',
    notificationsEnabled: true,
    universalAppUserId: 'test-app-user-1234',
    dailyGoal: 2000,
    unit: 'ml',
    wakeTime: '00:00', // Wide window
    sleepTime: '23:59',
    logs: []
  });
  
  await testUser.save();
  console.log(`[TEST] Created temporary dummy user with preference: universal.`);

  console.log(`[TEST] 🚀 Triggering processReminders() which should fire fetch() to Universal Bridge...`);
  try {
     const res = await processReminders();
     console.log(`[TEST] processReminders Output: `, res);
  } catch (err) {
     console.error(`[TEST] processReminders Error: `, err);
  }

  // wait a bit
  await new Promise(r => setTimeout(r, 2000));

  console.log(`[TEST] 📬 Simulating webhook push back from Universal Bridge natively...`);
  const mockWebhookBody = { action: 'drink_250', data: {} };
  await handleUniversalWebhook(mockWebhookBody, testUserId.toString());
  
  // Reload user
  const updatedUser = await User.findById(testUserId);
  const todayVal = new Date();
  todayVal.setMinutes(todayVal.getMinutes() + 330);
  const todayDateStr = todayVal.toISOString().slice(0, 10);
  
  const logDay = updatedUser.logs.find(l => l.date === todayDateStr);
  console.log(`[TEST] Log Verification -> Logged amount today: ${logDay ? logDay.logged : 0}ml`);
  
  // Teardown
  await User.findByIdAndDelete(testUserId);
  console.log(`[TEST] Cleaned up temporary test user.`);
  
  process.exit(0);
}

runTest();
