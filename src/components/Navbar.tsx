import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import {
  GraduationCap,
  CloudCheck,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAITutor: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAITutor }) => {
  const { currentUser, syncState, lastSyncTime, loginGoogle, logoutUser, activeSyllabus } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'syllabus', label: 'Syllabus' },
    { id: 'planner', label: 'Planner' },
    { id: 'revision', label: 'Revision' },
    { id: 'pyqs', label: 'PYQs' },
    { id: 'pcm', label: 'PCM Tools' },
    { id: 'tests', label: 'Tests' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  MyStudyPath
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  RBSE 12
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Session {activeSyllabus.academicSession}</span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">Provisional</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav aria-label="Desktop Navigation" className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Tutor Button */}
            <button
              onClick={onOpenAITutor}
              aria-label="Open AI Tutor"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
              <span className="hidden sm:inline">AI Tutor</span>
            </button>

            {/* PWA Install */}
            <PWAInstallButton />

            {/* Sync Badge */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {syncState === 'synced' ? (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cloud Synced {lastSyncTime ? `(${lastSyncTime})` : ''}</span>
                </>
              ) : syncState === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Local Cache</span>
                </>
              )}
            </div>

            {/* Auth / Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div
                  title={currentUser.email || 'Authenticated User'}
                  className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20"
                >
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
                <button
                  onClick={logoutUser}
                  aria-label="Sign out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={loginGoogle}
                aria-label="Sign in with Google"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Google Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
