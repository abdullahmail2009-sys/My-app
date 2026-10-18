import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

// Helper to get GoogleGenAI client safely
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'MyStudyPath',
    session: '2027-28',
    geminiConfigured: !!getGenAIClient(),
    timestamp: new Date().toISOString(),
  });
});

// Explain a topic according to RBSE Class 12 guidelines
app.post('/api/gemini/explain', async (req, res) => {
  try {
    const { topicTitle, chapterTitle, subjectName, userQuery } = req.body;
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server. Please ensure GEMINI_API_KEY is configured in project settings.',
      });
    }

    const systemPrompt = `You are an expert academic tutor for Rajasthan Board of Secondary Education (RBSE) Class 12 students.
Session: 2027–28.
Stay strictly within the official RBSE Class 12 syllabus boundaries for ${subjectName || 'the subject'}.
Do not invent page numbers or assume outside competitive curricula.
Give clean, crystal-clear conceptual explanations, step-by-step mathematical derivations or chemical mechanisms where applicable, and high-yield board exam tips.
Keep formulas with SI units and standard symbols.`;

    const prompt = `Topic: "${topicTitle}" in Chapter: "${chapterTitle}" (${subjectName}).
Student Question: ${userQuery || 'Explain this topic clearly with key concepts, definitions, derivations/reactions (if any), and frequent questions asked in RBSE board exams.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    res.json({
      explanation: response.text,
      source: 'AI-generated study guidance — Verify with official RBSE textbooks',
    });
  } catch (error: any) {
    console.error('Gemini explain error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate explanation' });
  }
});

// Generate chapter practice quiz tailored to RBSE board patterns
app.post('/api/gemini/quiz', async (req, res) => {
  try {
    const { chapterTitle, subjectName, topicTitle } = req.body;
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server.',
      });
    }

    const prompt = `Generate 3 practice questions for RBSE Class 12 ${subjectName}, Chapter: "${chapterTitle}", Topic: "${topicTitle || 'Overall Chapter'}".
Follow official RBSE board examination pattern:
- Question 1: 1 Mark Short/Conceptual question
- Question 2: 2 Marks Reasoning / Numerical / Reaction question
- Question 3: 4 Marks Derivation / Comprehensive problem
Format the response strictly as valid JSON with keys:
{
  "questions": [
    {
      "marks": number,
      "type": "1_mark" | "2_marks" | "4_marks",
      "question": "string",
      "modelAnswer": "string step-by-step answer",
      "boardTip": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini quiz error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

// Scan & extract syllabus document / text
app.post('/api/gemini/scan-syllabus', async (req, res) => {
  try {
    const { rawText } = req.body;
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server.',
      });
    }

    const prompt = `You are an AI syllabus analyzer. Parse the following text into structured syllabus items for RBSE Class 12:
Input:
${rawText}

Return JSON strictly matching this schema:
{
  "detectedSubject": "string",
  "academicSession": "2027–28",
  "verificationStatus": "ai_extracted",
  "chapters": [
    {
      "number": number,
      "title": "string",
      "marksWeightage": number or null,
      "topics": [
        {
          "title": "string",
          "estimatedHours": number,
          "difficulty": "Easy" | "Moderate" | "Hard"
        }
      ]
    }
  ]
}
Do not fabricate information. If marks or details are missing, set to null.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini scan error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse syllabus document' });
  }
});

// Analyze mistake from mock test
app.post('/api/gemini/analyze-mistake', async (req, res) => {
  try {
    const { subject, chapter, mistakeDescription, studentAttempt } = req.body;
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server.',
      });
    }

    const prompt = `A Class 12 student made this error in ${subject}, Chapter: ${chapter}.
Problem / Error: "${mistakeDescription}"
Student's Attempt: "${studentAttempt || 'Not specified'}"

Diagnose:
1. Root concept misunderstanding
2. Precise correction
3. A rule-of-thumb to never repeat this in RBSE board exams.
Keep concise (under 150 words).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });

    res.json({ diagnosis: response.text });
  } catch (error: any) {
    console.error('Mistake analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze mistake' });
  }
});

// Vite middleware or static serving
const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MyStudyPath server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
