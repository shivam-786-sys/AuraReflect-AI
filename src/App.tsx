import React, { useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  fbSignOut,
  onAuthStateChanged,
} from "./lib/firebase";
import { AppUser, JournalEntry, GuidedPrompt, UserStats } from "./types";
import {
  fetchUserEntries,
  saveJournalEntry,
  deleteJournalEntry,
  calculateUserStats,
} from "./lib/firestoreService";
import { Navbar } from "./components/Navbar";
import { LandingView } from "./components/LandingView";
import { DashboardView } from "./components/DashboardView";
import { EntryEditorView } from "./components/EntryEditorView";
import { EntryDetailView } from "./components/EntryDetailView";
import { AiRecapModal } from "./components/AiRecapModal";
import { ExportModal } from "./components/ExportModal";
import { DeleteAccountModal } from "./components/DeleteAccountModal";

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalEntries: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: "",
    averageMood: 0,
  });

  const [currentView, setCurrentView] = useState<"dashboard" | "editor" | "detail">("dashboard");
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [activeGuidedPrompt, setActiveGuidedPrompt] = useState<GuidedPrompt | null>(null);

  // Modals
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(appUser);
        loadUserEntries(appUser.uid);
      } else {
        // Check for local demo user session
        const demoUserJson = sessionStorage.getItem("aurareflect_demo_user");
        if (demoUserJson) {
          try {
            const demoUser = JSON.parse(demoUserJson);
            setUser(demoUser);
            loadUserEntries(demoUser.uid);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
          setEntries([]);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load entries for user
  const loadUserEntries = async (uid: string) => {
    try {
      const userEntries = await fetchUserEntries(uid);
      setEntries(userEntries);
      setStats(calculateUserStats(userEntries));
    } catch (err) {
      console.warn("Failed to load entries from Firestore:", err);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const appUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
      };
      sessionStorage.removeItem("aurareflect_demo_user");
      setUser(appUser);
      await loadUserEntries(appUser.uid);
      setCurrentView("dashboard");
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === "auth/popup-blocked") {
        setAuthError("Popup blocked by browser. Please allow popups or try the Instant Guest Preview.");
      } else if (err.code === "auth/unauthorized-domain") {
        setAuthError(
          "This domain is not yet authorized in Firebase Console. You can use 'Instant Guest Preview' right now."
        );
      } else {
        setAuthError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Demo / Guest Sign-in for immediate friction-free testing
  const handleDemoSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    const guestUid = "demo_guest_user";
    const demoUser: AppUser = {
      uid: guestUid,
      email: "guest.mindful@aurareflect.internal",
      displayName: "Mindful Explorer",
      photoURL: null,
      isDemo: true,
    };
    sessionStorage.setItem("aurareflect_demo_user", JSON.stringify(demoUser));
    setUser(demoUser);
    await loadUserEntries(guestUid);
    setCurrentView("dashboard");
    setAuthLoading(false);
  };

  // Sign Out
  const handleSignOut = async () => {
    sessionStorage.removeItem("aurareflect_demo_user");
    await fbSignOut(auth).catch(() => {});
    setUser(null);
    setEntries([]);
    setCurrentView("dashboard");
  };

  // Start New Entry
  const handleNewEntry = (prompt?: GuidedPrompt) => {
    if (!user) return;
    const newEntryId = "entry_" + Date.now();
    const newEntry: JournalEntry = {
      id: newEntryId,
      userId: user.uid,
      title: prompt ? prompt.title : "Evening Reflection",
      summary: "In progress...",
      tags: prompt ? [prompt.category] : ["Reflection"],
      moodScore: 0,
      moodLabel: "Reflective",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isClosed: false,
      messagesCount: 0,
      guidedPromptTitle: prompt?.title,
    };

    setActiveEntry(newEntry);
    setActiveGuidedPrompt(prompt || null);
    setCurrentView("editor");

    // Persist entry metadata shell
    saveJournalEntry(user.uid, newEntry).catch((e) =>
      console.warn("Initial entry shell save error", e)
    );
  };

  // Select existing entry to view detail
  const handleSelectEntry = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setCurrentView("detail");
  };

  // Continue an existing entry in editor
  const handleContinueEntry = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setCurrentView("editor");
  };

  // Close & Save Entry from editor
  const handleCloseAndSaveEntry = (updatedEntry: JournalEntry) => {
    setActiveEntry(updatedEntry);
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === updatedEntry.id);
      let nextList = [];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = updatedEntry;
      } else {
        nextList = [updatedEntry, ...prev];
      }
      setStats(calculateUserStats(nextList));
      return nextList;
    });
    setCurrentView("detail");
  };

  // Delete an entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== entryId);
        setStats(calculateUserStats(next));
        return next;
      });
      setCurrentView("dashboard");
    } catch (e) {
      console.error("Failed to delete entry:", e);
    }
  };

  // Handle Account Deletion
  const handleAccountDeleted = () => {
    setIsDeleteAccountOpen(false);
    sessionStorage.removeItem("aurareflect_demo_user");
    fbSignOut(auth).catch(() => {});
    setUser(null);
    setEntries([]);
    setCurrentView("dashboard");
  };

  return (
    <div className="min-h-screen text-white/90 selection:bg-orange-500 selection:text-stone-950">
      {/* Navigation Header */}
      <Navbar
        user={user}
        stats={stats}
        onSignOut={handleSignOut}
        onOpenRecap={() => setIsRecapOpen(true)}
        onOpenDeleteAccount={() => setIsDeleteAccountOpen(true)}
        currentView={currentView}
        onGoToDashboard={() => setCurrentView("dashboard")}
        onNewEntry={() => handleNewEntry()}
      />

      {/* Main Screen Router */}
      <main className="pb-16">
        {!user ? (
          <LandingView
            onGoogleSignIn={handleGoogleSignIn}
            onDemoSignIn={handleDemoSignIn}
            isLoading={authLoading}
            errorMessage={authError}
          />
        ) : currentView === "editor" && activeEntry ? (
          <EntryEditorView
            user={user}
            activeEntry={activeEntry}
            guidedPrompt={activeGuidedPrompt}
            onCloseAndSave={handleCloseAndSaveEntry}
            onBackToDashboard={() => {
              loadUserEntries(user.uid);
              setCurrentView("dashboard");
            }}
          />
        ) : currentView === "detail" && activeEntry ? (
          <EntryDetailView
            user={user}
            entry={activeEntry}
            onBack={() => {
              loadUserEntries(user.uid);
              setCurrentView("dashboard");
            }}
            onContinueEntry={handleContinueEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        ) : (
          <DashboardView
            user={user}
            entries={entries}
            stats={stats}
            onNewEntry={handleNewEntry}
            onSelectEntry={handleSelectEntry}
            onOpenExport={() => setIsExportOpen(true)}
            onDeleteEntry={handleDeleteEntry}
          />
        )}
      </main>

      {/* Modals */}
      <AiRecapModal
        entries={entries}
        isOpen={isRecapOpen}
        onClose={() => setIsRecapOpen(false)}
      />

      <ExportModal
        entries={entries}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {user && (
        <DeleteAccountModal
          userId={user.uid}
          isOpen={isDeleteAccountOpen}
          onClose={() => setIsDeleteAccountOpen(false)}
          onAccountDeleted={handleAccountDeleted}
        />
      )}
    </div>
  );
}
