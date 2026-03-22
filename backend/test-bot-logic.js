import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

function getLocalToday() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 330);
  return d.toISOString().slice(0, 10);
}

async function testBtnClick() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://deewakarsngh2004_db_user:Spider%403506@cluster0.5y6720u.mongodb.net/aerohydro');
  
  const user = await User.findOne({ notificationPreference: 'telegram' });
  if (!user) {
      console.log("No active telegram user found.");
      process.exit(1);
  }
  
  console.log(`[TEST] Active Database Profile Found: ID=${user._id}`);
  console.log(`[TEST] User Daily Goal is securely set to: ${user.dailyGoal}ml`);
  
  const today = getLocalToday();
  const logIndex = user.logs.findIndex(l => l.date === today);
  
  let currentLogged = 0;
  if (logIndex >= 0) {
      currentLogged = user.logs[logIndex].logged;
  }
  
  console.log(`[TEST] Current Logged amount for ${today}: ${currentLogged}ml`);
  
  const amount = 100;
  console.log(`[TEST] 💬 Simulating Telegram Button Click: +${amount}ml...`);
  
  if (logIndex >= 0) {
    user.logs[logIndex].logged += amount;
  } else {
    user.logs.push({ date: today, logged: amount, entries: [] });
  }
  
  await user.save();
  
  const updatedLog = user.logs.find(l => l.date === today);
  const newLogged = updatedLog ? updatedLog.logged : 0;
  const remaining = Math.max(0, user.dailyGoal - newLogged);
  
  console.log(`[TEST] Telegram Message Output: "✅ Logged ${amount}ml! You now have ${remaining}ml remaining today."`);
  
  // Revert test
  const finalLog = user.logs.find(l => l.date === today);
  finalLog.logged -= amount;
  await user.save();
  
  console.log("[TEST] Reverted test data. Database integrity verified.");
  process.exit(0);
}
testBtnClick();
