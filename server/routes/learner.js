import express from 'express';
import db from '../db.js';
import { calculateNextBestAction } from '../services/adaptiveEngine.js';

const router = express.Router();

// GET /api/learner/dashboard
router.get('/dashboard', (req, res) => {
  try {
    const userId = req.query.userId || 'user_student_1';

    // 1. Fetch user's active courses
    const courses = db.prepare(`
      SELECT c.*, m.filename as source_material_name,
             (SELECT COUNT(*) FROM concepts WHERE course_id = c.id) as total_concepts
      FROM courses c
      JOIN materials m ON c.material_id = m.id
      ORDER BY c.created_at DESC
    `).all();

    // 2. Aggregate Concept Mastery metrics strictly from database
    const masteryRows = db.prepare(`
      SELECT lm.*, c.name as concept_name, c.course_id, c.lesson_id, l.title as lesson_title, crs.title as course_title
      FROM learner_mastery lm
      JOIN concepts c ON lm.concept_id = c.id
      LEFT JOIN lessons l ON c.lesson_id = l.id
      LEFT JOIN courses crs ON c.course_id = crs.id
      WHERE lm.user_id = ?
    `).all(userId);

    const masteredConcepts = masteryRows.filter(r => r.mastery_score >= 80.0);
    const learningConcepts = masteryRows.filter(r => r.mastery_score >= 50.0 && r.mastery_score < 80.0);
    const weakConcepts = masteryRows.filter(r => r.total_attempts > 0 && r.mastery_score < 50.0);
    const unassessedConcepts = masteryRows.filter(r => r.total_attempts === 0);

    const totalConceptsTracked = masteryRows.length;
    const overallProgress = totalConceptsTracked > 0
      ? Math.round((masteredConcepts.length / totalConceptsTracked) * 100)
      : 0;

    // 3. Compute total learning time in seconds from activity log
    const timeRow = db.prepare(`
      SELECT COALESCE(SUM(duration_secs), 0) as total_seconds 
      FROM learning_activity 
      WHERE user_id = ?
    `).get(userId);
    const totalLearningTimeSecs = timeRow?.total_seconds || 0;

    // 4. Calculate active daily streak based on distinct dates in activity log
    const activeDates = db.prepare(`
      SELECT DISTINCT DATE(created_at) as activity_date 
      FROM learning_activity 
      WHERE user_id = ? 
      ORDER BY activity_date DESC
    `).all(userId);

    let streakDays = 0;
    if (activeDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const latestDate = activeDates[0].activity_date;
      if (latestDate === today || latestDate === yesterday) {
        streakDays = 1;
        let currentDate = new Date(latestDate);

        for (let i = 1; i < activeDates.length; i++) {
          const prevDate = new Date(activeDates[i].activity_date);
          const diffDays = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streakDays++;
            currentDate = prevDate;
          } else {
            break;
          }
        }
      }
    }

    // 5. Fetch recent activity feed
    const activities = db.prepare(`
      SELECT la.*, c.title as course_title
      FROM learning_activity la
      LEFT JOIN courses c ON la.course_id = c.id
      WHERE la.user_id = ?
      ORDER BY la.created_at DESC
      LIMIT 10
    `).all(userId);

    // 6. Compute Next Best Action for the primary course
    let nextRecommendation = null;
    if (courses.length > 0) {
      nextRecommendation = calculateNextBestAction(userId, courses[0].id);
    }

    res.json({
      courses_count: courses.length,
      courses,
      overall_progress: overallProgress,
      mastery_summary: {
        mastered: masteredConcepts.length,
        learning: learningConcepts.length,
        weak: weakConcepts.length,
        unassessed: unassessedConcepts.length,
        total: totalConceptsTracked
      },
      weak_areas: weakConcepts.slice(0, 5),
      strong_areas: masteredConcepts.slice(0, 5),
      total_learning_time_secs: totalLearningTimeSecs,
      streak_days: streakDays,
      recent_activities: activities,
      next_recommendation: nextRecommendation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/learner/activity
router.post('/activity', (req, res) => {
  try {
    const { userId = 'user_student_1', courseId, conceptId, activityType, durationSecs = 30 } = req.body;
    
    db.prepare(`
      INSERT INTO learning_activity (id, user_id, course_id, concept_id, activity_type, duration_secs)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`act_${uuidv4()}`, userId, courseId, conceptId || null, activityType, durationSecs);

    res.json({ message: 'Activity logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
