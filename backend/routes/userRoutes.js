import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Get user profile and today's log
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // We can also just return the whole user object
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create or update user profile
router.post('/', async (req, res) => {
  try {
    const { id, profile, log } = req.body;
    let user;

    if (id) {
      // Update existing user
      user = await User.findById(id);
      if (user) {
        Object.assign(user, profile);
        // Update today's log if provided (useful for recalculating schedule on settings save)
        if (log) {
          const today = log.date;
          const logIndex = user.logs.findIndex(l => l.date === today);
          if (logIndex >= 0) {
            user.logs[logIndex] = log;
          } else {
            user.logs.push(log);
          }
        }
        await user.save();
        return res.json(user);
      }
    }

    // Create new user (onboarding)
    user = new User({ ...profile, logs: log ? [log] : [] });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Log water (Update specific timeline entries and total logged)
router.post('/:id/logWater', async (req, res) => {
  try {
    const { date, total, entries } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const logIndex = user.logs.findIndex(l => l.date === date);
    if (logIndex >= 0) {
      user.logs[logIndex].logged = total;
      user.logs[logIndex].entries = entries;
    } else {
      user.logs.push({ date, logged: total, entries });
    }

    // If this is a reset (total=0), clear the goal notification flag
    // so reminders can resume for this day
    if (total === 0 && user.goalCompletedNotifiedDate === date) {
      user.goalCompletedNotifiedDate = null;
    }

    await user.save();
    res.json(user.logs[logIndex === -1 ? user.logs.length - 1 : logIndex]);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
