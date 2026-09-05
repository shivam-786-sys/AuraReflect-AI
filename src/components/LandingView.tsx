import React from "react";
import { Sparkles, Shield, Lock, BrainCircuit, HeartHandshake, Database, ArrowRight, CheckCircle2 } from "lucide-react";

interface LandingViewProps {
  onGoogleSignIn: () => void;
  onDemoSignIn: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onGoogleSignIn,
  onDemoSignIn,
  isLoading,
  errorMessage,
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-12 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="max-w-3xl mx-auto text-center pt-6 sm:pt-10">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-amber-200 shadow-[0_0_25px_rgba(249,115,22,0.4)] flex items-center justify-center p-3 animate-pulse">
            <Sparkles className="w-7 h-7 text-stone-950" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-orange-300 text-[10px] uppercase tracking-[0.25em] font-medium mb-6 backdrop-blur-md">
          <span>Aura Reflection Space • Gemini 3.6 Flash</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-white/95 mb-6 leading-[1.15] italic">
          A sacred, private space for your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-amber-400 font-serif">
            inner dialogue
          </span>
          .
        </h1>

        <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed mb-10 max-w-2xl mx-auto">
          Converse with Gemini 3.6 Flash to unpack daily thoughts, trace emotional arcs,
          and surface self-compassion. Protected by strict Firestore user isolation rules.
        </p>

        {/* Authentication Call-to-Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-6">
          <button
            id="google-signin-btn"
            onClick={onGoogleSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-300 hover:brightness-110 text-stone-950 font-semibold text-sm flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <button
            id="demo-signin-btn"
            onClick={onDemoSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 font-medium text-sm flex items-center justify-center gap-2 transition hover:scale-[1.01] cursor-pointer"
          >
            <span>Instant Guest Preview</span>
            <ArrowRight className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs max-w-md mx-auto">
            {errorMessage}
          </div>
        )}

        {/* Security badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-white/40 mt-6">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Password Storage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-orange-400" />
            <span>Owner-Bound Firestore Rules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Server-Only Secret Manager</span>
          </div>
        </div>
      </div>

      {/* Feature Pillar Grid with Immersive Glass styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-16">
        <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition backdrop-blur-md">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mb-5 border border-orange-500/20">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Reflective AI</div>
          <h3 className="text-white/90 font-medium text-lg mb-2 font-serif">
            Non-Judgmental Co-Reflector
          </h3>
          <p className="text-white/60 text-xs leading-relaxed">
            Aura validates your feelings, offers cognitive reframing, and asks mindful questions
            to help you untangle complex days without superficial advice.
          </p>
        </div>

        <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition backdrop-blur-md">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/20">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Deep Synthesis</div>
          <h3 className="text-white/90 font-medium text-lg mb-2 font-serif">
            Auto-Synthesized Mood &amp; Insights
          </h3>
          <p className="text-white/60 text-xs leading-relaxed">
            Closing an entry automatically extracts key insights, 2-3 tags, a title, and a 1-10
            sentiment score to map your emotional trajectory over time.
          </p>
        </div>

        <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition backdrop-blur-md">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 border border-blue-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Absolute Privacy</div>
          <h3 className="text-white/90 font-medium text-lg mb-2 font-serif">
            GDPR Freedom &amp; Zero Lock-in
          </h3>
          <p className="text-white/60 text-xs leading-relaxed">
            Export any entry or full journal to Markdown or PDF at any time. Wipe your entire
            account and all data in a single irreversible action.
          </p>
        </div>
      </div>

      {/* Trust & Architecture Banner */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] text-white/30 uppercase tracking-[0.3em] gap-4 py-4 border-t border-white/5">
        <span>Cloud Sync Enabled</span>
        <span>Gemini 3.6 Flash Engine</span>
        <span>Secure Reflection Space</span>
      </footer>
    </div>
  );
};
