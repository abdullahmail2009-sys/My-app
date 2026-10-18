import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { DailyStudyTask } from '../types/index.ts';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Trash2,
  Zap,
  Sparkles,
  AlertCircle,
  Sun,
  Moon,
  Sunset,
} from 'lucide-react';

export const StudyPlannerView: React.FC = () => {
  const {
    activeSyllabus,
    studyTasks,
    addStudyTask,
    toggleStudyTask,
    deleteStudyTask,
    preferences,
    updatePreferences,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState(activeSyllabus.subjects[0]?.id || 'physics');
  const [newChapterId, setNewChapterId] = useState('');
  const [newTopicId, setNewTopicId] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<DailyStudyTask['taskType']>('theory');
  const [newPlannedMinutes, setNewPlannedMinutes] = useState(60);
  const [newEnergySlot, setNewEnergySlot] = useState<DailyStudyTask['energySlot']>('morning_high');
  const [newPriority, setNewPriority] = useState<DailyStudyTask['priority']>('high');
  const [newNotes, setNewNotes] = useState('');

  const currentSubject = activeSyllabus.subjects.find((s) => s.id === newSubjectId);
  const allChapters = currentSubject?.units.flatMap((u) => u.chapters) || [];
  const currentChapter = allChapters.find((c) => c.id === newChapterId);

  // Filter tasks for selected date
  const dateTasks = studyTasks.filter((t) => t.date === selectedDate);
  const totalPlannedMinutes = dateTasks.reduce((acc, t) => acc + t.plannedMinutes, 0);
  const dailyHoursLimit = preferences.dailyStudyHoursLimit;
  const isOverLimit = totalPlannedMinutes > dailyHoursLimit * 60;

  const handleAutoGeneratePlan = () => {
    // Collect uncompleted high priority topics across active subjects
    let addedCount = 0;
    activeSyllabus.subjects.forEach((sub) => {
      if (addedCount >= 3) return;
      sub.units.forEach((u) => {
        u.chapters.forEach((c) => {
          if (c.isArchived || c.isExcluded || addedCount >= 3) return;
          c.topics.forEach((t) => {
            if (t.isArchived || t.isExcluded || addedCount >= 3) return;
            // Check if already in tasks for today
            const alreadyScheduled = studyTasks.some((st) => st.date === selectedDate && st.topicId === t.id);
            if (!alreadyScheduled) {
              addStudyTask({
                date: selectedDate,
                subjectId: sub.id,
                subjectName: sub.name,
                chapterId: c.id,
                chapterTitle: c.title,
                topicId: t.id,
                topicTitle: t.title,
                taskType: sub.id === 'physics' ? 'numericals' : sub.id === 'chemistry' ? 'ncert' : 'theory',
                plannedMinutes: 60,
                actualMinutes: 0,
                priority: 'high',
                energySlot: addedCount === 0 ? 'morning_high' : addedCount === 1 ? 'evening_high' : 'night_review',
                completed: false,
                notes: 'Auto-scheduled high priority focus session',
              });
              addedCount++;
            }
          });
        });
      });
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    addStudyTask({
      date: selectedDate,
      subjectId: newSubjectId,
      subjectName: currentSubject?.name || 'Subject',
      chapterId: newChapterId || 'custom-ch',
      chapterTitle: currentChapter?.title || 'General Chapter',
      topicId: newTopicId || `custom-${Date.now()}`,
      topicTitle: newTopicTitle,
      taskType: newTaskType,
      plannedMinutes: newPlannedMinutes,
      actualMinutes: 0,
      priority: newPriority,
      energySlot: newEnergySlot,
      completed: false,
      notes: newNotes,
    });

    setShowAddModal(false);
    setNewTopicTitle('');
    setNewNotes('');
  };

  const energySlots = [
    { id: 'morning_high', label: 'Morning High-Focus', icon: Sun, color: 'text-amber-500' },
    { id: 'afternoon_medium', label: 'Afternoon Practice', icon: Sun, color: 'text-orange-500' },
    { id: 'evening_high', label: 'Evening Problem Solving', icon: Sunset, color: 'text-indigo-500' },
    { id: 'night_review', label: 'Night Quick Review', icon: Moon, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Planner Header & Daily Controls */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Automatic Daily Study Planner
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedules demanding derivations & numericals during high-energy slots; light revisions during lower-energy windows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAutoGeneratePlan}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Auto-Generate Plan
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Date Picker Bar & Daily Hour Limit */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Selected Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
          />
          {selectedDate === todayStr && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500">Planned Today: </span>
            <span className={`font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
              {(totalPlannedMinutes / 60).toFixed(1)} hrs
            </span>
            <span className="text-slate-400"> / {dailyHoursLimit}h max</span>
          </div>
          {isOverLimit && (
            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5" /> Exceeds daily study limit!
            </span>
          )}
        </div>
      </div>

      {/* Tasks Organized by Energy Slots */}
      <div className="space-y-4">
        {energySlots.map((slot) => {
          const slotTasks = dateTasks.filter((t) => t.energySlot === slot.id);
          const SlotIcon = slot.icon;

          return (
            <div
              key={slot.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <SlotIcon className={`w-4 h-4 ${slot.color}`} />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {slot.label}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  {slotTasks.length} Task{slotTasks.length !== 1 ? 's' : ''}
                </span>
              </div>

              {slotTasks.length === 0 ? (
                <div className="text-xs text-slate-400 py-2 italic">
                  No tasks assigned to this slot yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {slotTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        task.completed
                          ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 shadow-2xs'
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
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className={task.completed ? 'line-through text-slate-400' : ''}>
                              {task.topicTitle}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {task.subjectName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {task.taskType.toUpperCase()} • Planned: {task.plannedMinutes}m
                            {task.notes && ` • Notes: ${task.notes}`}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteStudyTask(task.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add New Daily Study Task
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                <select
                  value={newSubjectId}
                  onChange={(e) => {
                    setNewSubjectId(e.target.value);
                    setNewChapterId('');
                  }}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {activeSyllabus.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Chapter</label>
                <select
                  value={newChapterId}
                  onChange={(e) => setNewChapterId(e.target.value)}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">Select Chapter (Optional)</option>
                  {allChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Topic or Task Goal
              </label>
              <input
                type="text"
                required
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="e.g. Derive Lens Maker's formula and solve 5 numericals"
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Task Type</label>
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value as any)}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="theory">Theory Lecture</option>
                  <option value="notes">Notes Making</option>
                  <option value="numericals">Numericals</option>
                  <option value="ncert">NCERT Exercises</option>
                  <option value="pyq">Board PYQs</option>
                  <option value="revision">Revision</option>
                  <option value="test">Mock Test</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Energy Window</label>
                <select
                  value={newEnergySlot}
                  onChange={(e) => setNewEnergySlot(e.target.value as any)}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="morning_high">Morning High</option>
                  <option value="afternoon_medium">Afternoon Medium</option>
                  <option value="evening_high">Evening High</option>
                  <option value="night_review">Night Review</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Duration (min)</label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={newPlannedMinutes}
                  onChange={(e) => setNewPlannedMinutes(Number(e.target.value))}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Notes (Optional)</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Specific problem numbers, textbook pages..."
                className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                Schedule Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
