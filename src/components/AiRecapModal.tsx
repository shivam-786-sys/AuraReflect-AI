import React, { useState } from "react";
import {
  X,
  Sparkles,
  Loader2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  Compass,
} from "lucide-react";
import { JournalEntry, RecapData } from "../types";
import { generateAiRecap } from "../lib/api";

interface AiRecapModalProps {
  entries: JournalEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const AiRecapModal: React.FC<AiRecapModalProps> = ({
  entries,
  isOpen,
  onClose,
}) => {
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly">("weekly");
  const [isLoading, setIsLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (selectedTimeframe = timeframe) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateAiRecap(entries, selectedTimeframe);
      setRecap(data);
    } catch (err: any) {
      console.error("Recap generation error:", err);
      setError(err.message || "Failed to generate AI recap. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#0c0a09]/95 border border-white/10 rounded-[32px] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto backdrop-blur-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-300 text-stone-950 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-light text-white/95">
              AI Mindset &amp; Growth Recap
            </h2>
            <p className="text-xs text-white/40">
              Synthesized by Gemini 3.6 Flash from your recent entries
            </p>
          </div>
        </div>

        {/* Timeframe Selector & Generate CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setTimeframe("weekly");
                handleGenerate("weekly");
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                timeframe === "weekly"
                  ? "bg-gradient-to-r from-orange-500 to-amber-300 text-stone-950 font-semibold shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Weekly Arc (7 Days)
            </button>
            <button
              onClick={() => {
                setTimeframe("monthly");
                handleGenerate("monthly");
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                timeframe === "monthly"
                  ? "bg-gradient-to-r from-orange-500 to-amber-300 text-stone-950 font-semibold shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Monthly Retrospective (30 Days)
            </button>
          </div>

          <button
            onClick={() => handleGenerate(timeframe)}
            disabled={isLoading || entries.length === 0}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-orange-300 font-medium text-xs flex items-center gap-2 border border-white/10 transition disabled:opacity-40 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Synthesis</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3.5 mb-6 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Recap Content */}
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/80 font-medium">
              Reviewing emotional themes across {entries.length} reflections...
            </p>
            <p className="text-xs text-white/40 mt-1">
              Gemini 3.6 Flash is tracing subtle shifts in your mindset.
            </p>
          </div>
        ) : recap ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Headline */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-white/5 to-amber-500/10 border border-orange-500/20 backdrop-blur-md">
              <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-medium block mb-1">
                Mindset Headline
              </span>
              <h3 className="text-lg font-serif text-white/95 font-light italic">
                "{recap.headline}"
              </h3>
            </div>

            {/* Emotional Arc */}
            <div>
              <h4 className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                <span>Emotional Evolution</span>
              </h4>
              <p className="text-sm text-white/80 leading-relaxed font-sans bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                {recap.emotionalArc}
              </p>
            </div>

            {/* Dominant Themes & Celebrated Wins */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <h5 className="text-xs font-medium text-white/90 mb-2 flex items-center gap-1.5 font-serif">
                  <BrainCircuit className="w-3.5 h-3.5 text-orange-300" />
                  <span>Dominant Themes</span>
                </h5>
                <ul className="space-y-1.5 text-xs text-white/60">
                  {recap.dominantThemes?.map((theme, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <span>{theme}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <h5 className="text-xs font-medium text-white/90 mb-2 flex items-center gap-1.5 font-serif">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Celebrated Wins</span>
                </h5>
                <ul className="space-y-1.5 text-xs text-white/60">
                  {recap.celebratedWins?.map((win, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{win}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Mindful Guidance */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 backdrop-blur-md">
              <h5 className="text-xs font-medium text-orange-300 mb-1.5 flex items-center gap-1.5 font-serif">
                <Compass className="w-3.5 h-3.5" />
                <span>Mindful Direction for Your Next Chapter</span>
              </h5>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
                {recap.mindfulGuidance}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-white/40 text-xs">
            Click "Generate Synthesis" above to generate your customized AI retrospective.
          </div>
        )}
      </div>
    </div>
  );
};
