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

// ============================================================
// Telegram Bot — initialised WITHOUT polling (webhook mode)
// ============================================================
let bot = null;
if (TELEGRAM_TOKEN) {
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
  console.log('Telegram bot initialized (webhook mode — no polling).');
} else {
  console.log('TELEGRAM_BOT_TOKEN missing. Telegram notifications will be simulated.');
}

// ============================================================
// Twilio client
// ============================================================
let twilioClient = null;
if (TWILIO_SID && TWILIO_AUTH) {
  twilioClient = twilio(TWILIO_SID, TWILIO_AUTH);
  console.log('Twilio client initialized.');
} else {
  console.log('Twilio credentials missing. SMS notifications will be simulated.');
}

// ============================================================
// handleTelegramWebhook  — called by POST /api/webhook/telegram
// Processes every incoming Telegram "update" object.
// ============================================================
export async function handleTelegramWebhook(update) {
  if (!bot) return;

  // --- Handle /start <userId> command ---
  if (update.message && update.message.text) {
    const match = update.message.text.match(/^\/start (.+)$/);
    if (match) {
      const chatId = update.message.chat.id;
      const userId = match[1];

      try {
        // Detach this chatId from any old 'ghost' accounts
        await User.updateMany(
          { telegramChatId: String(chatId) },
          { $unset: { telegramChatId: "" } }
        );

        const user = await User.findById(userId);
        if (user) {
          user.telegramChatId = String(chatId);
          user.notificationPreference = 'telegram';
          await user.save();
          await bot.sendMessage(chatId, `🎉 Successfully linked your AeroHydro account! I will remind you to drink water here.`);
        } else {
          await bot.sendMessage(chatId, `❌ Could not find an AeroHydro account with that ID.`);
        }
      } catch (err) {
        console.error('Error linking telegram account:', err);
      }
      return;
    }
  }

  // --- Handle inline button callbacks (drink_100, drink_250, drink_500) ---
  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (!data || !data.startsWith('drink_')) return;

    const amount = parseInt(data.split('_')[1], 10);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const user = await User.findOne({ telegramChatId: String(chatId), notificationPreference: 'telegram' });
      if (!user) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Account not linked!' });
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

      const updatedLog = user.logs.find(l => l.date === today);
      const newLogged = updatedLog ? updatedLog.logged : 0;
      const remaining = Math.max(0, user.dailyGoal - newLogged);

      await bot.answerCallbackQuery(callbackQuery.id, { text: `✅ Logged ${amount}ml!` });

      if (remaining > 0) {
        await bot.editMessageText(
          `✅ Logged ${amount}ml! You now have ${remaining}${user.unit} remaining today. Keep it up! 💪`,
          { chat_id: chatId, message_id: callbackQuery.message.message_id }
        );
      } else {
        await bot.editMessageText(
          `🎉 Logged ${amount}ml! You've reached your daily goal! Amazing work! 🏆`,
          { chat_id: chatId, message_id: callbackQuery.message.message_id }
        );
      }
    } catch (err) {
      console.error('Error logging water via Telegram:', err);
      try { await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error logging water' }); } catch (_) {}
    }
  }
}

// ============================================================
// Helper: convert "HH:MM" to minutes since midnight
// ============================================================
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Helper: get current IST minutes since midnight
function getCurrentISTMinutes() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 330); // UTC → IST
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// ============================================================
// sendNotification — delivers a message via telegram or twilio
// ============================================================
async function sendNotification(user, msg, includeButtons = false) {
  if (user.notificationPreference === 'telegram') {
    if (bot && user.telegramChatId) {
      const opts = { parse_mode: 'Markdown' };
      if (includeButtons) {
        opts.reply_markup = {
          inline_keyboard: [
            [
              { text: '🥤 100ml', callback_data: 'drink_100' },
              { text: '🥛 250ml', callback_data: 'drink_250' },
              { text: '🍶 500ml', callback_data: 'drink_500' }
            ]
          ]
        };
      }
      await bot.sendMessage(user.telegramChatId, msg, opts);
      return true;
    }
    console.log(`[SIMULATED TELEGRAM to ${user.name}] ${msg}`);
  } else if (user.notificationPreference === 'twilio') {
    if (twilioClient && user.phoneNumber && TWILIO_PHONE) {
      await twilioClient.messages.create({
        body: msg,
        from: TWILIO_PHONE,
        to: user.phoneNumber
      });
      return true;
    }
    console.log(`[SIMULATED SMS to ${user.phoneNumber || user.name}] ${msg}`);
  }
  return false;
}

