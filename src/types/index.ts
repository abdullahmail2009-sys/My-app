export type VerificationStatus = 'verified_rbse' | 'provisional' | 'user_defined' | 'ai_extracted';

export type MasteryStage =
  | 'theory'
  | 'notes'
  | 'formula_sheet'
  | 'ncert_exercises'
  | 'pyqs'
  | 'revision_1'
  | 'revision_2'
  | 'revision_3'
  | 'test_completed';

export const ALL_MASTERY_STAGES: { id: MasteryStage; label: string; shortLabel: string; applicableSubjects?: string[] }[] = [
  { id: 'theory', label: 'Theory / Lecture Completed', shortLabel: 'Theory' },
  { id: 'notes', label: 'Handwritten Notes Prepared', shortLabel: 'Notes' },
  { id: 'formula_sheet', label: 'Formula / Derivation Sheet', shortLabel: 'Formulas', applicableSubjects: ['physics', 'chemistry', 'mathematics'] },
  { id: 'ncert_exercises', label: 'Textbook / NCERT Exercises', shortLabel: 'NCERT' },
  { id: 'pyqs', label: 'Board PYQs Solved', shortLabel: 'PYQs' },
  { id: 'revision_1', label: 'Revision 1 (Day 1-3)', shortLabel: 'Rev 1' },
  { id: 'revision_2', label: 'Revision 2 (Day 7)', shortLabel: 'Rev 2' },
  { id: 'revision_3', label: 'Revision 3 (Day 15-21)', shortLabel: 'Rev 3' },
  { id: 'test_completed', label: 'Topic / Chapter Test', shortLabel: 'Test' },
];

export type TopicStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Needs Revision'
  | 'Weak Topic'
  | 'Practice Pending'
  | 'Test Pending';

export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;

export type ConfidenceBand = 'Weak' | 'Needs Practice' | 'Exam Ready';

export function getConfidenceBand(rating: number): ConfidenceBand {
  if (rating <= 2) return 'Weak';
  if (rating <= 3.5) return 'Needs Practice';
  return 'Exam Ready';
}

export interface Subtopic {
  id: string;
  title: string;
  completed?: boolean;
}

export interface Topic {
  id: string;
  chapterId: string;
  unitId: string;
  subjectId: string;
  title: string;
  code?: string;
  subtopics: Subtopic[];
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  estimatedHours: number;
  prerequisites?: string[]; // IDs of prerequisite topics
  isArchived?: boolean;
  isExcluded?: boolean;
  exclusionReason?: string;
  exclusionSource?: string;
}

export interface Chapter {
  id: string;
  unitId: string;
  subjectId: string;
  number: number;
  title: string;
  officialWeightageMarks?: number;
  isWeightageEstimated?: boolean;
  topics: Topic[];
  isArchived?: boolean;
  isExcluded?: boolean;
  exclusionReason?: string;
  exclusionSource?: string;
}

export interface Unit {
  id: string;
  subjectId: string;
  number: number;
  title: string;
  officialMarks?: number;
  chapters: Chapter[];
  isArchived?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
  units: Unit[];
  isCustom?: boolean;
}

export interface SyllabusVersion {
  id: string;
  title: string;
  academicSession: string; // "2027-28"
  verificationStatus: VerificationStatus;
  statusLabel: string;
  officialSourceUrl: string;
  lastCheckedDate: string;
  publishedDate?: string;
  isActive: boolean;
  subjects: Subject[];
  excludedItems?: {
    id: string;
    subjectId: string;
    subjectName: string;
    itemTitle: string;
    itemType: 'chapter' | 'topic';
    reason: string;
    source: string;
  }[];
}

export interface TopicMasteryState {
  topicId: string;
  chapterId: string;
  subjectId: string;
  status: TopicStatus;
  confidence: ConfidenceRating;
  completedStages: MasteryStage[];
  customStagesConfig?: MasteryStage[];
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  totalStudyMinutes: number;
  questionsSolved: number;
  questionsCorrect: number;
  notes?: string;
  startDate?: string;
  completedDate?: string;
  targetDate?: string;
  lastStudiedDate?: string;
  updatedAt: string;
}

export interface SpacedRevisionTask {
  id: string;
  topicId: string;
  chapterId: string;
  subjectId: string;
  topicTitle: string;
  subjectName: string;
  revisionStep: 1 | 2 | 3 | 4;
  scheduledDate: string; // YYYY-MM-DD
  completed: boolean;
  completedDate?: string;
  confidenceScore?: ConfidenceRating;
  recallAccuracy?: 'High' | 'Medium' | 'Low';
  notes?: string;
}

