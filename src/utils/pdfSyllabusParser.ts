import * as pdfjsLib from 'pdfjs-dist';
import type { Subject, Unit, Chapter, Topic, Subtopic } from '../types/index.ts';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    // Attempt local worker URL or reliable CDN fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization notice:', e);
  }
}

export interface ParsedTopicPreview {
  id: string;
  title: string;
  subtopics: string[];
  estimatedHours: number;
  selected: boolean;
}

export interface ParsedChapterPreview {
  id: string;
  number: number;
  title: string;
  officialWeightageMarks?: number;
  topics: ParsedTopicPreview[];
  selected: boolean;
}

export interface ParsedUnitPreview {
  id: string;
  number: number;
  title: string;
  officialMarks?: number;
  chapters: ParsedChapterPreview[];
  selected: boolean;
}

export interface ParsedSubjectPreview {
  id: string;
  name: string;
  code: string;
  color: string;
  targetSubjectId?: string; // Links to existing subject if matching
  units: ParsedUnitPreview[];
  selected: boolean;
}

export interface PDFParseProgress {
  currentPage: number;
  totalPages: number;
  status: 'reading' | 'extracting_text' | 'structuring' | 'complete' | 'error';
  message: string;
}

/**
 * Extract clean text page-by-page from a PDF File or ArrayBuffer
 */
export async function extractTextFromPDF(
  file: File | ArrayBuffer,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<{ fullText: string; pageCount: number; pages: { pageNum: number; text: string }[] }> {
  try {
    const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('The selected PDF file is empty (0 bytes). Please select a valid document.');
    }

    // 25MB check
    if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
      throw new Error('The PDF file exceeds 25 MB. Please select a smaller file or syllabus extract.');
    }

    onProgress?.({
      currentPage: 0,
      totalPages: 0,
      status: 'reading',
      message: 'Loading PDF document...',
    });

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: true,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    if (totalPages === 0) {
      throw new Error('The PDF document does not contain any readable pages.');
    }

    const pages: { pageNum: number; text: string }[] = [];
    const textChunks: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.({
        currentPage: pageNum,
        totalPages,
        status: 'extracting_text',
        message: `Extracting text from page ${pageNum} of ${totalPages}...`,
      });

      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();

      // Combine text items preserving space and line breaks
      let lastY: number | null = null;
      let pageStr = '';

      for (const item of content.items as any[]) {
        if (!item.str) continue;
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageStr += '\n';
        } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
          pageStr += ' ';
        }
        pageStr += item.str;
        lastY = item.transform[5];
      }

      pages.push({ pageNum, text: pageStr.trim() });
      textChunks.push(pageStr.trim());
    }

    const fullText = textChunks.join('\n\n');

    onProgress?.({
      currentPage: totalPages,
      totalPages,
      status: 'complete',
      message: 'PDF text extraction complete.',
    });

    return { fullText, pageCount: totalPages, pages };
  } catch (err: any) {
    if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
      throw new Error('This PDF is password-protected. Please remove the password and try again.');
    }
    if (err?.name === 'InvalidPDFException' || err?.message?.toLowerCase().includes('invalid pdf')) {
      throw new Error('This file is damaged or not a valid PDF document.');
    }
    throw err;
  }
}

/**
 * Standard colors & codes for recognized subjects
 */
const SUBJECT_PRESETS: Record<string, { code: string; color: string; defaultName: string }> = {
  physics: { code: 'PHY', color: '#2563eb', defaultName: 'Physics' },
  chemistry: { code: 'CHE', color: '#059669', defaultName: 'Chemistry' },
  mathematics: { code: 'MTH', color: '#7c3aed', defaultName: 'Mathematics' },
  maths: { code: 'MTH', color: '#7c3aed', defaultName: 'Mathematics' },
  biology: { code: 'BIO', color: '#16a34a', defaultName: 'Biology' },
  english: { code: 'ENG', color: '#ea580c', defaultName: 'English Compulsory' },
  hindi: { code: 'HIN', color: '#dc2626', defaultName: 'Hindi Compulsory' },
  computer: { code: 'CS', color: '#0891b2', defaultName: 'Computer Science' },
};

/**
 * Robust parsing heuristic to convert extracted raw text into structured Syllabus subjects, units, chapters, and topics
 */
