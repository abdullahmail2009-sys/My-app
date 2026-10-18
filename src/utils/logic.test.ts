import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTopicCompleted,
  calculateTopicMasteryPercentage,
  calculateOverallProgress,
} from './progressCalc.ts';
import {
  calculateNextRevisionDate,
  getRevisionUrgency,
  deduplicateRevisions,
} from './spacedRepetition.ts';
import { calculateBacklogAndPace } from './backlogCalc.ts';
import { checkPrerequisites, wouldCreateCycle } from './prerequisites.ts';
import { compareSyllabi } from './syllabusDiff.ts';
import { structureRawSyllabusText, mergeParsedSyllabusIntoActive } from './pdfSyllabusParser.ts';
import type { Subject, SyllabusVersion, TopicMasteryState, SpacedRevisionTask } from '../types/index.ts';

test('isTopicCompleted: evaluates completion flags correctly', () => {
  const empty = isTopicCompleted(undefined);
  assert.equal(empty, false);

  const statusComp: TopicMasteryState = {
    topicId: 't1',
    chapterId: 'c1',
    subjectId: 'phy',
    status: 'Completed',
    confidence: 4,
    completedStages: ['theory'],
    difficulty: 'Moderate',
    totalStudyMinutes: 60,
    questionsSolved: 10,
    questionsCorrect: 8,
    updatedAt: new Date().toISOString(),
  };
  assert.equal(isTopicCompleted(statusComp), true);

  const stagesComp: TopicMasteryState = {
    ...statusComp,
    status: 'In Progress',
    completedStages: ['theory', 'notes'],
  };
  assert.equal(isTopicCompleted(stagesComp), true);

  const incomplete: TopicMasteryState = {
    ...statusComp,
    status: 'In Progress',
    completedStages: ['theory'],
  };
  assert.equal(isTopicCompleted(incomplete), false);
});

test('calculateOverallProgress: computes weighted completion and respects exclusions', () => {
  const mockSubject: Subject = {
    id: 'phy',
    name: 'Physics',
    code: '12-PHY',
    color: '#3b82f6',
    priority: 'high',
    units: [
      {
        id: 'u1',
        subjectId: 'phy',
        number: 1,
        title: 'Electrostatics',
        chapters: [
          {
            id: 'c1',
            unitId: 'u1',
            subjectId: 'phy',
            number: 1,
            title: 'Electric Charges & Fields',
            officialWeightageMarks: 4,
            topics: [
              {
                id: 't1',
                chapterId: 'c1',
                unitId: 'u1',
                subjectId: 'phy',
                title: 'Coulombs Law',
                subtopics: [],
                difficulty: 'Moderate',
                estimatedHours: 2,
              },
              {
                id: 't2',
                chapterId: 'c1',
                unitId: 'u1',
                subjectId: 'phy',
                title: 'Electric Flux',
                subtopics: [],
                difficulty: 'Hard',
                estimatedHours: 2,
              },
            ],
          },
          {
            id: 'c2_excluded',
            unitId: 'u1',
            subjectId: 'phy',
            number: 2,
            title: 'Excluded Topic',
            officialWeightageMarks: 2,
            isExcluded: true,
            topics: [
              {
                id: 't_ex',
                chapterId: 'c2_excluded',
                unitId: 'u1',
                subjectId: 'phy',
                title: 'Van de Graaff generator',
                subtopics: [],
                difficulty: 'Moderate',
                estimatedHours: 1,
                isExcluded: true,
              },
            ],
          },
        ],
      },
    ],
  };

  const masteryMap: Record<string, TopicMasteryState> = {
    t1: {
      topicId: 't1',
      chapterId: 'c1',
      subjectId: 'phy',
      status: 'Completed',
      confidence: 4,
      completedStages: ['theory', 'notes', 'ncert_exercises', 'pyqs'],
      difficulty: 'Moderate',
      totalStudyMinutes: 120,
      questionsSolved: 15,
      questionsCorrect: 12,
      updatedAt: new Date().toISOString(),
    },
  };

  const summary = calculateOverallProgress([mockSubject], masteryMap);
  // Total active chapters is 1 (c2_excluded is excluded)
  assert.equal(summary.totalChapters, 1);
  // 1 topic completed out of 2 active topics in c1 -> partial chapter credit 50%
  assert.equal(summary.totalTopics, 2);
  assert.equal(summary.completedTopics, 1);
  assert.equal(summary.overallCoveragePercentage, 50);
});

