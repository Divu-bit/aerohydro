import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function purge() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  
  const result = await User.updateMany(
    { telegramChatId: { $ne: null }, notificationPreference: { $ne: 'telegram' } },
    { $unset: { telegramChatId: "" } }
  );
  
  console.log(`Completely purged telegramChatId from ${result.modifiedCount} ghost accounts.`);
  
  const active = await User.find({ telegramChatId: { $ne: null }, notificationPreference: 'telegram' });
  console.log(`There are exactly ${active.length} total active Telegram accounts remaining in the DB.`);
  for(const a of active) {
      console.log(`Active User: Goal=${a.dailyGoal}, ID=${a._id}`);
  }
  
  process.exit(0);
}
purge();
