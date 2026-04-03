import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  
  // Find all users grouped by telegramChatId
  const users = await User.find({ telegramChatId: { $ne: null }, notificationPreference: 'telegram' });
  const byChat = {};
  for (const u of users) {
    if (!byChat[u.telegramChatId]) byChat[u.telegramChatId] = [];
    byChat[u.telegramChatId].push(u);
  }
  
  let fixed = 0;
  for (const [chatId, copies] of Object.entries(byChat)) {
    if (copies.length > 1) {
      console.log(`Found ${copies.length} profiles for chatId ${chatId}.`);
      // Sort by creation time (descending: newest first)
      copies.sort((a, b) => b._id.getTimestamp() - a._id.getTimestamp());
      const active = copies[0]; // Newest is assumed to be active
      const ghosts = copies.slice(1);
      
      for (const ghost of ghosts) {
        console.log(`Disabling ghost profile ${ghost._id} (Goal: ${ghost.dailyGoal})`);
        ghost.telegramChatId = null;
        ghost.notificationPreference = 'none';
        await ghost.save();
        fixed++;
      }
    }
  }
  console.log(`Database cleanup complete. Disabled ${fixed} ghost accounts.`);
  process.exit(0);
}
fix();