test('spaced repetition: calculates adaptive intervals based on confidence and recall', () => {
  const baseDate = '2026-10-20';
  // Step 1 default is +1 day
  const normalNext = calculateNextRevisionDate(baseDate, 1, 'default', 3, 'Medium');
  assert.equal(normalNext, '2026-10-21');

  // Step 2 default is +7 days (2026-10-27). If low confidence (1), interval is shortened by 50% -> +3 days
  const lowConfNext = calculateNextRevisionDate(baseDate, 2, 'default', 1, 'Low');
  assert.equal(lowConfNext, '2026-10-23');

  // Step 2 with high confidence (5) and high recall -> interval expanded
  const highConfNext = calculateNextRevisionDate(baseDate, 2, 'default', 5, 'High');
  // 7 * 1.25 = 9 days -> 2026-10-29
  assert.equal(highConfNext, '2026-10-29');
});

test('spaced repetition: deduplicates revision tasks properly', () => {
  const existing: SpacedRevisionTask[] = [
    {
      id: 'rev-1',
      topicId: 't1',
      chapterId: 'c1',
      subjectId: 'phy',
      topicTitle: 'Coulombs Law',
      subjectName: 'Physics',
      revisionStep: 1,
      scheduledDate: '2026-10-21',
      completed: false,
    },
  ];

  const updated: SpacedRevisionTask = {
    id: 'rev-1-new',
    topicId: 't1',
    chapterId: 'c1',
    subjectId: 'phy',
    topicTitle: 'Coulombs Law',
    subjectName: 'Physics',
    revisionStep: 1,
    scheduledDate: '2026-10-22',
    completed: true,
  };

  const deduplicated = deduplicateRevisions(existing, updated);
  assert.equal(deduplicated.length, 1);
  assert.equal(deduplicated[0].scheduledDate, '2026-10-22');
  assert.equal(deduplicated[0].completed, true);
});

test('backlogCalc: computes deficit and feasibility accurately', () => {
  const metricsFeasible = calculateBacklogAndPace(
    50,
    30,
    '2026-12-20',
    6,
    2.0,
    '2026-10-20'
  );
  assert.equal(metricsFeasible.remainingTopics, 20);
  assert.equal(metricsFeasible.availableDays, 61);
  assert.equal(metricsFeasible.isFeasible, true);

  // Severe backlog case: 100 topics remaining, only 5 days available
  const metricsDeficit = calculateBacklogAndPace(
    100,
    0,
    '2026-10-25',
    4,
    2.5,
    '2026-10-20'
  );
  assert.equal(metricsDeficit.isFeasible, false);
  assert.ok(metricsDeficit.workloadDeficitHours > 0);
  assert.ok(metricsDeficit.feasibilityWarning?.includes('Schedule deficit'));
});

test('prerequisites: checks dependencies and detects cycles', () => {
  const completed = new Set(['t1']);
  const checkPass = checkPrerequisites('t2', ['t1'], completed, { t1: 'Electrostatics 1' });
  assert.equal(checkPass.hasUnmetPrerequisites, false);

  const checkFail = checkPrerequisites('t3', ['t1', 't2'], completed, {
    t1: 'Electrostatics 1',
    t2: 'Electrostatics 2',
  });
  assert.equal(checkFail.hasUnmetPrerequisites, true);
  assert.deepEqual(checkFail.unmetPrerequisiteIds, ['t2']);

  // Cycle detection: t1 -> t2, t2 -> t3, adding t3 -> t1 creates cycle
  const graph: Record<string, string[]> = {
    t2: ['t1'],
    t3: ['t2'],
  };
  const isCycle = wouldCreateCycle(graph, 't1', 't3');
  assert.equal(isCycle, true);

  const notCycle = wouldCreateCycle(graph, 't4', 't3');
  assert.equal(notCycle, false);
});

