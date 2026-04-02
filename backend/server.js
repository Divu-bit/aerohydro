import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import { processReminders, handleTelegramWebhook, handleUniversalWebhook } from './cronJobs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/user', userRoutes);

// ============================================================
// Cron endpoint — pinged every minute by cron-job.org
// ============================================================
app.get('/api/cron/reminders', async (req, res) => {
  try {
    await mongoose.connection.asPromise(); // ensure DB is connected
    const result = await processReminders();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Cron reminders error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// Telegram webhook — receives updates from Telegram servers
// ============================================================
app.post('/api/webhook/telegram', async (req, res) => {
  try {
    await mongoose.connection.asPromise(); // ensure DB is connected
    await handleTelegramWebhook(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.sendStatus(200); // always return 200 so Telegram doesn't retry
  }
});

// ============================================================
// Universal App webhook
// ============================================================
app.post('/api/webhook/universal', async (req, res) => {
  try {
    await mongoose.connection.asPromise(); // ensure DB is connected
    const userId = req.query.userId;
    if (userId) {
      await handleUniversalWebhook(req.body, userId);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Universal webhook error:', err);
    res.sendStatus(200); // always return 200 so Universal Bridge doesn't retry
  }
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || 'mongodb+srv://deewakarsngh2004_db_user:Spider%403506@cluster0.5y6720u.mongodb.net/aerohydro')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
