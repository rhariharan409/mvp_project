import React, { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, Layers, Users, Trash2, Plus, Edit, AlertTriangle } from 'lucide-react';
import { getCoursesList } from '../api/client';

export default function TeacherWorkspace({ onNavigateUpload, onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getCoursesList();
        setCourses(data);
      } catch (err) {
        console.error('Error loading teacher workspace:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
              EDUCATOR / ADMIN MODE
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-outfit mt-1">Teacher Workspace</h1>
          <p className="text-slate-400 text-sm">Review, edit, and monitor generated course structures and student mastery trends.</p>
        </div>

        <button
          onClick={onNavigateUpload}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 shadow-lg shadow-purple-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Course Material</span>
        </button>
      </div>

      {/* Courses List for Educator Review */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white font-outfit">Active Course Curriculum Catalog</h2>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((crs) => (
              <div key={crs.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md">
                    {crs.subject}
                  </span>
                  <h3 className="text-lg font-bold text-white font-outfit line-clamp-1">{crs.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{crs.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <div>Modules: <span className="text-white font-bold">{crs.modules_count || 0}</span></div>
                    <div>Concepts: <span className="text-white font-bold">{crs.concepts_count || 0}</span></div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onSelectCourse(crs.id)}
                    className="w-full py-2 bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Inspect & Edit Course</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center glass-card rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400">No courses created yet. Click above to upload academic materials.</p>
          </div>
        )}
      </div>
    </div>
  );
}
