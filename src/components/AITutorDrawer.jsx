import React, { useState } from 'react';
import { Bot, Send, Sparkles, HelpCircle, BookOpen, Lightbulb, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { askTutor } from '../api/client';
import MarkdownRenderer from './MarkdownRenderer';

const ACTION_CHIPS = [
  { id: 'explain_simply', label: 'Explain Simply', icon: BookOpen },
  { id: 'explain_examples', label: 'Explain with Examples', icon: Lightbulb },
  { id: 'step_by_step', label: 'Step-by-step', icon: HelpCircle },
  { id: 'generate_practice', label: 'Generate Practice Problem', icon: Sparkles },
  { id: 'give_hint', label: 'Give Hint', icon: CheckCircle2 },
  { id: 'recommend_next', label: 'Recommend What to Study Next', icon: ArrowRight }
];

export default function AITutorDrawer({ courseId, activeLessonTitle }) {
  const [messages, setMessages] = useState([
    {
      sender: 'tutor',
      text: `Hello! I am your **CogniFlow AI Tutor**. I am fully grounded in your uploaded study material for **${activeLessonTitle || 'this course'}**.\n\nHow can I help you understand this lesson?`,
      citation: null
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (queryText = inputQuery, mode = 'explain_simply') => {
    if (!queryText.trim() || isLoading) return;

    const userMsg = { sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await askTutor(queryText, courseId, mode);
      setMessages(prev => [
        ...prev,
        {
          sender: 'tutor',
          text: res.response,
          citation: res.citation
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'tutor',
          text: `⚠️ **AI Tutor Note**: I am grounded strictly in your uploaded material. I encountered an error connecting to the LLM service: ${err.message}`,
          citation: null
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col glass-panel border-l border-slate-800 bg-slate-950/90 text-slate-100">
      {/* Tutor Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-outfit">CogniFlow AI Tutor</h3>
            <p className="text-[11px] text-slate-400">Grounded in Course Material</p>
          </div>
        </div>
      </div>

      {/* Action Chips */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center space-x-2 overflow-x-auto">
        {ACTION_CHIPS.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              onClick={() => handleSend(chip.label, chip.id)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-900/40 text-slate-300 hover:text-blue-300 border border-slate-700/80 text-[11px] font-medium flex items-center space-x-1.5 flex-shrink-0 transition-all disabled:opacity-50"
            >
              <Icon className="w-3 h-3 text-blue-400" />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none space-y-2'
              }`}
            >
              {msg.sender === 'user' ? (
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
              ) : (
                <MarkdownRenderer content={msg.text} />
              )}
              
              {msg.citation && (
                <div className="pt-2 border-t border-slate-800 text-[10px] text-blue-400 font-medium flex items-center space-x-1">
                  <BookOpen className="w-3 h-3" />
                  <span>Citation: {msg.citation}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-2xl w-fit border border-slate-800">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span>Analyzing material and drafting grounded response...</span>
          </div>
        )}
      </div>

      {/* Query Input */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputQuery);
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask AI Tutor about this lesson..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
