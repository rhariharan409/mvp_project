import db from '../db.js';
import { parseDocument, createChunks } from './documentParser.js';
import { extractKnowledgeStructure, generateLessonContent, generateDiagnosticQuestions } from './llmService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Execute the 10-stage processing pipeline for a newly uploaded material file
 * @param {string} materialId 
 * @param {string} filePath 
 * @param {string} fileType 
 * @param {string} userId 
 */
export async function processMaterialPipeline(materialId, filePath, fileType, userId) {
  const updateStatus = (status, errorMessage = null) => {
    db.prepare(`
      UPDATE materials 
      SET upload_status = ?, error_message = ?
      WHERE id = ?
    `).run(status, errorMessage, materialId);
  };

  try {
    // Stage 1: UPLOADING
    updateStatus('UPLOADING');

    // Stage 2: EXTRACTING
    updateStatus('EXTRACTING');
    const { pages, sectionsCount } = await parseDocument(filePath, fileType, (msg) => {
      console.log(`[Pipeline ${materialId}] ${msg}`);
    });

    if (!pages || pages.length === 0) {
      throw new Error('No text or pages could be extracted from this document.');
    }

    // Save pages to SQLite
    let totalChars = 0;
    const insertPage = db.prepare(`
      INSERT INTO pages (id, material_id, page_number, text, chars_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    const dbPages = [];
    const insertManyPages = db.transaction((pageList) => {
      for (let p of pageList) {
        const pageId = `page_${uuidv4()}`;
        insertPage.run(pageId, materialId, p.page_number, p.text, p.chars_count);
        totalChars += p.chars_count;
        dbPages.push({ id: pageId, page_number: p.page_number, text: p.text });
      }
    });
    insertManyPages(pages);

    db.prepare(`
      UPDATE materials 
      SET pages_count = ?, chars_count = ?, sections_count = ? 
      WHERE id = ?
    `).run(pages.length, totalChars, sectionsCount, materialId);

    // Stage 3: CHUNKING
    updateStatus('CHUNKING');
    const rawChunks = createChunks(dbPages, materialId);
    
    const insertChunk = db.prepare(`
      INSERT INTO chunks (id, material_id, page_id, chunk_index, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const dbChunks = [];
    const insertManyChunks = db.transaction((chunkList) => {
      for (let c of chunkList) {
        insertChunk.run(c.id, c.material_id, c.page_id, c.chunk_index, c.content, c.metadata);
        dbChunks.push(c);
      }
    });
    insertManyChunks(rawChunks);

    // Stage 4: ANALYZING
    updateStatus('ANALYZING');

    // Stage 5 & 6: EXTRACTING_CONCEPTS & BUILDING_RELATIONSHIPS
    updateStatus('EXTRACTING_CONCEPTS');
    const structure = await extractKnowledgeStructure(dbChunks, pages.length);

    updateStatus('BUILDING_RELATIONSHIPS');

    // Stage 7: GENERATING_COURSE
    updateStatus('GENERATING_COURSE');
    const courseId = `course_${uuidv4()}`;
    
    db.prepare(`
      INSERT INTO courses (id, title, subject, description, material_id, creator_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      courseId,
      structure.course_title || 'Adaptive Master Course',
      structure.subject || 'General Studies',
      structure.course_description || 'Generated from document material.',
      materialId,
      userId
    );

    // Stage 8: GENERATING_LESSONS
    updateStatus('GENERATING_LESSONS');
    const createdConcepts = [];
    let moduleOrder = 1;

    for (let mod of (structure.modules || [])) {
      const moduleId = `mod_${uuidv4()}`;
      db.prepare(`
        INSERT INTO modules (id, course_id, title, description, order_index)
        VALUES (?, ?, ?, ?, ?)
      `).run(moduleId, courseId, mod.title, mod.description || '', moduleOrder++);

      let lessonOrder = 1;
      for (let les of (mod.lessons || [])) {
        const lessonId = `les_${uuidv4()}`;
        
        // Prepare grounded lesson content
        const lessonSourceChunks = dbChunks.slice(0, 5).map(c => c.content).join('\n\n');
        const lessonData = await generateLessonContent(les.title, les.concepts || [], lessonSourceChunks);

        db.prepare(`
          INSERT INTO lessons (id, module_id, title, order_index, summary, content, visual_suggestion, key_takeaways, active_learning)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          lessonId,
          moduleId,
          les.title,
          lessonOrder++,
          les.summary || '',
          lessonData.content,
          lessonData.visual_suggestion || '',
          JSON.stringify(lessonData.key_takeaways || []),
          typeof lessonData.active_learning === 'string' ? lessonData.active_learning : JSON.stringify(lessonData.active_learning || {})
        );

        // Store Concepts for this lesson
        for (let con of (les.concepts || [])) {
          const conceptId = `con_${uuidv4()}`;
          const matchingChunk = dbChunks.find(c => {
            try {
              return JSON.parse(c.metadata || '{}').page_number === con.source_page;
            } catch (e) { return false; }
          }) || dbChunks[0];
          
          db.prepare(`
            INSERT INTO concepts (id, course_id, lesson_id, name, definition, difficulty, importance, source_page, source_chunk_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            conceptId,
            courseId,
            lessonId,
            con.name,
            con.definition,
            con.difficulty || 3,
            con.importance || 3,
            con.source_page || 1,
            matchingChunk ? matchingChunk.id : null
          );

          createdConcepts.push({
            id: conceptId,
            name: con.name,
            definition: con.definition,
            source_page: con.source_page || 1,
            difficulty: con.difficulty || 3
          });
        }
      }
    }

    // Save Concept Prerequisites / Relationships
    if (structure.prerequisites && structure.prerequisites.length > 0) {
      const insertRel = db.prepare(`
        INSERT INTO concept_relationships (id, source_concept_id, target_concept_id, relationship_type)
        VALUES (?, ?, ?, 'prerequisite')
      `);

      for (let p of structure.prerequisites) {
        const sourceConcept = createdConcepts.find(c => c.name.toLowerCase() === p.source_concept_name.toLowerCase());
        const targetConcept = createdConcepts.find(c => c.name.toLowerCase() === p.target_concept_name.toLowerCase());

        if (sourceConcept && targetConcept && sourceConcept.id !== targetConcept.id) {
          insertRel.run(`rel_${uuidv4()}`, sourceConcept.id, targetConcept.id);
        }
      }
    }

    // Stage 9: GENERATING_ASSESSMENTS
    updateStatus('GENERATING_ASSESSMENTS');
    const diagnosticId = `diag_${uuidv4()}`;
    db.prepare(`
      INSERT INTO assessments (id, course_id, title, type)
      VALUES (?, ?, ?, 'diagnostic')
    `).run(diagnosticId, courseId, `${structure.course_title} Diagnostic Baseline Assessment`);

    const diagnosticQuestions = await generateDiagnosticQuestions(structure.course_title, createdConcepts);
    
    const insertQ = db.prepare(`
      INSERT INTO questions (id, assessment_id, concept_id, question_type, prompt, options, correct_answer, explanation, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let q of diagnosticQuestions) {
      const matchedConcept = createdConcepts.find(c => c.id === q.concept_id) || createdConcepts[0];
      if (matchedConcept) {
        insertQ.run(
          `q_${uuidv4()}`,
          diagnosticId,
          matchedConcept.id,
          q.question_type || 'mcq',
          q.prompt,
          JSON.stringify(q.options || []),
          q.correct_answer,
          q.explanation || '',
          q.difficulty || 3
        );
      }
    }

    // Also generate a practice quiz assessment
    const quizId = `quiz_${uuidv4()}`;
    db.prepare(`
      INSERT INTO assessments (id, course_id, title, type)
      VALUES (?, ?, ?, 'quiz')
    `).run(quizId, courseId, `${structure.course_title} Mastery Quiz`);

    for (let c of createdConcepts) {
      insertQ.run(
        `q_${uuidv4()}`,
        quizId,
        c.id,
        'mcq',
        `Which statement accurately describes ${c.name}?`,
        JSON.stringify([
          c.definition,
          `An auxiliary system designed to optimize memory bus traffic`,
          `A legacy protocol deprecated in modern standard implementations`,
          `A redundant software layer present in base architectures`
        ]),
        c.definition,
        `Defined in page ${c.source_page}: ${c.definition}`,
        c.difficulty || 3
      );
    }

    // Stage 10: VALIDATING & COMPLETED
    updateStatus('VALIDATING');
    
    // Initialize empty learner mastery records for student user
    const studentUser = db.prepare("SELECT id FROM users WHERE role = 'student' LIMIT 1").get();
    if (studentUser) {
      const insertMastery = db.prepare(`
        INSERT OR IGNORE INTO learner_mastery (id, user_id, concept_id, mastery_score, confidence, total_attempts, correct_count, incorrect_count, time_spent_secs)
        VALUES (?, ?, ?, 0.0, 'Low', 0, 0, 0, 0)
      `);
      for (let c of createdConcepts) {
        insertMastery.run(`lm_${uuidv4()}`, studentUser.id, c.id);
      }
    }

    updateStatus('COMPLETED');
    console.log(`[Pipeline ${materialId}] Successfully completed course generation for course ${courseId}`);

    return { courseId, materialId };

  } catch (err) {
    console.error(`[Pipeline Error ${materialId}]:`, err);
    updateStatus('FAILED', err.message);
    throw err;
  }
}
