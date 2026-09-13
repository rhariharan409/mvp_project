import React from 'react';
import { BrainCircuit, BookOpen, BarChart3, UploadCloud, ShieldCheck, Key, UserCheck, GraduationCap } from 'lucide-react';

export default function Header({ activeView, setActiveView, currentRole, setCurrentRole, hasApiKey, onOpenSettings }) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Vision */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 font-outfit">
                CogniFlow
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                Adaptive LMS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Material → Knowledge Graph → Adaptive Mastery</p>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeView === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveView('upload')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeView === 'upload'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Materials</span>
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeView === 'analytics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          {currentRole === 'teacher' && (
            <button
              onClick={() => setActiveView('teacher')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'teacher'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-purple-400 hover:text-purple-200 hover:bg-purple-950/40'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Teacher Mode</span>
            </button>
          )}
        </nav>

        {/* User Role & Settings Action */}
        <div className="flex items-center space-x-3">
          {/* Role Toggle Button */}
          <button
            onClick={() => {
              if (currentRole === 'student') {
                setCurrentRole('teacher');
                setActiveView('teacher');
              } else {
                setCurrentRole('student');
                setActiveView('dashboard');
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              currentRole === 'student'
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                : 'bg-purple-950/60 border-purple-800 text-purple-300 hover:border-purple-700'
            }`}
            title="Toggle between Student and Educator perspective"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{currentRole === 'student' ? 'Student View' : 'Teacher View'}</span>
          </button>

          {/* API Key Status / Settings */}
          <button
            onClick={onOpenSettings}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 border transition-all ${
              hasApiKey
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hasApiKey ? 'AI Engine Ready' : 'Configure API Key'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
