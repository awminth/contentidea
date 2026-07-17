import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Key, Server, Globe } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (username: string, fullName: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1');
  const [fullName, setFullName] = useState('Admin');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (isRegistering) {
      if (!fullName) {
        setError('Please enter your full name.');
        return;
      }
      onLoginSuccess(username, fullName);
    } else {
      if (username === 'admin' && password === '1') {
        onLoginSuccess('admin', 'Admin');
      } else {
        setError('Invalid username or password.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative overflow-hidden" id="login-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md glass-panel-heavy rounded-3xl p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-teal-50 border border-teal-200 rounded-xl mb-4 text-teal-700">
            <Server className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Marctober Tech Planner
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Content Ideas for Customized Management Systems
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Full Name (အမည်အပြည့်အစုံ)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Globe className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-xl py-3 pl-10 pr-4 text-slate-900 text-sm outline-none"
                  placeholder="e.g. Mg Mg"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Username (အသုံးပြုသူအမည်)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-xl py-3 pl-10 pr-4 text-slate-900 text-sm outline-none"
                placeholder="Username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Password (လျှို့ဝှက်နံပါတ်)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Key className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-xl py-3 pl-10 pr-4 text-slate-900 text-sm outline-none"
                placeholder="Password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            {isRegistering ? 'Create Account' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-600">
            {isRegistering ? 'Already have an account?' : 'Want to try another account?'}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-teal-700 hover:text-teal-600 font-semibold ml-1 cursor-pointer"
            >
              {isRegistering ? 'Sign In' : 'Register New User'}
            </button>
          </p>
        </div>

        <div className="mt-6 bg-slate-100 p-3 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] text-slate-700 font-mono">
            Demo Credentials:<br />
            <span className="text-teal-700 font-semibold">username:</span> admin |{' '}
            <span className="text-teal-700 font-semibold">password:</span> 1
          </div>
        </div>
      </motion.div>
    </div>
  );
}
