import React, { useState } from "react";
import { X, AlertTriangle, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { cascadeDeleteAccount } from "../lib/firestoreService";

interface DeleteAccountModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  userId,
  isOpen,
  onClose,
  onAccountDeleted,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError("Please type DELETE to confirm data destruction.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await cascadeDeleteAccount(userId);
      onAccountDeleted();
    } catch (err: any) {
      console.error("Cascade delete error:", err);
      setError(err.message || "Failed to complete account deletion.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#0c0a09]/95 border border-red-900/50 rounded-[32px] shadow-2xl p-6 sm:p-8 backdrop-blur-2xl">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-5 right-5 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-light text-white/95">
              Delete Account &amp; Vault
            </h3>
            <p className="text-xs text-red-400 font-sans">
              GDPR Irreversible Cascade Deletion
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/40 text-xs text-white/70 mb-5 leading-relaxed backdrop-blur-md">
          <p className="mb-2">
            This action <strong className="text-white">permanently obliterates</strong> all your data from Cloud Firestore:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-white/50">
            <li>All journal entries and conversation logs</li>
            <li>All multi-modal photos and voice reflections</li>
            <li>All AI mood trend records and custom metadata</li>
          </ul>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-white/60 mb-2 font-medium">
            Type <span className="font-mono text-red-400 font-bold">DELETE</span> to confirm:
          </label>
          <input
            id="delete-account-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={isDeleting}
            className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm focus:border-red-500 focus:outline-none placeholder-white/30"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            id="delete-account-confirm-btn"
            onClick={handleDelete}
            disabled={isDeleting || confirmText.trim().toUpperCase() !== "DELETE"}
            className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting Vault...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Destroy Account &amp; Data</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs sm:text-sm transition cursor-pointer border border-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
