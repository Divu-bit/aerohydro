import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import { startCronJobs } from './cronJobs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/user', userRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || 'mongodb+srv://deewakarsngh2004_db_user:Spider%403506@cluster0.5y6720u.mongodb.net/aerohydro')
  .then(() => {
    console.log('Connected to MongoDB');
    startCronJobs();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
