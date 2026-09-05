import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  BookOpen,
  Calendar,
  Smile,
  Search,
  Download,
  Flame,
  ArrowRight,
  Bell,
  BellRing,
  Filter,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { AppUser, JournalEntry, GuidedPrompt, UserStats } from "../types";
import { GUIDED_PROMPTS } from "../data/prompts";
import { MoodTrendChart } from "./MoodTrendChart";

interface DashboardViewProps {
  user: AppUser;
  entries: JournalEntry[];
  stats: UserStats;
  onNewEntry: (guidedPrompt?: GuidedPrompt) => void;
  onSelectEntry: (entry: JournalEntry) => void;
  onOpenExport: () => void;
  onDeleteEntry: (entryId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  entries,
  stats,
  onNewEntry,
  onSelectEntry,
  onOpenExport,
  onDeleteEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [featuredPromptIndex, setFeaturedPromptIndex] = useState(0);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(entries.flatMap((e) => e.tags || []).filter(Boolean))
  );

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      !searchQuery ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTag || (entry.tags || []).includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const getMoodBadge = (score: number, label: string) => {
    if (score >= 8) {
      return {
        className: "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20",
        label: `${Math.round(score * 10)}% ${label || "Calm"}`,
      };
    }
    if (score >= 5) {
      return {
        className: "text-orange-400 bg-orange-400/10 border border-orange-400/20",
        label: `${Math.round(score * 10)}% ${label || "Inspired"}`,
      };
    }
    return {
      className: "text-blue-400 bg-blue-400/10 border border-blue-400/20",
      label: `${Math.round(score * 10)}% ${label || "Reflective"}`,
    };
  };

  const currentPrompt = GUIDED_PROMPTS[featuredPromptIndex % GUIDED_PROMPTS.length];

  const handleNextPrompt = () => {
    setFeaturedPromptIndex((prev) => (prev + 1) % GUIDED_PROMPTS.length);
  };

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user.displayName ? user.displayName.split(" ")[0] : "Alex";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Immersive Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white/95 italic font-serif">
            {getGreetingTime()}, {firstName}.
          </h1>
          <p className="text-sm text-white/40">
            What's occupying your headspace today?
          </p>
        </div>

        {/* Action button & quick controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            id="dash-reminder-toggle-btn"
            onClick={() => setReminderEnabled(!reminderEnabled)}
            className={`p-2.5 rounded-full border text-xs flex items-center gap-2 transition cursor-pointer backdrop-blur-md ${
              reminderEnabled
                ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
            }`}
            title="Toggle daily evening reflection reminder"
          >
            {reminderEnabled ? (
              <>
                <BellRing className="w-4 h-4 text-orange-400" />
                <span className="hidden sm:inline">Nudge Active</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Daily Nudge</span>
              </>
            )}
          </button>

          <button
            id="dash-export-btn"
            onClick={onOpenExport}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs flex items-center gap-2 transition cursor-pointer backdrop-blur-md"
            title="Export full journal archive"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            id="dash-new-entry-btn"
            onClick={() => onNewEntry()}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-300 hover:brightness-110 text-stone-950 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>
        </div>
      </header>

      {/* Featured Immersive Starter Reflection Card */}
      <section className="bg-white/5 rounded-[32px] border border-white/10 p-8 sm:p-10 flex flex-col justify-center items-center text-center relative overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-0 bg-radial-at-t from-orange-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-orange-400/70 mb-3 font-medium">
          Starter Reflection • {currentPrompt.category}
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-white/90 max-w-2xl leading-relaxed mb-6 font-serif italic">
          "{currentPrompt.prompt}"
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
          <button
            onClick={() => onNewEntry(currentPrompt)}
            className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer border border-white/10 text-sm text-white font-medium shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            Answer this prompt
          </button>
          <button
            onClick={handleNextPrompt}
            className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white/50 hover:text-white/80 text-sm cursor-pointer transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try another</span>
          </button>
        </div>
      </section>

      {/* Insight, Mood Forecast & Streak Triple Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Gemini Insight */}
        <div className="bg-white/5 rounded-[32px] border border-white/10 p-6 flex flex-col justify-between backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-medium">
            Gemini Insight
          </div>
          <p className="text-xs sm:text-sm text-white/70 italic leading-relaxed font-serif">
            {stats.totalEntries > 0
              ? `"Your reflections reveal an emotional arc toward deeper clarity. Consider noting one moment of calm tonight."`
              : `"Welcome to your sanctuary. Begin by capturing whatever emotion is strongest in your awareness right now."`}
          </p>
          <div className="text-[10px] text-white/30 mt-4 tracking-wider uppercase">
            Adaptive Synthesis
          </div>
        </div>

