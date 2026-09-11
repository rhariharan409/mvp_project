import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';

import materialsRouter from './routes/materials.js';
import coursesRouter from './routes/courses.js';
import assessmentsRouter from './routes/assessments.js';
import learnerRouter from './routes/learner.js';
import tutorRouter from './routes/tutor.js';
import settingsRouter from './routes/settings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Express Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize SQLite database
await initDatabase();

// API Endpoints
app.use('/api/materials', materialsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/learner', learnerRouter);
app.use('/api/tutor', tutorRouter);
app.use('/api/settings', settingsRouter);

// Serve uploads static folder if needed
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`CogniFlow LMS Backend Server listening on port ${PORT}`);
});
