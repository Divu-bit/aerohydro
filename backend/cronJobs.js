import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import twilio from 'twilio';
import User from './models/User.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

// Helper to get today's date in IST (+5:30) since the frontend runs in IST
function getLocalToday() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 330);
  return d.toISOString().slice(0, 10);
}

// Initialize clients
let bot = null;
if (TELEGRAM_TOKEN) {
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log('Telegram bot initialized with polling.');
  
  // Handle /start command to link accounts
  bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match[1];
    
    try {
      // First, completely detach this telegram Chat ID from any old 'ghost' accounts a user might have abandoned
      await User.updateMany(
        { telegramChatId: String(chatId) },
        { $unset: { telegramChatId: "" } }
      );

      const user = await User.findById(userId);
      if (user) {
        user.telegramChatId = String(chatId);
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

  // Handle inline button callbacks for water logging
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data; // e.g. "drink_100", "drink_250", "drink_500"

    if (!data.startsWith('drink_')) return;

    const amount = parseInt(data.split('_')[1], 10);
    if (isNaN(amount) || amount <= 0) return;

    try {
      // Find the user by their telegram chat ID
      const user = await User.findOne({ telegramChatId: String(chatId), notificationPreference: 'telegram' });
      if (!user) {
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Account not linked!' });
        return;
      }

      const today = getLocalToday();
      const logIndex = user.logs.findIndex(l => l.date === today);

      if (logIndex >= 0) {
        user.logs[logIndex].logged += amount;
        user.logs[logIndex].entries.push({
          id: `tg_${Date.now()}`,
          amount,
          timestamp: new Date().toISOString()
        });
      } else {
        user.logs.push({
          date: today,
          logged: amount,
          entries: [{
            id: `tg_${Date.now()}`,
            amount,
            timestamp: new Date().toISOString()
          }]
        });
      }

      await user.save();

      // Calculate new remaining
      const updatedLog = user.logs.find(l => l.date === today);
      const newLogged = updatedLog ? updatedLog.logged : 0;
      const remaining = Math.max(0, user.dailyGoal - newLogged);

      // Acknowledge the button press
      bot.answerCallbackQuery(callbackQuery.id, { text: `✅ Logged ${amount}ml!` });

      // Update the original message to show confirmation
      if (remaining > 0) {
        bot.editMessageText(
          `✅ Logged ${amount}ml! You now have ${remaining}${user.unit} remaining today. Keep it up! 💪`,
          { chat_id: chatId, message_id: callbackQuery.message.message_id }
        );
      } else {
        bot.editMessageText(
          `🎉 Logged ${amount}ml! You've reached your daily goal! Amazing work! 🏆`,
          { chat_id: chatId, message_id: callbackQuery.message.message_id }
        );
      }
    } catch (err) {
      console.error('Error logging water via Telegram:', err);
      bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error logging water' });
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
      
      const today = getLocalToday();
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
          const msg = `💧 Hey ${user.name || 'there'}! Time to hydrate.\n\nYou still have **${remaining}${user.unit}** left to reach your daily goal.\n\nTap a button below to log your intake:`;
          
          if (user.notificationPreference === 'telegram') {
            if (bot && user.telegramChatId) {
              // Send message with inline keyboard buttons
              bot.sendMessage(user.telegramChatId, msg, {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🥤 100ml', callback_data: 'drink_100' },
                      { text: '🥛 250ml', callback_data: 'drink_250' },
                      { text: '🍶 500ml', callback_data: 'drink_500' }
                    ]
                  ]
                }
              }).catch(console.error);
            } else {
              console.log(`[SIMULATED TELEGRAM to ${user.name}] ${msg}`);
            }
          } else if (user.notificationPreference === 'twilio') {
            const smsMsg = `💧 Hey ${user.name || 'there'}! Time to hydrate. You still have ${remaining}${user.unit} left to reach your daily goal!`;
            if (twilioClient && user.phoneNumber && TWILIO_PHONE) {
              twilioClient.messages.create({
                body: smsMsg,
                from: TWILIO_PHONE,
                to: user.phoneNumber
              }).catch(console.error);
            } else {
              console.log(`[SIMULATED SMS to ${user.phoneNumber || user.name}] ${smsMsg}`);
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
