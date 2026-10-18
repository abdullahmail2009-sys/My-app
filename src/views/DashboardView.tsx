import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { calculateBacklogAndPace } from '../utils/backlogCalc.ts';
import {
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CalendarCheck,
  Award,
  Clock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Flame,
  Upload,
} from 'lucide-react';

interface DashboardViewProps {
  setActiveTab: (tab: string) => void;
  onSelectTopic: (topicId: string) => void;
  onOpenAITutor: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onSelectTopic,
  onOpenAITutor,
}) => {
  const {
    progressSummary,
    activeSyllabus,
    masteryMap,
    studyTasks,
    revisionTasks,
    milestones,
    preferences,
    toggleStudyTask,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // Today's study tasks
  const todayStudyTasks = studyTasks.filter((t) => t.date === todayStr);

  // Today's revisions & overdue
  const dueRevisions = revisionTasks.filter((r) => !r.completed && r.scheduledDate <= todayStr);
  const overdueRevisions = revisionTasks.filter((r) => !r.completed && r.scheduledDate < todayStr);

  // Backlog and pace calculation
  const backlogMetrics = calculateBacklogAndPace(
    progressSummary.totalTopics,
    progressSummary.completedTopics,
    preferences.examTargetDate,
    preferences.dailyStudyHoursLimit,
    2.5,
    todayStr
  );

  // High weightage weak topics (>= 4 marks and confidence <= 2 or weak)
  const weakHighYieldTopics: {
    topicId: string;
    topicTitle: string;
    chapterTitle: string;
    subjectName: string;
    marks: number;
    confidence: number;
  }[] = [];

  activeSyllabus.subjects.forEach((sub) => {
    sub.units.forEach((u) => {
      u.chapters.forEach((c) => {
        if (c.isArchived || c.isExcluded) return;
        const chMarks = c.officialWeightageMarks || 0;
        c.topics.forEach((t) => {
          if (t.isArchived || t.isExcluded) return;
          const m = masteryMap[t.id];
          const conf = m ? m.confidence : 3;
          if (conf <= 2 || (m && m.status === 'Weak Topic')) {
            weakHighYieldTopics.push({
              topicId: t.id,
              topicTitle: t.title,
              chapterTitle: c.title,
              subjectName: sub.name,
              marks: chMarks,
              confidence: conf,
            });
          }
        });
      });
    });
  });

  // Calculate upcoming milestone countdown
  const activeMilestones = milestones.filter((m) => !m.isCompleted && !m.isArchived);
  
  // Sort: dated items closest to today first, then undated target periods
  const sortedMilestones = [...activeMilestones].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  const nextMilestone = sortedMilestones[0];

  let daysToNextMilestone: number | null = null;
  let isMilestonePassed = false;

  if (nextMilestone) {
    if (nextMilestone.date) {
      const parts = nextMilestone.date.split('-').map(Number);
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const targetDateObj = new Date(year, month - 1, day);
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        const diffMs = targetDateObj.getTime() - todayObj.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          isMilestonePassed = true;
        } else {
          daysToNextMilestone = diffDays;
        }
      }
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Exam Session Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Target Session {preferences.targetSession || '2027–28'}
              </span>
              <span className="text-xs text-blue-200">RBSE Board Exam Target</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Class 12 Academic Command Center
            </h1>
            <p className="mt-1 text-sm text-blue-100/90 max-w-xl">
              Precision syllabus tracking, spaced repetition heuristics, authentic RBSE PYQs, and dynamic backlog recalculation.
            </p>
          </div>

          {/* Milestone Countdown Box */}
          <div
            onClick={() => setActiveTab('tests')}
            className="flex-shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[220px] cursor-pointer hover:bg-white/15 transition"
            title="Click to view and edit exam milestones"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  nextMilestone?.dateStatus === 'verified'
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                    : nextMilestone?.dateStatus === 'tentative'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                    : 'bg-blue-400/20 text-blue-200 border border-blue-300/30'
                }`}
              >
                {nextMilestone?.dateStatus === 'verified'
                  ? 'Official Date (Verified)'
                  : nextMilestone?.dateStatus === 'tentative'
                  ? 'Tentative Target'
                  : 'Personal Target'}
              </span>
            </div>

            {nextMilestone ? (
              <>
                <div className="text-2xl sm:text-3xl font-black mt-1 text-amber-300">
                  {daysToNextMilestone !== null ? (
                    <>
                      {daysToNextMilestone} <span className="text-sm font-semibold text-white">Days Left</span>
                    </>
                  ) : isMilestonePassed ? (
                    <span className="text-xs font-bold text-rose-300">Date has passed — please update</span>
                  ) : (
                    <span className="text-sm font-bold text-amber-200">Exam date not set</span>
                  )}
                </div>
                <div className="text-xs font-semibold text-white/95 mt-1 truncate max-w-[220px]">
                  {nextMilestone.title}
                </div>
                <div className="text-[11px] text-blue-200 mt-0.5">
                  {nextMilestone.date
                    ? `Target: ${nextMilestone.date}`
                    : nextMilestone.targetMonth
                    ? `Period: ${nextMilestone.targetMonth}`
                    : 'Target date unset'}
                </div>
              </>
            ) : (
              <div className="py-2">
                <div className="text-sm font-semibold text-white">No upcoming targets set</div>
                <div className="text-[11px] text-blue-200 mt-0.5">Click to configure milestones</div>
              </div>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Empty Syllabus Alert Banner if 0 topics entered */}
      {progressSummary.totalTopics === 0 && (
        <div className="p-6 rounded-3xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                0 Topics Entered in Syllabus — Get Started
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Your syllabus is currently empty. Start by importing your official syllabus PDF document or creating your subjects, units, and chapters manually.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveTab('import-syllabus')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import Syllabus PDF
            </button>
            <button
              onClick={() => setActiveTab('syllabus')}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Enter Manually
            </button>
          </div>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Raw Topic Completion */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Raw Completion</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {progressSummary.rawCoveragePercentage}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {progressSummary.completedTopics} of {progressSummary.totalTopics} topics completed
          </div>
          <div className="mt-3 w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressSummary.rawCoveragePercentage}%` }}
            />
          </div>
        </div>

        {/* Overall Weighted Coverage */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Weighted Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {progressSummary.overallCoveragePercentage}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Weighted by chapter marks
          </div>
          <div className="mt-3 w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progressSummary.overallCoveragePercentage}%` }}
            />
          </div>
        </div>

        {/* Chapters Breakdown */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Chapters Status</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {progressSummary.completedChapters} <span className="text-sm font-semibold text-slate-500">/ {progressSummary.totalChapters}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {progressSummary.totalChapters - progressSummary.completedChapters} chapters remaining
          </div>
          <div className="mt-3 w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${
                  progressSummary.totalChapters > 0
                    ? Math.round((progressSummary.completedChapters / progressSummary.totalChapters) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Spaced Revisions Due */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Revisions Due</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>{dueRevisions.length}</span>
            {overdueRevisions.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {overdueRevisions.length} Overdue
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Spaced repetition heuristic queue
          </div>
          <button
            onClick={() => setActiveTab('revision')}
            className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
          >
            Review Spaced Queue <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Backlog & Required Pace */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Required Pace</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {backlogMetrics.requiredTopicsPerDay} <span className="text-sm font-semibold text-slate-500">topics/day</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ~{backlogMetrics.requiredDailyStudyHours}h daily needed ({backlogMetrics.availableDays} days left)
          </div>
          <div className="mt-2 text-[11px] font-medium flex items-center gap-1">
            {backlogMetrics.isFeasible ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Pace is on schedule
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Deficit detected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subject-Wise Progress Grid */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Subject Progress & Priorities
            </h2>
            <p className="text-xs text-slate-500">
              Configured per RBSE Class 12 board weightage (Theory 56m Physics/Chemistry, 80m Math/English/Hindi)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('import-syllabus')}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Import Syllabus PDF
            </button>
            <button
              onClick={() => setActiveTab('syllabus')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Explore Full Syllabus <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {progressSummary.subjectBreakdown.map((sub) => (
            <div
              key={sub.subjectId}
              className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  {sub.subjectName}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: sub.color }}
                />
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {sub.coveragePercentage}%
                </span>
                <span className="text-[11px] text-slate-500">
                  {sub.completedTopics}/{sub.totalTopics} Topics
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${sub.coveragePercentage}%`,
                    backgroundColor: sub.color,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-slate-500">
                <span>
                  {sub.totalMarksWeightage > 0
                    ? `~${sub.totalMarksWeightage} M (Est.)`
                    : 'Weight unset'}
                </span>
                {sub.weakTopicsCount > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {sub.weakTopicsCount} Weak
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Solid
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Split: Today's Study Tasks vs High-Yield Weak Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Today's Study Plan
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('planner')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Open Daily Planner <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todayStudyTasks.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No tasks scheduled today
              </p>
              <p className="text-xs text-slate-500 mt-1">
                You can auto-generate tasks or schedule study sessions from the Study Planner.
              </p>
              <button
                onClick={() => setActiveTab('planner')}
                className="mt-3 px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                Plan Today's Sessions
              </button>
            </div>
          ) : todayStudyTasks.every((t) => t.completed) ? (
            <div className="py-8 text-center bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-900/40">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                All scheduled tasks completed for today!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                Great job! Completed {todayStudyTasks.length} of {todayStudyTasks.length} planned items.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayStudyTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleStudyTask(task.id)}
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                        task.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                      }`}
                    >
                      {task.completed && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className={task.completed ? 'line-through text-slate-400' : ''}>
                          {task.topicTitle}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {task.subjectName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {task.taskType.toUpperCase()} • Planned: {task.plannedMinutes} mins
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectTopic(task.topicId)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0 font-medium"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High-Yield Weak Topics Alert */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  High-Yield Weak Topics
                </h2>
                <p className="text-[11px] text-slate-500">
                  Priority attention: high verified weightage (&ge; 4 Marks) but low confidence
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              ROI Matrix <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {weakHighYieldTopics.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Award className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {progressSummary.totalTopics === 0
                  ? 'No topics in syllabus yet'
                  : 'No high-yield weaknesses flagged!'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {progressSummary.totalTopics === 0
                  ? 'Import or create topics in your syllabus to begin tracking confidence ratings.'
                  : 'All rated topics currently have confidence rating 3 or above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {weakHighYieldTopics.slice(0, 4).map((item) => (
                <div
                  key={item.topicId}
                  className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold text-rose-950 dark:text-rose-200">
                      {item.topicTitle}
                    </div>
                    <div className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                      {item.subjectName} • {item.chapterTitle} ({item.marks} Marks)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                      Confidence {item.confidence}/5
                    </span>
                    <button
                      onClick={() => onSelectTopic(item.topicId)}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
                    >
                      Revise
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
