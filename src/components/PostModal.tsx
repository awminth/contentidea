import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Check, Loader2, Info } from 'lucide-react';
import { Post, ContentStatus } from '../types';

interface PostModalProps {
  post?: Post | null;
  onClose: () => void;
  onSave: (postData: Partial<Post>) => void;
}

export default function PostModal({ post, onClose, onSave }: PostModalProps) {
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [postDate, setPostDate] = useState('2026-07-16');
  const [postTime, setPostTime] = useState('10:00 AM');
  const [contentType, setContentType] = useState<'Image' | 'Video' | 'Carousels' | 'Text' | 'Link'>('Image');
  const [status, setStatus] = useState<ContentStatus>('Draft');
  const [caption, setCaption] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [hashtags, setHashtags] = useState('');
  
  // Copywriter AI state
  const [improving, setImproving] = useState(false);
  const [aiNotice, setAiNotice] = useState('');

  // Auto-fill values if we are editing an existing post
  useEffect(() => {
    if (post) {
      setTopic(post.topic);
      setTitle(post.title);
      setPostDate(post.postDate);
      setPostTime(post.postTime || '10:00 AM');
      setContentType(post.contentType);
      setStatus(post.status);
      setCaption(post.caption);
      setImagePrompt(post.imagePrompt);
      setHashtags(post.hashtags);
    } else {
      // Set default tomorrow date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setPostDate(`${yyyy}-${mm}-${dd}`);
      setPostTime('10:00 AM');
    }
  }, [post]);

  const handleImproveCaption = async () => {
    if (!caption.trim()) {
      setAiNotice('Please write a basic caption draft first to let Gemini improve it!');
      return;
    }

    setImproving(true);
    setAiNotice('');

    try {
      const response = await fetch('/api/improve-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          tone: 'Engaging, premium tech-firm tone with emojis',
          language: 'Burmese' // Let's support Burmese/English based on draft
        })
      });

      const data = await response.json();
      if (data.improvedCaption) {
        setCaption(data.improvedCaption);
        if (data.isMock) {
          setAiNotice('Simulated copywriter boost applied! Connect your Gemini Secret Key for live generations.');
        } else {
          setAiNotice('Gemini has polished and enhanced your caption copy beautifully! ✨');
        }
      }
    } catch (err) {
      console.error("Caption boost failed:", err);
      setAiNotice('Failed to improve caption. Using original draft.');
    } finally {
      setImproving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !caption) return;

    onSave({
      id: post?.id,
      topic,
      title: title || topic,
      postDate,
      postTime,
      contentType,
      status,
      caption,
      imagePrompt: imagePrompt || 'Minimalist dark-mode customizable software graphic.',
      hashtags,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl glass-panel-heavy rounded-3xl shadow-2xl relative"
        id="post-modal"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
              {post ? 'Active Update' : 'New Plan Creation'}
            </span>
            <h2 className="text-base font-bold text-slate-100 font-sans mt-1">
              {post ? 'Edit Content Plan Details' : 'Schedule Custom Software Post'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Topic Title */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Post Topic/Category (ခေါင်းစဉ်တို)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. ERP System benefits for retail"
                className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none"
                required
              />
            </div>

            {/* Post Date */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Publishing Date (တင်မည့်ရက်စွဲ)
              </label>
              <input
                type="date"
                value={postDate}
                onChange={(e) => setPostDate(e.target.value)}
                className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono outline-none"
                required
              />
            </div>

            {/* Post Time */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Publishing Time (တင်မည့်အချိန်)
              </label>
              <input
                type="text"
                value={postTime}
                onChange={(e) => setPostTime(e.target.value)}
                placeholder="e.g. 10:30 AM or 06:00 PM"
                className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono outline-none"
                required
              />
            </div>

            {/* Format Type */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Content Format Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none cursor-pointer font-sans"
              >
                <option value="Image" className="bg-[#0b0c16] text-slate-200">Standalone Image (ဓာတ်ပုံ)</option>
                <option value="Carousels" className="bg-[#0b0c16] text-slate-200">Carousels / Album (ပုံအများကြီးတွဲတင်ခြင်း)</option>
                <option value="Video" className="bg-[#0b0c16] text-slate-200">Video / Reel (ဗီဒီယို)</option>
                <option value="Text" className="bg-[#0b0c16] text-slate-200">Text-Only Post (စာသားသီးသန့်)</option>
                <option value="Link" className="bg-[#0b0c16] text-slate-200">External Link / Website (လင့်ခ်)</option>
              </select>
            </div>

            {/* Plan Status */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Scheduler Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
                className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none cursor-pointer font-sans"
              >
                <option value="Draft" className="bg-[#0b0c16] text-slate-200">Draft (မူကြမ်း)</option>
                <option value="Scheduled" className="bg-[#0b0c16] text-slate-200">Scheduled (တင်ရန်စီစဉ်ထားဆဲ)</option>
                <option value="Posted" className="bg-[#0b0c16] text-slate-200">Posted (တင်ပြီးသွားပြီ)</option>
              </select>
            </div>
          </div>

          {/* Caption with AI Booster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Facebook Post Caption Text (ပို့စ်စာသား)
              </label>
              <button
                type="button"
                onClick={handleImproveCaption}
                disabled={improving}
                className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
              >
                {improving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Improving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-300 fill-indigo-300" /> Boost Copy with Gemini AI
                  </>
                )}
              </button>
            </div>
            
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              placeholder="Write your Facebook post caption draft here..."
              className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none leading-relaxed font-sans"
              required
            />
          </div>

          {aiNotice && (
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-300 font-medium font-sans">{aiNotice}</p>
            </div>
          )}

          {/* Image Graphic Prompt Description */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
              Visual Graphic Prompt Description (ဒီဇိုင်နာအတွက် ပုံအညွှန်း သို့မဟုတ် AI prompt)
            </label>
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="e.g. A tablet displaying automated financial summaries. Tech neon details."
              className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none font-sans"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
              Hashtags (အဟက်ရှ်တဂ်များ)
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="e.g. #ERPMyanmar #CustomSoftware #CodeCraft"
              className="w-full bg-black/25 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono outline-none"
            />
          </div>

          {/* Actions footer */}
          <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-md hover:shadow-indigo-500/10"
            >
              <Check className="w-4 h-4 stroke-[3]" /> Save Plan (သိမ်းဆည်းမည်)
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
