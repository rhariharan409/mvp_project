import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, Layers, FileCode, Cpu, Sparkles } from 'lucide-react';
import { uploadMaterialFile, getMaterialStatus } from '../api/client';

const PIPELINE_STAGES = [
  { id: 'UPLOADING', label: 'Uploading Document' },
  { id: 'EXTRACTING', label: 'Extracting Pages & OCR' },
  { id: 'CHUNKING', label: 'Semantic Chunks' },
  { id: 'ANALYZING', label: 'Analyzing Structure' },
  { id: 'EXTRACTING_CONCEPTS', label: 'Extracting Concepts' },
  { id: 'BUILDING_RELATIONSHIPS', label: 'Building Knowledge Graph' },
  { id: 'GENERATING_COURSE', label: 'Structuring Course' },
  { id: 'GENERATING_LESSONS', label: 'Generating Grounded Lessons' },
  { id: 'GENERATING_ASSESSMENTS', label: 'Creating Diagnostic & Quizzes' },
  { id: 'VALIDATING', label: 'Validating Schemas' },
  { id: 'COMPLETED', label: 'Course Ready' }
];

export default function MaterialUploader({ onCourseCreated }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMaterialId, setActiveMaterialId] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Poll processing status every 1.5 seconds if processing
  useEffect(() => {
    if (!activeMaterialId || pipelineStatus?.upload_status === 'COMPLETED' || pipelineStatus?.upload_status === 'FAILED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const status = await getMaterialStatus(activeMaterialId);
        setPipelineStatus(status);
        if (status.upload_status === 'COMPLETED') {
          clearInterval(interval);
        } else if (status.upload_status === 'FAILED') {
          setErrorMsg(status.error_message || 'Pipeline processing failed.');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeMaterialId, pipelineStatus?.upload_status]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const result = await uploadMaterialFile(file);
      setActiveMaterialId(result.materialId);
      setPipelineStatus({
        upload_status: 'UPLOADING',
        filename: file.name,
        pages_count: 0,
        chars_count: 0,
        sections_count: 0
      });
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const getCurrentStageIndex = () => {
    if (!pipelineStatus) return -1;
    const index = PIPELINE_STAGES.findIndex(s => s.id === pipelineStatus.upload_status);
    return index !== -1 ? index : 0;
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white font-outfit tracking-tight">
          Upload Academic Materials
        </h1>
        <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto">
          Upload PDF, DOCX, PPTX, or TXT study materials. CogniFlow extracts concepts, builds grounded lessons, generates knowledge graphs, and designs an adaptive learning plan.
        </p>
      </div>

      {/* File Upload Box */}
      {!activeMaterialId && (
        <form onSubmit={handleUploadSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/60 transition-all rounded-2xl p-8 bg-slate-900/40 text-center glass-panel relative group">
            <input
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            {file ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white flex items-center justify-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>{file.name}</span>
                  <span className="text-xs text-slate-400 font-normal">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </p>
                <p className="text-xs text-slate-400">Click or drag another file to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Drag & drop your study material here, or <span className="text-blue-400 underline">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Supports PDF, DOCX, PPTX, and TXT up to 50MB</p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Processing Error</p>
                <p className="text-xs text-red-300/80 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Build Adaptive Course</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Visible AI Processing Pipeline Progress */}
      {activeMaterialId && pipelineStatus && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white font-outfit flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  <span>AI Pipeline Execution</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{pipelineStatus.filename}</p>
              </div>

              {pipelineStatus.upload_status === 'COMPLETED' ? (
                <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Processing Complete</span>
                </div>
              ) : pipelineStatus.upload_status === 'FAILED' ? (
                <div className="flex items-center space-x-2 px-3 py-1 bg-red-950/60 border border-red-800 text-red-400 rounded-full text-xs font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Pipeline Failed</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-950/60 border border-blue-800 text-blue-400 rounded-full text-xs font-semibold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Stage {currentStageIndex + 1}/10</span>
                </div>
              )}
            </div>

            {/* Extracted Analytics Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Pages Extracted</span>
                <span className="text-xl font-bold text-white font-outfit">{pipelineStatus.pages_count || 0}</span>
              </div>
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Extracted Characters</span>
                <span className="text-xl font-bold text-blue-400 font-outfit">
                  {pipelineStatus.chars_count ? pipelineStatus.chars_count.toLocaleString() : 0}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Detected Sections</span>
                <span className="text-xl font-bold text-indigo-400 font-outfit">{pipelineStatus.sections_count || 0}</span>
              </div>
            </div>

            {/* Stage Progress Bar & List */}
            <div className="space-y-3 pt-2">
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(8, ((currentStageIndex + 1) / 10) * 100))}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                {PIPELINE_STAGES.slice(0, 10).map((stage, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex && pipelineStatus.upload_status !== 'COMPLETED';
                  const isFailed = pipelineStatus.upload_status === 'FAILED' && idx === currentStageIndex;

                  return (
                    <div
                      key={stage.id}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl border text-xs transition-all ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300'
                          : isCurrent
                          ? 'bg-blue-950/40 border-blue-600/60 text-white font-semibold'
                          : isFailed
                          ? 'bg-red-950/40 border-red-800 text-red-300'
                          : 'bg-slate-900/30 border-slate-800/60 text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                      ) : isFailed ? (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                          {idx + 1}
                        </div>
                      )}
                      <span>{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {pipelineStatus.upload_status === 'FAILED' && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm space-y-2">
                <p className="font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Pipeline Execution Failed</span>
                </p>
                <p className="text-xs text-red-200/80">{pipelineStatus.error_message}</p>
                <button
                  onClick={() => { setActiveMaterialId(null); setPipelineStatus(null); }}
                  className="px-4 py-1.5 bg-red-900/60 hover:bg-red-800 text-white rounded-lg text-xs font-semibold"
                >
                  Try Another Document
                </button>
              </div>
            )}

            {/* Launch Course Button when Completed */}
            {pipelineStatus.upload_status === 'COMPLETED' && pipelineStatus.course_id && (
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => onCourseCreated(pipelineStatus.course_id)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center space-x-2"
                >
                  <span>Enter Course Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
