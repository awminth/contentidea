import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, Sparkles, TrendingUp, Users, Heart, Share2, MessageSquare, 
  Eye, MousePointerClick, ChevronRight, Loader2, Award, Info, RefreshCw 
} from 'lucide-react';
import { Post, PageStats } from '../types';

interface AnalyticsProps {
  posts: Post[];
}

interface AIInsight {
  title: string;
  detail: string;
}

interface AIAnalysisResult {
  summary: string;
  insights: AIInsight[];
  bestPostTopic: string;
  bestContentType: string;
}

export default function Analytics({ posts }: AnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);

  // Filter posts that are actually published
  const publishedPosts = posts.filter(p => p.status === 'Posted');

  // Page level totals (dynamically sums the published post metrics plus static page base stats)
  const totalLikes = publishedPosts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const totalShares = publishedPosts.reduce((acc, p) => acc + (p.shares || 0), 0);
  const totalComments = publishedPosts.reduce((acc, p) => acc + (p.comments || 0), 0);
  const totalClicks = publishedPosts.reduce((acc, p) => acc + (p.clicks || 0), 0);
  const totalReach = publishedPosts.reduce((acc, p) => acc + (p.reach || 0), 0);

  const pageStats: PageStats = {
    followers: 2450 + Math.round(totalLikes * 0.2), // Growing with likes
    reach: 12500 + totalReach,
    engagement: totalLikes + totalShares + totalComments + totalClicks,
    profileViews: 850 + Math.round(totalClicks * 0.4),
  };

  // Run the Gemini performance auditor
  const runPerformanceAudit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts: publishedPosts,
          pageStats
        })
      });

      const result = await response.json();
      if (result.data) {
        setAnalysis(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch performance analysis:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run the audit automatically on load or whenever published posts change
  useEffect(() => {
    runPerformanceAudit();
  }, [posts.filter(p => p.status === 'Posted').length]);

  // Calculations for custom SVG bar-chart (engagement by content types)
  const contentTypes = ['Image', 'Video', 'Carousels', 'Text', 'Link'];
  const typeMetrics = contentTypes.map(type => {
    const typePosts = publishedPosts.filter(p => p.contentType === type);
    const count = typePosts.length;
    const likes = typePosts.reduce((acc, p) => acc + (p.likes || 0), 0);
    const clicks = typePosts.reduce((acc, p) => acc + (p.clicks || 0), 0);
    const avgEngagement = count > 0 ? Math.round((likes + clicks) / count) : 0;
    return { type, count, avgEngagement };
  });

  const maxAvgEngagement = Math.max(...typeMetrics.map(m => m.avgEngagement), 1);

  // Sort posts by highest reach/likes to highlight top-performer
  const topPerformers = [...publishedPosts]
    .sort((a, b) => (b.reach || 0) + (b.likes || 0) - ((a.reach || 0) + (a.likes || 0)))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-sans tracking-tight">FB Page Performance Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Facebook Page နှင့် တင်ထားသည့် Content များ၏ တုံ့ပြန်မှု ရလဒ်များ ဆန်းစစ်ခြင်း
          </p>
        </div>
        <button
          onClick={runPerformanceAudit}
          disabled={loading}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Re-Analyze Page (ပြန်ဆန်းစစ်ရန်)
        </button>
      </div>

      {/* Grid: Visual KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Page Followers', labelMm: 'ဖော်လိုဝါ စုစုပေါင်း', value: pageStats.followers.toLocaleString(), change: '+12.4%', icon: Users, color: 'text-blue-400 bg-blue-500/10 border-blue-500/10' },
          { label: 'Organic Monthly Reach', labelMm: 'လစဉ် လူဦးရေဆီရောက်ရှိမှု', value: pageStats.reach.toLocaleString(), change: '+18.2%', icon: Eye, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/10' },
          { label: 'Accumulated Engagement', labelMm: 'တုံ့ပြန်မှု စုစုပေါင်း', value: pageStats.engagement.toLocaleString(), change: '+24.5%', icon: TrendingUp, color: 'text-purple-400 bg-purple-500/10 border-purple-500/10' },
          { label: 'Custom App Clicks', labelMm: 'လုပ်ငန်းမေးမြန်းရန် ကလစ်နှိပ်မှု', value: pageStats.profileViews.toLocaleString(), change: '+32.1%', icon: MousePointerClick, color: 'text-amber-400 bg-amber-500/10 border-amber-500/10' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                  {kpi.label}
                </span>
                <span className={`p-2 rounded-lg border ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100 font-mono tracking-tight">{kpi.value}</h3>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">{kpi.labelMm}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-300">
                <span>{kpi.change}</span>
                <span className="text-slate-500 font-normal">this period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Charts & AI Insights panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Performance Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Reach Trend (Interactive custom SVG line-graph) */}
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">
                  📈 Reach Growth & Traffic Trend
                </h2>
                <p className="text-[10px] text-slate-500">Weekly organic impressions index</p>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-lg">
                Live Data
              </span>
            </div>

            {/* Custom Interactive SVG Line Plot */}
            <div className="h-48 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {/* Horizontal guide grids */}
                <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4"/>
                <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4"/>
                <line x1="0" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4"/>

                {/* Fill Area */}
                <path 
                  d="M 10,180 L 10,140 L 100,120 L 200,150 L 300,90 L 400,110 L 500,45 L 590,30 L 590,180 Z" 
                  fill="url(#chartGradient)"
                />
                
                {/* Line Path */}
                <path 
                  d="M 10,140 L 100,120 L 200,150 L 300,90 L 400,110 L 500,45 L 590,30" 
                  fill="none" 
                  stroke="#6366f1" 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Data Nodes */}
                <circle cx="10" cy="140" r="4" fill="#0c0f1d" stroke="#6366f1" strokeWidth="2" />
                <circle cx="100" cy="120" r="4" fill="#0c0f1d" stroke="#6366f1" strokeWidth="2" />
                <circle cx="200" cy="150" r="4" fill="#0c0f1d" stroke="#6366f1" strokeWidth="2" />
                <circle cx="300" cy="90" r="4" fill="#0c0f1d" stroke="#6366f1" strokeWidth="2" />
                <circle cx="400" cy="110" r="4" fill="#0c0f1d" stroke="#6366f1" strokeWidth="2" />
                <circle cx="500" cy="45" r="4" fill="#0c0f1d" stroke="#6366f1" strokeWidth="2" />
                <circle cx="590" cy="30" r="4" fill="#0c0f1d" stroke="#6366f1" strokeWidth="2" />
              </svg>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-3 px-1">
              <span>Jul 10</span>
              <span>Jul 11</span>
              <span>Jul 12</span>
              <span>Jul 13 (ERP Campaign)</span>
              <span>Jul 14</span>
              <span>Jul 15</span>
              <span>Jul 16 (Today)</span>
            </div>
          </div>

          {/* Chart 2: Content Format Engagement Index */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans mb-4">
              📊 Content Format Comparative Index (Likes + Clicks)
            </h2>

            {publishedPosts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Mark your scheduled content as 'Posted' on the Dashboard to populate custom graphics!
              </div>
            ) : (
              <div className="space-y-4">
                {typeMetrics.map((metric, idx) => {
                  const widthPercent = Math.max(5, Math.round((metric.avgEngagement / maxAvgEngagement) * 100));
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-sans">
                        <span className="text-slate-300 font-medium">{metric.type} ({metric.count} Posts)</span>
                        <span className="text-indigo-300 font-mono font-bold">{metric.avgEngagement} Average Points</span>
                      </div>
                      <div className="w-full bg-black/25 h-5 rounded-lg overflow-hidden border border-white/10 relative">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-r-md transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Gemini Strategic Feedback & AI Audit */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[430px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse fill-indigo-400" />
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
                  Gemini Strategic Content Audit
                </h2>
              </div>

              {loading ? (
                <div className="py-24 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                  <p className="text-xs text-slate-400 font-sans">Gemini AI is auditing your posts...</p>
                </div>
              ) : analysis ? (
                <div className="space-y-5">
                  <div className="bg-black/25 p-3.5 border border-white/10 rounded-xl">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-sans mb-1">
                      Auditor Summary
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {analysis.summary}
                    </p>
                  </div>

                  {/* Best performing highlight */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/25 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Best Topic</p>
                      <p className="text-[11px] font-bold text-slate-200 truncate mt-1">{analysis.bestPostTopic || 'Custom Software'}</p>
                    </div>
                    <div className="bg-black/25 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Best Format</p>
                      <p className="text-[11px] font-bold text-indigo-300 truncate mt-1">{analysis.bestContentType || 'Carousels'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      🎯 strategic recommendations
                    </p>
                    <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                      {analysis.insights.map((insight, idx) => (
                        <div key={idx} className="space-y-0.5 border-l-2 border-indigo-500 pl-3">
                          <h4 className="text-xs font-bold text-slate-200 font-sans">{insight.title}</h4>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-sans">{insight.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-xs text-slate-500 font-sans">Click below to perform content diagnostics.</p>
                </div>
              )}
            </div>

            <button
              onClick={runPerformanceAudit}
              disabled={loading}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md hover:shadow-indigo-500/10 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-white fill-white" /> Run AI Content Audit
            </button>
          </div>
        </div>
      </div>

      {/* Published content list panel */}
      <div className="glass-panel rounded-3xl p-6">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans mb-4 flex items-center gap-2">
          <Award className="w-4.5 h-4.5 text-indigo-300" /> Active Posted Content Performance Logs
        </h2>

        {publishedPosts.length === 0 ? (
          <div className="py-10 text-center bg-black/10 border border-dashed border-white/10 rounded-xl">
            <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No active posted logs yet.</p>
            <p className="text-[10px] text-slate-400 mt-1">Mark posts as "Posted" on the Content Planner list to start logging engagement analytics!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishedPosts.map(post => (
              <div key={post.id} className="bg-black/25 p-4 border border-white/10 rounded-2xl space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-400">{post.postDate}</span>
                    <h3 className="text-xs font-bold text-slate-200 truncate max-w-[180px] font-sans mt-0.5">{post.topic}</h3>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 bg-black/20 p-2.5 rounded-lg border border-white/5 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400">Reach</p>
                    <p className="text-[11px] font-mono font-bold text-slate-200 mt-0.5">{post.reach?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-sans">Likes</p>
                    <p className="text-[11px] font-mono font-bold text-indigo-300 mt-0.5">{post.likes || 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Clicks</p>
                    <p className="text-[11px] font-mono font-bold text-indigo-400 mt-0.5">{post.clicks || 0}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {post.comments || 0} Comments
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3 h-3" /> {post.shares || 0} Shares
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
