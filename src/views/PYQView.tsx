import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { PYQRecord } from '../types/index.ts';
import {
  HelpCircle,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Plus,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';

export const PYQView: React.FC = () => {
  const { pyqs, activeSyllabus, updatePYQAttempt, addPYQ } = useApp();

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState(activeSyllabus.subjects[0]?.id || 'physics');
  const [newChapterId, setNewChapterId] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newMarks, setNewMarks] = useState(4);
  const [newYear, setNewYear] = useState('2024');
  const [newSource, setNewSource] = useState('RBSE Board Paper');
  const [newSolution, setNewSolution] = useState('');
  const [newVerification, setNewVerification] = useState<PYQRecord['verificationStatus']>('verified_rbse');

  const filteredPYQs = pyqs.filter((q) => {
    if (selectedSubject !== 'all' && q.subjectId !== selectedSubject) return false;
    if (selectedYear !== 'all' && q.examYear !== selectedYear) return false;
    if (selectedStatus !== 'all' && q.attemptStatus !== selectedStatus) return false;
    if (
      searchQuery &&
      !q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !q.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const attemptedCount = pyqs.filter((q) => q.attemptStatus !== 'unattempted').length;
  const correctCount = pyqs.filter((q) => q.attemptStatus === 'correct').length;
  const accuracyPct = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

  const toggleSolution = (id: string) => {
    setRevealedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const sub = activeSyllabus.subjects.find((s) => s.id === newSubjectId);
    const ch = sub?.units.flatMap((u) => u.chapters).find((c) => c.id === newChapterId);

    addPYQ({
      subjectId: newSubjectId,
      subjectName: sub?.name || 'Subject',
      chapterId: newChapterId || 'ch-gen',
      chapterTitle: ch?.title || 'General Chapter',
      questionText: newQuestionText,
      marks: newMarks,
      examYear: newYear,
      source: newSource,
      verificationStatus: newVerification,
      attemptStatus: 'unattempted',
      solution: newSolution,
    });

    setShowAddModal(false);
    setNewQuestionText('');
    setNewSolution('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            Verified RBSE Previous Year Questions (PYQs)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Authentic board examination questions categorized by official chapter weightage, marking scheme, and verified year of examination.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition active:scale-95 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Question / Upload Paper
        </button>
      </div>

      {/* Accuracy & Attempt Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Total PYQs Bank</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {pyqs.length} <span className="text-xs font-normal text-slate-400">Questions</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Questions Attempted</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {attemptedCount} <span className="text-xs font-normal text-slate-400">/ {pyqs.length}</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Board Accuracy</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {accuracyPct}% <span className="text-xs font-normal text-slate-400">({correctCount} correct)</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium"
        >
          <option value="all">All Subjects</option>
          {activeSyllabus.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium"
        >
          <option value="all">All Board Exam Years</option>
          <option value="2024">2024 Examination</option>
          <option value="2023">2023 Examination</option>
          <option value="2022">2022 Examination</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="unattempted">Unattempted</option>
          <option value="correct">Solved Correctly</option>
          <option value="incorrect">Incorrect</option>
          <option value="needs_practice">Needs Practice</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredPYQs.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            No questions match current filters.
          </div>
        ) : (
          filteredPYQs.map((q) => {
            const isRevealed = revealedSolutions[q.id];

            return (
              <div
                key={q.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      {q.subjectName}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {q.chapterTitle}
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      [{q.marks} Marks]
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        q.verificationStatus === 'verified_rbse'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {q.verificationStatus === 'verified_rbse'
                        ? 'Verified RBSE PYQ'
                        : 'Uploaded — Verification Pending'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {q.examYear}
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                  {q.questionText}
                </p>

                <div className="text-[11px] text-slate-400">Source: {q.source}</div>

                {/* Solution Accordion */}
                {q.solution && (
                  <div>
                    <button
                      onClick={() => toggleSolution(q.id)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 py-1"
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {isRevealed ? 'Hide Model Answer' : 'Show Model Answer & Step Marking'}
                    </button>
                    {isRevealed && (
                      <div className="mt-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed animate-in fade-in">
                        <div className="font-bold text-[11px] text-blue-700 dark:text-blue-300 mb-1">
                          Official RBSE Marking Scheme Guidance:
                        </div>
                        {q.solution}
                      </div>
                    )}
                  </div>
                )}

                {/* Attempt Status Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Your Attempt:</span>
                    <span
                      className={`font-bold ${
                        q.attemptStatus === 'correct'
                          ? 'text-emerald-600'
                          : q.attemptStatus === 'incorrect'
                          ? 'text-rose-600'
                          : q.attemptStatus === 'needs_practice'
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {q.attemptStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updatePYQAttempt(q.id, 'correct')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        q.attemptStatus === 'correct'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950'
                      }`}
                    >
                      Correct
                    </button>
                    <button
                      onClick={() => updatePYQAttempt(q.id, 'incorrect')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        q.attemptStatus === 'incorrect'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950'
                      }`}
                    >
                      Incorrect
                    </button>
                    <button
                      onClick={() => updatePYQAttempt(q.id, 'needs_practice')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        q.attemptStatus === 'needs_practice'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950'
                      }`}
                    >
                      Re-Practice
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom / Uploaded Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddQuestion}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add Board Question / Upload Practice Problem
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
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
                <label className="font-semibold text-slate-700 dark:text-slate-300">Marks</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={newMarks}
                  onChange={(e) => setNewMarks(Number(e.target.value))}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Question Text</label>
              <textarea
                rows={3}
                required
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Paste verbatim question statement..."
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Exam Year</label>
                <input
                  type="text"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="e.g. 2024, 2023"
                  className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Provenance Status</label>
                <select
                  value={newVerification}
                  onChange={(e) => setNewVerification(e.target.value as any)}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="verified_rbse">Verified RBSE PYQ</option>
                  <option value="uploaded_pending">Uploaded — Verification Pending</option>
                  <option value="student_custom">Student Custom Problem</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Source Document Citation
              </label>
              <input
                type="text"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="e.g. RBSE Annual Board Examination Paper Code 12-PHY-Set-1"
                className="mt-1 w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Model Solution & Marking Steps (Optional)
              </label>
              <textarea
                rows={3}
                value={newSolution}
                onChange={(e) => setNewSolution(e.target.value)}
                placeholder="Step-by-step marking scheme..."
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Save to PYQ Bank
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
