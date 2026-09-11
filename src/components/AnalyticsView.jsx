import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Award, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { getLearnerDashboard } from '../api/client';

export default function AnalyticsView() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getLearnerDashboard('user_student_1');
        setDashboard(data);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <p className="text-slate-400">Loading Analytics Data...</p>
      </div>
    );
  }

  const summary = dashboard?.mastery_summary || { mastered: 0, learning: 0, weak: 0, unassessed: 0, total: 0 };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-white font-outfit">Learning Progress & Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Detailed metric trajectory, concept breakdown, and revision effectiveness.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-semibold block">Total Concepts Tracked</span>
          <span className="text-3xl font-extrabold text-white font-outfit">{summary.total}</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-semibold block">Mastered Concepts (&gt;80%)</span>
          <span className="text-3xl font-extrabold text-emerald-400 font-outfit">{summary.mastered}</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-semibold block">Learning In-Progress</span>
          <span className="text-3xl font-extrabold text-blue-400 font-outfit">{summary.learning}</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-semibold block">Weak Concepts (&lt;50%)</span>
          <span className="text-3xl font-extrabold text-amber-400 font-outfit">{summary.weak}</span>
        </div>
      </div>

      {/* Distribution Visual */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white font-outfit">Concept Mastery Distribution</h3>
        
        {summary.total > 0 ? (
          <div className="space-y-4">
            <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden flex border border-slate-800">
              <div style={{ width: `${(summary.mastered / summary.total) * 100}%` }} className="bg-emerald-500 h-full" title="Mastered" />
              <div style={{ width: `${(summary.learning / summary.total) * 100}%` }} className="bg-blue-500 h-full" title="Learning" />
              <div style={{ width: `${(summary.weak / summary.total) * 100}%` }} className="bg-amber-500 h-full" title="Weak" />
              <div style={{ width: `${(summary.unassessed / summary.total) * 100}%` }} className="bg-slate-800 h-full" title="Unassessed" />
            </div>

            <div className="flex items-center justify-around text-xs text-slate-400 pt-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                <span>Mastered ({Math.round((summary.mastered / summary.total) * 100)}%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                <span>Learning ({Math.round((summary.learning / summary.total) * 100)}%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                <span>Weak ({Math.round((summary.weak / summary.total) * 100)}%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-slate-800 inline-block" />
                <span>Unassessed ({Math.round((summary.unassessed / summary.total) * 100)}%)</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No concept records available to analyze.</p>
        )}
      </div>
    </div>
  );
}
