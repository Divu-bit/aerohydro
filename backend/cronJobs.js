import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import twilio from 'twilio';
import User from './models/User.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

// Initialize clients
let bot = null;
if (TELEGRAM_TOKEN) {
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log('Telegram bot initialized with polling.');
  
  bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match[1];
    
    try {
      const user = await User.findById(userId);
      if (user) {
        user.telegramChatId = chatId;
        user.notificationPreference = 'telegram';
        await user.save();
        bot.sendMessage(chatId, `🎉 Successfully linked your AeroHydro account! I will remind you to drink water here.`);
      } else {
        bot.sendMessage(chatId, `❌ Could not find an AeroHydro account with that ID.`);
      }
    } catch (err) {
      console.error('Error linking telegram account:', err);
    }
  });
} else {
  console.log('TELEGRAM_BOT_TOKEN missing. Telegram notifications will be simulated.');
}

let twilioClient = null;
if (TWILIO_SID && TWILIO_AUTH) {
  twilioClient = twilio(TWILIO_SID, TWILIO_AUTH);
  console.log('Twilio client initialized.');
} else {
  console.log('Twilio credentials missing. SMS notifications will be simulated.');
}

export function startCronJobs() {
  console.log('Started AeroHydro Notification Cron Job.');
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      // Find all users who prefer telegram or twilio
      const users = await User.find({
        notificationPreference: { $in: ['telegram', 'twilio'] }
      });
      
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();

      for (const user of users) {
        // Find today's log
        const log = user.logs.find(l => l.date === today);
        const logged = log ? log.logged : 0;
        
        const remaining = Math.max(0, user.dailyGoal - logged);
        
        // If user already met the goal, skip
        if (remaining <= 0) continue;

        // Check if enough time has passed based on reminderInterval
        const lastReminded = user.lastRemindedAt || new Date(now.getTime() - (user.reminderInterval * 60 * 1000 + 1));
        const diffMs = now - lastReminded;
        const diffMins = diffMs / 60000;

        if (diffMins >= user.reminderInterval) {
          const msg = `💧 Hey ${user.name || 'there'}! Time to hydrate. You still have ${remaining}${user.unit} left to reach your daily goal!`;
          
          if (user.notificationPreference === 'telegram') {
            if (bot && user.telegramChatId) {
              bot.sendMessage(user.telegramChatId, msg).catch(console.error);
            } else {
              console.log(`[SIMULATED TELEGRAM to ${user.name}] ${msg}`);
            }
          } else if (user.notificationPreference === 'twilio') {
            if (twilioClient && user.phoneNumber && TWILIO_PHONE) {
              twilioClient.messages.create({
                body: msg,
                from: TWILIO_PHONE,
                to: user.phoneNumber
              }).catch(console.error);
            } else {
              console.log(`[SIMULATED SMS to ${user.phoneNumber || user.name}] ${msg}`);
            }
          }

          // Update last reminded time
          user.lastRemindedAt = now;
          await user.save();
        }
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  });
}
