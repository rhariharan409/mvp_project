import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate and return the Next Best Learning Action for a user in a specific course
 * @param {string} userId 
 * @param {string} courseId 
 * @returns {object} Recommendation object with action, concept, lesson, reason
 */
export function calculateNextBestAction(userId, courseId) {
  // 1. Fetch all concepts for this course
  const concepts = db.prepare(`
    SELECT c.id, c.name, c.definition, c.difficulty, c.importance, c.lesson_id, l.title as lesson_title, l.module_id,
           COALESCE(lm.mastery_score, 0.0) as mastery_score,
           COALESCE(lm.total_attempts, 0) as total_attempts,
           COALESCE(lm.correct_count, 0) as correct_count,
           COALESCE(lm.incorrect_count, 0) as incorrect_count,
           COALESCE(lm.last_practiced_at, NULL) as last_practiced_at
    FROM concepts c
    LEFT JOIN lessons l ON c.lesson_id = l.id
    LEFT JOIN learner_mastery lm ON c.id = lm.concept_id AND lm.user_id = ?
    WHERE c.course_id = ?
    ORDER BY l.order_index ASC, c.importance DESC
  `).all(userId, courseId);

  if (!concepts || concepts.length === 0) {
    return {
      action_type: 'LEARN_NEW',
      target_concept_id: null,
      target_lesson_id: null,
      reason: 'No concepts available in this course yet.',
      priority: 1.0
    };
  }

  // 2. Fetch all prerequisite relationships
  const relationships = db.prepare(`
    SELECT source_concept_id, target_concept_id
    FROM concept_relationships cr
    JOIN concepts c1 ON cr.source_concept_id = c1.id
    WHERE c1.course_id = ?
  `).all(courseId);

  // Map prerequisites per concept
  const prereqsMap = {}; // target_concept_id -> Array of source_concept_id
  for (let rel of relationships) {
    if (!prereqsMap[rel.target_concept_id]) prereqsMap[rel.target_concept_id] = [];
    prereqsMap[rel.target_concept_id].push(rel.source_concept_id);
  }

  const conceptMap = {};
  concepts.forEach(c => { conceptMap[c.id] = c; });

  // 3. Priority Case A: Check for Weak Concepts (< 50% mastery) that have been attempted
  const weakConcepts = concepts.filter(c => c.total_attempts > 0 && c.mastery_score < 50.0);
  if (weakConcepts.length > 0) {
    // Pick highest importance weak concept
    const target = weakConcepts[0];
    
    // Check if its prerequisites are also weak
    const targetPrereqs = prereqsMap[target.id] || [];
    const weakPrereqId = targetPrereqs.find(pId => (conceptMap[pId]?.mastery_score || 0) < 60.0);

    if (weakPrereqId) {
      const prereqConcept = conceptMap[weakPrereqId];
      const reason = `You should revisit '${prereqConcept.name}' (${Math.round(prereqConcept.mastery_score)}% mastery) before attempting '${target.name}' because '${prereqConcept.name}' is a weak prerequisite.`;
      
      saveRecommendation(userId, courseId, 'REVISIT_PREREQUISITE', prereqConcept.id, prereqConcept.lesson_id, reason, 0.95);
      return {
        action_type: 'REVISIT_PREREQUISITE',
        target_concept_id: prereqConcept.id,
        target_concept_name: prereqConcept.name,
        target_lesson_id: prereqConcept.lesson_id,
        reason,
        priority: 0.95
      };
    }

    const reason = `You should review weak concept '${target.name}' (current mastery: ${Math.round(target.mastery_score)}%) to solidify your foundation before advancing.`;
    saveRecommendation(userId, courseId, 'REVIEW_WEAK', target.id, target.lesson_id, reason, 0.9);
    return {
      action_type: 'REVIEW_WEAK',
      target_concept_id: target.id,
      target_concept_name: target.name,
      target_lesson_id: target.lesson_id,
      reason,
      priority: 0.9
    };
  }

  // 4. Priority Case B: First Unlearned Concept where all Prerequisites are Satisfied (Mastery >= 60%)
  for (let c of concepts) {
    if (c.mastery_score === 0.0 && c.total_attempts === 0) {
      const targetPrereqs = prereqsMap[c.id] || [];
      const unsatisfiedPrereqId = targetPrereqs.find(pId => (conceptMap[pId]?.mastery_score || 0) < 60.0);

      if (unsatisfiedPrereqId) {
        const prereqConcept = conceptMap[unsatisfiedPrereqId];
        const reason = `You should learn '${prereqConcept.name}' before starting '${c.name}' because '${prereqConcept.name}' is required as a prerequisite.`;
        saveRecommendation(userId, courseId, 'REVISIT_PREREQUISITE', prereqConcept.id, prereqConcept.lesson_id, reason, 0.85);
        return {
          action_type: 'REVISIT_PREREQUISITE',
          target_concept_id: prereqConcept.id,
          target_concept_name: prereqConcept.name,
          target_lesson_id: prereqConcept.lesson_id,
          reason,
          priority: 0.85
        };
      }

      // Ready to learn new concept!
      const satisfiedPrereqNames = targetPrereqs.map(pId => conceptMap[pId]?.name).filter(Boolean);
      const prereqContext = satisfiedPrereqNames.length > 0
        ? ` (you have mastered prerequisite ${satisfiedPrereqNames.join(', ')})`
        : '';
      
      const reason = `You should learn '${c.name}' next in lesson '${c.lesson_title || 'Lesson'}'${prereqContext}.`;
      saveRecommendation(userId, courseId, 'LEARN_NEW', c.id, c.lesson_id, reason, 0.8);
      return {
        action_type: 'LEARN_NEW',
        target_concept_id: c.id,
        target_concept_name: c.name,
        target_lesson_id: c.lesson_id,
        reason,
        priority: 0.8
      };
    }
  }

  // 5. Priority Case C: Practice concepts with medium mastery (50% - 80%)
  const practiceCandidate = concepts.find(c => c.mastery_score >= 50.0 && c.mastery_score < 80.0);
  if (practiceCandidate) {
    const reason = `Take a quick practice quiz on '${practiceCandidate.name}' (mastery: ${Math.round(practiceCandidate.mastery_score)}%) to elevate it to Mastered status.`;
    saveRecommendation(userId, courseId, 'PRACTICE', practiceCandidate.id, practiceCandidate.lesson_id, reason, 0.75);
    return {
      action_type: 'PRACTICE',
      target_concept_id: practiceCandidate.id,
      target_concept_name: practiceCandidate.name,
      target_lesson_id: practiceCandidate.lesson_id,
      reason,
      priority: 0.75
    };
  }

  // 6. Priority Case D: All concepts mastered! Take final exam or advance
  const topConcept = concepts[0];
  const reason = `All concepts in this course are well understood! Take the comprehensive course exam to finalize your certificate.`;
  saveRecommendation(userId, courseId, 'TAKE_QUIZ', topConcept.id, topConcept.lesson_id, reason, 0.7);
  return {
    action_type: 'TAKE_QUIZ',
    target_concept_id: topConcept.id,
    target_concept_name: topConcept.name,
    target_lesson_id: topConcept.lesson_id,
    reason,
    priority: 0.7
  };
}

