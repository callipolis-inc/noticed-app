import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space, FieldNote } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { formatNoteDate, formatTimeOnly } from "@/lib/utils";
import { toSuperscriptNumber } from "../notes/TextHighlighter";
import {
  X,
  Printer,
  Copy,
  Check,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";

interface ManuscriptExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space;
  notes: FieldNote[];
  userName?: string;
  authorBio?: string;
}

type PaperFormat = "a4" | "a5";

export function ManuscriptExportModal({
  isOpen,
  onClose,
  space,
  notes,
  userName = "Author",
  authorBio,
}: ManuscriptExportModalProps) {
  const [paperFormat, setPaperFormat] = useState<PaperFormat>("a4");
  const [includeCover, setIncludeCover] = useState(true);
  const [includeIndex, setIncludeIndex] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeMarginalia, setIncludeMarginalia] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter out any archived notes & sort chronologically (oldest to newest for manuscript reading)
  const sortedNotes = useMemo(() => {
    return [...notes]
      .filter((n) => !n.archived)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [notes]);

  // Group notes by date
  const groupedPassages = useMemo(() => {
    const groups: { dateKey: string; notes: FieldNote[] }[] = [];
    const map = new Map<string, FieldNote[]>();

    for (const note of sortedNotes) {
      const key = formatNoteDate(note.createdAt);
      if (!map.has(key)) {
        map.set(key, []);
        groups.push({ dateKey: key, notes: map.get(key)! });
      }
      map.get(key)!.push(note);
    }
    return groups;
  }, [sortedNotes]);

  // Total statistics for folio metadata
  const totalWords = useMemo(() => {
    return sortedNotes.reduce((acc, note) => {
      const words = (note.content || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      return acc + words;
    }, 0);
  }, [sortedNotes]);

  if (!isOpen) return null;

  const handlePrint = () => {
    triggerSuccessHaptic();
    window.print();
  };

  const handleCopyMarkdown = async () => {
    triggerHaptic("medium");

    let md = `# ${space.name}\n`;
    if (space.description) md += `*${space.description}*\n\n`;
    md += `**Author:** ${userName}\n`;
    if (authorBio) md += `**Inscription:** ${authorBio}\n`;
    md += `**Date:** ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}\n\n`;
    md += `---\n\n`;

    if (includeIndex) {
      md += `## Table of Passages\n\n`;
      groupedPassages.forEach((group, gIdx) => {
        md += `### ${group.dateKey}\n`;
        group.notes.forEach((note, nIdx) => {
          const title =
            note.title ||
            note.content.split("\n")[0].slice(0, 50) ||
            "Photographic plate";
          md += `- ${gIdx + 1}.${nIdx + 1} ${title} (${formatTimeOnly(note.createdAt)})\n`;
        });
      });
      md += `\n---\n\n`;
    }

    groupedPassages.forEach((group) => {
      md += `## ${group.dateKey}\n\n`;
      group.notes.forEach((note) => {
        if (note.title) md += `### ${note.title}\n\n`;
        md += `${note.content}\n\n`;

        if (includeMarginalia && note.marginalia) {
          md += `> *Sidenote:* ${note.marginalia}`;
          if (note.quoteSource) md += ` — ${note.quoteSource}`;
          md += `\n\n`;
        }

        if (
          includePhotos &&
          note.photos &&
          note.photos.length > 0 &&
          note.photosMeta
        ) {
          note.photosMeta.forEach((meta, pIdx) => {
            if (meta?.caption) {
              md += `*[Plate #${pIdx + 1}: ${meta.caption}]*\n\n`;
            }
          });
        }
      });
      md += `---\n\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      triggerSuccessHaptic();
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center select-none manuscript-print-active-host">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-md manuscript-modal-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl h-[94dvh] sm:h-[90dvh] rounded-t-3xl sm:rounded-3xl apple-card shadow-2xl border border-[var(--glass-border)] flex flex-col overflow-hidden z-10"
        >
          {/* Top Control Bar */}
          <header className="px-4 sm:px-6 py-3.5 border-b border-[var(--glass-border)] bg-[var(--bg-elevated)]/90 backdrop-blur-md flex items-center justify-between shrink-0 manuscript-modal-controls z-20">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-[var(--text-secondary)] stroke-[2]" />
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                  Folio Manuscript Edition
                </h2>
                <p className="text-[11px] text-[var(--text-tertiary)] font-serif italic truncate max-w-[180px] sm:max-w-xs">
                  {space.name} · {sortedNotes.length} notices
                </p>
              </div>
            </div>

            {/* Actions Cluster */}
            <div className="flex items-center gap-2">
              {/* Paper Format Switcher */}
              <div className="hidden sm:flex items-center p-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--bg-base)]">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setPaperFormat("a4");
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider transition-all cursor-pointer ${
                    paperFormat === "a4"
                      ? "bg-[var(--text-primary)] text-[var(--bg-base)] font-bold shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  A4 FOLIO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setPaperFormat("a5");
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider transition-all cursor-pointer ${
                    paperFormat === "a5"
                      ? "bg-[var(--text-primary)] text-[var(--bg-base)] font-bold shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  A5 OCTAVO
                </button>
              </div>

              {/* Customization Options Toggle */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setShowOptions((v) => !v);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                  showOptions
                    ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-[var(--text-primary)] shadow-xs"
                    : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--glass-border)]"
                }`}
                title="Options"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Copy Markdown */}
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full inner-pseudo-glass text-xs font-medium text-[var(--text-primary)] hover:opacity-90 active:scale-95 transition-all cursor-pointer border border-[var(--glass-border)]"
                title="Copy Markdown"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                    <span className="text-emerald-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>Markdown</span>
                  </>
                )}
              </button>

              {/* Primary Print / Save PDF Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-base)] text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Print / PDF</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer border border-[var(--glass-border)] ml-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Options Drawer Sub-bar */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="px-4 sm:px-6 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--glass-border)] text-xs flex flex-wrap items-center gap-3 shrink-0 manuscript-modal-controls z-10"
              >
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                  Include in Folio:
                </span>

                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                    className="accent-stone-900 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Title Page & Ex Libris</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={includeIndex}
                    onChange={(e) => setIncludeIndex(e.target.checked)}
                    className="accent-stone-900 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Table of Contents</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={includePhotos}
                    onChange={(e) => setIncludePhotos(e.target.checked)}
                    className="accent-stone-900 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Polaroid Plates</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={includeMarginalia}
                    onChange={(e) => setIncludeMarginalia(e.target.checked)}
                    className="accent-stone-900 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Footnotes Apparatus</span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Folio Book Stage (Scrollable on screen, printable to native PDF) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 sm:py-10 bg-[#e7e4dc] dark:bg-[#0c0c0e] flex justify-center no-scrollbar">
            {/* The Physical Paper Sheet (Alabaster Cream Linen in Print) */}
            <div
              className={`w-full ${
                paperFormat === "a4" ? "max-w-[760px]" : "max-w-[620px]"
              } bg-[#fdfbf7] text-[#1c1917] rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-14 md:p-16 border border-stone-200/90 space-y-12 transition-all font-serif selection:bg-stone-300 selection:text-black manuscript-print-container`}
              style={{
                minHeight: "100%",
              }}
            >
              {/* ============================================================
                  1. FOLIO TITLE & EX LIBRIS PLATE (Halaman Judul Buku)
                  ============================================================ */}
              {includeCover && (
                <section className="text-center py-12 sm:py-16 border-b border-stone-300/80 space-y-8 manuscript-avoid-break">
                  <div className="space-y-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-stone-500">
                      Volume Folio Edition
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-serif font-normal tracking-tight text-stone-900 leading-[1.12]">
                      {space.name}
                    </h1>
                    {space.description && (
                      <p className="text-base text-stone-600 italic max-w-md mx-auto pt-2 leading-relaxed">
                        {space.description}
                      </p>
                    )}
                  </div>

                  {/* Ornamental Hairline Divider */}
                  <div className="w-16 h-px bg-stone-400 mx-auto" />

                  {/* Ex Libris Crest Box */}
                  <div className="max-w-xs mx-auto border border-stone-400/70 p-5 rounded-lg bg-[#faf8f2] space-y-2.5 shadow-xs">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-500 border-b border-stone-300/60 pb-1 font-semibold">
                      EX LIBRIS
                    </div>
                    <div className="text-lg font-serif font-medium text-stone-900">
                      {userName}
                    </div>
                    {authorBio && (
                      <p className="text-xs font-serif italic text-stone-600 leading-snug">
                        “{authorBio}”
                      </p>
                    )}
                  </div>

                  {/* Metadata Footer */}
                  <div className="pt-4 text-[11px] font-mono uppercase tracking-widest text-stone-400">
                    Compiled ·{" "}
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {totalWords} words
                  </div>
                </section>
              )}

              {/* ============================================================
                  2. TABLE OF PASSAGES (Daftar Isi / Chronicle Index)
                  ============================================================ */}
              {includeIndex && (
                <section className="py-6 space-y-6 border-b border-stone-300/80 manuscript-avoid-break">
                  <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                    <h3 className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-stone-900">
                      Table of Passages
                    </h3>
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-stone-500">
                      {groupedPassages.length} Chronological Entries
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    {groupedPassages.map((group, gIdx) => (
                      <div key={group.dateKey} className="space-y-1.5">
                        <div className="font-serif italic font-semibold text-stone-800 flex items-center justify-between">
                          <span>{group.dateKey}</span>
                          <span className="font-mono not-italic text-[10px] text-stone-400 uppercase">
                            {group.notes.length}{" "}
                            {group.notes.length === 1 ? "entry" : "entries"}
                          </span>
                        </div>

                        <div className="space-y-1 pl-2">
                          {group.notes.map((note, nIdx) => {
                            const label =
                              note.title ||
                              (note.content
                                ? note.content.split("\n")[0].slice(0, 54) +
                                  "…"
                                : "Photographic plate");
                            return (
                              <div
                                key={note.id}
                                className="flex items-baseline gap-2 text-stone-700"
                              >
                                <span className="font-mono text-[10px] text-stone-400 shrink-0">
                                  {gIdx + 1}.{nIdx + 1}
                                </span>
                                <span className="truncate max-w-[70%]">
                                  {label}
                                </span>
                                <span className="flex-1 border-b border-dotted border-stone-300 translate-y-[-3px]" />
                                <span className="font-mono text-[10px] text-stone-400 shrink-0">
                                  {formatTimeOnly(note.createdAt)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ============================================================
                  3. MANUSCRIPT NOTICES STREAM (Isi Catatan Alami)
                  ============================================================ */}
              <div className="space-y-12">
                {groupedPassages.map((group) => (
                  <article
                    key={group.dateKey}
                    className="space-y-8 manuscript-avoid-break pt-2"
                  >
                    {/* Date Section Header */}
                    <div className="border-b border-stone-300 pb-2 flex items-baseline justify-between">
                      <h2 className="font-serif text-lg font-bold tracking-tight text-stone-900">
                        {group.dateKey}
                      </h2>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
                        Folio Record
                      </span>
                    </div>

                    {/* Notes in Date Group */}
                    <div className="space-y-10">
                      {group.notes.map((note) => {
                        const notePhotos = note.photos || [];

                        return (
                          <div
                            key={note.id}
                            className="space-y-4 manuscript-avoid-break"
                          >
                            {/* Note Title if present */}
                            {note.title && (
                              <h3 className="font-serif text-xl font-bold tracking-tight text-stone-900 leading-snug">
                                {note.title}
                              </h3>
                            )}

                            {/* Main Body Text */}
                            {note.content && (
                              <div className="font-serif text-[15px] sm:text-[15.5px] leading-[1.7] text-stone-800 whitespace-pre-wrap">
                                {note.content}
                              </div>
                            )}

                            {/* Polaroid Photographic Plates */}
                            {includePhotos && notePhotos.length > 0 && (
                              <div className="pt-2 pb-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {notePhotos.map((photoUrl, pIdx) => {
                                    const meta = note.photosMeta?.[pIdx];
                                    const filterClass = meta?.filter
                                      ? `film-filter-${meta.filter}`
                                      : "";
                                    const isPolaroid =
                                      meta?.frameMode === "polaroid";

                                    return (
                                      <div
                                        key={pIdx}
                                        className={`rounded-xl overflow-hidden border border-stone-200 bg-white p-3 pb-4 shadow-xs space-y-2 manuscript-avoid-break ${
                                          isPolaroid ? "polaroid-frame-card" : ""
                                        }`}
                                      >
                                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-100">
                                          <img
                                            src={photoUrl}
                                            alt={`Plate ${pIdx + 1}`}
                                            className={`w-full h-full object-cover ${filterClass}`}
                                          />
                                        </div>
                                        {meta?.caption && (
                                          <p className="font-typewriter text-[11px] text-stone-700 pt-1 leading-tight truncate">
                                            {meta.caption}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Penguin Classics Footnotes Apparatus */}
                            {includeMarginalia &&
                              (note.marginalia ||
                                (note.marginaliaItems &&
                                  note.marginaliaItems.length > 0)) && (
                                <div className="pt-3 border-t border-stone-300/80 space-y-1.5 text-xs text-stone-600">
                                  {note.marginaliaItems &&
                                  note.marginaliaItems.length > 0 ? (
                                    note.marginaliaItems.map((m, mIdx) => (
                                      <div
                                        key={m.id || mIdx}
                                        className="leading-relaxed"
                                      >
                                        <span className="font-serif font-bold text-stone-900 mr-1.5">
                                          {toSuperscriptNumber(mIdx + 1)}
                                        </span>
                                        <span className="italic">
                                          {m.content}
                                        </span>
                                        {m.citation && (
                                          <span className="not-italic text-stone-500 font-sans ml-1.5 text-[11px]">
                                            — {m.citation}
                                          </span>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="leading-relaxed">
                                      <span className="font-serif font-bold text-stone-900 mr-1.5">
                                        ¹
                                      </span>
                                      <span className="italic">
                                        {note.marginalia}
                                      </span>
                                      {note.quoteSource && (
                                        <span className="not-italic text-stone-500 font-sans ml-1.5 text-[11px]">
                                          — {note.quoteSource}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>

              {/* Colophon & End of Manuscript */}
              <div className="pt-16 pb-6 text-center border-t border-stone-300 space-y-2 manuscript-avoid-break">
                <div className="font-serif italic text-sm text-stone-500">
                  End of Volume · {space.name}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">
                  Printed with Noticed — Sidenotes Literary Atelier
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
