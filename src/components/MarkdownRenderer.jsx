import React from 'react';

/**
 * Lightweight, robust Markdown Renderer for CogniFlow LMS
 * Converts raw Markdown strings into beautifully styled React Tailwind UI elements.
 */
export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockBuffer = [];
  let codeLanguage = '';
  let inList = false;
  let listItems = [];
  let isOrderedList = false;
  let inTable = false;
  let tableHeader = [];
  let tableRows = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      if (isOrderedList) {
        elements.push(
          <ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-1.5 my-3 pl-2 text-slate-200">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{renderInline(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1.5 my-3 pl-2 text-slate-200">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{renderInline(item)}</li>
            ))}
          </ul>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableHeader.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-4 rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-200 font-semibold">
                {tableHeader.map((h, idx) => (
                  <th key={idx} className="p-3 border-r border-slate-800/60 last:border-0">{renderInline(h.trim())}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-900/40">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 border-r border-slate-800/40 last:border-0 text-slate-300">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Block Handling
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${elements.length}`} className="my-4 rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-cyan-300 overflow-x-auto">
            {codeLanguage && <div className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-wider">{codeLanguage}</div>}
            <pre className="whitespace-pre">{codeBlockBuffer.join('\n')}</pre>
          </div>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
        codeLanguage = '';
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Table Row Handling
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed.split('|').slice(1, -1);
      // Check if separator line
      if (cells.every(c => c.trim().match(/^:?-+:?$/))) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // List Handling
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)/);
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)/);

    if (ulMatch) {
      flushTable();
      if (!inList || isOrderedList) {
        flushList();
        inList = true;
        isOrderedList = false;
      }
      listItems.push(ulMatch[1]);
      continue;
    } else if (olMatch) {
      flushTable();
      if (!inList || !isOrderedList) {
        flushList();
        inList = true;
        isOrderedList = true;
      }
      listItems.push(olMatch[2]);
      continue;
    } else if (inList) {
      flushList();
    }

    // Blank line
    if (!trimmed) {
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${elements.length}`} className="my-6 border-slate-800/80" />);
      continue;
    }

    // Blockquotes & Callouts
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '');
      if (quoteText.startsWith('[!NOTE]')) {
        elements.push(
          <div key={`alert-${elements.length}`} className="my-4 p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs space-y-1">
            <span className="font-bold text-blue-400 block">NOTE</span>
            <div>{renderInline(quoteText.replace('[!NOTE]', '').trim())}</div>
          </div>
        );
      } else if (quoteText.startsWith('[!IMPORTANT]')) {
        elements.push(
          <div key={`alert-${elements.length}`} className="my-4 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs space-y-1">
            <span className="font-bold text-indigo-400 block">IMPORTANT</span>
            <div>{renderInline(quoteText.replace('[!IMPORTANT]', '').trim())}</div>
          </div>
        );
      } else if (quoteText.startsWith('[!WARNING]')) {
        elements.push(
          <div key={`alert-${elements.length}`} className="my-4 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <span className="font-bold text-amber-400 block">WARNING</span>
            <div>{renderInline(quoteText.replace('[!WARNING]', '').trim())}</div>
          </div>
        );
      } else {
        elements.push(
          <blockquote key={`bq-${elements.length}`} className="my-4 p-3.5 border-l-4 border-blue-500 bg-slate-900/60 rounded-r-xl italic text-slate-300 text-xs">
            {renderInline(quoteText)}
          </blockquote>
        );
      }
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${elements.length}`} className="text-2xl font-extrabold text-white font-outfit mt-6 mb-3 border-b border-slate-800 pb-2">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-xl font-bold text-white font-outfit mt-5 mb-2.5">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-base font-bold text-blue-300 font-outfit mt-4 mb-2">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-sm font-semibold text-slate-200 mt-3 mb-1.5">
          {renderInline(trimmed.slice(5))}
        </h4>
      );
      continue;
    }

    // Standard Paragraph
    elements.push(
      <p key={`p-${elements.length}`} className="my-2.5 text-slate-300 leading-relaxed text-sm">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className={`markdown-body space-y-1 ${className}`}>{elements}</div>;
}

/**
 * Render inline formatting (**bold**, *italic*, `code`, [links](url))
 */
function renderInline(text) {
  if (!text) return null;

  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }

    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
        return (
          <strong key={bIdx} className="font-extrabold text-white">
            {bPart.slice(2, -2)}
          </strong>
        );
      }

      const italicParts = bPart.split(/(\*[^*]+\*)/g);
      return italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length > 2) {
          return <em key={iIdx} className="italic text-slate-200">{iPart.slice(1, -1)}</em>;
        }
        return iPart;
      });
    });
  });
}