function saveRecommendation(userId, courseId, actionType, conceptId, lessonId, reason, priority) {
  db.prepare(`
    INSERT INTO recommendations (id, user_id, course_id, action_type, target_concept_id, target_lesson_id, reason, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`rec_${uuidv4()}`, userId, courseId, actionType, conceptId, lessonId, reason, priority);
}

/**
 * Update user concept mastery scores after diagnostic test or assessment quiz
 * @param {string} userId 
 * @param {string} assessmentId 
 * @param {Array<{question_id: string, concept_id: string, user_answer: string, is_correct: boolean}>} answerList 
 */
export function updateMasteryAfterAssessment(userId, assessmentId, answerList) {
  const now = new Date().toISOString();

  const getMastery = db.prepare('SELECT * FROM learner_mastery WHERE user_id = ? AND concept_id = ?');
  const insertMastery = db.prepare(`
    INSERT INTO learner_mastery (id, user_id, concept_id, mastery_score, confidence, total_attempts, correct_count, incorrect_count, time_spent_secs, last_practiced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateMastery = db.prepare(`
    UPDATE learner_mastery
    SET mastery_score = ?, confidence = ?, total_attempts = ?, correct_count = ?, incorrect_count = ?, last_practiced_at = ?
    WHERE user_id = ? AND concept_id = ?
  `);

  for (let ans of answerList) {
    if (!ans.concept_id) continue;
    
    const existing = getMastery.get(userId, ans.concept_id);
    let attempts = (existing?.total_attempts || 0) + 1;
    let correct = (existing?.correct_count || 0) + (ans.is_correct ? 1 : 0);
    let incorrect = (existing?.incorrect_count || 0) + (ans.is_correct ? 0 : 1);

    // Calculate score: weighted accuracy score
    const accuracyRatio = correct / attempts;
    let newScore = Math.min(100.0, Math.round(accuracyRatio * 100.0));
    
    // Confidence rating
    let confidence = 'Low';
    if (attempts >= 3 && newScore >= 80) confidence = 'High';
    else if (attempts >= 1 && newScore >= 60) confidence = 'Medium';

    if (existing) {
      updateMastery.run(newScore, confidence, attempts, correct, incorrect, now, userId, ans.concept_id);
    } else {
      insertMastery.run(`lm_${uuidv4()}`, userId, ans.concept_id, newScore, confidence, attempts, correct, incorrect, 30, now);
    }
  }
}