export interface DailyStudyTask {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  topicId: string;
  topicTitle: string;
  taskType: 'theory' | 'notes' | 'numericals' | 'ncert' | 'pyq' | 'revision' | 'test';
  plannedMinutes: number;
  actualMinutes: number;
  priority: 'high' | 'medium' | 'low';
  energySlot: 'morning_high' | 'afternoon_medium' | 'evening_high' | 'night_review';
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface SubjectResource {
  id: string;
  subjectId: string;
  chapterId: string;
  topicId?: string;
  type: 'formula' | 'derivation' | 'reaction' | 'mistake' | 'note' | 'link' | 'attachment';
  title: string;
  content: string;
  // Specific fields
  symbolsAndUnits?: { symbol: string; name: string; siUnit: string; dimensions?: string }[];
  reactionDetails?: { type: 'physical' | 'organic' | 'inorganic'; reagents: string; conditions: string; mechanismNotes?: string };
  mistakeDetails?: { incorrectAttempt: string; correctConcept: string; whyMade: string; testId?: string };
  mathExerciseDetails?: { exerciseNo: string; questionNo: string; status: 'solved' | 'unsolved' | 'incorrect' | 'repeated' };
  attachmentUrl?: string;
  createdAt: string;
}

export interface MockTestRecord {
  id: string;
  testName: string;
  date: string;
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  marksObtained: number;
  timeTakenMinutes: number;
  chapterPerformance: {
    chapterId: string;
    chapterTitle: string;
    marksScored: number;
    maxMarks: number;
    errorsCount: number;
    flaggedWeakness?: boolean;
  }[];
  mistakes: {
    id: string;
    chapterId: string;
    topicId?: string;
    questionReference: string;
    description: string;
    confidenceImpact: number; // e.g., -1
  }[];
  notes?: string;
}

export interface PYQRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  topicId?: string;
  questionText: string;
  marks: number;
  examYear: string; // e.g., "2024", "2023", "2022"
  source: string; // e.g., "RBSE Annual Board Examination Paper Code 12-PHY-A"
  verificationStatus: 'verified_rbse' | 'uploaded_pending' | 'ai_practice' | 'student_custom';
  attemptStatus: 'unattempted' | 'correct' | 'incorrect' | 'needs_practice';
  solution?: string;
  notes?: string;
}

export interface MilestoneItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD or empty
  targetMonth?: string; // e.g., "Last week of July", "January"
  academicYear?: string; // e.g., "2027-28" or "2028"
  dateStatus?: 'target' | 'tentative' | 'verified'; // "Personal Target", "Tentative", "Officially Verified"
  subjects: string[];
  targetPercentage?: number;
  isBoardExam?: boolean;
  isCompleted?: boolean;
  isArchived?: boolean;
  notes?: string;
}

export interface UserPreferences {
  targetSession: string; // "2027–28"
  targetYear?: string; // e.g., "2028"
  examTargetDate: string; // "2028-03-01"
  dailyStudyHoursLimit: number; // e.g., 6 hours
  sessionDurationMinutes?: number; // e.g., 60 mins
  dailyBreakMinutes?: number; // e.g., 15 mins
  preferredHighEnergySlot: 'morning' | 'afternoon' | 'evening' | 'night';
  revisionScheduleType: 'default' | 'advanced';
  revisionIntervals?: number[]; // [1, 3, 7, 21, 60]
  autoRescheduleOverdueRevisions?: boolean;
  weakConfidenceThreshold?: number; // default 2
  masteryConfidenceThreshold?: number; // default 4
  requiredCompletionStages?: string[];
  autoReschedulePlannerTasks?: boolean;
  prioritizeWeakHighYield?: boolean;
  enableStudyReminders?: boolean;
  reminderSound?: boolean;
  subjectPriorities: Record<string, 'high' | 'medium' | 'low'>;
  subjectEstimatedMarks?: Record<string, number>;
  dashboardCards?: {
    showCountdown?: boolean;
    showRawCompletion?: boolean;
    showWeightedCoverage?: boolean;
    showChaptersStatus?: boolean;
    showRevisionsDue?: boolean;
    showRequiredPace?: boolean;
    showSubjectPriorities?: boolean;
    showTodayTasks?: boolean;
    showWeakTopics?: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  fontSize?: 'compact' | 'normal' | 'comfortable';
  pdfAutoDetectUnits?: boolean;
  pdfDefaultEstimatedHours?: number;
  pdfDefaultDifficulty?: 'Easy' | 'Moderate' | 'Hard';
  aiAssistantEnabled?: boolean;
  aiStrictLocalOnly?: boolean;
}

export interface ProgressSummary {
  totalChapters: number;
  completedChapters: number;
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  weakTopics: number;
  rawCoveragePercentage: number;
  overallCoveragePercentage: number;
  masteryPercentage: number;
  revisionPercentage: number;
  questionAccuracyPercentage: number;
  subjectBreakdown: {
    subjectId: string;
    subjectName: string;
    color: string;
    totalTopics: number;
    completedTopics: number;
    rawCoveragePercentage: number;
    coveragePercentage: number;
    masteryPercentage: number;
    totalMarksWeightage: number;
    completedMarksWeightage: number;
    weakTopicsCount: number;
    priority: 'high' | 'medium' | 'low';
  }[];
}
