import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import GenerateIdeas from './components/GenerateIdeas';
import ContentIdeas from './components/ContentIdeas';

const STORAGE_VERSION = 'v4-two-tabs';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ username: string; fullName: string } | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [ideasRefreshKey, setIdeasRefreshKey] = useState(0);

  useEffect(() => {
    if (localStorage.getItem('fb_planner_version') !== STORAGE_VERSION) {
      localStorage.removeItem('fb_planner_user');
      localStorage.removeItem('fb_planner_posts');
      localStorage.setItem('fb_planner_version', STORAGE_VERSION);
      return;
    }

    const savedUser = localStorage.getItem('fb_planner_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (username: string, fullName: string) => {
    const user = { username, fullName };
    setCurrentUser(user);
    localStorage.setItem('fb_planner_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fb_planner_user');
    setActiveTab('generate');
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900 flex" id="app-root">
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />
      <main className="flex-1 min-h-screen ml-64 p-8 overflow-y-auto relative">
        {activeTab === 'generate' && (
          <GenerateIdeas
            onSaved={() => {
              setIdeasRefreshKey((k) => k + 1);
              setActiveTab('content-ideas');
            }}
          />
        )}
        {activeTab === 'content-ideas' && (
          <ContentIdeas refreshKey={ideasRefreshKey} />
        )}
      </main>
    </div>
  );
}
