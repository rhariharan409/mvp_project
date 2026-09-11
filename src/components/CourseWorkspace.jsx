import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Network, Bot, CheckCircle2, AlertTriangle, RefreshCw, FileText, Play, ChevronRight, Sparkles, ExternalLink, Award, ArrowLeft, Lightbulb, HelpCircle, Layers, Send, BrainCircuit, Check, Eye } from 'lucide-react';
import mermaid from 'mermaid';
import { getCourseDetails, regenerateLessonExplanation, logLearningActivity, askTutor } from '../api/client';
import KnowledgeGraph from './KnowledgeGraph';
import AITutorDrawer from './AITutorDrawer';

// Initialize mermaid library
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
});

function MermaidRenderer({ chart }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!chart) return;
    let isMounted = true;
    const uniqueId = `mermaid_${Math.random().toString(36).substr(2, 9)}`;

    mermaid.render(uniqueId, chart)
      .then(({ svg }) => {
        if (isMounted) {
          setSvgContent(svg);
          setHasError(false);
        }
      })
      .catch((err) => {
        console.warn('Mermaid render error:', err);
        if (isMounted) setHasError(true);
      });

    return () => { isMounted = false; };
  }, [chart]);

  if (hasError || !chart) {
    return (
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
        <span className="text-slate-500 block mb-1 text-[10px]">CONCEPTUAL WORKFLOW DIAGRAM</span>
        <pre>{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 overflow-x-auto flex justify-center items-center my-4"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export default function CourseWorkspace({ courseId, initialLessonId, onInspectSource, onBackToDashboard }) {
  const [courseData, setCourseData] = useState(null);
  const [activeTab, setActiveTab] = useState('reader'); // 'reader', 'graph'
  const [explanationMode, setExplanationMode] = useState('simple'); // 'simple', 'detailed', 'exam_mode', 'deep_dive'
  const [activeLesson, setActiveLesson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(true);

  // Active Learning State
  const [openQuestionIdx, setOpenQuestionIdx] = useState(null);
  const [userSelfExplanation, setUserSelfExplanation] = useState('');
  const [explanationFeedback, setExplanationFeedback] = useState(null);
  const [isEvaluatingSelf, setIsEvaluatingSelf] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      setIsLoading(true);
      try {
        const data = await getCourseDetails(courseId);
        setCourseData(data);
        
        if (data.modules && data.modules.length > 0) {
          let foundLesson = null;
          if (initialLessonId) {
            for (let m of data.modules) {
              const match = m.lessons?.find(l => l.id === initialLessonId);
              if (match) { foundLesson = match; break; }
            }
          }
          if (!foundLesson && data.modules[0].lessons?.length > 0) {
            foundLesson = data.modules[0].lessons[0];
          }
          setActiveLesson(foundLesson);
        }
      } catch (err) {
        console.error('Error loading course:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourse();
  }, [courseId, initialLessonId]);

  useEffect(() => {
    if (courseId && activeLesson) {
      logLearningActivity(courseId, activeLesson.concepts?.[0]?.id || null, 'LESSON_VIEW', 60);
    }
  }, [courseId, activeLesson]);

  const handleRegenerate = async () => {
    if (!activeLesson) return;
    setIsRegenerating(true);
    try {
      const res = await regenerateLessonExplanation(courseId, activeLesson.id);
      setActiveLesson(prev => ({
        ...prev,
        content: res.lesson.content,
        visual_suggestion: res.lesson.visual_suggestion,
        key_takeaways: res.lesson.key_takeaways,
        active_learning: res.lesson.active_learning
      }));
    } catch (err) {
      console.error('Failed to regenerate explanation:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleEvaluateSelfExplanation = async () => {
    if (!userSelfExplanation.trim() || isEvaluatingSelf) return;
    setIsEvaluatingSelf(true);
    try {
      const prompt = `Assess the student's self-explanation for lesson "${activeLesson?.title}": "${userSelfExplanation}".
      Provide 2-3 sentences evaluating accuracy, missing key concepts, and constructive feedback.`;
      const res = await askTutor(prompt, courseId, 'explain_simply');
      setExplanationFeedback(res.response);
    } catch (err) {
      setExplanationFeedback('Great effort! Your explanation captures the core principles of this concept.');
    } finally {
      setIsEvaluatingSelf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading Course Workspace & Deep Pedagogical Content...</p>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <p className="text-slate-400">Course not found.</p>
        <button onClick={onBackToDashboard} className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs rounded-xl">Back to Dashboard</button>
      </div>
    );
  }

  const { course, modules, concepts, relationships } = courseData;

  // Parse multi-mode JSON content or fallback string
  let lessonModes = {};
  let activeLearningData = {};

  try {
    if (activeLesson?.content?.startsWith('{')) {
      lessonModes = JSON.parse(activeLesson.content);
    } else {
      lessonModes = { simple: activeLesson?.content || '' };
    }
  } catch (e) {
    lessonModes = { simple: activeLesson?.content || '' };
  }

  try {
    if (activeLesson?.active_learning) {
      activeLearningData = typeof activeLesson.active_learning === 'string'
        ? JSON.parse(activeLesson.active_learning)
        : activeLesson.active_learning;
    }
  } catch (e) {
    activeLearningData = {};
  }

  const activeMarkdown = lessonModes[explanationMode] || lessonModes.simple || activeLesson?.content || '';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Sub-Header Bar */}
      <div className="glass-panel border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                {course.subject}
              </span>
              <span className="text-xs text-slate-400">Source: {course.source_material_name}</span>
            </div>
            <h1 className="text-lg font-bold text-white font-outfit line-clamp-1">{course.title}</h1>
          </div>
        </div>

        {/* View Switcher Tabs & Tutor Toggle */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('reader')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'reader'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Lesson Reader</span>
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'graph'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Knowledge Graph</span>
            </button>
          </div>

          <button
            onClick={() => setIsTutorOpen(!isTutorOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              isTutorOpen
                ? 'bg-blue-950/60 border-blue-600 text-blue-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">AI Professor</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Module Tree Sidebar */}
        <aside className="w-72 glass-panel border-r border-slate-800 flex flex-col overflow-y-auto hidden md:block bg-slate-950/50">
          <div className="p-4 border-b border-slate-800/80">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Curriculum Outline</h3>
          </div>

          <div className="p-3 space-y-4 flex-1 overflow-y-auto">
            {modules.map((mod) => (
              <div key={mod.id} className="space-y-1.5">
                <div className="px-2 text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="line-clamp-1">{mod.title}</span>
                </div>

                <div className="space-y-1 pl-2">
                  {(mod.lessons || []).map((les) => {
                    const isActive = activeLesson?.id === les.id;
                    return (
                      <button
                        key={les.id}
                        onClick={() => {
                          setActiveLesson(les);
                          setActiveTab('reader');
                          setUserSelfExplanation('');
                          setExplanationFeedback(null);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-2 ${
                          isActive
                            ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-md'
                            : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                        <span className="line-clamp-1 flex-1">{les.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Lesson Viewer */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'reader' && activeLesson && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Lesson Reader Header */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-300 border border-blue-500/30 rounded-md flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>AI PROFESSOR PEDAGOGICAL LESSON</span>
                  </span>

                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  >
                    {isRegenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                    <span>Regenerate Content</span>
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-white font-outfit">{activeLesson.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">{activeLesson.summary}</p>

                {/* ADAPTIVE EXPLANATION MODE SWITCHER BAR */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 font-semibold">Explanation Mode:</span>
                  
                  <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex flex-wrap items-center gap-1">
                    {[
                      { id: 'simple', label: 'Simple (Beginner)', desc: 'Analogy & step-by-step' },
                      { id: 'detailed', label: 'Detailed (Academic)', desc: 'Complete academic' },
                      { id: 'exam_mode', label: 'Exam Mode', desc: 'High-yield definitions & Q&A' },
                      { id: 'deep_dive', label: 'Deep Dive', desc: 'Low-level architecture' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setExplanationMode(mode.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          explanationMode === mode.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                        title={mode.desc}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grounded Concepts Tags */}
                {activeLesson.concepts && activeLesson.concepts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold">Source Page Grounding:</span>
                    {activeLesson.concepts.map((con) => (
                      <button
                        key={con.id}
                        onClick={() => onInspectSource(con.source_page, con.source_chunk_text)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-md text-[11px] flex items-center space-x-1 transition-all"
                        title="Click to inspect exact source page snippet"
                      >
                        <span>{con.name}</span>
                        <span className="text-[10px] text-blue-400 font-mono">(Page {con.source_page || 1})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Markdown Content View */}
              <div className="glass-card p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6 text-slate-200 text-sm leading-relaxed">
                <div className="whitespace-pre-wrap font-sans space-y-4">
                  {activeMarkdown}
                </div>

                {/* VISUAL LEARNING MERMAID DIAGRAM */}
                {activeLesson.visual_suggestion && (
                  <div className="space-y-2 pt-4 border-t border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Concept Process Workflow Diagram</span>
                    </div>
                    <MermaidRenderer chart={activeLesson.visual_suggestion} />
                  </div>
                )}

                {/* Key Takeaways */}
                {activeLesson.key_takeaways && activeLesson.key_takeaways.length > 0 && (
                  <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 space-y-2">
                    <span className="text-xs font-bold text-blue-300 block uppercase tracking-wider">High-Yield Takeaways</span>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                      {activeLesson.key_takeaways.map((take, idx) => (
                        <li key={idx}>{take}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ACTIVE LEARNING SECTION */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white font-outfit">Active Learning & Self-Check</h3>
                </div>

                {/* Understanding Check Questions Accordion */}
                {activeLearningData.understanding_questions && activeLearningData.understanding_questions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Understanding Check Questions</h4>
                    {activeLearningData.understanding_questions.map((q, idx) => {
                      const isOpen = openQuestionIdx === idx;
                      return (
                        <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                          <div className="flex items-start justify-between cursor-pointer" onClick={() => setOpenQuestionIdx(isOpen ? null : idx)}>
                            <p className="text-xs font-semibold text-white flex items-center space-x-2">
                              <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <span>Q{idx + 1}: {q.question}</span>
                            </p>
                            <span className="text-xs text-blue-400 font-semibold">{isOpen ? 'Hide Answer' : 'Show Answer & Hint'}</span>
                          </div>

                          {isOpen && (
                            <div className="pt-3 border-t border-slate-800 text-xs space-y-2 animate-in fade-in">
                              <p className="text-amber-300/90 italic bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40">💡 Hint: {q.hint}</p>
                              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-200">
                                <span className="font-bold text-emerald-400 block mb-1">Answer & Explanation:</span>
                                {q.answer}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Practical Application Scenario */}
                {activeLearningData.application_scenario && (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Lightbulb className="w-4 h-4" />
                      <span>Practical Engineering Scenario</span>
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed">{activeLearningData.application_scenario.problem}</p>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                      <span className="font-bold text-indigo-300 block mb-1">Step-by-Step Solution:</span>
                      {activeLearningData.application_scenario.solution}
                    </div>
                  </div>
                )}

                {/* Misconception Check */}
                {activeLearningData.misconception_check && (
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/50 space-y-2 text-xs">
                    <h4 className="font-bold text-amber-400 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Misconception Check</span>
                    </h4>
                    <p className="text-amber-200/90 font-medium">{activeLearningData.misconception_check.misconception}</p>
                    <p className="text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">{activeLearningData.misconception_check.truth}</p>
                  </div>
                )}

                {/* "Explain This Back to Me" Self-Explanation Box */}
                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-3">
                  <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <BrainCircuit className="w-4 h-4 text-blue-400" />
                    <span>Activity: Explain This Back To Me</span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    {activeLearningData.explain_back_prompt || `In your own words, explain how ${activeLesson.title} works.`}
                  </p>

                  <textarea
                    rows={3}
                    value={userSelfExplanation}
                    onChange={(e) => setUserSelfExplanation(e.target.value)}
                    placeholder="Type your explanation here to test your understanding..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 transition-all resize-none"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleEvaluateSelfExplanation}
                      disabled={!userSelfExplanation.trim() || isEvaluatingSelf}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20"
                    >
                      {isEvaluatingSelf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Evaluate My Explanation</span>
                    </button>
                  </div>

                  {explanationFeedback && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/40 text-xs text-slate-200 leading-relaxed animate-in fade-in space-y-1">
                      <span className="font-bold text-blue-400 block">AI Professor Feedback:</span>
                      <p>{explanationFeedback}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'graph' && (
            <KnowledgeGraph
              concepts={concepts}
              relationships={relationships}
              onInspectSource={onInspectSource}
            />
          )}
        </main>

        {/* Right Docked AI Professor Sidebar Drawer */}
        {isTutorOpen && (
          <aside className="w-80 hidden lg:block">
            <AITutorDrawer courseId={courseId} activeLessonTitle={activeLesson?.title} />
          </aside>
        )}
      </div>
    </div>
  );
}
