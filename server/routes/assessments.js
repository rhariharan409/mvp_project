import express from 'express';
import db from '../db.js';
import { updateMasteryAfterAssessment, calculateNextBestAction } from '../services/adaptiveEngine.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/assessments/:id
router.get('/:id', (req, res) => {
  try {
    const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const rawQuestions = db.prepare('SELECT * FROM questions WHERE assessment_id = ?').all(req.params.id);
    const questions = rawQuestions.map(q => ({
      ...q,
      options: JSON.parse(q.options || '[]')
    }));

    res.json({ assessment, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessments/submit
router.post('/submit', (req, res) => {
  try {
    const { userId = 'user_student_1', assessmentId, userAnswers } = req.body;
    
    const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const questions = db.prepare('SELECT * FROM questions WHERE assessment_id = ?').all(assessmentId);
    
    let score = 0;
    const evaluatedAnswers = userAnswers.map(ans => {
      const q = questions.find(item => item.id === ans.question_id);
      const isCorrect = q ? q.correct_answer.trim().toLowerCase() === String(ans.user_answer).trim().toLowerCase() : false;
      if (isCorrect) score += 1;
      return {
        question_id: ans.question_id,
        concept_id: q?.concept_id,
        user_answer: ans.user_answer,
        correct_answer: q?.correct_answer,
        is_correct: isCorrect,
        explanation: q?.explanation
      };
    });

    const maxScore = questions.length;
    const finalScorePct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Save attempt in database
    const attemptId = `att_${uuidv4()}`;
    db.prepare(`
      INSERT INTO attempts (id, user_id, assessment_id, score, max_score, answers_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(attemptId, userId, assessmentId, finalScorePct, 100, JSON.stringify(evaluatedAnswers));

    // Update Learner Knowledge Model mastery scores
    updateMasteryAfterAssessment(userId, assessmentId, evaluatedAnswers);

    // Compute updated Next Best Learning Action
    const nextAction = calculateNextBestAction(userId, assessment.course_id);

    // Log Activity
    db.prepare(`
      INSERT INTO learning_activity (id, user_id, course_id, activity_type, duration_secs, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`act_${uuidv4()}`, userId, assessment.course_id, assessment.type === 'diagnostic' ? 'DIAGNOSTIC_COMPLETE' : 'QUIZ_SUBMIT', 120, JSON.stringify({ score: finalScorePct }));

    res.json({
      attempt_id: attemptId,
      score: finalScorePct,
      correct_count: score,
      total_questions: maxScore,
      evaluated_answers: evaluatedAnswers,
      next_recommendation: nextAction
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
