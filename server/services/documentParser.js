import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { createWorker } from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse document file based on extension and return pages object list
 * @param {string} filePath 
 * @param {string} fileType 
 * @param {function} progressCallback 
 * @returns {Promise<{pages: Array<{page_number: number, text: string, chars_count: number}>, sections_count: number}>}
 */
export async function parseDocument(filePath, fileType, progressCallback = () => {}) {
  const buffer = fs.readFileSync(filePath);
  const ext = fileType.toLowerCase();

  let pages = [];
  let sectionsCount = 0;

  if (ext === 'pdf' || ext === 'application/pdf') {
    pages = await parsePdf(buffer, progressCallback);
  } else if (ext === 'docx' || ext === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    pages = await parseDocx(buffer, progressCallback);
  } else if (ext === 'pptx' || ext === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    pages = await parsePptx(buffer, progressCallback);
  } else if (ext === 'txt' || ext === 'text/plain') {
    pages = await parseTxt(buffer, progressCallback);
  } else {
    throw new Error(`Unsupported document file format: ${fileType}`);
  }

  // Count sections detected across text
  sectionsCount = countDetectedSections(pages);

  return { pages, sectionsCount };
}

async function parsePdf(buffer, progressCallback) {
  progressCallback('Extracting text from PDF...');
  
  // Custom page render function to capture page boundaries
  let pageTexts = [];
  
  const renderPage = (pageData) => {
    return pageData.getTextContent().then((textContent) => {
      let lastY, text = '';
      for (let item of textContent.items) {
        if (lastY == item.transform[5] || !lastY) {
          text += item.str + ' ';
        } else {
          text += '\n' + item.str + ' ';
        }
        lastY = item.transform[5];
      }
      pageTexts.push(text.trim());
      return text;
    });
  };

  try {
    const data = await pdfParse(buffer, { pagerender: renderPage });
    let pages = [];
    
    // If pageTexts captured per page
    if (pageTexts.length > 0) {
      for (let i = 0; i < pageTexts.length; i++) {
        let text = pageTexts[i] || '';
        
        // OCR fallback if text is virtually empty (scanned PDF page)
        if (text.length < 25) {
          progressCallback(`Running OCR fallback on PDF page ${i + 1}...`);
          text = await runOcrFallback(buffer, i + 1) || text;
        }

        pages.push({
          page_number: i + 1,
          text: cleanText(text),
          chars_count: text.length
        });
        progressCallback(`Processed PDF page ${i + 1}/${pageTexts.length}`);
      }
    } else {
      // Fallback split by page breaks
      const fullText = data.text || '';
      const splitPages = fullText.split(/\n\s*\n\f|\f/);
      for (let i = 0; i < splitPages.length; i++) {
        const text = splitPages[i] || '';
        pages.push({
          page_number: i + 1,
          text: cleanText(text),
          chars_count: text.length
        });
      }
    }
    
    if (pages.length === 0) {
      pages.push({
        page_number: 1,
        text: cleanText(data.text || ''),
        chars_count: (data.text || '').length
      });
    }

    return pages;
  } catch (err) {
    console.error('PDF parsing error:', err);
    throw new Error(`Failed to parse PDF document: ${err.message}`);
  }
}

async function parseDocx(buffer, progressCallback) {
  progressCallback('Extracting text from DOCX...');
  try {
    const result = await mammoth.extractRawText({ buffer });
    const fullText = result.value || '';
    
    // Split into pseudo-pages by ~2500 characters or headings
    const paragraphs = fullText.split(/\n\s*\n/);
    let pages = [];
    let currentPageText = '';
    let pageNum = 1;

    for (let p of paragraphs) {
      p = p.trim();
      if (!p) continue;
      
      if (currentPageText.length + p.length > 2200 && currentPageText.length > 0) {
        pages.push({
          page_number: pageNum++,
          text: cleanText(currentPageText),
          chars_count: currentPageText.length
        });
        currentPageText = p;
      } else {
        currentPageText += (currentPageText ? '\n\n' : '') + p;
      }
    }

    if (currentPageText.length > 0) {
      pages.push({
        page_number: pageNum,
        text: cleanText(currentPageText),
        chars_count: currentPageText.length
      });
    }

    return pages.length > 0 ? pages : [{ page_number: 1, text: cleanText(fullText), chars_count: fullText.length }];
  } catch (err) {
    throw new Error(`Failed to parse DOCX document: ${err.message}`);
  }
}