export function structureRawSyllabusText(
  rawText: string,
  existingSubjects: Subject[] = []
): ParsedSubjectPreview[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Regex patterns
  const subjectRegex = /^(?:subject\s*[:\-]?\s*|विषय\s*[:\-]?\s*)?([A-Za-z\s]{3,30}|भौतिक\s*विज्ञान|रसायन\s*विज्ञान|गणित|अंग्रेजी|हिन्दी|जीव\s*विज्ञान)(?:\s*\(?(?:theory|code|\d{2,3})\)?)?$/i;
  const unitRegex = /^(?:unit|इकाई|खण्ड|part)\s*([0-9IVXLCDM]+)[\s:\-–—\.]+(.+?)(?:\s*[\(\[]\s*(\d+)\s*(?:marks|अंक|m)[\)\]])?$/i;
  const chapterRegex = /^(?:chapter|अध्याय|पाठ|lesson)\s*([0-9]+)[\s:\-–—\.]+(.+?)(?:\s*[\(\[]\s*(\d+)\s*(?:marks|अंक|m)[\)\]])?$/i;
  const numberedChapterRegex = /^([0-9]{1,2})\.\s+([A-Za-z\u0900-\u097F][A-Za-z0-9\s,\-\(\)\/\.\u0900-\u097F]{4,80})(?:\s*[\(\[]\s*(\d+)\s*(?:marks|अंक|m)[\)\]])?$/;
  const topicNumberedRegex = /^(?:[0-9]{1,2}\.[0-9]{1,2}|[a-z]\))\s*(.+)$/i;
  const bulletRegex = /^[\u2022\u25E6\u25AA\u25CF\-\*\+]\s*(.+)$/;

  const subjects: ParsedSubjectPreview[] = [];

  let currentSubject: ParsedSubjectPreview | null = null;
  let currentUnit: ParsedUnitPreview | null = null;
  let currentChapter: ParsedChapterPreview | null = null;

  let unitCounter = 1;
  let chapterCounter = 1;
  let topicCounter = 1;

  // Helper to ensure an active subject exists
  const ensureSubject = (detectedName?: string): ParsedSubjectPreview => {
    const rawName = detectedName?.trim() || 'General Syllabus';
    const key = rawName.toLowerCase();

    // Check if matches existing or preset
    let matchedKey = Object.keys(SUBJECT_PRESETS).find((k) => key.includes(k));
    let matchedExisting = existingSubjects.find((s) => s.name.toLowerCase() === key || (matchedKey && s.id === matchedKey));

    if (!currentSubject || (detectedName && currentSubject.name.toLowerCase() !== rawName.toLowerCase())) {
      const preset = matchedKey ? SUBJECT_PRESETS[matchedKey] : { code: 'SUB', color: '#6366f1', defaultName: rawName };
      const subId = matchedExisting ? matchedExisting.id : `sub-imp-${Date.now()}-${subjects.length + 1}`;

      currentSubject = {
        id: subId,
        name: matchedExisting ? matchedExisting.name : preset.defaultName,
        code: matchedExisting ? matchedExisting.code : preset.code,
        color: matchedExisting ? matchedExisting.color : preset.color,
        targetSubjectId: matchedExisting?.id,
        units: [],
        selected: true,
      };
      subjects.push(currentSubject);
      currentUnit = null;
      currentChapter = null;
    }
    return currentSubject;
  };

  // Helper to ensure an active unit exists
  const ensureUnit = (unitTitle = 'Main Curriculum', unitNum = unitCounter++): ParsedUnitPreview => {
    const sub = ensureSubject();
    if (!currentUnit) {
      currentUnit = {
        id: `u-imp-${Date.now()}-${unitNum}`,
        number: unitNum,
        title: unitTitle,
        chapters: [],
        selected: true,
      };
      sub.units.push(currentUnit);
    }
    return currentUnit;
  };

  // Helper to ensure an active chapter exists
  const ensureChapter = (chapTitle = 'General Topics', chapNum = chapterCounter++): ParsedChapterPreview => {
    const unit = ensureUnit();
    if (!currentChapter) {
      currentChapter = {
        id: `c-imp-${Date.now()}-${chapNum}`,
        number: chapNum,
        title: chapTitle,
        topics: [],
        selected: true,
      };
      unit.chapters.push(currentChapter);
    }
    return currentChapter;
  };

  // Iterate line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Check for Subject header
    const subjectMatch = line.match(subjectRegex);
    const isExplicitSubjectHeader =
      subjectMatch &&
      (line.toLowerCase().includes('subject') ||
        line.includes('विषय') ||
        ['physics', 'chemistry', 'mathematics', 'maths', 'biology', 'english', 'hindi'].includes(
          subjectMatch[1].trim().toLowerCase()
        ));

    if (isExplicitSubjectHeader && subjectMatch) {
      ensureSubject(subjectMatch[1]);
      continue;
    }

    // 2. Check for Unit Header
    const unitMatch = line.match(unitRegex);
    if (unitMatch) {
      const uNumStr = unitMatch[1];
      const parsedNum = parseInt(uNumStr, 10) || unitCounter++;
      const uTitle = unitMatch[2].trim();
      const uMarks = unitMatch[3] ? parseInt(unitMatch[3], 10) : undefined;

      const sub = ensureSubject();
      currentUnit = {
        id: `u-imp-${Date.now()}-${sub.units.length + 1}`,
        number: parsedNum,
        title: uTitle,
        officialMarks: uMarks,
        chapters: [],
        selected: true,
      };
      sub.units.push(currentUnit);
      currentChapter = null;
      continue;
    }

    // 3. Check for Chapter Header
    const chapterMatch = line.match(chapterRegex);
    if (chapterMatch) {
      const cNum = parseInt(chapterMatch[1], 10) || chapterCounter++;
      const cTitle = chapterMatch[2].trim();
      const cMarks = chapterMatch[3] ? parseInt(chapterMatch[3], 10) : undefined;

      const unit = ensureUnit();
      currentChapter = {
        id: `c-imp-${Date.now()}-${unit.chapters.length + 1}`,
        number: cNum,
        title: cTitle,
        officialWeightageMarks: cMarks,
        topics: [],
        selected: true,
      };
      unit.chapters.push(currentChapter);
      continue;
    }

    // 4. Numbered chapter style (e.g. "1. Electric Charges and Fields (4 Marks)")
    const numChapMatch = line.match(numberedChapterRegex);
    if (numChapMatch && !line.includes('•') && !line.includes(':') && line.length < 80) {
      const cNum = parseInt(numChapMatch[1], 10);
      const cTitle = numChapMatch[2].trim();
      const cMarks = numChapMatch[3] ? parseInt(numChapMatch[3], 10) : undefined;

      const unit = ensureUnit();
      currentChapter = {
        id: `c-imp-${Date.now()}-${unit.chapters.length + 1}`,
        number: cNum,
        title: cTitle,
        officialWeightageMarks: cMarks,
        topics: [],
        selected: true,
      };
      unit.chapters.push(currentChapter);
      continue;
    }

    // 5. Topic parsing (bullet, numbered sub-item, or comma-separated list of topics)
    const topicNumMatch = line.match(topicNumberedRegex);
    const bulletMatch = line.match(bulletRegex);

    let topicText = '';
    if (topicNumMatch) {
      topicText = topicNumMatch[1].trim();
    } else if (bulletMatch) {
      topicText = bulletMatch[1].trim();
    } else if (currentChapter && line.length > 3 && line.length < 120 && !line.startsWith('Note') && !line.startsWith('Page')) {
      // Freeform topic under current chapter
      topicText = line;
    }

    if (topicText) {
      // Split by semicolon or major delimiter if multiple topics on one line
      const subItems = topicText.includes(';') ? topicText.split(';').map((s) => s.trim()) : [topicText];

      for (const item of subItems) {
        if (!item || item.length < 2) continue;

        const chap = ensureChapter();

        // Extract subtopics if enclosed in brackets or parentheses
        let subtopics: string[] = [];
        let cleanTitle = item;
        const parenMatch = item.match(/^(.+?)\s*\((.+?)\)$/);
        if (parenMatch) {
          cleanTitle = parenMatch[1].trim();
          subtopics = parenMatch[2].split(/[,;]/).map((st) => st.trim()).filter((st) => st.length > 0);
        }

        const newTopic: ParsedTopicPreview = {
          id: `top-imp-${Date.now()}-${topicCounter++}`,
          title: cleanTitle,
          subtopics,
          estimatedHours: 2,
          selected: true,
        };

        chap.topics.push(newTopic);
      }
    }
  }

  // If no structured topics were created but text exists, build a fallback structure
  if (subjects.length === 0 && lines.length > 0) {
    const fallbackSubject = ensureSubject('Imported Syllabus');
    const fallbackUnit = ensureUnit('General Unit', 1);
    const fallbackChapter = ensureChapter('Imported Chapter 1', 1);

    lines.slice(0, 50).forEach((l, idx) => {
      fallbackChapter.topics.push({
        id: `top-imp-fb-${idx}`,
        title: l,
        subtopics: [],
        estimatedHours: 1.5,
        selected: true,
      });
    });
  }

  return subjects;
}

