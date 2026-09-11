import express from 'express';
import db from '../db.js';
import { generateLessonContent } from '../services/llmService.js';

const router = express.Router();

// GET /api/courses
router.get('/', (req, res) => {
  try {
    const courses = db.prepare(`
      SELECT c.*, m.filename as source_material_name, m.pages_count, m.chars_count,
             (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as modules_count,
             (SELECT COUNT(*) FROM concepts WHERE course_id = c.id) as concepts_count
      FROM courses c
      JOIN materials m ON c.material_id = m.id
      ORDER BY c.created_at DESC
    `).all();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/:id
router.get('/:id', (req, res) => {
  try {
    const courseId = req.params.id;
    const course = db.prepare(`
      SELECT c.*, m.filename as source_material_name
      FROM courses c
      JOIN materials m ON c.material_id = m.id
      WHERE c.id = ?
    `).get(courseId);

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC').all(courseId);

    for (let mod of modules) {
      mod.lessons = db.prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index ASC').all(mod.id);
      
      for (let les of mod.lessons) {
        les.concepts = db.prepare(`
          SELECT c.*, ch.content as source_chunk_text
          FROM concepts c
          LEFT JOIN chunks ch ON c.source_chunk_id = ch.id
          WHERE c.lesson_id = ?
        `).all(les.id);
        les.key_takeaways = JSON.parse(les.key_takeaways || '[]');
      }
    }

    const allConcepts = db.prepare('SELECT * FROM concepts WHERE course_id = ?').all(courseId);
    const relationships = db.prepare(`
      SELECT cr.*, c1.name as source_concept_name, c2.name as target_concept_name
      FROM concept_relationships cr
      JOIN concepts c1 ON cr.source_concept_id = c1.id
      JOIN concepts c2 ON cr.target_concept_id = c2.id
      WHERE c1.course_id = ?
    `).all(courseId);

    const diagnostic = db.prepare("SELECT id, title FROM assessments WHERE course_id = ? AND type = 'diagnostic'").get(courseId);

    res.json({
      course,
      modules,
      concepts: allConcepts,
      relationships,
      diagnostic_id: diagnostic?.id || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses/:id/regenerate-explanation
router.post('/:id/regenerate-explanation', async (req, res) => {
  try {
    const { lessonId } = req.body;
    const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const concepts = db.prepare('SELECT * FROM concepts WHERE lesson_id = ?').all(lessonId);
    const updatedContent = await generateLessonContent(lesson.title, concepts, '');

    db.prepare(`
      UPDATE lessons 
      SET content = ?, visual_suggestion = ?, key_takeaways = ?, active_learning = ?
      WHERE id = ?
    `).run(
      updatedContent.content,
      updatedContent.visual_suggestion || '',
      JSON.stringify(updatedContent.key_takeaways || []),
      typeof updatedContent.active_learning === 'string' ? updatedContent.active_learning : JSON.stringify(updatedContent.active_learning || {}),
      lessonId
    );

    res.json({ message: 'Explanation regenerated successfully', lesson: updatedContent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
