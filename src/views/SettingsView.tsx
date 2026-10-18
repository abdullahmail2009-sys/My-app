import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Settings,
  Cloud,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Plus,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    currentUser,
    syncState,
    lastSyncTime,
    loginGoogle,
    logoutUser,
    exportJSON,
    importJSON,
    resetAllData,
    activeSyllabus,
  } = useApp();

  const [confirmReset, setConfirmReset] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importJSON(content);
      if (success) {
        setImportStatus('Backup restored successfully!');
      } else {
        setImportStatus('Failed to import backup: invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          System Settings & Cloud Synchronization
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xl">
          Configure academic target session, daily availability limits, subject prioritization, Firebase Cloud synchronization, and full offline backups.
        </p>
      </div>

      {/* Target Session & Study Limit */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Academic Session & Examination Goals
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Target Academic Session
            </label>
            <input
              type="text"
              value={preferences.targetSession}
              onChange={(e) => updatePreferences({ targetSession: e.target.value })}
              className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Board Exam Target Date
            </label>
            <input
              type="date"
              value={preferences.examTargetDate}
              onChange={(e) => updatePreferences({ examTargetDate: e.target.value })}
              className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Daily Study Hours Limit
            </label>
            <input
              type="number"
              min="2"
              max="16"
              value={preferences.dailyStudyHoursLimit}
              onChange={(e) => updatePreferences({ dailyStudyHoursLimit: Number(e.target.value) })}
              className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Cloud & Firebase Authentication Sync */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cloud Firestore & Google Account Sync
              </h2>
              <p className="text-xs text-slate-500">
                Syncs topic mastery, revision queue, mock tests, and mistakes securely.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              syncState === 'synced'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : syncState === 'syncing'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {syncState === 'synced'
              ? `Synced ${lastSyncTime ? `at ${lastSyncTime}` : ''}`
              : syncState === 'syncing'
              ? 'Syncing...'
              : 'Offline Local Mode'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            {currentUser ? (
              <div>
                <span className="text-slate-500">Signed in as: </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentUser.displayName || currentUser.email} ({currentUser.email})
                </span>
              </div>
            ) : (
              <span className="text-slate-500">
                You are currently in local guest mode. Sign in to synchronize your progress across mobile and desktop.
              </span>
            )}
          </div>

          {currentUser ? (
            <button
              onClick={logoutUser}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={loginGoogle}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </button>
          )}
        </div>
      </div>

      {/* Backup & Local Data Persistence */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Backup, Export & Offline Persistence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full data portability: download complete syllabus progress, formulas, revisions, and test history in standard JSON format.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportJSON}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-blue-600" />
            Download JSON Backup
          </button>

          <label className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Restore from JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>

        {importStatus && (
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs font-medium">
            {importStatus}
          </div>
        )}
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="p-5 sm:p-6 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="text-sm font-bold">Reset Application Data</h3>
        </div>
        <p className="text-xs text-rose-700 dark:text-rose-400">
          Restores default RBSE Class 12 syllabus, starter progress, and clears local cached storage.
        </p>

        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
          >
            Reset All Data...
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetAllData();
                setConfirmReset(false);
              }}
              className="px-4 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-bold transition"
            >
              Confirm Complete Reset
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