// ============================================================
// processReminders  — called by GET /api/cron/reminders
// One-shot: checks every user and sends due reminders.
//
// Logic:
//   1. If goal met & not yet notified today → send "goal completed!" and stop
//   2. If past sleep time & goal NOT met & not yet notified → send "goal missed"
//   3. If within wake–sleep window & goal not met → normal reminder (interval-based)
// ============================================================
export async function processReminders() {
  const users = await User.find({
    notificationsEnabled: true,
    notificationPreference: { $in: ['telegram', 'twilio'] }
  });

  const today = getLocalToday();
  const nowMins = getCurrentISTMinutes();
  const now = new Date();
  let sent = 0;

  for (const user of users) {
    const log = user.logs.find(l => l.date === today);
    const logged = log ? log.logged : 0;
    const remaining = Math.max(0, user.dailyGoal - logged);
    const alreadyNotifiedToday = user.goalCompletedNotifiedDate === today;

    const wakeMins = timeToMinutes(user.wakeTime) ?? 7 * 60;   // default 07:00
    const sleepMins = timeToMinutes(user.sleepTime) ?? 23 * 60; // default 23:00

    // ── Case 1: Goal completed ──
    if (remaining <= 0 && !alreadyNotifiedToday) {
      const msg = `🎉 Amazing, ${user.name || 'there'}! You've reached your daily goal of **${user.dailyGoal}${user.unit}**! Great job staying hydrated! 🏆`;
      try {
        const ok = await sendNotification(user, msg);
        if (ok) sent++;
      } catch (err) {
        console.error(`Goal-complete send error for ${user.name}:`, err.message);
      }
      user.goalCompletedNotifiedDate = today;
      await user.save();
      continue; // No further reminders needed
    }

    // If already notified (goal met earlier or missed earlier), skip entirely
    if (alreadyNotifiedToday) continue;

    // ── Case 2: Sleep time passed & goal NOT met ──
    if (nowMins >= sleepMins) {
      const msg = `😴 Hey ${user.name || 'there'}, your day is over but you didn't complete your hydration goal.\n\n**${remaining}${user.unit}** was left out of your **${user.dailyGoal}${user.unit}** goal. Try to do better tomorrow! 💪`;
      try {
        const ok = await sendNotification(user, msg);
        if (ok) sent++;
      } catch (err) {
        console.error(`Goal-missed send error for ${user.name}:`, err.message);
      }
      user.goalCompletedNotifiedDate = today;
      await user.save();
      continue;
    }

    // ── Case 3: Normal reminder (only within wake–sleep window) ──
    if (nowMins < wakeMins) continue; // Before wake time — skip

    const lastReminded = user.lastRemindedAt || new Date(now.getTime() - (user.reminderInterval * 60 * 1000 + 1));
    const diffMins = (now - lastReminded) / 60000;

    if (diffMins >= user.reminderInterval) {
      const msg = `💧 Hey ${user.name || 'there'}! Time to hydrate.\n\nYou still have **${remaining}${user.unit}** left to reach your daily goal.\n\nTap a button below to log your intake:`;
      try {
        const ok = await sendNotification(user, msg, true);
        if (ok) sent++;
      } catch (err) {
        console.error(`Reminder send error for ${user.name}:`, err.message);
      }
      user.lastRemindedAt = now;
      await user.save();
    }
  }

  return { checked: users.length, sent };
}
