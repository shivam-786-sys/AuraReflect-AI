import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Standard Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy Gemini client helper
let genAiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAiClient = new GoogleGenAI({ apiKey });
  }
  return genAiClient;
}

// Resilient Model Fallback Ladder & Error Recovery Matrix
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
] as const;

const RECOVERABLE_STATUS_CODES = [404, 429, 500, 503];

async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const ai = getGenAI();
  let lastError: any = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      console.log(`[Gemini Request] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { response, modelUsed: model };
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.statusCode || error?.response?.status;
      const isRecoverable =
        RECOVERABLE_STATUS_CODES.includes(status) ||
        (error?.message &&
          /unavailable|quota|rate limit|not found|internal/i.test(error.message));

      console.warn(
        `[Gemini Warning] Model ${model} failed (status: ${status}, recoverable: ${isRecoverable}): ${error?.message}`
      );

      if (!isRecoverable && i < MODEL_FALLBACK_LADDER.length - 1) {
        // Even for non-standard errors, try next model if available
        continue;
      }
    }
  }

  throw lastError || new Error("All models in the fallback ladder failed to generate content.");
}

// In-memory rate & quota limiter fallback (supplements Firestore user quota)
const userDailyQuotaMap = new Map<string, { count: number; date: string }>();

function checkAndIncrementQuota(uid: string, maxPerDay = 60): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split("T")[0];
  const record = userDailyQuotaMap.get(uid);

  if (!record || record.date !== today) {
    userDailyQuotaMap.set(uid, { count: 1, date: today });
    return { allowed: true, remaining: maxPerDay - 1 };
  }

  if (record.count >= maxPerDay) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxPerDay - record.count };
}

// --- API Endpoints ---

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 2. Chat / Reflection Turn with Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const {
      uid = "anonymous",
      userMessage = "",
      history = [],
      imageBase64,
      imageMimeType,
      audioBase64,
      audioMimeType,
      guidedPromptTitle,
    } = body;

    if (!userMessage && !imageBase64 && !audioBase64) {
      return res.status(400).json({ error: "No input content provided (message, image, or audio required)." });
    }

    // Quota Enforcement
    const quota = checkAndIncrementQuota(uid);
    if (!quota.allowed) {
      return res.status(429).json({
        error: "Daily reflection quota reached. Please return tomorrow to continue your mindfulness journey.",
      });
    }

    const systemInstruction = `You are Aura, an empathetic, psychologically grounded, and warm reflective journaling companion.
Your mission is to help the user process their thoughts, emotions, dilemmas, and daily experiences with safety, deep presence, and non-judgmental clarity.

Guidelines:
1. Provide active, compassionate listening and acknowledge emotions without generic platitudes or cliché advice.
2. Ask one insightful, gentle follow-up question that invites deeper introspection or cognitive reframing.
3. Keep responses conversational, balanced, and digestible (1-3 paragraphs maximum).
4. If an image or voice audio is attached, thoughtfully acknowledge the visual or spoken nuance.
5. If a starter prompt was selected, anchor your reflection in its emotional theme.
6. Never break character; treat all user thoughts as strictly confidential personal reflections.`;

    // Construct conversation content for Gemini
    const contents: any[] = [];

    // Append prior conversational context (last 8 turns for focused memory)
    if (Array.isArray(history) && history.length > 0) {
      const recentTurns = history.slice(-8);
      for (const turn of recentTurns) {
        if (turn.role && turn.content) {
          contents.push({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: turn.content }],
          });
        }
      }
    }

    // Prepare current user turn parts
    const currentParts: any[] = [];

    if (guidedPromptTitle) {
      currentParts.push({ text: `[Journal Focus / Prompt]: "${guidedPromptTitle}"\n` });
    }

    if (userMessage) {
      currentParts.push({ text: userMessage });
    }

    if (imageBase64) {
      const cleanImage = imageBase64.replace(/^data:[^;]+;base64,/, "");
      currentParts.push({
        inlineData: {
          mimeType: imageMimeType || "image/jpeg",
          data: cleanImage,
        },
      });
    }

    if (audioBase64) {
      const cleanAudio = audioBase64.replace(/^data:[^;]+;base64,/, "");
      currentParts.push({
        inlineData: {
          mimeType: audioMimeType || "audio/webm",
          data: cleanAudio,
        },
      });
    }

    contents.push({
      role: "user",
      parts: currentParts,
    });

    const { response, modelUsed } = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "I hear you deeply. Take a gentle breath as you reflect on this moment.";

    return res.json({
      reply: replyText,
      modelUsed,
      quotaRemaining: quota.remaining,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[/api/chat Error]:", err);
    return res.status(500).json({
      error: err?.message || "Failed to process reflection with Gemini. Please try again.",
    });
  }
});

// 3. Finalize & Summarize Entry (Title, Summary, Tags, Mood Score)
app.post("/api/finalize-entry", async (req, res) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const { fullConversation = [] } = body;

    if (!Array.isArray(fullConversation) || fullConversation.length === 0) {
      return res.status(400).json({ error: "Conversation history is required to summarize the entry." });
    }

    const conversationText = fullConversation
      .map((msg: any) => `${msg.role === "user" ? "User" : "Aura"}: ${msg.content}`)
      .join("\n\n");

    const prompt = `Analyze this journal entry reflection conversation and generate structured metadata for the user's personal archive.

Conversation:
${conversationText}

Produce a valid JSON object strictly matching this schema:
{
  "title": "A concise, evocative 3 to 6 word title summarizing the core reflection",
  "summary": "A compassionate 2 to 3 sentence synthesis of the reflection",
  "tags": ["2 to 4 high-level relevant tags like Gratitude, Career, Mindset, Health, Relationships, Creativity"],
  "moodScore": 7, // An integer from 1 (deep distress/sadness) to 5 (calm/neutral) to 10 (profound joy/fulfillment)
  "moodLabel": "A one-word or two-word mood description such as Peaceful, Motivated, Contemplative, Anxious, Uplifted, Grounded",
  "keyTakeaways": ["2 to 3 bulleted self-insights or affirmations derived from the conversation"]
}`;

    const { response } = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    let resultJson = {
      title: "Evening Reflection",
      summary: "A thoughtful pause examining today's moments and personal growth.",
      tags: ["Mindfulness", "Self-Care"],
      moodScore: 6,
      moodLabel: "Reflective",
      keyTakeaways: ["Taking space to breathe brings clarity."],
    };

    try {
      if (response.text) {
        resultJson = JSON.parse(response.text);
      }
    } catch (parseErr) {
      console.warn("Failed to parse JSON response from Gemini, using safe extraction", parseErr);
    }

    return res.json(resultJson);
  } catch (err: any) {
    console.error("[/api/finalize-entry Error]:", err);
    return res.status(500).json({
      error: err?.message || "Failed to generate entry synthesis.",
      fallback: {
        title: "Personal Reflection",
        summary: "A moment of mindful reflection and introspection.",
        tags: ["Reflection"],
        moodScore: 5,
        moodLabel: "Centered",
        keyTakeaways: ["Self-awareness is the first step toward lasting peace."],
      },
    });
  }
});

// 4. Generate Weekly / Monthly Recap Synthesis
app.post("/api/generate-recap", async (req, res) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const { entries = [], timeframe = "weekly" } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "No entries provided for recap synthesis." });
    }

    const entriesSummary = entries.slice(0, 15).map((e: any, idx: number) => {
      return `Entry ${idx + 1} (${e.createdAt || "Recent"}):
Title: ${e.title}
Mood: ${e.moodLabel} (Score: ${e.moodScore}/10)
Tags: ${(e.tags || []).join(", ")}
Summary: ${e.summary}`;
    }).join("\n---\n");

    const prompt = `You are an expert mindfulness and personal growth coach. Review the user's ${timeframe} journal entries and deliver a profound, empowering summary of their emotional evolution and mindset trends.

Past Entries:
${entriesSummary}

Output a structured JSON object with this exact schema:
{
  "headline": "A poetic and encouraging headline for this period",
  "emotionalArc": "A paragraph detailing how their emotions evolved over this timeframe",
  "dominantThemes": ["Top 3-4 recurrent themes identified across entries"],
  "celebratedWins": ["2-3 notable breakthroughs, moments of gratitude, or growth milestones"],
  "mindfulGuidance": "2-3 actionable, gentle suggestions for their next chapter",
  "averageMoodScore": 7.2
}`;

    const { response } = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    });

    let recapJson = {
      headline: `Your ${timeframe === "weekly" ? "Weekly" : "Monthly"} Growth Arc`,
      emotionalArc: "You have shown notable mindfulness in confronting challenges and creating space for balance.",
      dominantThemes: ["Self-Care", "Clarity", "Intentional Living"],
      celebratedWins: ["Maintained a consistent reflection habit", "Showed self-compassion during stress"],
      mindfulGuidance: "Continue honoring your need for rest and celebratory pauses.",
      averageMoodScore: 7,
    };

    try {
      if (response.text) {
        recapJson = JSON.parse(response.text);
      }
    } catch (e) {
      console.warn("Recap JSON parse error", e);
    }

    return res.json(recapJson);
  } catch (err: any) {
    console.error("[/api/generate-recap Error]:", err);
    return res.status(500).json({ error: err?.message || "Failed to generate recap." });
  }
});

// Vite Middleware Setup & Production Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
