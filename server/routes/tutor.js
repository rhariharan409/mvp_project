import express from 'express';
import db from '../db.js';
import { askAiTutor } from '../services/llmService.js';

const router = express.Router();

// POST /api/tutor/chat
router.post('/chat', async (req, res) => {
  try {
    const { query, courseId, mode = 'explain_simply', apiKey } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    // Fetch course material context from SQLite
    let contextText = '';
    if (courseId) {
      const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
      const chunks = db.prepare('SELECT content, metadata FROM chunks WHERE material_id = ? LIMIT 10').all(course?.material_id || '');
      contextText = chunks.map(c => `[Page ${JSON.parse(c.metadata || '{}').page_number || 1}]: ${c.content}`).join('\n\n');
    }

    const tutorResponse = await askAiTutor(query, contextText, mode, apiKey);

    // Log Activity
    if (courseId) {
      db.prepare(`
        INSERT INTO learning_activity (id, user_id, course_id, activity_type, duration_secs, metadata_json)
        VALUES (?, ?, ?, 'TUTOR_QUERY', 20, ?)
      `).run(`act_${Date.now()}`, 'user_student_1', courseId, JSON.stringify({ query }));
    }

    res.json(tutorResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
