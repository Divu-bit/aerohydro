import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  
  const users = await User.find({ telegramChatId: { $ne: null } });
  console.log(`Found ${users.length} accounts actively linked to a Telegram Chat ID.`);
  
  for (const u of users) {
    console.log(`---`);
    console.log(`User ID: ${u._id}`);
    console.log(`Daily Goal: ${u.dailyGoal} ml`);
    console.log(`Notification Pref: ${u.notificationPreference}`);
    console.log(`Telegram Chat ID: ${u.telegramChatId}`);
    
    // Check their logs for today
    const today = new Date();
    today.setMinutes(today.getMinutes() + 330);
    const todayStr = today.toISOString().slice(0, 10);
    
    const log = u.logs.find(l => l.date === todayStr);
    console.log(`Today's Log [${todayStr}]: ${log ? log.logged : 0} ml logged`);
  }
  
  process.exit(0);
}
check();
