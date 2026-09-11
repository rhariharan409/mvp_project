import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import MaterialUploader from './components/MaterialUploader';
import CourseWorkspace from './components/CourseWorkspace';
import DiagnosticModal from './components/DiagnosticModal';
import SourceGroundingModal from './components/SourceGroundingModal';
import SettingsModal from './components/SettingsModal';
import AnalyticsView from './components/AnalyticsView';
import TeacherWorkspace from './components/TeacherWorkspace';
import { getSettings, getCourseDetails } from './api/client';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'upload', 'workspace', 'analytics', 'teacher'
  const [currentRole, setCurrentRole] = useState('student'); // 'student', 'teacher'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Modals
  const [diagnosticId, setDiagnosticId] = useState(null);
  const [groundingSource, setGroundingSource] = useState(null); // { pageNumber, chunkContent }
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const checkSettings = async () => {
    try {
      const data = await getSettings();
      setHasApiKey(data.has_gemini_key);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    checkSettings();
  }, []);

  const handleSelectCourse = (courseId, lessonId = null) => {
    setSelectedCourseId(courseId);
    setSelectedLessonId(lessonId);
    setActiveView('workspace');
  };

  const handleStartDiagnostic = async (courseId) => {
    try {
      const data = await getCourseDetails(courseId);
      if (data.diagnostic_id) {
        setDiagnosticId(data.diagnostic_id);
      }
    } catch (err) {
      console.error('Failed to start diagnostic:', err);
    }
  };

  const handleInspectSource = (pageNumber, chunkContent) => {
    setGroundingSource({ pageNumber, chunkContent });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        hasApiKey={hasApiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'dashboard' && (
          <StudentDashboard
            onSelectCourse={handleSelectCourse}
            onStartDiagnostic={handleStartDiagnostic}
            onNavigateUpload={() => setActiveView('upload')}
          />
        )}

        {activeView === 'upload' && (
          <MaterialUploader
            onCourseCreated={(courseId) => handleSelectCourse(courseId)}
          />
        )}

        {activeView === 'workspace' && selectedCourseId && (
          <CourseWorkspace
            courseId={selectedCourseId}
            initialLessonId={selectedLessonId}
            onInspectSource={handleInspectSource}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {activeView === 'analytics' && <AnalyticsView />}

        {activeView === 'teacher' && (
          <TeacherWorkspace
            onNavigateUpload={() => setActiveView('upload')}
            onSelectCourse={handleSelectCourse}
          />
        )}
      </main>

      {/* Modals */}
      {diagnosticId && (
        <DiagnosticModal
          assessmentId={diagnosticId}
          onClose={() => setDiagnosticId(null)}
          onComplete={() => setActiveView('dashboard')}
        />
      )}

      {groundingSource && (
        <SourceGroundingModal
          pageNumber={groundingSource.pageNumber}
          chunkContent={groundingSource.chunkContent}
          onClose={() => setGroundingSource(null)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSettingsUpdated={checkSettings}
        />
      )}
    </div>
  );
}
