import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { processMaterialPipeline } from '../services/knowledgePipeline.js';

const router = express.Router();

// Set up file upload destination
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.docx', '.pptx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported document file format. Please upload PDF, DOCX, PPTX, or TXT files.'));
    }
  }
});

// POST /api/materials/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const userId = req.body.userId || 'user_student_1';
    const materialId = `mat_${uuidv4()}`;
    const fileType = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    db.prepare(`
      INSERT INTO materials (id, user_id, filename, file_type, file_size, upload_status)
      VALUES (?, ?, ?, ?, ?, 'UPLOADING')
    `).run(materialId, userId, req.file.originalname, fileType, req.file.size);

    // Launch processing pipeline asynchronously in background
    processMaterialPipeline(materialId, req.file.path, fileType, userId).catch(err => {
      console.error('Async pipeline processing failed:', err);
    });

    res.status(201).json({
      message: 'File upload accepted. Processing pipeline started.',
      materialId,
      filename: req.file.originalname
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materials
router.get('/', (req, res) => {
  try {
    const materials = db.prepare(`
      SELECT m.*, u.name as uploader_name 
      FROM materials m 
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `).all();
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materials/:id/status
router.get('/:id/status', (req, res) => {
  try {
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const course = db.prepare('SELECT id, title FROM courses WHERE material_id = ?').get(req.params.id);

    res.json({
      id: material.id,
      filename: material.filename,
      upload_status: material.upload_status,
      pages_count: material.pages_count,
      chars_count: material.chars_count,
      sections_count: material.sections_count,
      error_message: material.error_message,
      course_id: course?.id || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materials/:id/chunks
router.get('/:id/chunks', (req, res) => {
  try {
    const chunks = db.prepare('SELECT id, page_id, chunk_index, content, metadata FROM chunks WHERE material_id = ? ORDER BY chunk_index ASC').all(req.params.id);
    res.json(chunks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
