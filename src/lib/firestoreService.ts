import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { JournalEntry, JournalMessage, UserStats } from "../types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Strict Undefined-Stripping Utility
 * Removes all undefined keys to prevent Firestore driver serialization crashes.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// Local cache keys for offline fallback / demo resilience
const LOCAL_ENTRIES_KEY = "aurareflect_local_entries_";
const LOCAL_MESSAGES_KEY = "aurareflect_local_messages_";

export async function saveJournalEntry(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  const sanitized = stripUndefined(entry);

  // Always mirror in localStorage for immediate resilience
  try {
    const localList: JournalEntry[] = JSON.parse(
      localStorage.getItem(LOCAL_ENTRIES_KEY + userId) || "[]"
    );
    const existingIndex = localList.findIndex((e) => e.id === entry.id);
    if (existingIndex >= 0) {
      localList[existingIndex] = sanitized;
    } else {
      localList.unshift(sanitized);
    }
    localStorage.setItem(LOCAL_ENTRIES_KEY + userId, JSON.stringify(localList));
  } catch (err) {
    console.warn("Local storage mirror warning", err);
  }

  // If user is not an authenticated Firebase user (e.g., guest preview), local storage is authoritative
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  // Persist to Cloud Firestore for authenticated users
  const path = `users/${userId}/entries/${entry.id}`;
  try {
    const entryDocRef = doc(db, "users", userId, "entries", entry.id);
    await setDoc(entryDocRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveJournalMessage(
  userId: string,
  entryId: string,
  message: JournalMessage
): Promise<void> {
  const sanitized = stripUndefined(message);

  // Local storage mirror
  try {
    const key = `${LOCAL_MESSAGES_KEY}${userId}_${entryId}`;
    const localMsgs: JournalMessage[] = JSON.parse(
      localStorage.getItem(key) || "[]"
    );
    const idx = localMsgs.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
      localMsgs[idx] = sanitized;
    } else {
      localMsgs.push(sanitized);
    }
    localStorage.setItem(key, JSON.stringify(localMsgs));
  } catch (err) {
    console.warn("Local message mirror warning", err);
  }

  // If user is not an authenticated Firebase user (e.g., guest preview), local storage is authoritative
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  // Persist to Cloud Firestore: /users/{uid}/entries/{entryId}/messages/{messageId}
  const path = `users/${userId}/entries/${entryId}/messages/${message.id}`;
  try {
    const msgDocRef = doc(db, "users", userId, "entries", entryId, "messages", message.id);
    await setDoc(msgDocRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserEntries(userId: string): Promise<JournalEntry[]> {
  const path = `users/${userId}/entries`;

  // Fetch from Cloud Firestore if authenticated
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const entriesRef = collection(db, "users", userId, "entries");
      const q = query(entriesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });

      if (entries.length > 0) {
        localStorage.setItem(LOCAL_ENTRIES_KEY + userId, JSON.stringify(entries));
        return entries;
      }
    } catch (error) {
      console.warn("Firestore fetchUserEntries notice:", error);
    }
  }

  // Fallback to local cache
  try {
    const localCached = localStorage.getItem(LOCAL_ENTRIES_KEY + userId);
    if (localCached) {
      return JSON.parse(localCached);
    }
  } catch (e) {
    console.warn("Local storage read error", e);
  }

  return [];
}

export async function fetchEntryMessages(
  userId: string,
  entryId: string
): Promise<JournalMessage[]> {
  const path = `users/${userId}/entries/${entryId}/messages`;

  // Fetch from Cloud Firestore if authenticated
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const messagesRef = collection(db, "users", userId, "entries", entryId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "asc"));
      const snapshot = await getDocs(q);

      const messages: JournalMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push(docSnap.data() as JournalMessage);
      });

      if (messages.length > 0) {
        localStorage.setItem(`${LOCAL_MESSAGES_KEY}${userId}_${entryId}`, JSON.stringify(messages));
        return messages;
      }
    } catch (error) {
      console.warn("Firestore fetchEntryMessages notice:", error);
    }
  }

  // Fallback to local storage
  try {
    const localCached = localStorage.getItem(`${LOCAL_MESSAGES_KEY}${userId}_${entryId}`);
    if (localCached) {
      return JSON.parse(localCached);
    }
  } catch (e) {
    console.warn("Local storage read error", e);
  }

  return [];
}

