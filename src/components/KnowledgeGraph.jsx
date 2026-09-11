import React, { useState } from 'react';
import { Network, FileText, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';

export default function KnowledgeGraph({ concepts = [], relationships = [], onInspectSource }) {
  const [selectedConcept, setSelectedConcept] = useState(null);

  // Group concepts by module or grid layout for clear visual mapping
  const conceptMap = {};
  concepts.forEach(c => { conceptMap[c.id] = c; });

  const getMasteryColor = (score, attempts) => {
    if (attempts === 0) return { bg: '#1e293b', border: '#475569', text: '#94a3b8', label: 'Unlearned' };
    if (score >= 80) return { bg: '#064e3b', border: '#10b981', text: '#34d399', label: 'Mastered' };
    if (score >= 50) return { bg: '#1e3a8a', border: '#3b82f6', text: '#60a5fa', label: 'Learning' };
    return { bg: '#78350f', border: '#f59e0b', text: '#fbbf24', label: 'Weak' };
  };

  // Compute node coordinates in SVG canvas
  const nodeCount = concepts.length;
  const cols = Math.ceil(Math.sqrt(nodeCount * 1.5));
  const nodesWithCoords = concepts.map((concept, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = 120 + col * 220 + (row % 2 === 1 ? 40 : 0);
    const y = 100 + row * 150;
    return { ...concept, x, y };
  });

  const nodePosMap = {};
  nodesWithCoords.forEach(n => { nodePosMap[n.id] = n; });

  return (
    <div className="space-y-6">
      {/* Legend Bar */}
      <div className="glass-card p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-2 font-semibold text-slate-200">
          <Network className="w-4 h-4 text-blue-400" />
          <span>Interactive Prerequisite Knowledge Graph</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400" />
            <span className="text-slate-300">Mastered (&gt;80%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
            <span className="text-slate-300">Learning (50-79%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-400" />
            <span className="text-slate-300">Weak (&lt;50%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-600" />
            <span className="text-slate-400">Unlearned</span>
          </div>
        </div>
      </div>

      {/* Main SVG Graph Canvas */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-x-auto min-h-[500px] relative bg-slate-950/80 p-4">
        <svg className="w-full min-w-[800px] h-[550px]">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="28"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>

          {/* Prerequisite Edges */}
          {relationships.map((rel) => {
            const source = nodePosMap[rel.source_concept_id];
            const target = nodePosMap[rel.target_concept_id];
            if (!source || !target) return null;

            return (
              <line
                key={rel.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#475569"
                strokeWidth="2"
                strokeDasharray={rel.relationship_type === 'prerequisite' ? 'none' : '4,4'}
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          {/* Concept Nodes */}
          {nodesWithCoords.map((node) => {
            const colors = getMasteryColor(node.mastery_score || 0, node.total_attempts || 0);
            const isSelected = selectedConcept?.id === node.id;

            return (
              <g
                key={node.id}
                onClick={() => setSelectedConcept(node)}
                className="cursor-pointer group"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? "32" : "28"}
                  fill={colors.bg}
                  stroke={isSelected ? "#60a5fa" : colors.border}
                  strokeWidth={isSelected ? "4" : "2.5"}
                  className="transition-all duration-200 group-hover:scale-110"
                />
                
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {node.name.length > 14 ? `${node.name.slice(0, 12)}..` : node.name}
                </text>

                <text
                  x={node.x}
                  y={node.y + 46}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  pointerEvents="none"
                >
                  Page {node.source_page || 1}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Concept Popover / Detail Card */}
        {selectedConcept && (
          <div className="absolute top-6 right-6 w-80 glass-card p-5 rounded-2xl border border-blue-500/40 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Page {selectedConcept.source_page || 1} Grounded Concept
                </span>
                <h4 className="text-base font-bold text-white font-outfit mt-1">{selectedConcept.name}</h4>
              </div>
              <button
                onClick={() => setSelectedConcept(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
              {selectedConcept.definition}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Mastery Score</span>
                <span className="font-bold text-white text-sm">{Math.round(selectedConcept.mastery_score || 0)}%</span>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Difficulty</span>
                <span className="font-bold text-amber-400 text-sm">Level {selectedConcept.difficulty || 3}/5</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onInspectSource(selectedConcept.source_page, selectedConcept.source_chunk_text)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center justify-center space-x-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Inspect Source Page Reference</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
