import React, { useState } from 'react';
import { Sparkles, X, BookOpen, HelpCircle, Check, Loader2, AlertCircle } from 'lucide-react';

interface AITutorModalProps {
  initialTopic?: string;
  initialChapter?: string;
  initialSubject?: string;
  onClose: () => void;
}

export const AITutorModal: React.FC<AITutorModalProps> = ({
  initialTopic = '',
  initialChapter = '',
  initialSubject = 'Physics',
  onClose,
}) => {
  const [mode, setMode] = useState<'explain' | 'quiz' | 'mistake'>('explain');
  const [subject, setSubject] = useState(initialSubject);
  const [chapter, setChapter] = useState(initialChapter);
  const [topic, setTopic] = useState(initialTopic);
  const [userQuery, setUserQuery] = useState('');
  const [studentAttempt, setStudentAttempt] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [explanationResult, setExplanationResult] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [diagnosisResult, setDiagnosisResult] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const handleExplain = async () => {
    if (!topic.trim()) {
      setError('Please provide a topic name to explain.');
      return;
    }
    setError(null);
    setLoading(true);
    setExplanationResult(null);

    try {
      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topic,
          chapterTitle: chapter,
          subjectName: subject,
          userQuery,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate explanation');
      }
      setExplanationResult(data.explanation);
    } catch (err: any) {
      setError(err.message || 'An error occurred while contacting AI Tutor.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!chapter.trim()) {
      setError('Please provide a chapter name for the practice quiz.');
      return;
    }
    setError(null);
    setLoading(true);
    setQuizQuestions([]);
    setRevealedAnswers({});

    try {
      const res = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterTitle: chapter,
          subjectName: subject,
          topicTitle: topic,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }
      setQuizQuestions(data.questions || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnoseMistake = async () => {
    if (!userQuery.trim()) {
      setError('Please describe the error or problem where you made a mistake.');
      return;
    }
    setError(null);
    setLoading(true);
    setDiagnosisResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-mistake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          chapter,
          mistakeDescription: userQuery,
          studentAttempt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze mistake');
      }
      setDiagnosisResult(data.diagnosis);
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing mistake.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/40 dark:bg-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                RBSE AI Tutor & Practice Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grounded in official RBSE Class 12 session 2027–28 syllabus boundaries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close AI Tutor"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-1">
          <button
            onClick={() => setMode('explain')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              mode === 'explain'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Explain Topic
          </button>
          <button
            onClick={() => setMode('quiz')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              mode === 'quiz'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Generate Quiz (1/2/4 M)
          </button>
          <button
            onClick={() => setMode('mistake')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              mode === 'mistake'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Diagnose Mistake
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Input fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Physics / Chemistry / Math"
                className="mt-1 w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Chapter</label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. Electric Charges"
                className="mt-1 w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Gauss's Law"
                className="mt-1 w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {mode === 'explain' && (
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Specific question or area of doubt (Optional)
              </label>
              <textarea
                rows={2}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="e.g., Explain derivation of electric field due to infinite wire with step-by-step marking tips..."
                className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                onClick={handleExplain}
                disabled={loading}
                className="mt-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate RBSE Explanation
              </button>
            </div>
          )}

          {mode === 'quiz' && (
            <div>
              <p className="text-slate-500 mb-2">
                Generates 3 board-formatted practice questions (1 mark objective, 2 mark conceptual/numerical, 4 mark derivation) strictly matching RBSE Class 12 blueprint.
              </p>
              <button
                onClick={handleGenerateQuiz}
                disabled={loading}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
                Generate 3 Board Practice Questions
              </button>
            </div>
          )}

          {mode === 'mistake' && (
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  What question or calculation went wrong?
                </label>
                <textarea
                  rows={2}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="e.g. Lost 2 marks on calculating EMF from Nernst equation because of log concentration sign..."
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Your attempt or thoughts (Optional)
                </label>
                <input
                  type="text"
                  value={studentAttempt}
                  onChange={(e) => setStudentAttempt(e.target.value)}
                  placeholder="e.g. I put anode concentration in denominator instead of numerator"
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleDiagnoseMistake}
                disabled={loading}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                Diagnose Conceptual Root Cause
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {explanationResult && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="font-bold text-slate-900 dark:text-white">Explanation</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  AI Guidance
                </span>
              </div>
              <div className="prose dark:prose-invert text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                {explanationResult}
              </div>
            </div>
          )}

          {quizQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="font-bold text-slate-900 dark:text-white">Generated Board Practice Questions</div>
              {quizQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      Q{idx + 1} ({q.marks} Mark{q.marks > 1 ? 's' : ''})
                    </span>
                    <button
                      onClick={() =>
                        setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }))
                      }
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      {revealedAnswers[idx] ? 'Hide Answer' : 'Show Model Answer'}
                    </button>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {q.question}
                  </div>
                  {revealedAnswers[idx] && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 space-y-1 animate-in fade-in">
                      <div className="font-bold text-[11px] text-emerald-800 dark:text-emerald-300">Step-by-Step Marking Scheme Answer:</div>
                      <div className="whitespace-pre-line">{q.modelAnswer}</div>
                      {q.boardTip && (
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 pt-1 italic">
                          Board Exam Tip: {q.boardTip}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {diagnosisResult && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
              <span className="font-bold text-amber-800 dark:text-amber-300">Diagnosis & Rule of Thumb</span>
              <div className="whitespace-pre-line text-xs">{diagnosisResult}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] text-slate-500">
          <span>Official Source: rajeduboard.rajasthan.gov.in</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
