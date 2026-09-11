import React from 'react';
import { FileText, ExternalLink, ShieldCheck } from 'lucide-react';

export default function SourceGroundingModal({ pageNumber, chunkContent, onClose }) {
  return (
    <div className="fixed inset-0 z-50 glass-panel bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-xl w-full glass-card p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white font-outfit">Source Document Grounding Reference</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md inline-block">
            Source Page {pageNumber || 1}
          </span>
          
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed max-h-60 overflow-y-auto">
            {chunkContent || 'Extracted raw text snippet from study material.'}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
          >
            Close Grounding View
          </button>
        </div>
      </div>
    </div>
  );
}
