import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Plus, Check, Copy, Calendar as CalendarIcon, Loader2, Info, 
  Building, Target, Compass, Globe, ChevronDown, CheckSquare, MessageSquare, ArrowRight 
} from 'lucide-react';
import { DailySuggestion, Post } from '../types';

interface SuggestionsProps {
  onAddPostFromSuggestion: (suggestion: DailySuggestion, selectedDate: string) => void;
  posts: Post[];
}

export default function Suggestions({ onAddPostFromSuggestion, posts }: SuggestionsProps) {
  const [businessName, setBusinessName] = useState('CodeCraft Software Agency');
  const [niche, setNiche] = useState('Custom Enterprise Systems (ERP, POS, Payroll, HR, Mobile Apps, Odoo integration)');
  const [targetAudience, setTargetAudience] = useState('SMEs, retail businesses, logistics firms, corporate executives, and local startups');
  const [language, setLanguage] = useState<'Burmese' | 'English'>('Burmese');
  
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DailySuggestion[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scheduledDates, setScheduledDates] = useState<Record<string, string>>({});
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [isMock, setIsMock] = useState(false);

  // Today's date reference
  const todayStr = "2026-07-16";

  const handleGenerate = async () => {
    setLoading(true);
    setSuggestions([]);
    
    try {
      const response = await fetch('/api/generate-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          niche,
          targetAudience,
          language
        })
      });

      const data = await response.json();
      
      if (data.suggestions) {
        // Map backend suggestions to DailySuggestion format with temp IDs
        const formatted = data.suggestions.map((s: any, idx: number) => ({
          id: `suggestion-${Date.now()}-${idx}`,
          topic: s.topic,
          description: s.description,
          contentType: s.contentType || 'Image',
          caption: s.caption,
          imagePrompt: s.imagePrompt,
          hashtags: s.hashtags || '',
          isAdded: false
        }));
        setSuggestions(formatted);
        setIsMock(!!data.isMock);
        
        // Auto-assign date (default: today or upcoming days)
        const dateMap: Record<string, string> = {};
        formatted.forEach((s: any, idx: number) => {
          const targetDate = new Date(2026, 6, 16 + idx); // July 16, 17, 18, etc.
          const yyyy = targetDate.getFullYear();
          const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
          const dd = String(targetDate.getDate()).padStart(2, '0');
          dateMap[s.id] = `${yyyy}-${mm}-${dd}`;
        });
        setScheduledDates(dateMap);
      }
    } catch (err) {
      console.error("Failed to generate content suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddToPlanner = (suggestion: DailySuggestion) => {
    const selectedDate = scheduledDates[suggestion.id] || todayStr;
    onAddPostFromSuggestion(suggestion, selectedDate);
    
    setAddedIds(prev => ({
      ...prev,
      [suggestion.id]: true
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-sans tracking-tight">Gemini AI Strategy Suggestion Engine</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gemini AI ကိုအသုံးပြု၍ သင့်လုပ်ငန်းနှင့် ကိုက်ညီမည့် နေ့စဉ် Facebook Post အကြံပြုချက်များကို အလိုအလျောက် ထုတ်ယူမည်။
          </p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-xl flex items-center gap-2 shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
          <span className="text-[11px] font-bold text-indigo-200 font-sans">Powered by Gemini 3.5 Flash</span>
        </div>
      </div>

      {/* Input settings Panel - Customizing their Software Agency Page */}
      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-400" /> Customize Your Software Page Persona
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
              <Building className="w-3.5 h-3.5 text-slate-400" /> Page Name / Brand
            </label>
            <input 
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. CodeCraft Software Solutions"
              className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Content Language
            </label>
            <div className="flex gap-2 bg-black/25 p-1.5 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setLanguage('Burmese')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  language === 'Burmese' 
                    ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                🇲🇲 Burmese (မြန်မာစာ)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('English')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  language === 'English' 
                    ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
              <Info className="w-3.5 h-3.5 text-slate-400" /> Software Specialties & Niche (လုပ်ငန်းအသေးစိတ်)
            </label>
            <textarea 
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              rows={2}
              placeholder="e.g. ERP integration, inventory POS, mobile app customization, etc..."
              className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none leading-relaxed transition-all"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
              <Target className="w-3.5 h-3.5 text-slate-400" /> Target Audience (ပစ်မှတ်ထားမည့်သူများ)
            </label>
            <input 
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. SMEs, retail store owners, logistics partners, startups..."
              className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              Generating Custom Facebook Strategies...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-white fill-white" />
              Generate Daily Custom Post Schedule (အစီအစဉ်များ ထုတ်ယူရန်)
            </>
          )}
        </button>
      </div>

      {/* API Notice Badge */}
      {isMock && suggestions.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-300 font-sans">Offline Simulation Active</p>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-sans">
              No custom Gemini API Key was found in your Secrets panel. We have generated premium pre-configured software strategies tailored to your Page to enable full testing capability. Add your real key in <strong>Settings &gt; Secrets</strong> to enable active server-side live generation!
            </p>
          </div>
        </div>
      )}

      {/* Generated suggestions list section */}
      {suggestions.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-sans">
            🚀 Generated Content Suggestions ({suggestions.length} Ideas)
          </h2>

          <div className="space-y-6">
            {suggestions.map((suggestion, idx) => {
              const isAdded = addedIds[suggestion.id];
              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  key={suggestion.id}
                  className="glass-panel rounded-3xl overflow-hidden shadow-xl"
                >
                  {/* Top Bar Card */}
                  <div className="p-4 bg-black/20 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-mono font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-slate-200 font-sans">{suggestion.topic}</h3>
                        <p className="text-[10px] text-slate-400 font-sans">{suggestion.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Format Badge */}
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                        suggestion.contentType === 'Carousels' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        suggestion.contentType === 'Video' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      }`}>
                        {suggestion.contentType}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Caption Preview */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                          💬 Post Caption (ပို့စ်စာသား)
                        </span>
                        <button
                          onClick={() => handleCopyText(suggestion.id, suggestion.caption)}
                          className="text-[10px] font-semibold text-indigo-300 hover:text-indigo-200 hover:bg-white/5 flex items-center gap-1 cursor-pointer bg-black/25 px-2.5 py-1 rounded-lg border border-white/10 transition-all"
                        >
                          {copiedId === suggestion.id ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Caption
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-black/25 p-4 rounded-xl border border-white/10 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line max-h-[220px] overflow-y-auto">
                        {suggestion.caption}
                        {suggestion.hashtags && (
                          <div className="mt-3 text-indigo-300 font-mono text-[11px]">
                            {suggestion.hashtags}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image Prompt & Schedule Controls */}
                    <div className="space-y-4 flex flex-col justify-between bg-black/10 p-4 rounded-xl border border-white/5">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans mb-1.5">
                          🎨 Visual Graphic Prompt
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed italic bg-black/25 p-3 rounded-lg border border-white/5 font-mono">
                          "{suggestion.imagePrompt}"
                        </p>
                      </div>

                      {/* Scheduling controls */}
                      <div className="pt-3 border-t border-white/10 space-y-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                            Select Schedule Date
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                            <input
                              type="date"
                              value={scheduledDates[suggestion.id] || ''}
                              onChange={(e) => setScheduledDates(prev => ({ ...prev, [suggestion.id]: e.target.value }))}
                              className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-slate-300 font-mono outline-none transition-all"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddToPlanner(suggestion)}
                          disabled={isAdded}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-indigo-500/20'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Added to Planner (ထည့်ပြီးပါပြီ)
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Add to Planner (ပလန်နာသို့ ပေါင်းထည့်မည်)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
