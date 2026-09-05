import React from "react";
import { X, Download, Printer, FileText, CheckCircle2 } from "lucide-react";
import { JournalEntry } from "../types";

interface ExportModalProps {
  entries: JournalEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  entries,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  // Export full journal history as Markdown
  const handleDownloadAllMarkdown = () => {
    let md = `# My AuraReflect Mindfulness Journal Archive\n\n`;
    md += `*Exported on: ${new Date().toLocaleDateString()}*\n`;
    md += `*Total Reflections: ${entries.length}*\n\n---\n\n`;

    entries.forEach((e, idx) => {
      md += `## ${idx + 1}. ${e.title}\n`;
      md += `**Date:** ${new Date(e.createdAt).toLocaleDateString()} ${new Date(e.createdAt).toLocaleTimeString()}\n`;
      md += `**Mood Score:** ${e.moodScore}/10 (${e.moodLabel})\n`;
      md += `**Tags:** ${(e.tags || []).join(", ")}\n\n`;
      md += `### Summary\n${e.summary}\n\n`;
      if (e.keyTakeaways && e.keyTakeaways.length > 0) {
        md += `### Takeaways\n`;
        e.keyTakeaways.forEach((t) => (md += `- ${t}\n`));
        md += `\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aurareflect_full_journal_${new Date().toISOString().split("T")[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#0c0a09]/95 border border-white/10 rounded-[32px] shadow-2xl p-6 sm:p-8 backdrop-blur-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-300 text-stone-950 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-light text-white/95">
              Export Journal Data
            </h3>
            <p className="text-xs text-white/40">
              Complete ownership &amp; zero platform lock-in
            </p>
          </div>
        </div>

        <p className="text-xs text-white/60 mb-6 leading-relaxed font-sans">
          Export all {entries.length} reflections in your private vault. All metadata, summaries,
          mood scores, and tags are preserved in open Markdown.
        </p>

        <div className="space-y-3">
          <button
            id="export-download-md-btn"
            onClick={handleDownloadAllMarkdown}
            disabled={entries.length === 0}
            className="w-full p-3.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-300 hover:brightness-110 text-stone-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition disabled:opacity-40 cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.3)]"
          >
            <Download className="w-4 h-4" />
            <span>Download Full History (.md)</span>
          </button>

          <button
            id="export-print-pdf-btn"
            onClick={handlePrintPDF}
            className="w-full p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition cursor-pointer backdrop-blur-md"
          >
            <Printer className="w-4 h-4 text-white/40" />
            <span>Print or Save to PDF</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-white/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Compliant with open Markdown formats.</span>
        </div>
      </div>
    </div>
  );
};