        {/* Mood Forecast / Status */}
        <div className="bg-gradient-to-br from-orange-600/20 to-amber-600/10 rounded-[32px] border border-orange-500/20 p-6 flex flex-col justify-between backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-widest text-orange-200/60 mb-2 font-medium">
            Emotional Resonance
          </div>
          <div className="flex items-end justify-between my-2">
            <div>
              <div className="text-2xl sm:text-3xl font-light text-white font-serif">
                {stats.averageMood >= 8
                  ? "Elevated"
                  : stats.averageMood >= 5
                  ? "Balanced"
                  : "Reflective"}
              </div>
              <div className="text-xs text-orange-200/60 mt-0.5">
                {stats.averageMood > 0 ? `${stats.averageMood}/10 Average` : "Awaiting Entries"}
              </div>
            </div>
            {/* Ambient Equalizer Bars */}
            <div className="flex gap-1.5 items-end h-9 pb-1">
              <div className="w-1 h-3 bg-orange-500/40 rounded-full"></div>
              <div className="w-1 h-6 bg-orange-500/60 rounded-full"></div>
              <div className="w-1 h-8 bg-orange-500/90 rounded-full"></div>
              <div className="w-1 h-5 bg-orange-500/50 rounded-full"></div>
            </div>
          </div>
          <div className="text-[10px] text-orange-200/40 tracking-wider uppercase">
            Real-time Sentiment
          </div>
        </div>

        {/* Current Streak with Segmented Bars */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 flex flex-col justify-between backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-[0.1em] text-white/40 mb-2 font-medium">
            Current Streak
          </div>
          <div className="flex items-end gap-2 my-1">
            <span className="text-3xl sm:text-4xl font-light text-white font-serif">
              {stats.currentStreak}
            </span>
            <span className="text-xs text-white/60 mb-1.5 font-sans">Days mindful</span>
          </div>
          <div className="mt-3 flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className={`h-1 flex-1 rounded-full ${
                  day <= Math.min(stats.currentStreak, 7)
                    ? "bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mood Trend Chart */}
      <section className="bg-white/[0.03] border border-white/5 rounded-[32px] p-6 sm:p-8 backdrop-blur-md">
        <MoodTrendChart entries={entries} onSelectEntry={onSelectEntry} />
      </section>

      {/* Guided Prompts Grid */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <h2 className="text-lg font-serif font-light text-white/90">
              Curated Inquiries
            </h2>
          </div>
          <span className="text-[11px] text-white/40">
            Select a prompt to ignite your conversation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GUIDED_PROMPTS.map((gp) => (
            <div
              key={gp.id}
              onClick={() => onNewEntry(gp)}
              className="group p-5 rounded-2xl bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-orange-500/30 cursor-pointer transition flex flex-col justify-between backdrop-blur-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 text-orange-300 border border-white/10">
                    {gp.category}
                  </span>
                  <span className="text-white/30 text-[11px] group-hover:text-orange-300 transition flex items-center gap-0.5">
                    Reflect <ArrowRight className="w-3 h-3 inline" />
                  </span>
                </div>
                <h3 className="text-white/90 font-medium text-sm mb-1.5 group-hover:text-orange-200 transition font-serif">
                  {gp.title}
                </h3>
                <p className="text-white/50 text-xs line-clamp-2 leading-relaxed">
                  {gp.prompt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Past Entries Archive Section */}
      <section className="bg-white/[0.03] border border-white/5 rounded-[32px] p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">
              Journal History
            </div>
            <h2 className="text-xl font-serif font-light text-white/90">
              Saved Reflections Archive
            </h2>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="dash-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reflections..."
                className="pl-9 pr-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-6">
            <span className="text-[11px] text-white/40 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-xs transition cursor-pointer ${
                selectedTag === null
                  ? "bg-gradient-to-r from-orange-500 to-amber-300 text-stone-950 font-medium shadow-sm"
                  : "bg-white/5 text-white/50 hover:text-white border border-white/10"
              }`}
            >
              All ({entries.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs transition cursor-pointer ${
                  selectedTag === tag
                    ? "bg-gradient-to-r from-orange-500 to-amber-300 text-stone-950 font-medium shadow-sm"
                    : "bg-white/5 text-white/50 hover:text-white border border-white/10"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Entries Grid / List */}
        {filteredEntries.length === 0 ? (
          <div className="p-12 rounded-[24px] bg-white/[0.02] border border-white/5 text-center">
            <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-serif text-white/70 font-light mb-1">
              {searchQuery || selectedTag ? "No reflections match your filter" : "No reflections yet"}
            </h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto mb-5">
              {searchQuery || selectedTag
                ? "Try searching for a different keyword or clear the tag filter."
                : "Your thoughts and insights will be saved here in your private vault."}
            </p>
            <button
              onClick={() => onNewEntry()}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-300 text-stone-950 font-medium text-xs inline-flex items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Begin First Reflection</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const mood = getMoodBadge(entry.moodScore, entry.moodLabel);
              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className="group p-5 rounded-2xl bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${mood.className}`}
                      >
                        <Smile className="w-3 h-3" />
                        <span>{mood.label}</span>
                      </span>

                      <span className="text-[11px] text-white/40 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-white/30" />
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h3 className="text-base font-serif font-light text-white/95 group-hover:text-orange-200 transition truncate">
                      {entry.title}
                    </h3>

                    <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                      {entry.summary}
                    </p>

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {entry.tags.map((t, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/50"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs text-white/40 group-hover:text-orange-300 transition flex items-center gap-1">
                      Open thread →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