test('syllabusDiff: detects added and removed chapters accurately', () => {
  const v1: SyllabusVersion = {
    id: 'v1',
    title: 'Syllabus 2026-27',
    academicSession: '2026-27',
    verificationStatus: 'verified_rbse',
    statusLabel: 'Verified',
    officialSourceUrl: 'https://rajeduboard.rajasthan.gov.in/',
    lastCheckedDate: '2026-05-01',
    isActive: true,
    subjects: [
      {
        id: 'phy',
        name: 'Physics',
        code: '12-PHY',
        color: '#3b82f6',
        priority: 'high',
        units: [
          {
            id: 'u1',
            subjectId: 'phy',
            number: 1,
            title: 'Electrostatics',
            chapters: [
              {
                id: 'c1',
                unitId: 'u1',
                subjectId: 'phy',
                number: 1,
                title: 'Electric Charges and Fields',
                topics: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const v2: SyllabusVersion = {
    ...v1,
    id: 'v2',
    title: 'Syllabus 2027-28 Provisional',
    academicSession: '2027-28',
    subjects: [
      {
        id: 'phy',
        name: 'Physics',
        code: '12-PHY',
        color: '#3b82f6',
        priority: 'high',
        units: [
          {
            id: 'u1',
            subjectId: 'phy',
            number: 1,
            title: 'Electrostatics',
            chapters: [
              {
                id: 'c1',
                unitId: 'u1',
                subjectId: 'phy',
                number: 1,
                title: 'Electric Charges and Fields',
                topics: [],
              },
              {
                id: 'c2',
                unitId: 'u1',
                subjectId: 'phy',
                number: 2,
                title: 'Electrostatic Potential and Capacitance',
                topics: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const diff = compareSyllabi(v1, v2);
  assert.equal(diff.addedCount, 1);
  assert.equal(diff.removedCount, 0);
  assert.equal(diff.changes[0].itemType, 'chapter');
  assert.equal(diff.changes[0].newValue, 'Electrostatic Potential and Capacitance');
});

test('pdfSyllabusParser: structureRawSyllabusText parses subjects, units, chapters, and topics correctly', () => {
  const sampleText = `
Subject: Physics
Unit 1: Optics (8 Marks)
Chapter 1: Ray Optics and Optical Instruments (5 Marks)
1.1 Reflection of Light by Spherical Mirrors
1.2 Refraction and Total Internal Reflection (Mirage, Optical Fibres)
1.3 Refraction at Spherical Surfaces and Lenses
Chapter 2: Wave Optics (3 Marks)
2.1 Huygens Principle
2.2 Interference of Light Waves and Young Experiment
`;

  const parsed = structureRawSyllabusText(sampleText);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'Physics');
  assert.equal(parsed[0].units.length, 1);
  assert.equal(parsed[0].units[0].title, 'Optics');
  assert.equal(parsed[0].units[0].officialMarks, 8);
  assert.equal(parsed[0].units[0].chapters.length, 2);
  assert.equal(parsed[0].units[0].chapters[0].title, 'Ray Optics and Optical Instruments');
  assert.equal(parsed[0].units[0].chapters[0].officialWeightageMarks, 5);
  assert.equal(parsed[0].units[0].chapters[0].topics.length, 3);
  assert.equal(parsed[0].units[0].chapters[0].topics[1].subtopics.length, 2);
  assert.equal(parsed[0].units[0].chapters[0].topics[1].subtopics[0], 'Mirage');
  assert.equal(parsed[0].units[0].chapters[1].title, 'Wave Optics');
  assert.equal(parsed[0].units[0].chapters[1].topics.length, 2);
});

test('pdfSyllabusParser: mergeParsedSyllabusIntoActive preserves existing records and merges non-duplicates', () => {
  const existingActive = {
    subjects: [
      {
        id: 'physics',
        name: 'Physics',
        code: 'PHY',
        color: '#2563eb',
        priority: 'high' as const,
        units: [
          {
            id: 'u-existing-1',
            subjectId: 'physics',
            number: 1,
            title: 'Electrostatics',
            officialMarks: 8,
            chapters: [
              {
                id: 'c-existing-1',
                unitId: 'u-existing-1',
                subjectId: 'physics',
                number: 1,
                title: 'Electric Charges and Fields',
                topics: [
                  {
                    id: 't-existing-1',
                    chapterId: 'c-existing-1',
                    unitId: 'u-existing-1',
                    subjectId: 'physics',
                    title: 'Electric Charges',
                    subtopics: [],
                    difficulty: 'Moderate' as const,
                    estimatedHours: 2,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const parsedToMerge = [
    {
      id: 'sub-parsed-1',
      name: 'Physics',
      code: 'PHY',
      color: '#2563eb',
      targetSubjectId: 'physics',
      selected: true,
      units: [
        {
          id: 'u-parsed-1',
          number: 1,
          title: 'Electrostatics',
          selected: true,
          chapters: [
            {
              id: 'c-parsed-1',
              number: 1,
              title: 'Electric Charges and Fields',
              selected: true,
              topics: [
                {
                  id: 't-parsed-1',
                  title: 'Electric Charges', // Duplicate title, should NOT duplicate
                  subtopics: [],
                  estimatedHours: 2,
                  selected: true,
                },
                {
                  id: 't-parsed-2',
                  title: 'Coulombs Law', // New topic, should be appended safely
                  subtopics: [],
                  estimatedHours: 2,
                  selected: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const { updatedSubjects, addedCounts, newTopicIds } = mergeParsedSyllabusIntoActive(
    existingActive,
    parsedToMerge
  );

  assert.equal(addedCounts.subjects, 0); // Reused existing physics
  assert.equal(addedCounts.units, 0); // Reused existing unit
  assert.equal(addedCounts.chapters, 0); // Reused existing chapter
  assert.equal(addedCounts.topics, 1); // Only added new non-duplicate topic
  assert.equal(newTopicIds.length, 1);

  const mergedTopics = updatedSubjects[0].units[0].chapters[0].topics;
  assert.equal(mergedTopics.length, 2);
  assert.equal(mergedTopics[0].id, 't-existing-1'); // Preserved original existing topic ID and data
  assert.equal(mergedTopics[1].title, 'Coulombs Law');
});
