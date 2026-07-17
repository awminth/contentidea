import React, { useState } from 'react';
import { Sparkles, Loader2, Info, Check } from 'lucide-react';

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(base: string, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface GenerateIdeasProps {
  onSaved?: () => void;
}

export default function GenerateIdeas({ onSaved }: GenerateIdeasProps) {
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(addDaysISO(todayISO(), 6));
  const [genLanguage, setGenLanguage] = useState<'Burmese' | 'English'>('Burmese');
  const [genLoading, setGenLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewIdeas, setPreviewIdeas] = useState<any[]>([]);
  const [previousWeekCount, setPreviousWeekCount] = useState(0);
  const [rangeIsMock, setRangeIsMock] = useState(false);
  const [error, setError] = useState('');
  const [saveOk, setSaveOk] = useState('');

  const handleGenerate = async () => {
    setGenLoading(true);
    setPreviewIdeas([]);
    setError('');
    setSaveOk('');

    try {
      const response = await fetch('/api/generate-range-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate, language: genLanguage }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Generate failed');
      }
      setPreviewIdeas(data.suggestions || []);
      setPreviousWeekCount((data.previousWeekAnalyzed || []).length);
      setRangeIsMock(!!data.isMock);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Content ideas ထုတ်မရပါ။');
    } finally {
      setGenLoading(false);
    }
  };

  const handleSaveToDb = async () => {
    if (previewIdeas.length === 0) return;
    setSaving(true);
    setError('');
    setSaveOk('');
    try {
      const payload = previewIdeas.map((s) => ({
        topic: s.topic,
        category: s.category,
        postDate: s.date,
        contentType: s.contentType,
        ideaSummary: s.ideaSummary,
        postTime: s.postTime,
      }));
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideas: payload, planFrom: fromDate, planTo: toDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Save failed');
      setPreviewIdeas([]);
      setSaveOk(`သိမ်းပြီးပါပြီ — Content Ideas tab တွင် ${fromDate} → ${toDate} ကို နှိပ်ပြီး ကြည့်ပါ။`);
      onSaved?.();
    } catch (err: any) {
      setError(err.message || 'Database သို့ သိမ်းမရပါ။');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="border-b border-slate-300 pb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Generate Ideas</h1>
        <p className="text-sm text-slate-600 mt-1">
          ရက်စွဲရွေးပြီး Content Ideas ထုတ်ပါ။ Save လုပ်ပြီးရင် Content Ideas tab တွင် Date Range အလိုက် ကြည့်နိုင်သည်။
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}
      {saveOk && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-800">{saveOk}</div>
      )}

      <div className="glass-panel rounded-3xl p-6 border border-teal-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-teal-50 rounded-xl border border-teal-200 text-teal-700">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Generate Weekly Content Ideas
            </h2>
            <p className="text-[11px] text-teal-700 font-medium">
              Marctober Tech · Tech / Management System အလှည့်ကျ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-100 p-4 rounded-2xl border border-slate-200">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono outline-none focus:border-teal-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono outline-none focus:border-teal-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Language</label>
            <select
              value={genLanguage}
              onChange={(e) => setGenLanguage(e.target.value as 'Burmese' | 'English')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none cursor-pointer focus:border-teal-500"
            >
              <option value="Burmese">Myanmar</option>
              <option value="English">English</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={genLoading}
              className="w-full bg-teal-700 hover:bg-teal-600 disabled:bg-slate-400 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {genLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Ideas
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 bg-teal-50 border border-teal-200 p-3 rounded-xl text-[11px] text-slate-700">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-700" />
          <span>
            AI သည် <strong className="text-slate-900">ပြီးခဲ့သော ၇ ရက်</strong> တွင် Posted ideas များကိုသာ ဆန်းစစ်ပြီး ယခု Date Range အတွက် idea အသစ်ထုတ်ပေးသည်။
            {previousWeekCount > 0 && previewIdeas.length > 0 && (
              <> ယခု Generate တွင် previous week {previousWeekCount} ခုကို အသုံးပြုထားသည်။</>
            )}
          </span>
        </div>

        {rangeIsMock && previewIdeas.length > 0 && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 text-[10px] text-amber-800 rounded-xl">
            Gemini API မရနိုင်သဖြင့် offline ideas ကို ပြသထားသည်။
          </div>
        )}

        {previewIdeas.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Preview ({previewIdeas.length} ideas) — {fromDate} → {toDate}
              </h3>
              <button
                onClick={handleSaveToDb}
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save to Database
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {previewIdeas.map((s, idx) => {
                const isTech = s.category === 'Tech';
                return (
                  <div key={`${s.date}-${idx}`} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                        {s.dayName} · {s.date}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isTech
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {s.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1">{s.topic}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{s.ideaSummary}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
