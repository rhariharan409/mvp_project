import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'lms_database.sqlite');

let sqlDb = null;

export async function initDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(filebuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  // Create database tables
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT CHECK(role IN ('student', 'teacher')) DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      upload_status TEXT CHECK(upload_status IN ('UPLOADING', 'EXTRACTING', 'CHUNKING', 'ANALYZING', 'EXTRACTING_CONCEPTS', 'BUILDING_RELATIONSHIPS', 'GENERATING_COURSE', 'GENERATING_LESSONS', 'GENERATING_ASSESSMENTS', 'VALIDATING', 'COMPLETED', 'FAILED')) DEFAULT 'UPLOADING',
      pages_count INTEGER DEFAULT 0,
      chars_count INTEGER DEFAULT 0,
      sections_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      chars_count INTEGER NOT NULL,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      page_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      material_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      module_id TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      summary TEXT,
      content TEXT NOT NULL,
      visual_suggestion TEXT,
      key_takeaways TEXT,
      active_learning TEXT,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      lesson_id TEXT,
      name TEXT NOT NULL,
      definition TEXT NOT NULL,
      difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 5) DEFAULT 3,
      importance INTEGER CHECK(importance BETWEEN 1 AND 5) DEFAULT 3,
      source_page INTEGER,
      source_chunk_id TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
      FOREIGN KEY (source_chunk_id) REFERENCES chunks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS concept_relationships (
      id TEXT PRIMARY KEY,
      source_concept_id TEXT NOT NULL,
      target_concept_id TEXT NOT NULL,
      relationship_type TEXT CHECK(relationship_type IN ('prerequisite', 'related', 'extends')) DEFAULT 'prerequisite',
      FOREIGN KEY (source_concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
      FOREIGN KEY (target_concept_id) REFERENCES concepts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT CHECK(type IN ('diagnostic', 'quiz', 'module_exam')) DEFAULT 'quiz',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      question_type TEXT CHECK(question_type IN ('mcq', 'multi_select', 'true_false', 'short_answer')) DEFAULT 'mcq',
      prompt TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 5) DEFAULT 3,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learner_mastery (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      mastery_score REAL CHECK(mastery_score BETWEEN 0.0 AND 100.0) DEFAULT 0.0,
      confidence TEXT CHECK(confidence IN ('Low', 'Medium', 'High')) DEFAULT 'Low',
      total_attempts INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      time_spent_secs INTEGER DEFAULT 0,
      last_practiced_at DATETIME,
      UNIQUE(user_id, concept_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      assessment_id TEXT NOT NULL,
      score REAL NOT NULL,
      max_score REAL NOT NULL,
      answers_json TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      concept_id TEXT,
      activity_type TEXT NOT NULL,
      duration_secs INTEGER DEFAULT 0,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_concept_id TEXT,
      target_lesson_id TEXT,
      reason TEXT NOT NULL,
      priority REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration: Ensure active_learning column exists in existing DBs
  try {
    sqlDb.run("ALTER TABLE lessons ADD COLUMN active_learning TEXT;");
  } catch (e) {
    // Column already exists
  }

  // Seed default student & teacher users if not existing
  const studentExists = db.prepare('SELECT id FROM users WHERE id = ?').get('user_student_1');
  if (!studentExists) {
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(
      'user_student_1',
      'Alex Student',
      'student@cogniflow.edu',
      'student'
    );
  }

  const teacherExists = db.prepare('SELECT id FROM users WHERE id = ?').get('user_teacher_1');
  if (!teacherExists) {
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(
      'user_teacher_1',
      'Prof. Sarah Jenkins',
      'teacher@cogniflow.edu',
      'teacher'
    );
  }

  saveDb();
  console.log('Database initialized successfully with persistence file:', dbPath);
}

let inTransaction = false;

function saveDb() {
  if (!sqlDb || inTransaction) return;
  try {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error persisting SQLite DB file:', err);
  }
}

// Wrapper matching better-sqlite3 API
const db = {
  prepare(sql) {
    return {
      all(...params) {
        if (!sqlDb) throw new Error('Database not initialized');
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params.flat());
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
      get(...params) {
        if (!sqlDb) throw new Error('Database not initialized');
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params.flat());
        let result = undefined;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },
      run(...params) {
        if (!sqlDb) throw new Error('Database not initialized');
        sqlDb.run(sql, params.flat());
        saveDb();
        return { changes: sqlDb.getRowsModified() };
      }
    };
  },
  exec(sql) {
    if (!sqlDb) throw new Error('Database not initialized');
    sqlDb.exec(sql);
    saveDb();
  },
  transaction(fn) {
    return (...args) => {
      if (!sqlDb) throw new Error('Database not initialized');
      inTransaction = true;
      sqlDb.exec('BEGIN TRANSACTION;');
      try {
        const res = fn(...args);
        sqlDb.exec('COMMIT;');
        inTransaction = false;
        saveDb();
        return res;
      } catch (err) {
        try { sqlDb.exec('ROLLBACK;'); } catch (rErr) {}
        inTransaction = false;
        throw err;
      }
    };
  }
};


export default db;
