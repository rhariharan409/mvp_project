import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({
      has_gemini_key: !!(settings.gemini_api_key || process.env.GEMINI_API_KEY),
      gemini_api_key: settings.gemini_api_key ? '••••••••' + settings.gemini_api_key.slice(-4) : '',
      active_user_role: settings.active_user_role || 'student'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
router.post('/', (req, res) => {
  try {
    const { gemini_api_key, active_user_role } = req.body;

    const upsert = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    if (gemini_api_key !== undefined) {
      upsert.run('gemini_api_key', gemini_api_key);
    }
    if (active_user_role !== undefined) {
      upsert.run('active_user_role', active_user_role);
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
