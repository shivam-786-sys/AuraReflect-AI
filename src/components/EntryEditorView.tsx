import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Volume2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { AppUser, JournalEntry, JournalMessage, GuidedPrompt } from "../types";
import { sendChatMessage, finalizeEntryWithGemini } from "../lib/api";
import { saveJournalEntry, saveJournalMessage } from "../lib/firestoreService";

interface EntryEditorViewProps {
  user: AppUser;
  activeEntry: JournalEntry;
  guidedPrompt?: GuidedPrompt | null;
  onCloseAndSave: (updatedEntry: JournalEntry) => void;
  onBackToDashboard: () => void;
}

export const EntryEditorView: React.FC<EntryEditorViewProps> = ({
  user,
  activeEntry,
  guidedPrompt,
  onCloseAndSave,
  onBackToDashboard,
}) => {
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Image attachment state
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with initial message or prompt
  useEffect(() => {
    // If brand new entry with prompt, initialize Aura's warm welcome
    if (messages.length === 0) {
      const initialAuraGreeting: JournalMessage = {
        id: "msg-welcome-" + Date.now(),
        role: "model",
        content: guidedPrompt
          ? `Welcome. I'm holding a quiet space for you. You've chosen to explore: **"${guidedPrompt.title}"**.\n\n*${guidedPrompt.prompt}*\n\nWhenever you feel ready, share what's on your mind or in your heart.`
          : "Welcome. Take a deep, gentle breath. This space is entirely yours, protected and private. What's unfolding for you today?",
        timestamp: new Date().toISOString(),
      };
      setMessages([initialAuraGreeting]);
      // Persist the welcome message
      saveJournalMessage(user.uid, activeEntry.id, initialAuraGreeting).catch((e) =>
        console.warn("Initial message sync:", e)
      );
    }
  }, [guidedPrompt, activeEntry.id, user.uid]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Image Upload Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorBanner("Please select an image smaller than 5MB.");
      return;
    }

    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setErrorBanner(null);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageBase64(null);
    setImageMimeType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Voice Note Recording Handlers
  const startAudioRecording = async () => {
    setErrorBanner(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorBanner(
          "Microphone recording is not supported in this browser environment. You can reflect seamlessly with text and photos."
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setAudioDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setAudioDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access notice:", err?.name, err?.message);
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "SecurityError" ||
        err?.message?.includes("Permission denied")
      ) {
        setErrorBanner(
          "Microphone permission was blocked by the browser or system. If running in an embedded preview, open in a new tab to grant microphone access, or continue reflecting seamlessly with text and photos."
        );
      } else {
        setErrorBanner(
          `Microphone unavailable (${err?.message || "Not available"}). Text and photo reflections are ready.`
        );
      }
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const cancelAudioRecording = () => {
    stopAudioRecording();
    setAudioBase64(null);
    setAudioDuration(0);
  };

  // Send Message & Receive Gemini Reflection
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = inputText.trim();
    if (!trimmed && !imageBase64 && !audioBase64) return;
    if (isSending) return;

    setErrorBanner(null);
    setIsSending(true);

    const userMsgId = "msg-user-" + Date.now();
    const newUserMessage: JournalMessage = {
      id: userMsgId,
      role: "user",
      content: trimmed || (audioBase64 ? "[Voice Reflection Attached]" : "[Photo Reflection Attached]"),
      timestamp: new Date().toISOString(),
      imageBase64: imageBase64 || undefined,
      imageMimeType: imageMimeType || undefined,
      hasAudio: Boolean(audioBase64),
      audioDurationSeconds: audioDuration || undefined,
    };

    // Stash current input buffers in case persistence fails
    const currentInputStash = trimmed;
    const currentImageStash = imageBase64;
    const currentAudioStash = audioBase64;

    try {
      // 1. Guaranteed Transaction Verification: persist user message to Firestore
      await saveJournalMessage(user.uid, activeEntry.id, newUserMessage);

      // Now safe to update local message list & clear input controls
      setMessages((prev) => [...prev, newUserMessage]);
      setInputText("");
      setImageBase64(null);
      setImageMimeType(null);
      setAudioBase64(null);
      setAudioDuration(0);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // 2. Call Gemini 3.6 Flash via server-side proxy
      const aiResponse = await sendChatMessage({
        uid: user.uid,
        userMessage: trimmed,
        history: [...messages, newUserMessage],
        imageBase64: currentImageStash || undefined,
        imageMimeType: imageMimeType || undefined,
        audioBase64: currentAudioStash || undefined,
        audioMimeType: "audio/webm",
        guidedPromptTitle: guidedPrompt?.title,
      });

      const modelMsgId = "msg-model-" + Date.now();
      const newModelMessage: JournalMessage = {
        id: modelMsgId,
        role: "model",
        content: aiResponse.reply,
        timestamp: aiResponse.timestamp || new Date().toISOString(),
      };

      // 3. Persist model response to Firestore
      await saveJournalMessage(user.uid, activeEntry.id, newModelMessage);
      setMessages((prev) => [...prev, newModelMessage]);

      // Update entry metadata with message count
      const updatedMeta: JournalEntry = {
        ...activeEntry,
        messagesCount: messages.length + 2,
        updatedAt: new Date().toISOString(),
      };
      await saveJournalEntry(user.uid, updatedMeta);
    } catch (err: any) {
      console.error("Message send failure:", err);
      // Restore input buffer so user never loses their thoughts!
      setInputText(currentInputStash);
      setImageBase64(currentImageStash);
      setAudioBase64(currentAudioStash);
      setErrorBanner(
        err.message || "Failed to save or reflect on your entry. Your draft has been preserved. Please retry."
      );
    } finally {
      setIsSending(false);
    }
  };

  // Finalize & Close Entry with Gemini Auto-Summary, Tags, and Mood Score
  const handleFinalizeEntry = async () => {
    if (messages.length === 0) {
      setErrorBanner("Write at least one reflection before closing the entry.");
      return;
    }

    setIsFinalizing(true);
    setErrorBanner(null);

    try {
      const summaryData = await finalizeEntryWithGemini(messages);

      const finalizedEntry: JournalEntry = {
        ...activeEntry,
        title: summaryData.title || activeEntry.title || "Reflective Journal",
        summary: summaryData.summary || "A mindful journal reflection.",
        tags: summaryData.tags && summaryData.tags.length > 0 ? summaryData.tags : ["Reflection"],
        moodScore: summaryData.moodScore || 7,
        moodLabel: summaryData.moodLabel || "Centered",
        keyTakeaways: summaryData.keyTakeaways || [],
        isClosed: true,
        messagesCount: messages.length,
        updatedAt: new Date().toISOString(),
      };

      // Save to Cloud Firestore
      await saveJournalEntry(user.uid, finalizedEntry);

      // Trigger celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#10b981", "#6366f1"],
      });

      onCloseAndSave(finalizedEntry);
    } catch (err: any) {
      console.error("Finalize error:", err);
      setErrorBanner("Failed to synthesize reflection summary. You can still save and exit.");
      // Provide fallback close
      const fallbackEntry: JournalEntry = {
        ...activeEntry,
        title: activeEntry.title || "Personal Reflection",
        summary: "A private moment of contemplation.",
        tags: ["Journal"],
        moodScore: 6,
        moodLabel: "Reflective",
        isClosed: true,
        messagesCount: messages.length,
        updatedAt: new Date().toISOString(),
      };
      await saveJournalEntry(user.uid, fallbackEntry).catch(() => {});
      onCloseAndSave(fallbackEntry);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="editor-back-btn"
            onClick={onBackToDashboard}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition cursor-pointer backdrop-blur-md"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-serif font-light text-white/95 flex items-center gap-2">
              <span>{guidedPrompt ? guidedPrompt.title : activeEntry.title || "Active Reflection"}</span>
              <span className="text-[10px] font-sans uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-orange-300">
                Live Turn
              </span>
            </h2>
            <p className="text-xs text-white/40 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Isolated in /users/{user.uid.slice(0, 8)}...
            </p>
          </div>
        </div>

        {/* Close & Finalize Action */}
        <button
          id="editor-finalize-btn"
          onClick={handleFinalizeEntry}
          disabled={isFinalizing || isSending}
          className="px-5 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-300 hover:brightness-110 text-stone-950 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition disabled:opacity-50 cursor-pointer"
        >
          {isFinalizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing Insights...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>Close &amp; Summarize</span>
            </>
          )}
        </button>
      </div>

      {/* Error / Warning Alert Banner */}
      {errorBanner && (
        <div className="mt-3 p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="p-1 text-white/50 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Conversational Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-200 text-stone-950 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.4)] mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed backdrop-blur-md ${
                  isUser
                    ? "bg-gradient-to-r from-orange-500 to-amber-300 text-stone-950 font-medium rounded-tr-none shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                    : "bg-white/5 border border-white/10 text-white/90 rounded-tl-none"
                }`}
              >
                {/* Photo thumbnail if present */}
                {msg.imageBase64 && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={msg.imageBase64}
                      alt="Reflection attachment"
                      className="max-h-60 w-auto object-cover"
                    />
                  </div>
                )}

                {/* Audio badge if voice note */}
                {msg.hasAudio && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 text-xs font-mono mb-2">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Voice Note ({msg.audioDurationSeconds || 0}s)</span>
                  </div>
                )}

                {/* Message Content */}
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                <div
                  className={`text-[10px] mt-2 text-right ${
                    isUser ? "text-stone-900/70" : "text-white/40"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Gemini Typing / Reflecting Indicator */}
        {isSending && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-200 text-stone-950 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.4)] mt-0.5 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 text-xs text-white/60 flex items-center gap-2 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              <span>Aura is reflecting on your thoughts with Gemini 3.6 Flash...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Previews */}
      {(imageBase64 || audioBase64 || isRecording) && (
        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl mb-3 flex flex-wrap items-center gap-3 shrink-0 backdrop-blur-md">
          {/* Image preview */}
          {imageBase64 && (
            <div className="relative group inline-block">
              <img
                src={imageBase64}
                alt="Selected"
                className="w-14 h-14 rounded-xl object-cover border border-white/20"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow hover:bg-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Voice recording in progress */}
          {isRecording && (
            <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>Recording Voice Note ({audioDuration}s)...</span>
              <button
                type="button"
                onClick={stopAudioRecording}
                className="px-2.5 py-0.5 rounded-full bg-red-800 hover:bg-red-700 text-white font-medium text-[11px]"
              >
                Done
              </button>
              <button
                type="button"
                onClick={cancelAudioRecording}
                className="text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Voice note ready to send */}
          {audioBase64 && !isRecording && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-orange-300">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Voice Note Recorded ({audioDuration}s)</span>
              <button
                type="button"
                onClick={() => {
                  setAudioBase64(null);
                  setAudioDuration(0);
                }}
                className="text-white/40 hover:text-red-400 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input Form Bar with Immersive Glass Pill Styling */}
      <form
        onSubmit={handleSendMessage}
        className="p-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 shrink-0 focus-within:border-orange-500/50 transition backdrop-blur-xl shadow-2xl"
      >
        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Image Attachment Trigger */}
        <button
          type="button"
          id="editor-attach-image-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach photo for multimodal reflection"
          className="p-2.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* Audio Recording Trigger */}
        <button
          type="button"
          id="editor-voice-note-btn"
          onClick={isRecording ? stopAudioRecording : startAudioRecording}
          title={isRecording ? "Stop recording" : "Record voice reflection"}
          className={`p-2.5 rounded-full transition cursor-pointer ${
            isRecording
              ? "bg-red-600 text-white animate-pulse"
              : "text-white/40 hover:text-white hover:bg-white/10"
          }`}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Input */}
        <input
          id="editor-input-field"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isRecording
              ? "Listening to voice input..."
              : "Share a thought, feeling, or moment..."
          }
          disabled={isSending || isFinalizing}
          className="flex-1 bg-transparent border-0 text-white placeholder-white/30 text-sm focus:outline-none px-3"
        />

        {/* Send Button */}
        <button
          id="editor-send-btn"
          type="submit"
          disabled={
            isSending ||
            isFinalizing ||
            (!inputText.trim() && !imageBase64 && !audioBase64)
          }
          className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-300 text-stone-950 font-medium transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.3)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