async function parsePptx(buffer, progressCallback) {
  progressCallback('Extracting slides from PPTX...');
  try {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter(filename => /^ppt\/slides\/slide\d+\.xml$/.test(filename));
    
    // Sort slide files numerically
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });

    let pages = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const slideXml = await zip.files[slideFiles[i]].async('text');
      // Extract text inside <a:t> tags
      const matches = slideXml.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
      const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');

      pages.push({
        page_number: i + 1,
        text: cleanText(slideText),
        chars_count: slideText.length
      });
      progressCallback(`Processed Slide ${i + 1}/${slideFiles.length}`);
    }

    return pages.length > 0 ? pages : [{ page_number: 1, text: 'No slide text detected', chars_count: 0 }];
  } catch (err) {
    throw new Error(`Failed to parse PPTX presentation: ${err.message}`);
  }
}

async function parseTxt(buffer, progressCallback) {
  progressCallback('Reading plain text file...');
  const fullText = buffer.toString('utf-8');
  
  // Split into pages by ~2500 characters or Chapter breaks
  const lines = fullText.split('\n');
  let pages = [];
  let currentPageText = '';
  let pageNum = 1;

  for (let line of lines) {
    if (currentPageText.length + line.length > 2500 || line.toUpperCase().startsWith('CHAPTER') || line.toUpperCase().startsWith('SECTION')) {
      if (currentPageText.trim()) {
        pages.push({
          page_number: pageNum++,
          text: cleanText(currentPageText),
          chars_count: currentPageText.length
        });
      }
      currentPageText = line + '\n';
    } else {
      currentPageText += line + '\n';
    }
  }

  if (currentPageText.trim()) {
    pages.push({
      page_number: pageNum,
      text: cleanText(currentPageText),
      chars_count: currentPageText.length
    });
  }

  return pages.length > 0 ? pages : [{ page_number: 1, text: cleanText(fullText), chars_count: fullText.length }];
}

async function runOcrFallback(buffer, pageNum) {
  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(buffer);
    await worker.terminate();
    return ret.data.text;
  } catch (ocrErr) {
    console.warn(`OCR fallback skipped or failed for page ${pageNum}:`, ocrErr.message);
    return '';
  }
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function countDetectedSections(pages) {
  let count = 0;
  const sectionRegex = /^(chapter|unit|section|part|module|\d+\.\d+|\d+\s+[A-Z])/im;
  
  for (let p of pages) {
    const lines = p.text.split('\n');
    for (let line of lines) {
      if (sectionRegex.test(line.trim())) {
        count++;
      }
    }
  }
  return Math.max(count, pages.length > 0 ? Math.ceil(pages.length / 2) : 1);
}

/**
 * Split page contents into semantic chunks with page reference
 * @param {Array<{id: string, page_number: number, text: string}>} dbPages 
 * @param {string} materialId 
 * @returns {Array<{id: string, material_id: string, page_id: string, chunk_index: number, content: string, metadata: string}>}
 */
export function createChunks(dbPages, materialId) {
  const chunks = [];
  let globalChunkIndex = 0;

  for (let page of dbPages) {
    const text = page.text;
    if (!text || text.trim().length === 0) continue;

    // Split text by paragraphs or target ~1200 characters per chunk (~300 words)
    const paragraphs = text.split('\n\n');
    let currentChunk = '';

    for (let para of paragraphs) {
      para = para.trim();
      if (!para) continue;

      if (currentChunk.length + para.length > 1200 && currentChunk.length > 0) {
        chunks.push({
          id: `chunk_${uuidv4()}`,
          material_id: materialId,
          page_id: page.id,
          chunk_index: globalChunkIndex++,
          content: currentChunk.trim(),
          metadata: JSON.stringify({ page_number: page.page_number })
        });
        // 100 character overlap
        currentChunk = currentChunk.slice(-100) + '\n\n' + para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `chunk_${uuidv4()}`,
        material_id: materialId,
        page_id: page.id,
        chunk_index: globalChunkIndex++,
        content: currentChunk.trim(),
        metadata: JSON.stringify({ page_number: page.page_number })
      });
    }
  }

  return chunks;
}
