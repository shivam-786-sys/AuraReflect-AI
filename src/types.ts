export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo?: boolean;
}

export interface JournalMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  imageBase64?: string;
  imageMimeType?: string;
  hasAudio?: boolean;
  audioDurationSeconds?: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary: string;
  tags: string[];
  moodScore: number; // 1 to 10 scale
  moodLabel: string; // e.g. "Grounded", "Reflective", "Joyful", "Anxious"
  keyTakeaways?: string[];
  createdAt: string;
  updatedAt: string;
  isClosed: boolean;
  messagesCount: number;
  guidedPromptTitle?: string;
}

export interface GuidedPrompt {
  id: string;
  category: "Gratitude" | "Emotional Processing" | "Growth & Mindset" | "Relationships" | "Daily Wind-Down";
  title: string;
  prompt: string;
  badge: string;
}

export interface RecapData {
  headline: string;
  emotionalArc: string;
  dominantThemes: string[];
  celebratedWins: string[];
  mindfulGuidance: string;
  averageMoodScore: number;
}

export interface UserStats {
  totalEntries: number;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string;
  averageMood: number;
}
