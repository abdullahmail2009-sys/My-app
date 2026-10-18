import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Topic, ALL_MASTERY_STAGES, MasteryStage, ConfidenceRating, TopicStatus } from '../types/index.ts';
import { checkPrerequisites } from '../utils/prerequisites.ts';
import { calculateTopicMasteryPercentage } from '../utils/progressCalc.ts';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Clock,
  Target,
  Edit3,
} from 'lucide-react';

interface TopicModalProps {
  topic: Topic;
  subjectName: string;
  chapterTitle: string;
  onClose: () => void;
  onOpenAITutorForTopic: (topicTitle: string, chapterTitle: string, subjectName: string) => void;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  topic,
  subjectName,
  chapterTitle,
  onClose,
  onOpenAITutorForTopic,
}) => {
  const {
    masteryMap,
    updateTopicMastery,
    toggleMasteryStage,
    addRevisionTask,
    preferences,
  } = useApp();

  const mastery = masteryMap[topic.id] || {
    topicId: topic.id,
    chapterId: topic.chapterId,
    subjectId: topic.subjectId,
    status: 'Not Started' as TopicStatus,
    confidence: 3 as ConfidenceRating,
    completedStages: [] as MasteryStage[],
    difficulty: topic.difficulty,
    totalStudyMinutes: 0,
    questionsSolved: 0,
    questionsCorrect: 0,
    updatedAt: new Date().toISOString(),
  };

  const [notes, setNotes] = useState(mastery.notes || '');
  const [loggedMinutes, setLoggedMinutes] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Check prerequisites
  const completedTopicIds = new Set(
    Object.values(masteryMap)
      .filter((m) => m.status === 'Completed' || (m.completedStages.includes('theory') && m.completedStages.includes('notes')))
      .map((m) => m.topicId)
  );

  const prereqCheck = checkPrerequisites(
    topic.id,
    topic.prerequisites,
    completedTopicIds
  );

  const masteryPercentage = calculateTopicMasteryPercentage(mastery, topic.subjectId);

  const handleConfidenceChange = (val: ConfidenceRating) => {
    updateTopicMastery(topic.id, { confidence: val });
  };

  const handleStatusChange = (val: TopicStatus) => {
    updateTopicMastery(topic.id, {
      status: val,
      completedDate: val === 'Completed' ? new Date().toISOString().split('T')[0] : mastery.completedDate,
    });
  };

  const handleDifficultyChange = (val: 'Easy' | 'Moderate' | 'Hard') => {
    updateTopicMastery(topic.id, { difficulty: val });
  };

  const handleSaveNotes = () => {
    updateTopicMastery(topic.id, { notes });
  };

  const handleLogStudyTime = () => {
    if (loggedMinutes > 0) {
      updateTopicMastery(topic.id, {
        totalStudyMinutes: mastery.totalStudyMinutes + loggedMinutes,
        lastStudiedDate: new Date().toISOString().split('T')[0],
      });
      setLoggedMinutes(0);
    }
  };

  const handleLogQuestions = () => {
    if (solvedCount > 0) {
      updateTopicMastery(topic.id, {
        questionsSolved: mastery.questionsSolved + solvedCount,
        questionsCorrect: mastery.questionsCorrect + correctCount,
      });
      setSolvedCount(0);
      setCorrectCount(0);
    }
  };

  const handleScheduleRevision = (step: 1 | 2 | 3 | 4) => {
    const today = new Date();
    const scheduleDays: Record<number, number> =
      preferences.revisionScheduleType === 'advanced'
        ? { 1: 3, 2: 7, 3: 21, 4: 45 }
        : { 1: 1, 2: 7, 3: 15, 4: 30 };

    today.setDate(today.getDate() + (scheduleDays[step] || 7));
    const scheduledDate = today.toISOString().split('T')[0];

    addRevisionTask({
      id: `rev-${topic.id}-step-${step}-${Date.now()}`,
      topicId: topic.id,
      chapterId: topic.chapterId,
      subjectId: topic.subjectId,
      topicTitle: topic.title,
      subjectName,
      revisionStep: step,
      scheduledDate,
      completed: false,
    });

    toggleMasteryStage(topic.id, `revision_${step <= 3 ? step : 3}` as MasteryStage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <span>{subjectName}</span>
              <span>•</span>
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{chapterTitle}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {topic.title}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                Est: {topic.estimatedHours} hrs
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Studied: {mastery.totalStudyMinutes} mins</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                <Target className="w-3.5 h-3.5" />
                <span>Mastery: {masteryPercentage}%</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close topic modal"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Prerequisite Recommendation Warning */}
          {prereqCheck.hasUnmetPrerequisites && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex items-start gap-2.5 text-amber-800 dark:text-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Prerequisite Alert: </span>
                {prereqCheck.warningMessage}
              </div>
            </div>
          )}

          {/* Quick AI & Study Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenAITutorForTopic(topic.title, chapterTitle, subjectName)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Ask AI Tutor to Explain
            </button>
            <button
              onClick={() => handleScheduleRevision(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              Schedule Next Revision
            </button>
          </div>

          {/* Status & Confidence Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Completion Status
              </label>
              <select
                value={mastery.status}
                onChange={(e) => handleStatusChange(e.target.value as TopicStatus)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Needs Revision">Needs Revision</option>
                <option value="Weak Topic">Weak Topic</option>
                <option value="Practice Pending">Practice Pending</option>
                <option value="Test Pending">Test Pending</option>
              </select>
            </div>

            {/* Confidence Rating (1-5) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confidence Indicator
                </label>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    mastery.confidence <= 2
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : mastery.confidence === 3
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {mastery.confidence <= 2
                    ? 'Weak (1-2)'
                    : mastery.confidence === 3
                    ? 'Needs Practice (3)'
                    : 'Exam Ready (4-5)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {([1, 2, 3, 4, 5] as ConfidenceRating[]).map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleConfidenceChange(rating)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      mastery.confidence === rating
                        ? rating <= 2
                          ? 'bg-rose-600 text-white shadow-xs'
                          : rating === 3
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Difficulty Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Perceived Difficulty
            </label>
            <div className="flex gap-2">
              {(['Easy', 'Moderate', 'Hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => handleDifficultyChange(diff)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    mastery.difficulty === diff
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Mastery Stages Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mastery Stages (One-Tap Tracking)
              </label>
              <span className="text-[11px] text-slate-500">
                {mastery.completedStages.length} / {ALL_MASTERY_STAGES.length} Completed
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_MASTERY_STAGES.map((stage) => {
                const isChecked = mastery.completedStages.includes(stage.id);
                return (
                  <button
                    key={stage.id}
                    onClick={() => toggleMasteryStage(topic.id, stage.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                      isChecked
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-medium">{stage.label}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        isChecked
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtopics Checklist if available */}
          {topic.subtopics && topic.subtopics.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Syllabus Subtopics ({topic.subtopics.length})
              </label>
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                {topic.subtopics.map((sub, idx) => (
                  <div key={sub.id || idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{sub.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Logs: Study Time & Questions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Log Study Time */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Log Study Session
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="15"
                  placeholder="Minutes"
                  value={loggedMinutes || ''}
                  onChange={(e) => setLoggedMinutes(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleLogStudyTime}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                >
                  Log
                </button>
              </div>
            </div>

            {/* Log Question Practice */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Log Question Practice
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Solved"
                  value={solvedCount || ''}
                  onChange={(e) => setSolvedCount(Number(e.target.value))}
                  className="w-1/2 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Correct"
                  value={correctCount || ''}
                  onChange={(e) => setCorrectCount(Number(e.target.value))}
                  className="w-1/2 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleLogQuestions}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  Save
                </button>
              </div>
              <div className="text-[11px] text-slate-500">
                Current: {mastery.questionsSolved} solved ({mastery.questionsCorrect} correct)
              </div>
            </div>
          </div>

          {/* Student Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Personal Notes & Mistake Reminders</span>
              <button
                onClick={handleSaveNotes}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Edit3 className="w-3 h-3" />
                Save Notes
              </button>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record tricky derivations, important formula variations, textbook page references, or frequent mistakes..."
              className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
