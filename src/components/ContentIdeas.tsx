import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Loader2, Trash2, CheckCircle2, Lightbulb, CheckSquare, Square,
  CalendarRange, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';

type Idea = {
  id: string;
  topic: string;
  category: string;
  postDate: string;
  contentType: string;
  status: 'Draft' | 'Scheduled' | 'Posted';
  caption: string;
  planFrom?: string;
  planTo?: string;
  hasWeekRange?: boolean;
  createdBatch?: string;
};

type DateRangeGroup = {
  key: string;
  from: string;
  to: string;
  ideas: Idea[];
  pendingCount: number;
  postedCount: number;
};

function formatDisplayDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ContentIdeasProps {
  refreshKey?: number;
}

export default function ContentIdeas({ refreshKey = 0 }: ContentIdeasProps) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedRangeKey, setSelectedRangeKey] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadIdeas = async () => {
    setLoadingIdeas(true);
    try {
      const res = await fetch('/api/ideas');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Load failed');
      setIdeas(data.ideas || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Database မှ ideas တင်မရပါ။');
    } finally {
      setLoadingIdeas(false);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, [refreshKey]);

  const rangeGroups: DateRangeGroup[] = useMemo(() => {
    const map = new Map<string, Idea[]>();

    for (const idea of ideas) {
      const key = idea.hasWeekRange
        ? `week:${idea.planFrom}|${idea.planTo}`
        : `batch:${idea.createdBatch || idea.postDate}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(idea);
    }

    return Array.from(map.entries())
      .map(([key, groupIdeas]) => {
        const sortedDates = groupIdeas.map((i) => i.postDate).sort();
        const from =
          groupIdeas[0].hasWeekRange && groupIdeas[0].planFrom
            ? groupIdeas[0].planFrom
            : sortedDates[0];
        const to =
          groupIdeas[0].hasWeekRange && groupIdeas[0].planTo
            ? groupIdeas[0].planTo
            : sortedDates[sortedDates.length - 1];

        return {
          key,
          from,
          to,
          ideas: groupIdeas.sort((a, b) => a.postDate.localeCompare(b.postDate)),
          pendingCount: groupIdeas.filter((i) => i.status !== 'Posted').length,
          postedCount: groupIdeas.filter((i) => i.status === 'Posted').length,
        };
      })
      .sort((a, b) => b.from.localeCompare(a.from) || b.to.localeCompare(a.to));
  }, [ideas]);

  const selectedRange = rangeGroups.find((g) => g.key === selectedRangeKey) || null;
  const listForPage = selectedRange ? selectedRange.ideas : rangeGroups;
  const totalItems = listForPage.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage) || 1);
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * rowsPerPage;
  const pagedItems = listForPage.slice(startIdx, startIdx + rowsPerPage);

  const rangeIdeaIds = selectedRange?.ideas.map((i) => i.id) || [];
  const allRangeSelected =
    rangeIdeaIds.length > 0 && rangeIdeaIds.every((id) => selectedIds.has(id));

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [selectedRangeKey, rowsPerPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCheckAll = () => {
    if (!selectedRange) return;
    setSelectedIds(new Set(selectedRange.ideas.map((i) => i.id)));
  };

  const handleUncheckAll = () => {
    setSelectedIds(new Set());
  };

  const handleTickPosted = async (idea: Idea) => {
    try {
      const url =
        idea.status === 'Posted'
          ? `/api/ideas/${idea.id}/unposted`
          : `/api/ideas/${idea.id}/posted`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id
            ? { ...i, status: idea.status === 'Posted' ? 'Draft' : 'Posted' }
            : i
        )
      );
    } catch (err: any) {
      setError(err.message || 'Status မပြောင်းနိုင်ပါ။');
    }
  };

  const handleBulkPosted = async (posted: boolean) => {
    if (!selectedRange) return;
    const ids = selectedIds.size > 0 ? [...selectedIds] : selectedRange.ideas.map((i) => i.id);
    if (ids.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/ideas/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, posted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      const idSet = new Set(ids);
      setIdeas((prev) =>
        prev.map((i) =>
          idSet.has(i.id) ? { ...i, status: posted ? 'Posted' : 'Draft' } : i
        )
      );
    } catch (err: any) {
      setError(err.message || 'Bulk update မရပါ။');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ဤ idea ကို ဖျက်မလား?')) return;
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setIdeas((prev) => {
        const next = prev.filter((i) => i.id !== id);
        if (selectedRangeKey) {
          const stillInRange = next.some((i) => {
            const key = i.hasWeekRange
              ? `week:${i.planFrom}|${i.planTo}`
              : `batch:${i.createdBatch || i.postDate}`;
            return key === selectedRangeKey;
          });
          if (!stillInRange) setSelectedRangeKey(null);
        }
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'ဖျက်မရပါ။');
    }
  };

  const handleDeleteSelectedOrAll = async (mode: 'selected' | 'all') => {
    if (!selectedRange) return;
    const ids =
      mode === 'all'
        ? selectedRange.ideas.map((i) => i.id)
        : [...selectedIds];
    if (ids.length === 0) {
      setError('ဖျက်ရန် idea ရွေးထားခြင်း မရှိပါ။ Check လုပ်ပြီးမှ Delete လုပ်ပါ။');
      return;
    }
    const label = mode === 'all' ? 'ဤ Date Range အတွင်း idea အားလုံး' : `ရွေးထားသော idea ${ids.length} ခု`;
    if (!confirm(`${label} ကို ဖျက်မလား?`)) return;

    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/ideas/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      const idSet = new Set(ids);
      setIdeas((prev) => {
        const next = prev.filter((i) => !idSet.has(i.id));
        const stillInRange = next.some((i) => {
          const key = i.hasWeekRange
            ? `week:${i.planFrom}|${i.planTo}`
            : `batch:${i.createdBatch || i.postDate}`;
          return key === selectedRangeKey;
        });
        if (!stillInRange) setSelectedRangeKey(null);
        return next;
      });
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err.message || 'ဖျက်မရပါ။');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="border-b border-slate-300 pb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Content Ideas</h1>
        <p className="text-sm text-slate-600 mt-1">
          Generate လုပ်သိမ်းထားသော တစ်ပတ်စာ Date Range (ဥပမာ 17 Jul → 24 Jul) တစ်ခုကို နှိပ်ပြီး အတွင်း Ideas အားလုံးကို ကြည့် / Tick လုပ်ပါ
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-xl border border-teal-200 text-teal-700">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {selectedRange ? 'Ideas in Date Range' : 'Saved Date Ranges'}
              </h2>
              <p className="text-[11px] text-slate-600">
                {selectedRange
                  ? `${formatDisplayDate(selectedRange.from)} → ${formatDisplayDate(selectedRange.to)}`
                  : `${rangeGroups.length} date range(s)`}
              </p>
            </div>
          </div>

          {selectedRange && (
            <button
              type="button"
              onClick={() => setSelectedRangeKey(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Date Ranges သို့ ပြန်ရန်
            </button>
          )}
        </div>

        {selectedRange && (
          <div className="mb-4 flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              disabled={busy}
              onClick={handleCheckAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Check All
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleUncheckAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" /> Uncheck All
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleBulkPosted(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 text-white hover:bg-teal-600 cursor-pointer disabled:opacity-50"
              title={selectedIds.size ? 'ရွေးထားသည်များကို Posted' : 'အားလုံး Posted'}
            >
              Mark Posted
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleBulkPosted(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-50 cursor-pointer disabled:opacity-50"
            >
              Unmark Posted
            </button>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0}
              onClick={() => handleDeleteSelectedOrAll('selected')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-red-300 text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.size})
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDeleteSelectedOrAll('all')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-500 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete All
            </button>
            {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
          </div>
        )}

        {loadingIdeas ? (
          <div className="py-10 text-center text-sm text-slate-600 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : ideas.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <p className="text-sm text-slate-600">
              Idea မရှိသေးပါ။ Generate Ideas tab မှ Generate → Save လုပ်ပါ။
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {!selectedRange ? (
              <div className="space-y-3">
                {(pagedItems as DateRangeGroup[]).map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setSelectedRangeKey(group.key)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/40 transition-all cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-teal-700 shrink-0">
                          <CalendarRange className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 font-mono">
                            {formatDisplayDate(group.from)}
                            <span className="text-slate-400 mx-2">→</span>
                            {formatDisplayDate(group.to)}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            တစ်ပတ်စာ · {group.ideas.length} ideas · Pending {group.pendingCount} · Posted {group.postedCount}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                        Ideas ကြည့်ရန် →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(pagedItems as Idea[]).map((idea) => (
                  <IdeaRow
                    key={idea.id}
                    idea={idea}
                    selected={selectedIds.has(idea.id)}
                    onToggleSelect={() => toggleSelect(idea.id)}
                    onTick={() => handleTickPosted(idea)}
                    onDelete={() => handleDelete(idea.id)}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <span className="font-semibold">Rows per page</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-slate-500">
                  {totalItems === 0
                    ? '0'
                    : `${startIdx + 1}–${Math.min(startIdx + rowsPerPage, totalItems)}`}{' '}
                  of {totalItems}
                </span>
                {selectedRange && allRangeSelected && (
                  <span className="text-teal-700 font-semibold">· All checked</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs font-mono text-slate-700 px-2">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IdeaRow({
  idea,
  selected,
  onToggleSelect,
  onTick,
  onDelete,
}: {
  idea: Idea;
  selected: boolean;
  onToggleSelect: () => void;
  onTick: () => void;
  onDelete: () => void;
}) {
  const isPosted = idea.status === 'Posted';
  const isTech = idea.category === 'Tech';

  return (
    <motion.div
      layout
      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-start gap-3 ${
        isPosted ? 'bg-teal-50/60 border-teal-200' : 'bg-white border-slate-200'
      } ${selected ? 'ring-2 ring-teal-400/50' : ''}`}
    >
      <button
        type="button"
        onClick={onToggleSelect}
        className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer ${
          selected
            ? 'bg-slate-800 border-slate-800 text-white'
            : 'bg-white border-slate-400 text-transparent hover:border-slate-600'
        }`}
        title={selected ? 'Uncheck' : 'Check'}
      >
        <CheckSquare className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onTick}
        className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
          isPosted
            ? 'bg-teal-600 border-teal-600 text-white'
            : 'bg-white border-slate-400 text-slate-300 hover:border-teal-600 hover:text-teal-600'
        }`}
        title={isPosted ? 'Unmark Posted' : 'Mark as Posted'}
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-slate-600">{idea.postDate}</span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
            isTech
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {idea.category}
          </span>
          <span className="text-[9px] text-slate-500 uppercase">{idea.contentType}</span>
        </div>
        <h4 className={`text-xs font-bold ${isPosted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
          {idea.topic}
        </h4>
        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{idea.caption}</p>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 cursor-pointer"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
