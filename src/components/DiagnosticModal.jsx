import React, { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, AlertCircle, ArrowRight, Loader2, Award, Zap } from 'lucide-react';
import { getAssessment, submitAssessment } from '../api/client';

export default function DiagnosticModal({ assessmentId, onClose, onComplete }) {
  const [assessmentData, setAssessmentData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAssessment(assessmentId);
        setAssessmentData(data.assessment);
        setQuestions(data.questions || []);
      } catch (err) {
        console.error('Error loading diagnostic test:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [assessmentId]);

  const handleSelectOption = (questionId, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const userAnswers = questions.map(q => ({
        question_id: q.id,
        user_answer: selectedAnswers[q.id] || ''
      }));

      const res = await submitAssessment(assessmentId, userAnswers);
      setResult(res);
    } catch (err) {
      console.error('Error submitting diagnostic:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 glass-panel bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-300">Loading Diagnostic Baseline Test...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="fixed inset-0 z-50 glass-panel bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full glass-card p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
              DIAGNOSTIC BASELINE TEST
            </span>
            <h2 className="text-xl font-bold text-white font-outfit mt-1">{assessmentData?.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        {/* Results Screen */}
        {result ? (
          <div className="space-y-6">
            <div className="text-center space-y-2 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white font-outfit">Diagnostic Assessment Completed!</h3>
              <p className="text-sm text-slate-400">
                Calculated Baseline Score: <span className="font-bold text-white">{result.score}%</span> ({result.correct_count}/{result.total_questions} Concept Mastery)
              </p>
            </div>

            {/* Recommendation Output */}
            {result.next_recommendation && (
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-300">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span>RECOMMENDED STARTING POINT</span>
                </div>
                <p className="text-sm text-white font-semibold">{result.next_recommendation.reason}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => { onComplete(); onClose(); }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-500/25"
              >
                <span>Start Personal Learning Path</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Question Runner */
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}% Completed</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            {currentQ && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white leading-relaxed">
                  {currentQ.prompt}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5">
                  {(currentQ.options || []).map((opt, idx) => {
                    const isSelected = selectedAnswers[currentQ.id] === opt;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(currentQ.id, opt)}
                        className={`w-full text-left p-3.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-3 ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isSelected ? 'border-blue-400 bg-blue-500 text-white' : 'border-slate-700 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Previous
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  disabled={!selectedAnswers[currentQ?.id]}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  disabled={isSubmitting || !selectedAnswers[currentQ?.id]}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/25"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Diagnostic</span>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
