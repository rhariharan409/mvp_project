import React, { useState, useEffect } from 'react';
import { BookOpen, Award, Zap, AlertTriangle, CheckCircle, Clock, Flame, ArrowRight, Sparkles, Plus, Play, RefreshCw, BarChart, Trash2 } from 'lucide-react';
import { getLearnerDashboard, deleteCourse } from '../api/client';

export default function StudentDashboard({ onSelectCourse, onStartDiagnostic, onStartQuiz, onNavigateUpload }) {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const data = await getLearnerDashboard('user_student_1');
      setDashboard(data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, title) => {
    if (!window.confirm(`Are you sure you want to delete course "${title}"?`)) return;
    setDeletingId(courseId);
    try {
      await deleteCourse(courseId);
      await fetchDashboard();
    } catch (err) {
      alert('Failed to delete course: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Fetching database learner metrics...</p>
        </div>
      </div>
    );
  }

  const hasCourses = dashboard && dashboard.courses_count > 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-outfit tracking-tight flex items-center space-x-3">
            <span>Adaptive Student Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time concept-level learner profile & adaptive learning path derived directly from your SQLite database.
          </p>
        </div>

        <button
          onClick={onNavigateUpload}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Study Material</span>
        </button>
      </div>

      {/* Honest Empty State when no courses created */}
      {!hasCourses ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4 border border-slate-800 my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white font-outfit">No Courses Enrolled Yet</h2>
          <p className="text-slate-400 text-sm">
            You currently have 0 courses in your database. Upload your PDF, DOCX, PPTX, or TXT study materials to generate your personalized adaptive course and knowledge graph.
          </p>
          <div className="pt-2">
            <button
              onClick={onNavigateUpload}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upload Your First Material</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Key Database-Derived Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Overall Progress</span>
                <Award className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-white font-outfit">
                {dashboard.overall_progress}%
              </p>
              <p className="text-[11px] text-slate-500">Based on concept mastery</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Mastered Concepts</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 font-outfit">
                {dashboard.mastery_summary?.mastered || 0}
              </p>
              <p className="text-[11px] text-slate-500">Out of {dashboard.mastery_summary?.total || 0} concepts</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Weak Concepts</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-amber-400 font-outfit">
                {dashboard.mastery_summary?.weak || 0}
              </p>
              <p className="text-[11px] text-slate-500">Needs targeted review</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Active Streak</span>
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-extrabold text-orange-400 font-outfit">
                {dashboard.streak_days} <span className="text-sm font-normal text-slate-400">Days</span>
              </p>
              <p className="text-[11px] text-slate-500">Calculated from activity</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-1 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Learning Time</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-indigo-400 font-outfit">
                {Math.round(dashboard.total_learning_time_secs / 60)} <span className="text-sm font-normal text-slate-400">Mins</span>
              </p>
              <p className="text-[11px] text-slate-500">Actual active seconds</p>
            </div>
          </div>

          {/* Adaptive Learning Engine Hero Widget */}
          {dashboard.next_recommendation && (
            <div className="glass-card rounded-2xl p-6 border-2 border-blue-500/40 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-950 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>ADAPTIVE ENGINE RECOMMENDATION</span>
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Next Best Action</span>
                  </div>
                  <h3 className="text-xl font-bold text-white font-outfit">
                    {dashboard.next_recommendation.reason}
                  </h3>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      if (dashboard.next_recommendation.target_lesson_id) {
                        onSelectCourse(dashboard.courses[0].id, dashboard.next_recommendation.target_lesson_id);
                      } else {
                        onSelectCourse(dashboard.courses[0].id);
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center space-x-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Execute Action</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enrolled Courses Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white font-outfit">Enrolled Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboard.courses.map((crs) => (
                <div key={crs.id} className="glass-card glass-card-hover p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                        {crs.subject}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{crs.total_concepts} Concepts</span>
                    </div>

                    <h3 className="text-lg font-bold text-white font-outfit line-clamp-1">{crs.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{crs.description}</p>
                    <p className="text-[11px] text-slate-500">Source: {crs.source_material_name}</p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onSelectCourse(crs.id)}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1.5"
                      >
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onStartDiagnostic(crs.id)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all border border-slate-700"
                        title="Start Diagnostic Assessment"
                      >
                        Diagnostic
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(crs.id, crs.title)}
                        disabled={deletingId === crs.id}
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 text-xs transition-all disabled:opacity-50"
                        title="Delete Course"
                      >
                        {deletingId === crs.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown: Weak Areas & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weak Concepts Card */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Identified Weak Concepts</span>
              </h3>

              {dashboard.weak_areas && dashboard.weak_areas.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.weak_areas.map((weak) => (
                    <div key={weak.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{weak.concept_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{weak.lesson_title || 'Lesson'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                          {Math.round(weak.mastery_score)}% Mastery
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No weak concepts detected. Great job!</p>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span>Recent Learning Activity</span>
              </h3>

              {dashboard.recent_activities && dashboard.recent_activities.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recent_activities.map((act) => (
                    <div key={act.id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200">{act.activity_type.replace('_', ' ')}</span>
                        <span className="text-slate-400 ml-2">in {act.course_title || 'Course'}</span>
                      </div>
                      <span className="text-slate-500">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No recent activity recorded yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
