import { JournalMessage, RecapData } from "../types";

export interface ChatResponse {
  reply: string;
  modelUsed?: string;
  quotaRemaining?: number;
  timestamp: string;
}

export interface FinalizeResponse {
  title: string;
  summary: string;
  tags: string[];
  moodScore: number;
  moodLabel: string;
  keyTakeaways: string[];
}

export async function sendChatMessage(params: {
  uid: string;
  userMessage: string;
  history: JournalMessage[];
  imageBase64?: string;
  imageMimeType?: string;
  audioBase64?: string;
  audioMimeType?: string;
  guidedPromptTitle?: string;
}): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: params.uid,
      userMessage: params.userMessage,
      history: params.history,
      imageBase64: params.imageBase64,
      imageMimeType: params.imageMimeType,
      audioBase64: params.audioBase64,
      audioMimeType: params.audioMimeType,
      guidedPromptTitle: params.guidedPromptTitle,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Reflection failed (status ${res.status})`);
  }

  return res.json();
}

export async function finalizeEntryWithGemini(
  fullConversation: JournalMessage[]
): Promise<FinalizeResponse> {
  const res = await fetch("/api/finalize-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullConversation }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (errData.fallback) return errData.fallback;
    throw new Error(errData.error || "Failed to generate entry synthesis.");
  }

  return res.json();
}

export async function generateAiRecap(
  entries: any[],
  timeframe: "weekly" | "monthly"
): Promise<RecapData> {
  const res = await fetch("/api/generate-recap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries, timeframe }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to generate recap.");
  }

  return res.json();
}
