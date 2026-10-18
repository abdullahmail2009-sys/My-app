import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  RotateCcw,
  HelpCircle,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  MoreHorizontal,
  X,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
    { id: 'planner', label: 'Planner', icon: CalendarCheck },
    { id: 'revision', label: 'Revision', icon: RotateCcw },
    { id: 'pyqs', label: 'PYQs', icon: HelpCircle },
  ];

  const secondaryItems = [
    { id: 'pcm', label: 'PCM Tools & Notes', icon: Wrench, description: 'Formulas, reactions, derivations & mistakes' },
    { id: 'tests', label: 'Tests & Exams', icon: FileText, description: 'Mock tests, error linker & milestones' },
    { id: 'reports', label: 'Reports & Backlog', icon: BarChart3, description: 'Analytics, pace calculator & ROI matrix' },
    { id: 'settings', label: 'Settings & Cloud', icon: Settings, description: 'Subject setup, backup & PWA details' },
  ];

  const isMoreActive = secondaryItems.some((item) => item.id === activeTab);

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Hidden on Desktop lg:hidden) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe shadow-lg"
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setShowMoreMenu(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition ${
                    isActive ? 'bg-blue-50 dark:bg-blue-950/80 scale-110' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMoreMenu((prev) => !prev)}
            aria-label="More navigation options"
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
              isMoreActive || showMoreMenu
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition ${
                isMoreActive ? 'bg-blue-50 dark:bg-blue-950/80 scale-110' : ''
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* More Navigation Drawer Modal */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 border-t border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                All Navigation Modules
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-4">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl text-left transition ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