export async function deleteJournalEntry(
  userId: string,
  entryId: string
): Promise<void> {
  // Delete from local cache
  try {
    const localList: JournalEntry[] = JSON.parse(
      localStorage.getItem(LOCAL_ENTRIES_KEY + userId) || "[]"
    );
    const updated = localList.filter((e) => e.id !== entryId);
    localStorage.setItem(LOCAL_ENTRIES_KEY + userId, JSON.stringify(updated));
    localStorage.removeItem(`${LOCAL_MESSAGES_KEY}${userId}_${entryId}`);
  } catch (err) {
    console.warn("Local cache delete error", err);
  }

  // If not authenticated, local deletion is sufficient
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  // Delete from Cloud Firestore
  const path = `users/${userId}/entries/${entryId}`;
  try {
    // Delete subcollection messages first
    const messagesRef = collection(db, "users", userId, "entries", entryId, "messages");
    const msgsSnap = await getDocs(messagesRef);
    const batch = writeBatch(db);
    msgsSnap.forEach((mDoc) => {
      batch.delete(mDoc.ref);
    });
    await batch.commit();

    // Delete entry doc
    const entryDocRef = doc(db, "users", userId, "entries", entryId);
    await deleteDoc(entryDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * GDPR-style Cascade Account & Data Deletion
 * Completely removes all entries, messages, and user profile data.
 */
export async function cascadeDeleteAccount(userId: string): Promise<void> {
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const entriesRef = collection(db, "users", userId, "entries");
      const entriesSnap = await getDocs(entriesRef);

      for (const entryDocSnap of entriesSnap.docs) {
        const entryId = entryDocSnap.id;
        const msgsRef = collection(db, "users", userId, "entries", entryId, "messages");
        const msgsSnap = await getDocs(msgsRef);
        const batch = writeBatch(db);
        msgsSnap.forEach((mDoc) => batch.delete(mDoc.ref));
        batch.delete(entryDocSnap.ref);
        await batch.commit();
      }

      // Delete user profile doc if present
      const userDocRef = doc(db, "users", userId);
      await deleteDoc(userDocRef);
    } catch (err) {
      console.warn("Firestore cascade delete warning (clearing local):", err);
    }
  }

  // Clear all local records for this user
  try {
    localStorage.removeItem(LOCAL_ENTRIES_KEY + userId);
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(LOCAL_MESSAGES_KEY + userId)) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn("Local clear error", e);
  }
}

/**
 * Compute user journaling streak and statistics
 */
export function calculateUserStats(entries: JournalEntry[]): UserStats {
  if (!entries || entries.length === 0) {
    return {
      totalEntries: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: "",
      averageMood: 0,
    };
  }

  // Sort dates descending
  const dateSet = new Set<string>();
  let totalMood = 0;
  let countWithMood = 0;

  for (const entry of entries) {
    if (entry.createdAt) {
      const datePart = entry.createdAt.split("T")[0];
      dateSet.add(datePart);
    }
    if (typeof entry.moodScore === "number" && entry.moodScore > 0) {
      totalMood += entry.moodScore;
      countWithMood += 1;
    }
  }

  const sortedDates = Array.from(dateSet).sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let currentStreak = 0;
  let cursor = new Date();

  // Check if active today or yesterday
  if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
    let checkDate = sortedDates.includes(today) ? today : yesterday;
    let curr = new Date(checkDate);
    
    while (true) {
      const str = curr.toISOString().split("T")[0];
      if (sortedDates.includes(str)) {
        currentStreak += 1;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    totalEntries: entries.length,
    currentStreak: Math.max(currentStreak, entries.length > 0 ? 1 : 0),
    bestStreak: Math.max(currentStreak, entries.length > 0 ? 1 : 0),
    lastActiveDate: sortedDates[0] || today,
    averageMood: countWithMood > 0 ? Number((totalMood / countWithMood).toFixed(1)) : 7.0,
  };
}