/**
 * Merge selected preview items into the active syllabus safely preserving user records
 */
export function mergeParsedSyllabusIntoActive(
  activeSyllabus: { subjects: Subject[] },
  parsedSubjects: ParsedSubjectPreview[]
): {
  updatedSubjects: Subject[];
  addedCounts: { subjects: number; units: number; chapters: number; topics: number };
  newTopicIds: string[];
} {
  const resultSubjects: Subject[] = JSON.parse(JSON.stringify(activeSyllabus.subjects));
  let addedSubjects = 0;
  let addedUnits = 0;
  let addedChapters = 0;
  let addedTopics = 0;
  const newTopicIds: string[] = [];

  for (const pSub of parsedSubjects) {
    if (!pSub.selected) continue;

    // Filter only selected units, chapters, topics
    const selectedUnits = pSub.units
      .filter((u) => u.selected)
      .map((u) => ({
        ...u,
        chapters: u.chapters
          .filter((c) => c.selected)
          .map((c) => ({
            ...c,
            topics: c.topics.filter((t) => t.selected),
          }))
          .filter((c) => c.topics.length > 0 || c.selected),
      }))
      .filter((u) => u.chapters.length > 0 || u.selected);

    if (selectedUnits.length === 0) continue;

    // Check if target subject already exists
    let targetSub = resultSubjects.find(
      (s) => s.id === pSub.targetSubjectId || s.id === pSub.id || s.name.toLowerCase() === pSub.name.toLowerCase()
    );

    if (!targetSub) {
      // Create new subject
      const newSubject: Subject = {
        id: pSub.id.startsWith('sub-') ? pSub.id : `sub-user-${Date.now()}`,
        name: pSub.name,
        code: pSub.code || 'SUB',
        color: pSub.color || '#2563eb',
        priority: 'high',
        isCustom: true,
        units: [],
      };
      resultSubjects.push(newSubject);
      targetSub = newSubject;
      addedSubjects++;
    }

    // Merge units into targetSub
    for (const pUnit of selectedUnits) {
      let targetUnit = targetSub.units.find(
        (u) => u.id === pUnit.id || (u.number === pUnit.number && u.title.toLowerCase() === pUnit.title.toLowerCase())
      );

      if (!targetUnit) {
        targetUnit = {
          id: pUnit.id.startsWith('u-') ? pUnit.id : `u-user-${Date.now()}-${targetSub.units.length + 1}`,
          subjectId: targetSub.id,
          number: pUnit.number,
          title: pUnit.title,
          officialMarks: pUnit.officialMarks,
          chapters: [],
        };
        targetSub.units.push(targetUnit);
        addedUnits++;
      }

      // Merge chapters into targetUnit
      for (const pChap of pUnit.chapters) {
        let targetChap = targetUnit.chapters.find(
          (c) => c.id === pChap.id || (c.number === pChap.number && c.title.toLowerCase() === pChap.title.toLowerCase())
        );

        if (!targetChap) {
          targetChap = {
            id: pChap.id.startsWith('c-') ? pChap.id : `c-user-${Date.now()}-${targetUnit.chapters.length + 1}`,
            unitId: targetUnit.id,
            subjectId: targetSub.id,
            number: pChap.number,
            title: pChap.title,
            officialWeightageMarks: pChap.officialWeightageMarks,
            topics: [],
          };
          targetUnit.chapters.push(targetChap);
          addedChapters++;
        }

        // Merge topics into targetChap
        for (const pTop of pChap.topics) {
          const topicExists = targetChap.topics.some(
            (t) => t.id === pTop.id || t.title.toLowerCase() === pTop.title.toLowerCase()
          );

          if (!topicExists) {
            const cleanSubtopics: Subtopic[] = pTop.subtopics.map((st, sidx) => ({
              id: `st-${Date.now()}-${sidx}`,
              title: st,
              completed: false,
            }));

            const finalTopicId = pTop.id.startsWith('top-') ? pTop.id : `top-user-${Date.now()}-${targetChap.topics.length + 1}`;
            const newTopic: Topic = {
              id: finalTopicId,
              chapterId: targetChap.id,
              unitId: targetUnit.id,
              subjectId: targetSub.id,
              title: pTop.title,
              subtopics: cleanSubtopics,
              difficulty: 'Moderate',
              estimatedHours: pTop.estimatedHours || 2,
            };

            targetChap.topics.push(newTopic);
            newTopicIds.push(finalTopicId);
            addedTopics++;
          }
        }
      }
    }
  }

  return {
    updatedSubjects: resultSubjects,
    addedCounts: {
      subjects: addedSubjects,
      units: addedUnits,
      chapters: addedChapters,
      topics: addedTopics,
    },
    newTopicIds,
  };
}
