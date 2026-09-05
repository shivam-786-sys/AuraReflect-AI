import React from "react";
import { Sparkles, Flame, LogOut, ShieldCheck, BarChart3, Trash2, BookOpen } from "lucide-react";
import { AppUser, UserStats } from "../types";

interface NavbarProps {
  user: AppUser | null;
  stats: UserStats;
  onSignOut: () => void;
  onOpenRecap: () => void;
  onOpenDeleteAccount: () => void;
  currentView: "dashboard" | "editor" | "detail";
  onGoToDashboard: () => void;
  onNewEntry: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  stats,
  onSignOut,
  onOpenRecap,
  onOpenDeleteAccount,
  currentView,
  onGoToDashboard,
  onNewEntry,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/20 backdrop-blur-3xl border-b border-white/5 text-white/90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            id="nav-brand-btn"
            onClick={onGoToDashboard}
            className="flex items-center gap-3 text-left group hover:opacity-90 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-200 shadow-[0_0_15px_rgba(249,115,22,0.4)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-stone-950" />
            </div>
            <div>
              <span className="font-serif text-xl font-medium tracking-tight text-white/90 group-hover:text-orange-200 transition">
                Aura
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-[0.2em] text-white/40 border border-white/10 px-2 py-0.5 rounded-full">
                Immersive Space
              </span>
            </div>
          </button>
        </div>

        {/* Center / Stats (Only if logged in) */}
        {user && (
          <div className="hidden md:flex items-center gap-3">
            {/* Streak Counter */}
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-orange-300 backdrop-blur-md"
              title="Consecutive days of mindful reflection"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              <span className="font-semibold text-white">{stats.currentStreak}</span>
              <span className="text-white/40 text-[11px]">Days Streak</span>
            </div>

            {/* AI Recap CTA */}
            <button
              id="nav-ai-recap-btn"
              onClick={onOpenRecap}
              disabled={stats.totalEntries === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gemini Insight Recap</span>
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {currentView !== "editor" && (
                <button
                  id="nav-new-reflection-btn"
                  onClick={onNewEntry}
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-300 hover:brightness-110 text-stone-950 font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.3)] transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>New Reflection</span>
                </button>
              )}

              {/* User Avatar & Info */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
                {user.photoURL ? (
                  <div className="w-8 h-8 rounded-full border border-orange-500/30 p-0.5">
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border border-orange-500/30 p-0.5">
                    <div className="w-full h-full rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">
                      {(user.displayName || user.email || "AR").slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                )}

                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-white/90 truncate max-w-[110px]">
                    {user.displayName ? user.displayName.split(" ")[0] : "Reflector"}
                  </p>
                  <p className="text-[10px] text-white/40 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                    Encrypted
                  </p>
                </div>

                {/* Account & Data Management dropdown or direct action */}
                <button
                  id="nav-delete-account-btn"
                  onClick={onOpenDeleteAccount}
                  title="Manage Account & Delete Data (GDPR)"
                  className="p-1.5 rounded-xl text-white/40 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  id="nav-sign-out-btn"
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Isolated Vault
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
