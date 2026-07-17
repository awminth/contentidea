import React from 'react';
import { Sparkles, Lightbulb, LogOut, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentUser: { username: string; fullName: string };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentUser, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const menuItems = [
    {
      id: 'generate',
      label: 'Generate Ideas',
      labelMm: 'Idea အသစ်ထုတ်ရန်',
      icon: Sparkles,
    },
    {
      id: 'content-ideas',
      label: 'Content Ideas',
      labelMm: 'Date Range & Tick',
      icon: Lightbulb,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-300 flex flex-col h-screen fixed left-0 top-0 z-20 shadow-sm">
      <div className="p-6 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center">
          <span className="font-bold text-white text-xs">MT</span>
        </div>
        <div>
          <span className="text-sm font-bold text-slate-900 tracking-wider uppercase block">
            Marctober Tech
          </span>
          <span className="text-[10px] text-teal-700 font-semibold font-mono">
            CONTENT IDEAS
          </span>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl border border-slate-200 bg-white">
          <div className="w-9 h-9 bg-teal-100 border border-teal-200 text-teal-800 rounded-full flex items-center justify-center font-bold text-sm">
            {currentUser.fullName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-slate-900 truncate">
              {currentUser.fullName}
            </h4>
            <p className="text-[10px] text-slate-600 font-mono truncate">
              @{currentUser.username}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-teal-50 border border-teal-200 text-teal-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{item.labelMm}</p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5">
          <p className="text-[10px] text-teal-800 font-bold mb-1 uppercase tracking-wider">Database</p>
          <p className="text-[10px] text-slate-700 leading-tight">
            MySQL · mt_contentplanner
          </p>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-red-700 hover:text-red-800 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4" />
            <span className="font-semibold">Log Out</span>
          </div>
          <ChevronRight className="w-3 h-3 text-red-400" />
        </button>
      </div>
    </aside>
  );
}
