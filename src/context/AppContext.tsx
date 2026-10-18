import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  SyllabusVersion,
  Subject,
  Unit,
  Chapter,
  Topic,
  TopicMasteryState,
  SpacedRevisionTask,
  DailyStudyTask,
  SubjectResource,
  MockTestRecord,
  PYQRecord,
  MilestoneItem,
  UserPreferences,
  MasteryStage,
  ConfidenceRating,
  TopicStatus,
  ProgressSummary,
} from '../types/index.ts';
import { OFFICIAL_RBSE_2027_28_SYLLABUS } from '../data/defaultSyllabus.ts';
import {
  DEFAULT_PHYSICS_RESOURCES,
  DEFAULT_CHEMISTRY_RESOURCES,
  DEFAULT_MATH_RESOURCES,
} from '../data/defaultSubjectTools.ts';
import { DEFAULT_PYQS } from '../data/defaultPYQs.ts';
import { calculateOverallProgress } from '../utils/progressCalc.ts';
import { mergeParsedSyllabusIntoActive, ParsedSubjectPreview } from '../utils/pdfSyllabusParser.ts';
import {
  auth,
  db,
  signInWithGoogle as fbSignIn,
  signOutUser as fbSignOut,
  OperationType,
  handleFirestoreError,
} from '../services/firebase.ts';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AppContextType {
  activeSyllabus: SyllabusVersion;
  masteryMap: Record<string, TopicMasteryState>;
  revisionTasks: SpacedRevisionTask[];
  studyTasks: DailyStudyTask[];
  resources: SubjectResource[];
  mockTests: MockTestRecord[];
  pyqs: PYQRecord[];
  milestones: MilestoneItem[];
  preferences: UserPreferences;
  currentUser: FirebaseUser | null;
  syncState: 'synced' | 'syncing' | 'offline_local' | 'error';
  lastSyncTime: string | null;
  progressSummary: ProgressSummary;
  // Actions
  updateTopicMastery: (topicId: string, partial: Partial<TopicMasteryState>) => void;
  bulkUpdateChapterTopics: (chapterId: string, partial: Partial<TopicMasteryState>) => void;
  toggleMasteryStage: (topicId: string, stage: MasteryStage) => void;
  addRevisionTask: (task: SpacedRevisionTask) => void;
  completeRevisionTask: (taskId: string, confidence: ConfidenceRating, recall: 'High' | 'Medium' | 'Low') => void;
  addStudyTask: (task: Omit<DailyStudyTask, 'id'>) => void;
  toggleStudyTask: (taskId: string) => void;
  deleteStudyTask: (taskId: string) => void;
  addResource: (resource: Omit<SubjectResource, 'id' | 'createdAt'>) => void;
  deleteResource: (id: string) => void;
  addMockTest: (test: Omit<MockTestRecord, 'id'>) => void;
  updatePYQAttempt: (id: string, status: 'correct' | 'incorrect' | 'needs_practice') => void;
  addPYQ: (pyq: Omit<PYQRecord, 'id'>) => void;
  addMilestone: (milestone: Omit<MilestoneItem, 'id'>) => void;
  updateMilestone: (id: string, partial: Partial<MilestoneItem>) => void;
  deleteMilestone: (id: string) => void;
  toggleMilestone: (id: string) => void;
  archiveMilestone: (id: string) => void;
  updatePreferences: (partial: Partial<UserPreferences>) => void;
  importSyllabusVersion: (newVersion: SyllabusVersion) => void;
  mergeImportedSyllabus: (parsedSubjects: any[]) => {
    subjects: number;
    units: number;
    chapters: number;
    topics: number;
  };
  clearDefaultSyllabus: () => void;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, partial: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  reorderSubjects: (subjects: Subject[]) => void;
  addUnit: (subjectId: string, unit: Omit<Unit, 'id' | 'subjectId'>) => void;
  updateUnit: (subjectId: string, unitId: string, partial: Partial<Unit>) => void;
  deleteUnit: (subjectId: string, unitId: string) => void;
  addChapter: (subjectId: string, unitId: string, chapter: Omit<Chapter, 'id' | 'unitId' | 'subjectId'>) => void;
  updateChapter: (subjectId: string, unitId: string, chapterId: string, partial: Partial<Chapter>) => void;
  deleteChapter: (subjectId: string, unitId: string, chapterId: string) => void;
  addTopic: (subjectId: string, unitId: string, chapterId: string, topic: Omit<Topic, 'id' | 'chapterId' | 'unitId' | 'subjectId'>) => void;
  updateTopic: (subjectId: string, unitId: string, chapterId: string, topicId: string, partial: Partial<Topic>) => void;
  deleteTopic: (subjectId: string, unitId: string, chapterId: string, topicId: string) => void;
  resetAllData: () => void;
  loginGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  exportJSON: () => void;
  importJSON: (jsonString: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'mystudypath_rbse12_state_v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  targetSession: '2027–28',
  examTargetDate: '2028-03-01',
  dailyStudyHoursLimit: 6,
  preferredHighEnergySlot: 'morning',
  revisionScheduleType: 'default',
  subjectPriorities: {
    physics: 'high',
    chemistry: 'high',
    mathematics: 'high',
    english: 'medium',
    hindi: 'medium',
  },
  theme: 'light',
};

const DEFAULT_MILESTONES: MilestoneItem[] = [
  {
    id: 'mile-half-yearly',
    title: 'Half-Yearly Examination',
    date: '2027-12-10',
    targetMonth: 'December 2027',
    academicYear: '2027–28',
    dateStatus: 'target',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English', 'Hindi'],
    targetPercentage: 85,
    isCompleted: false,
    notes: 'Personal target for school half-yearly exams (date editable)',
  },
  {
    id: 'mile-unit-test-3',
    title: 'Third Unit Test / Third Periodic Test',
    date: '2028-01-14',
    targetMonth: 'January 2028',
    academicYear: '2027–28',
    dateStatus: 'target',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English', 'Hindi'],
    targetPercentage: 90,
    isCompleted: false,
    notes: 'Target date around January 14 (editable periodic test)',
  },
  {
    id: 'mile-jee-main-1',
    title: 'JEE Main Session 1',
    date: '2028-01-21',
    targetMonth: 'January 2028',
    academicYear: '2028',
    dateStatus: 'target',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    targetPercentage: 95,
    isCompleted: false,
    notes: 'National entrance target date around January 21',
  },
  {
    id: 'mile-annual-board',
    title: 'Annual Board Examination',
    date: '2028-02-14',
    targetMonth: 'February 2028',
    academicYear: '2027–28',
    dateStatus: 'target',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English', 'Hindi'],
    targetPercentage: 95,
    isBoardExam: true,
    isCompleted: false,
    notes: 'Target date around February 14 (Personal planning target, not official)',
  },
  {
    id: 'mile-jee-main-2',
    title: 'JEE Main Session 2',
    date: '2028-04-20',
    targetMonth: 'April 2028',
    academicYear: '2028',
    dateStatus: 'target',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    targetPercentage: 95,
    isCompleted: false,
    notes: 'Target date around April 20',
  },
  {
    id: 'mile-jee-advanced',
    title: 'JEE Advanced',
    date: '', // Unset exact calendar date
    targetMonth: 'Last week of July 2028',
    academicYear: '2028',
    dateStatus: 'target',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    targetPercentage: 90,
    isCompleted: false,
    notes: 'Target period: the last week of July (exact date unset)',
  },
];

// Seed starter progress for realistic testability
function getInitialMasteryMap(): Record<string, TopicMasteryState> {
  const map: Record<string, TopicMasteryState> = {};

  // Starter completed topics for Electrostatics
  map['phy-c1-t1'] = {
    topicId: 'phy-c1-t1',
    chapterId: 'phy-c1',
    subjectId: 'physics',
    status: 'Completed',
    confidence: 4,
    completedStages: ['theory', 'notes', 'formula_sheet', 'ncert_exercises', 'pyqs', 'revision_1'],
    difficulty: 'Easy',
    totalStudyMinutes: 90,
    questionsSolved: 15,
    questionsCorrect: 13,
    startDate: '2026-10-10',
    completedDate: '2026-10-12',
    lastStudiedDate: '2026-10-14',
    updatedAt: new Date().toISOString(),
  };

  map['phy-c1-t2'] = {
    topicId: 'phy-c1-t2',
    chapterId: 'phy-c1',
    subjectId: 'physics',
    status: 'Completed',
    confidence: 5,
    completedStages: ['theory', 'notes', 'formula_sheet', 'ncert_exercises', 'pyqs', 'revision_1', 'revision_2'],
    difficulty: 'Moderate',
    totalStudyMinutes: 150,
    questionsSolved: 20,
    questionsCorrect: 19,
    startDate: '2026-10-12',
    completedDate: '2026-10-15',
    lastStudiedDate: '2026-10-16',
    updatedAt: new Date().toISOString(),
  };

  map['phy-c1-t3'] = {
    topicId: 'phy-c1-t3',
    chapterId: 'phy-c1',
    subjectId: 'physics',
    status: 'In Progress',
    confidence: 3,
    completedStages: ['theory', 'notes'],
    difficulty: 'Moderate',
    totalStudyMinutes: 80,
    questionsSolved: 8,
    questionsCorrect: 6,
    startDate: '2026-10-16',
    lastStudiedDate: '2026-10-17',
    updatedAt: new Date().toISOString(),
  };

  map['che-c1-t1'] = {
    topicId: 'che-c1-t1',
    chapterId: 'che-c1',
    subjectId: 'chemistry',
    status: 'Completed',
    confidence: 4,
    completedStages: ['theory', 'notes', 'formula_sheet', 'ncert_exercises', 'pyqs'],
    difficulty: 'Moderate',
    totalStudyMinutes: 110,
    questionsSolved: 14,
    questionsCorrect: 12,
    startDate: '2026-10-11',
    completedDate: '2026-10-14',
    lastStudiedDate: '2026-10-16',
    updatedAt: new Date().toISOString(),
  };

  map['math-c1-t1'] = {
    topicId: 'math-c1-t1',
    chapterId: 'math-c1',
    subjectId: 'mathematics',
    status: 'Completed',
    confidence: 5,
    completedStages: ['theory', 'notes', 'ncert_exercises', 'pyqs', 'revision_1'],
    difficulty: 'Moderate',
    totalStudyMinutes: 120,
    questionsSolved: 25,
    questionsCorrect: 23,
    startDate: '2026-10-09',
    completedDate: '2026-10-13',
    lastStudiedDate: '2026-10-15',
    updatedAt: new Date().toISOString(),
  };

  return map;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline_local' | 'error'>('offline_local');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Core state collections
  const [activeSyllabus, setActiveSyllabus] = useState<SyllabusVersion>(OFFICIAL_RBSE_2027_28_SYLLABUS);
  const [masteryMap, setMasteryMap] = useState<Record<string, TopicMasteryState>>(getInitialMasteryMap);
  const [revisionTasks, setRevisionTasks] = useState<SpacedRevisionTask[]>([
    {
      id: 'rev-seed-1',
      topicId: 'phy-c1-t2',
      chapterId: 'phy-c1',
      subjectId: 'physics',
      topicTitle: "Coulomb's Law & Superposition Principle",
      subjectName: 'Physics',
      revisionStep: 3,
      scheduledDate: new Date().toISOString().split('T')[0], // Due today!
      completed: false,
    },
    {
      id: 'rev-seed-2',
      topicId: 'che-c1-t1',
      chapterId: 'che-c1',
      subjectId: 'chemistry',
      topicTitle: "Henry's Law & Raoult's Law",
      subjectName: 'Chemistry',
      revisionStep: 1,
      scheduledDate: new Date().toISOString().split('T')[0], // Due today!
      completed: false,
    },
  ]);

  const [studyTasks, setStudyTasks] = useState<DailyStudyTask[]>([
    {
      id: 'task-seed-1',
      date: new Date().toISOString().split('T')[0],
      subjectId: 'physics',
      subjectName: 'Physics',
      chapterId: 'phy-c1',
      chapterTitle: 'Electric Charges and Fields',
      topicId: 'phy-c1-t3',
      topicTitle: 'Electric Field Lines & Electric Dipole',
      taskType: 'numericals',
      plannedMinutes: 60,
      actualMinutes: 45,
      priority: 'high',
      energySlot: 'morning_high',
      completed: false,
      notes: 'Solve NCERT Ex 1.8 to 1.12 dipole torque problems',
    },
    {
      id: 'task-seed-2',
      date: new Date().toISOString().split('T')[0],
      subjectId: 'mathematics',
      subjectName: 'Mathematics',
      chapterId: 'math-c1',
      chapterTitle: 'Relations and Functions',
      topicId: 'math-c1-t2',
      topicTitle: 'One-One (Injective) & Onto (Surjective) Functions',
      taskType: 'ncert',
      plannedMinutes: 75,
      actualMinutes: 0,
      priority: 'high',
      energySlot: 'evening_high',
      completed: false,
      notes: 'Practice Ex 1.2 Q1 to Q8 with injectivity proofs',
    },
  ]);

  const [resources, setResources] = useState<SubjectResource[]>([
    ...DEFAULT_PHYSICS_RESOURCES,
    ...DEFAULT_CHEMISTRY_RESOURCES,
    ...DEFAULT_MATH_RESOURCES,
  ]);

  const [mockTests, setMockTests] = useState<MockTestRecord[]>([
    {
      id: 'test-seed-1',
      testName: 'Physics Unit 1 Chapter Test (Electrostatics)',
      date: '2026-10-15',
      subjectId: 'physics',
      subjectName: 'Physics',
      maxMarks: 25,
      marksObtained: 21,
      timeTakenMinutes: 60,
      chapterPerformance: [
        {
          chapterId: 'phy-c1',
          chapterTitle: 'Electric Charges and Fields',
          marksScored: 21,
          maxMarks: 25,
          errorsCount: 1,
          flaggedWeakness: false,
        },
      ],
      mistakes: [
        {
          id: 'mistake-seed-1',
          chapterId: 'phy-c1',
          topicId: 'phy-c1-t3',
          questionReference: 'Q4 (Dipole in uniform field)',
          description: 'Forgot factor of sin(theta) when calculating potential energy U = -p.E',
          confidenceImpact: -1,
        },
      ],
      notes: 'Strong in Gauss Law derivations; need careful vector algebra on dipole torque and potential energy.',
    },
  ]);

  const [pyqs, setPyqs] = useState<PYQRecord[]>(DEFAULT_PYQS);
  const [milestones, setMilestones] = useState<MilestoneItem[]>(DEFAULT_MILESTONES);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  // Load state from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.activeSyllabus) setActiveSyllabus(data.activeSyllabus);
        if (data.masteryMap) setMasteryMap(data.masteryMap);
        if (data.revisionTasks) setRevisionTasks(data.revisionTasks);
        if (data.studyTasks) setStudyTasks(data.studyTasks);
        if (data.resources) setResources(data.resources);
        if (data.mockTests) setMockTests(data.mockTests);
        if (data.pyqs) setPyqs(data.pyqs);
        if (data.milestones) {
          const hasStaleMilestone = Array.isArray(data.milestones) && data.milestones.some(
            (m: any) => m.id === 'mile-1' && m.date === '2027-09-20'
          );
          if (hasStaleMilestone || data.milestones.length === 0) {
            setMilestones(DEFAULT_MILESTONES);
          } else {
            setMilestones(data.milestones);
          }
        }
        if (data.preferences) setPreferences(data.preferences);
        if (data.lastSyncTime) setLastSyncTime(data.lastSyncTime);
      }
    } catch (e) {
      console.warn('Could not read from local storage:', e);
    }
  }, []);

  // Save to LocalStorage whenever key state changes
  useEffect(() => {
    try {
      const payload = {
        activeSyllabus,
        masteryMap,
        revisionTasks,
        studyTasks,
        resources,
        mockTests,
        pyqs,
        milestones,
        preferences,
        lastSyncTime,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to write to local storage:', e);
    }
  }, [activeSyllabus, masteryMap, revisionTasks, studyTasks, resources, mockTests, pyqs, milestones, preferences, lastSyncTime]);

  // Auth listener & Firestore synchronization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setSyncState('syncing');
        try {
          const userDocRef = doc(db, 'users', user.uid);
          let snap;
          try {
            snap = await getDoc(userDocRef);
          } catch (getErr: any) {
            if (getErr?.code === 'permission-denied' || getErr?.message?.includes('permission')) {
              handleFirestoreError(getErr, OperationType.GET, `users/${user.uid}`);
            }
            throw getErr;
          }

          if (snap && snap.exists()) {
            const cloudData = snap.data();
            if (cloudData.masteryMap) setMasteryMap((prev) => ({ ...prev, ...cloudData.masteryMap }));
            if (cloudData.preferences) setPreferences((prev) => ({ ...prev, ...cloudData.preferences }));
          } else {
            // First time sync to Firestore
            try {
              await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                academicSession: '2027-28',
                examTargetDate: '2028-03-01',
                dailyTargetHours: 6,
                revisionScheduleType: 'default',
                highEnergyTime: 'morning',
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            } catch (setErr: any) {
              if (setErr?.code === 'permission-denied' || setErr?.message?.includes('permission')) {
                handleFirestoreError(setErr, OperationType.WRITE, `users/${user.uid}`);
              }
              throw setErr;
            }
          }
          const nowStr = new Date().toLocaleTimeString();
          setLastSyncTime(nowStr);
          setSyncState('synced');
        } catch (err) {
          console.error('Firestore sync error:', err);
          setSyncState('offline_local');
        }
      } else {
        setSyncState('offline_local');
      }
    });

    return () => unsubscribe();
  }, []);

  // Debounced cloud synchronization when logged in
  useEffect(() => {
    if (!currentUser || syncState === 'offline_local' && !lastSyncTime) return;
    const timer = setTimeout(async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(
          userDocRef,
          {
            masteryMap,
            preferences,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        setLastSyncTime(new Date().toLocaleTimeString());
        setSyncState('synced');
      } catch (err: any) {
        console.warn('Background Firestore sync paused, local changes safe:', err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentUser, masteryMap, preferences, lastSyncTime, syncState]);

  // Calculate overall progress summary using reactive data
  const progressSummary = useMemo(() => {
    return calculateOverallProgress(activeSyllabus.subjects, masteryMap);
  }, [activeSyllabus, masteryMap]);

  // Actions
  const updateTopicMastery = useCallback((topicId: string, partial: Partial<TopicMasteryState>) => {
    setMasteryMap((prev) => {
      const existing = prev[topicId] || {
        topicId,
        chapterId: '',
        subjectId: '',
        status: 'Not Started',
        confidence: 3,
        completedStages: [],
        difficulty: 'Moderate',
        totalStudyMinutes: 0,
        questionsSolved: 0,
        questionsCorrect: 0,
        updatedAt: new Date().toISOString(),
      };
      const updated: TopicMasteryState = {
        ...existing,
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      return { ...prev, [topicId]: updated };
    });
  }, []);

  const bulkUpdateChapterTopics = useCallback((chapterId: string, partial: Partial<TopicMasteryState>) => {
    setMasteryMap((prev) => {
      const next = { ...prev };
      activeSyllabus.subjects.forEach((sub) => {
        sub.units.forEach((u) => {
          u.chapters.forEach((c) => {
            if (c.id === chapterId) {
              c.topics.forEach((t) => {
                const existing = next[t.id] || {
                  topicId: t.id,
                  chapterId: c.id,
                  subjectId: sub.id,
                  status: 'Not Started',
                  confidence: 3,
                  completedStages: [],
                  difficulty: t.difficulty,
                  totalStudyMinutes: 0,
                  questionsSolved: 0,
                  questionsCorrect: 0,
                  updatedAt: new Date().toISOString(),
                };
                next[t.id] = { ...existing, ...partial, updatedAt: new Date().toISOString() };
              });
            }
          });
        });
      });
      return next;
    });
  }, [activeSyllabus]);

  const toggleMasteryStage = useCallback((topicId: string, stage: MasteryStage) => {
    setMasteryMap((prev) => {
      const existing = prev[topicId] || {
        topicId,
        chapterId: '',
        subjectId: '',
        status: 'In Progress',
        confidence: 3,
        completedStages: [],
        difficulty: 'Moderate',
        totalStudyMinutes: 0,
        questionsSolved: 0,
        questionsCorrect: 0,
        updatedAt: new Date().toISOString(),
      };

      const hasStage = existing.completedStages.includes(stage);
      const newStages = hasStage
        ? existing.completedStages.filter((s) => s !== stage)
        : [...existing.completedStages, stage];

      let newStatus = existing.status;
      if (newStages.includes('theory') && newStages.includes('notes') && (newStages.includes('pyqs') || newStages.includes('ncert_exercises'))) {
        newStatus = 'Completed';
      } else if (newStages.length > 0 && newStatus === 'Not Started') {
        newStatus = 'In Progress';
      }

      return {
        ...prev,
        [topicId]: {
          ...existing,
          completedStages: newStages,
          status: newStatus,
          lastStudiedDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const addRevisionTask = useCallback((task: SpacedRevisionTask) => {
    setRevisionTasks((prev) => {
      // Replace existing step for topic or append
      const filtered = prev.filter(
        (t) => !(t.topicId === task.topicId && t.revisionStep === task.revisionStep)
      );
      return [...filtered, task];
    });
  }, []);

  const completeRevisionTask = useCallback((taskId: string, confidence: ConfidenceRating, recall: 'High' | 'Medium' | 'Low') => {
    setRevisionTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            completed: true,
            completedDate: new Date().toISOString().split('T')[0],
            confidenceScore: confidence,
            recallAccuracy: recall,
          };
        }
        return t;
      })
    );
  }, []);

  const addStudyTask = useCallback((task: Omit<DailyStudyTask, 'id'>) => {
    const newTask: DailyStudyTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setStudyTasks((prev) => [newTask, ...prev]);
  }, []);

  const toggleStudyTask = useCallback((taskId: string) => {
    setStudyTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  }, []);

  const deleteStudyTask = useCallback((taskId: string) => {
    setStudyTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const addResource = useCallback((resource: Omit<SubjectResource, 'id' | 'createdAt'>) => {
    const newRes: SubjectResource = {
      ...resource,
      id: `res-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setResources((prev) => [newRes, ...prev]);
  }, []);

  const deleteResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addMockTest = useCallback((test: Omit<MockTestRecord, 'id'>) => {
    const newTest: MockTestRecord = {
      ...test,
      id: `test-${Date.now()}`,
    };
    setMockTests((prev) => [newTest, ...prev]);

    // Apply error-linker: if test has chapter errors, reduce confidence and flag topic for review
    if (test.mistakes && test.mistakes.length > 0) {
      test.mistakes.forEach((m) => {
        if (m.topicId) {
          updateTopicMastery(m.topicId, {
            status: 'Needs Revision',
            confidence: 2, // reduced confidence rule
          });
        }
      });
    }
  }, [updateTopicMastery]);

  const updatePYQAttempt = useCallback((id: string, status: 'correct' | 'incorrect' | 'needs_practice') => {
    setPyqs((prev) =>
      prev.map((q) => (q.id === id ? { ...q, attemptStatus: status } : q))
    );
  }, []);

  const addPYQ = useCallback((pyq: Omit<PYQRecord, 'id'>) => {
    const newQ: PYQRecord = {
      ...pyq,
      id: `pyq-${Date.now()}`,
    };
    setPyqs((prev) => [newQ, ...prev]);
  }, []);

  const addMilestone = useCallback((milestone: Omit<MilestoneItem, 'id'>) => {
    const newM: MilestoneItem = {
      ...milestone,
      id: `mile-${Date.now()}`,
    };
    setMilestones((prev) => [...prev, newM].sort((a, b) => a.date.localeCompare(b.date)));
  }, []);

  const toggleMilestone = useCallback((id: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isCompleted: !m.isCompleted } : m))
    );
  }, []);

  const updateMilestone = useCallback((id: string, partial: Partial<MilestoneItem>) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...partial } : m))
    );
  }, []);

  const deleteMilestone = useCallback((id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const archiveMilestone = useCallback((id: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isArchived: !m.isArchived } : m))
    );
  }, []);

  const updatePreferences = useCallback((partial: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...partial }));
  }, []);

  const importSyllabusVersion = useCallback((newVersion: SyllabusVersion) => {
    setActiveSyllabus(newVersion);
  }, []);

  const mergeImportedSyllabus = useCallback((parsedSubjects: ParsedSubjectPreview[]) => {
    const { updatedSubjects, addedCounts, newTopicIds } = mergeParsedSyllabusIntoActive(
      activeSyllabus,
      parsedSubjects
    );

    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: updatedSubjects,
      lastCheckedDate: new Date().toISOString().split('T')[0],
      verificationStatus: prev.verificationStatus === 'verified_rbse' ? 'verified_rbse' : 'user_defined',
    }));

    // Initialize mastery states for newly added topics without overwriting existing topics
    setMasteryMap((prev) => {
      const nextMap = { ...prev };
      newTopicIds.forEach((tId) => {
        if (!nextMap[tId]) {
          nextMap[tId] = {
            topicId: tId,
            chapterId: '',
            subjectId: '',
            status: 'Not Started',
            confidence: 3,
            completedStages: [],
            difficulty: 'Moderate',
            totalStudyMinutes: 0,
            questionsSolved: 0,
            questionsCorrect: 0,
            updatedAt: new Date().toISOString(),
          };
        }
      });
      return nextMap;
    });

    return addedCounts;
  }, [activeSyllabus]);

  const clearDefaultSyllabus = useCallback(() => {
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: [],
      statusLabel: 'User Custom Syllabus',
      verificationStatus: 'user_defined',
      lastCheckedDate: new Date().toISOString().split('T')[0],
    }));
  }, []);

  const addSubject = useCallback((subject: Omit<Subject, 'id'>) => {
    const newSub: Subject = {
      ...subject,
      id: `sub-${Date.now()}`,
      units: subject.units || [],
      isCustom: true,
    };
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: [...prev.subjects, newSub],
    }));
  }, []);

  const updateSubject = useCallback((id: string, partial: Partial<Subject>) => {
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    }));
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
    }));
  }, []);

  const reorderSubjects = useCallback((subjects: Subject[]) => {
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects,
    }));
  }, []);

  const addUnit = useCallback((subjectId: string, unit: Omit<Unit, 'id' | 'subjectId'>) => {
    const newUnit: Unit = {
      ...unit,
      id: `u-${Date.now()}`,
      subjectId,
      chapters: unit.chapters || [],
    };
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s.id === subjectId ? { ...s, units: [...s.units, newUnit] } : s
      ),
    }));
  }, []);

  const updateUnit = useCallback((subjectId: string, unitId: string, partial: Partial<Unit>) => {
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              units: s.units.map((u) => (u.id === unitId ? { ...u, ...partial } : u)),
            }
          : s
      ),
    }));
  }, []);

  const deleteUnit = useCallback((subjectId: string, unitId: string) => {
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              units: s.units.filter((u) => u.id !== unitId),
            }
          : s
      ),
    }));
  }, []);

  const addChapter = useCallback(
    (subjectId: string, unitId: string, chapter: Omit<Chapter, 'id' | 'unitId' | 'subjectId'>) => {
      const newChap: Chapter = {
        ...chapter,
        id: `c-${Date.now()}`,
        unitId,
        subjectId,
        topics: chapter.topics || [],
      };
      setActiveSyllabus((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                units: s.units.map((u) =>
                  u.id === unitId ? { ...u, chapters: [...u.chapters, newChap] } : u
                ),
              }
            : s
        ),
      }));
    },
    []
  );

  const updateChapter = useCallback(
    (subjectId: string, unitId: string, chapterId: string, partial: Partial<Chapter>) => {
      setActiveSyllabus((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                units: s.units.map((u) =>
                  u.id === unitId
                    ? {
                        ...u,
                        chapters: u.chapters.map((c) =>
                          c.id === chapterId ? { ...c, ...partial } : c
                        ),
                      }
                    : u
                ),
              }
            : s
        ),
      }));
    },
    []
  );

  const deleteChapter = useCallback((subjectId: string, unitId: string, chapterId: string) => {
    setActiveSyllabus((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              units: s.units.map((u) =>
                u.id === unitId
                  ? {
                      ...u,
                      chapters: u.chapters.filter((c) => c.id !== chapterId),
                    }
                  : u
              ),
            }
          : s
      ),
    }));
  }, []);

  const addTopic = useCallback(
    (
      subjectId: string,
      unitId: string,
      chapterId: string,
      topic: Omit<Topic, 'id' | 'chapterId' | 'unitId' | 'subjectId'>
    ) => {
      const newTopicId = `top-${Date.now()}`;
      const newTop: Topic = {
        ...topic,
        id: newTopicId,
        chapterId,
        unitId,
        subjectId,
        subtopics: topic.subtopics || [],
      };
      setActiveSyllabus((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                units: s.units.map((u) =>
                  u.id === unitId
                    ? {
                        ...u,
                        chapters: u.chapters.map((c) =>
                          c.id === chapterId ? { ...c, topics: [...c.topics, newTop] } : c
                        ),
                      }
                    : u
                ),
              }
            : s
        ),
      }));
      setMasteryMap((prev) => ({
        ...prev,
        [newTopicId]: {
          topicId: newTopicId,
          chapterId,
          subjectId,
          status: 'Not Started',
          confidence: 3,
          completedStages: [],
          difficulty: newTop.difficulty || 'Moderate',
          totalStudyMinutes: 0,
          questionsSolved: 0,
          questionsCorrect: 0,
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    []
  );

  const updateTopic = useCallback(
    (
      subjectId: string,
      unitId: string,
      chapterId: string,
      topicId: string,
      partial: Partial<Topic>
    ) => {
      setActiveSyllabus((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                units: s.units.map((u) =>
                  u.id === unitId
                    ? {
                        ...u,
                        chapters: u.chapters.map((c) =>
                          c.id === chapterId
                            ? {
                                ...c,
                                topics: c.topics.map((t) =>
                                  t.id === topicId ? { ...t, ...partial } : t
                                ),
                              }
                            : c
                        ),
                      }
                    : u
                ),
              }
            : s
        ),
      }));
    },
    []
  );

  const deleteTopic = useCallback(
    (subjectId: string, unitId: string, chapterId: string, topicId: string) => {
      setActiveSyllabus((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                units: s.units.map((u) =>
                  u.id === unitId
                    ? {
                        ...u,
                        chapters: u.chapters.map((c) =>
                          c.id === chapterId
                            ? {
                                ...c,
                                topics: c.topics.filter((t) => t.id !== topicId),
                              }
                            : c
                        ),
                      }
                    : u
                ),
              }
            : s
        ),
      }));
    },
    []
  );

  const resetAllData = useCallback(() => {
    setActiveSyllabus(OFFICIAL_RBSE_2027_28_SYLLABUS);
    setMasteryMap(getInitialMasteryMap());
    setResources([...DEFAULT_PHYSICS_RESOURCES, ...DEFAULT_CHEMISTRY_RESOURCES, ...DEFAULT_MATH_RESOURCES]);
    setPyqs(DEFAULT_PYQS);
    setMilestones(DEFAULT_MILESTONES);
    setStudyTasks([]);
    setRevisionTasks([]);
    setMockTests([]);
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  const loginGoogle = useCallback(async () => {
    try {
      setSyncState('syncing');
      const user = await fbSignIn();
      if (user) {
        setSyncState('synced');
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Login error:', e);
      setSyncState('error');
    }
  }, []);

  const logoutUser = useCallback(async () => {
    await fbSignOut();
    setCurrentUser(null);
    setSyncState('offline_local');
  }, []);

  const exportJSON = useCallback(() => {
    const exportObject = {
      app: 'MyStudyPath',
      version: '1.0',
      exportDate: new Date().toISOString(),
      activeSyllabus,
      masteryMap,
      revisionTasks,
      studyTasks,
      resources,
      mockTests,
      pyqs,
      milestones,
      preferences,
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MyStudyPath_RBSE12_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSyllabus, masteryMap, revisionTasks, studyTasks, resources, mockTests, pyqs, milestones, preferences]);

  const importJSON = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.masteryMap) setMasteryMap(data.masteryMap);
      if (data.activeSyllabus) setActiveSyllabus(data.activeSyllabus);
      if (data.revisionTasks) setRevisionTasks(data.revisionTasks);
      if (data.studyTasks) setStudyTasks(data.studyTasks);
      if (data.resources) setResources(data.resources);
      if (data.mockTests) setMockTests(data.mockTests);
      if (data.pyqs) setPyqs(data.pyqs);
      if (data.milestones) setMilestones(data.milestones);
      if (data.preferences) setPreferences(data.preferences);
      return true;
    } catch (e) {
      console.error('Import parse error:', e);
      return false;
    }
  }, []);

  const value = {
    activeSyllabus,
    masteryMap,
    revisionTasks,
    studyTasks,
    resources,
    mockTests,
    pyqs,
    milestones,
    preferences,
    currentUser,
    syncState,
    lastSyncTime,
    progressSummary,
    updateTopicMastery,
    bulkUpdateChapterTopics,
    toggleMasteryStage,
    addRevisionTask,
    completeRevisionTask,
    addStudyTask,
    toggleStudyTask,
    deleteStudyTask,
    addResource,
    deleteResource,
    addMockTest,
    updatePYQAttempt,
    addPYQ,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    toggleMilestone,
    archiveMilestone,
    updatePreferences,
    importSyllabusVersion,
    mergeImportedSyllabus,
    clearDefaultSyllabus,
    addSubject,
    updateSubject,
    deleteSubject,
    reorderSubjects,
    addUnit,
    updateUnit,
    deleteUnit,
    addChapter,
    updateChapter,
    deleteChapter,
    addTopic,
    updateTopic,
    deleteTopic,
    resetAllData,
    loginGoogle,
    logoutUser,
    exportJSON,
    importJSON,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
