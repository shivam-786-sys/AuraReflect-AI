import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Download,
  Trash2,
  Tag,
  Smile,
  CheckCircle2,
  MessageSquare,
  Volume2,
  Share2,
} from "lucide-react";
import { AppUser, JournalEntry, JournalMessage } from "../types";
import { fetchEntryMessages, deleteJournalEntry } from "../lib/firestoreService";

interface EntryDetailViewProps {
  user: AppUser;
  entry: JournalEntry;
  onBack: () => void;
  onContinueEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
}

export const EntryDetailView: React.FC<EntryDetailViewProps> = ({
  user,
  entry,
  onBack,
  onContinueEntry,
  onDeleteEntry,
}) => {
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const msgs = await fetchEntryMessages(user.uid, entry.id);
        if (mounted) setMessages(msgs);
      } catch (e) {
        console.warn("Messages load error:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user.uid, entry.id]);

  // Export single entry as Markdown
  const handleExportMarkdown = () => {
    let md = `# ${entry.title}\n\n`;
    md += `**Date:** ${new Date(entry.createdAt).toLocaleDateString()} ${new Date(entry.createdAt).toLocaleTimeString()}\n`;
    md += `**Mood Score:** ${entry.moodScore}/10 (${entry.moodLabel})\n`;
    md += `**Tags:** ${(entry.tags || []).join(", ")}\n\n`;
    md += `## Summary\n${entry.summary}\n\n`;

    if (entry.keyTakeaways && entry.keyTakeaways.length > 0) {
      md += `## Key Insights & Takeaways\n`;
      entry.keyTakeaways.forEach((t) => {
        md += `- ${t}\n`;
      });
      md += `\n`;
    }

    md += `## Conversation Reflection\n\n`;
    messages.forEach((msg) => {
      const speaker = msg.role === "user" ? "You" : "Aura (Gemini 3.6 Flash)";
      md += `### ${speaker} (${new Date(msg.timestamp).toLocaleTimeString()})\n`;
      md += `${msg.content}\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entry.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_reflection.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getMoodColor = (score: number) => {
    if (score >= 8) return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
    if (score >= 5) return "bg-orange-400/10 text-orange-400 border-orange-400/20";
    return "bg-blue-400/10 text-blue-400 border-blue-400/20";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <button
          id="detail-back-btn"
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm text-white/70 hover:text-white transition px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reflections</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            id="detail-export-md-btn"
            onClick={handleExportMarkdown}
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            title="Download as Markdown"
          >
            <Download className="w-3.5 h-3.5 text-white/40" />
            <span>Export Markdown</span>
          </button>

          <button
            id="detail-continue-btn"
            onClick={() => onContinueEntry(entry)}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-300 text-stone-950 font-medium text-xs flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Continue Reflection</span>
          </button>

          <button
            id="detail-delete-btn"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-full text-white/40 hover:text-red-400 hover:bg-white/5 transition cursor-pointer"
            title="Delete Reflection"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete confirmation banner if clicked */}
      {showDeleteConfirm && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 flex items-center justify-between gap-4 text-xs animate-in fade-in backdrop-blur-md">
          <span className="text-red-200">
            Permanently delete this reflection and all messages from Firestore?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDeleteEntry(entry.id)}
              className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium cursor-pointer"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header Info Card */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-t from-orange-500/5 via-transparent to-transparent pointer-events-none"></div>

        <div className="flex flex-wrap items-center gap-2 mb-3 relative z-10">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getMoodColor(
              entry.moodScore
            )}`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>
              Mood: {entry.moodScore}/10 • {entry.moodLabel}
            </span>
          </span>

          <span className="text-xs text-white/40 flex items-center gap-1 ml-auto">
            <Calendar className="w-3 h-3 text-white/30" />
            {new Date(entry.createdAt).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif text-white/95 font-light mb-3 relative z-10">
          {entry.title}
        </h1>

        <p className="text-white/70 text-sm leading-relaxed mb-4 font-sans relative z-10">
          {entry.summary}
        </p>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4 relative z-10">
            {entry.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-0.5 rounded-full bg-white/5 text-white/60 text-xs flex items-center gap-1 border border-white/10"
              >
                <Tag className="w-3 h-3 text-white/40" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Key takeaways bullet list */}
        {entry.keyTakeaways && entry.keyTakeaways.length > 0 && (
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 mt-4 relative z-10 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Synthesized Takeaways</span>
            </div>
            <ul className="space-y-2 text-xs text-white/70">
              {entry.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Full Conversation Thread */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-orange-400" />
          <span>Full Conversation Thread ({messages.length} exchanges)</span>
        </h2>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-white/40">
            Loading archived messages from Cloud Firestore...
          </div>
        ) : messages.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-white/40">
            No messages recorded in this entry.
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`p-5 rounded-2xl border backdrop-blur-md ${
                  isUser
                    ? "bg-gradient-to-r from-orange-500/10 to-amber-500/5 border-orange-500/20 ml-4 sm:ml-12"
                    : "bg-white/5 border-white/10 mr-4 sm:mr-12"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                  <span
                    className={`font-medium ${
                      isUser ? "text-orange-400" : "text-emerald-400"
                    }`}
                  >
                    {isUser ? "You" : "Aura (Gemini 3.6 Flash)"}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {msg.imageBase64 && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-white/10 max-w-sm">
                    <img src={msg.imageBase64} alt="Attached reflection" className="w-full h-auto" />
                  </div>
                )}

                {msg.hasAudio && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] text-orange-300 font-mono mb-2">
                    <Volume2 className="w-3 h-3" />
                    <span>Voice Note ({msg.audioDurationSeconds || 0}s)</span>
                  </div>
                )}

                <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed font-sans">
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
