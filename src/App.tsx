import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { OfflineBanner } from './components/OfflineBanner.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { SyllabusView } from './views/SyllabusView.tsx';
import { StudyPlannerView } from './views/StudyPlannerView.tsx';
import { RevisionView } from './views/RevisionView.tsx';
import { PYQView } from './views/PYQView.tsx';
import { PCMToolsView } from './views/PCMToolsView.tsx';
import { TestsExamsView } from './views/TestsExamsView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { SyllabusImportView } from './views/SyllabusImportView.tsx';
import { TopicModal } from './components/TopicModal.tsx';
import { AITutorModal } from './components/AITutorModal.tsx';
import { SyllabusDiffModal } from './components/SyllabusDiffModal.tsx';
import { Topic } from './types/index.ts';

const AppContent: React.FC = () => {
  const { activeSyllabus } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modals state
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showAITutor, setShowAITutor] = useState(false);
  const [aiTutorInitialData, setAiTutorInitialData] = useState<{
    topic?: string;
    chapter?: string;
    subject?: string;
  }>({});
  const [showSyllabusDiff, setShowSyllabusDiff] = useState(false);

  // Find topic object for TopicModal
  let currentTopicObject: { topic: Topic; chapterTitle: string; subjectName: string } | null = null;
  if (selectedTopicId) {
    for (const sub of activeSyllabus.subjects) {
      for (const u of sub.units) {
        for (const c of u.chapters) {
          for (const t of c.topics) {
            if (t.id === selectedTopicId) {
              currentTopicObject = { topic: t, chapterTitle: c.title, subjectName: sub.name };
              break;
            }
          }
        }
      }
    }
  }

  const handleOpenAITutorForTopic = (topicTitle: string, chapterTitle: string, subjectName: string) => {
    setAiTutorInitialData({ topic: topicTitle, chapter: chapterTitle, subject: subjectName });
    setShowAITutor(true);
  };

  const handleOpenAITutorForMistake = (mistakeText: string) => {
    setAiTutorInitialData({ topic: mistakeText, chapter: 'General', subject: 'Physics / Chemistry / Math' });
    setShowAITutor(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <OfflineBanner />
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAITutor={() => {
          setAiTutorInitialData({});
          setShowAITutor(true);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 lg:pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            setActiveTab={setActiveTab}
            onSelectTopic={(id) => setSelectedTopicId(id)}
            onOpenAITutor={() => setShowAITutor(true)}
          />
        )}
        {activeTab === 'syllabus' && (
          <SyllabusView
            onSelectTopic={(id) => setSelectedTopicId(id)}
            onOpenSyllabusDiff={() => setShowSyllabusDiff(true)}
            onOpenAITutor={() => setShowAITutor(true)}
            onNavigateToImportPDF={() => setActiveTab('import-syllabus')}
          />
        )}
        {activeTab === 'import-syllabus' && (
          <SyllabusImportView
            onBackToSyllabus={() => setActiveTab('syllabus')}
            onNavigateToPlanner={() => setActiveTab('planner')}
          />
        )}
        {activeTab === 'planner' && <StudyPlannerView />}
        {activeTab === 'revision' && <RevisionView />}
        {activeTab === 'pyqs' && <PYQView />}
        {activeTab === 'pcm' && (
          <PCMToolsView onOpenAITutorForMistake={handleOpenAITutorForMistake} />
        )}
        {activeTab === 'tests' && <TestsExamsView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modals */}
      {currentTopicObject && (
        <TopicModal
          topic={currentTopicObject.topic}
          subjectName={currentTopicObject.subjectName}
          chapterTitle={currentTopicObject.chapterTitle}
          onClose={() => setSelectedTopicId(null)}
          onOpenAITutorForTopic={handleOpenAITutorForTopic}
        />
      )}

      {showAITutor && (
        <AITutorModal
          initialTopic={aiTutorInitialData.topic}
          initialChapter={aiTutorInitialData.chapter}
          initialSubject={aiTutorInitialData.subject}
          onClose={() => setShowAITutor(false)}
        />
      )}

      {showSyllabusDiff && (
        <SyllabusDiffModal onClose={() => setShowSyllabusDiff(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
