import React, { useState, useEffect } from 'react';
import { Key, Shield, Check, Save, Loader2, Info } from 'lucide-react';
import { getSettings, updateSettings } from '../api/client';

export default function SettingsModal({ onClose, onSettingsUpdated }) {
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getSettings();
        setHasApiKey(data.has_gemini_key);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({ gemini_api_key: apiKey });
      setSavedSuccess(true);
      onSettingsUpdated();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 glass-panel bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card p-6 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white font-outfit">AI Engine Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">Google Gemini / LLM API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? "•••••••••••••••• (API Key Configured)" : "Paste your Gemini API Key here..."}
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 transition-all font-mono"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed flex items-start space-x-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                If no API key is set, CogniFlow automatically uses its deterministic grounded document analysis pipeline to extract concepts and create courses directly from your text.
              </span>
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>API Key saved successfully!</span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-blue-500/20"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
