import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FieldNote, Space, ThemePalette } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { formatNoteDate } from "@/lib/utils";
import { toSuperscriptNumber } from "./TextHighlighter";
import {
  X,
  Download,
  Share2,
  Check,
  MapPin,
  BookOpen,
  Film,
  RectangleVertical,
} from "lucide-react";

interface PhotostripModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: FieldNote | null;
  space?: Space;
  defaultTheme?: ThemePalette;
}

type CardAspectRatio = "4:5" | "9:16";
type CardLayoutMode = "excerpt" | "photostrip";

const PAPER_PALETTES: {
  id: ThemePalette;
  name: string;
  bg: string;
  cardBg: string;
  ink: string;
  sub: string;
  muted: string;
  border: string;
  isDark: boolean;
}[] = [
  {
    id: "alabaster",
    name: "Alabaster",
    bg: "#f7f5f0",
    cardBg: "#ffffff",
    ink: "#1c1917",
    sub: "#68625c",
    muted: "#9c948c",
    border: "rgba(28, 25, 23, 0.09)",
    isDark: false,
  },
  {
    id: "clean_white",
    name: "Clean White",
    bg: "#ffffff",
    cardBg: "#f8f8f9",
    ink: "#141416",
    sub: "#52525b",
    muted: "#94949e",
    border: "rgba(20, 20, 22, 0.08)",
    isDark: false,
  },
  {
    id: "sage",
    name: "Kyoto Matcha",
    bg: "#dbe6db",
    cardBg: "#e5efe5",
    ink: "#122416",
    sub: "#3e5443",
    muted: "#6b8270",
    border: "rgba(18, 36, 22, 0.12)",
    isDark: false,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    bg: "#111113",
    cardBg: "#19191d",
    ink: "#f4f4f6",
    sub: "#a1a1aa",
    muted: "#6e6e77",
    border: "rgba(255, 255, 255, 0.09)",
    isDark: true,
  },
  {
    id: "espresso",
    name: "Espresso",
    bg: "#1c1816",
    cardBg: "#25201d",
    ink: "#f5efe8",
    sub: "#b5a89d",
    muted: "#7d7168",
    border: "rgba(245, 239, 232, 0.09)",
    isDark: true,
  },
  {
    id: "oxford",
    name: "Oxford Navy",
    bg: "#101520",
    cardBg: "#151b29",
    ink: "#f1f5f9",
    sub: "#94a3b8",
    muted: "#64748b",
    border: "rgba(241, 245, 249, 0.1)",
    isDark: true,
  },
];

function wrapCanvasParagraphs(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];

  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p].trim();
    if (!para) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  return lines;
}

export function PhotostripModal({
  isOpen,
  onClose,
  note,
  space,
  defaultTheme = "alabaster",
}: PhotostripModalProps) {
  const [paperTheme, setPaperTheme] = useState<ThemePalette>(defaultTheme);
  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>("4:5");
  const [layoutMode, setLayoutMode] = useState<CardLayoutMode>("excerpt");
  const [isExporting, setIsExporting] = useState(false);
  const [exportedStatus, setExportedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && note) {
      setPaperTheme(defaultTheme);
      const hasMultiplePhotos = (note.photos?.length || 0) > 1;
      setLayoutMode(
        hasMultiplePhotos && !note.content ? "photostrip" : "excerpt",
      );
    }
  }, [isOpen, note, defaultTheme]);

  const footnotes = useMemo(() => {
    if (!note) return [];
    const list: {
      num: number;
      content: string;
      citation?: string;
      anchor?: string;
    }[] = [];

    if (note.marginaliaItems && note.marginaliaItems.length > 0) {
      note.marginaliaItems.forEach((m) => {
        list.push({
          num: list.length + 1,
          content: m.content,
          citation: m.citation,
          anchor: m.targetSentence,
        });
      });
    } else if (note.marginalia) {
      list.push({
        num: 1,
        content: note.marginalia,
        citation: note.quoteSource,
      });
    }

    if (note.highlights) {
      note.highlights
        .filter((h) => Boolean(h.marginalia))
        .forEach((h) => {
          list.push({
            num: list.length + 1,
            content: h.marginalia!,
            anchor: h.selectedText,
          });
        });
    }

    return list;
  }, [note]);

  if (!note) return null;

  const photos = note.photos || [];
  const hasPhotos = photos.length > 0;
  const activePalette =
    PAPER_PALETTES.find((p) => p.id === paperTheme) || PAPER_PALETTES[0];
  const isStory = aspectRatio === "9:16";

  const handleExport = async (mode: "download" | "share") => {
    triggerHaptic("medium");
    setIsExporting(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      const width = 1080;
      const padding = isStory ? 96 : 84;
      const innerWidth = width - padding * 2;
      const targetHeight = isStory ? 1920 : 1350;

      // Typography scaling
      const bodyFontSize = isStory ? 36 : 31;
      const bodyLineHeight = isStory ? 56 : 46;
      ctx.font = `${bodyFontSize}px 'Newsreader', Georgia, serif`;
      const bodyLines = note.content
        ? wrapCanvasParagraphs(ctx, note.content, innerWidth)
        : [];

      ctx.font = "italic 24px 'Newsreader', Georgia, serif";
      const footnoteLinesList = footnotes.map((fn) => {
        const prefix = `${toSuperscriptNumber(fn.num)} `;
        const fullText = fn.citation
          ? `${prefix}${fn.content} — ${fn.citation}`
          : `${prefix}${fn.content}`;
        return wrapCanvasParagraphs(ctx, fullText, innerWidth);
      });

      const photosToDraw =
        layoutMode === "photostrip" ? photos : hasPhotos ? [photos[0]] : [];
      const photoAspect = isStory ? 0.75 : 0.56;
      const photoHeight = Math.round(innerWidth * photoAspect);
      const photoGap = isStory ? 36 : 24;
      const totalPhotosHeight =
        photosToDraw.length > 0
          ? photosToDraw.length * photoHeight +
            (photosToDraw.length - 1) * photoGap +
            (isStory ? 44 : 28)
          : 0;

      const titleHeight = note.title ? (isStory ? 72 : 56) : 0;
      const bodyHeight =
        bodyLines.length > 0 ? bodyLines.length * bodyLineHeight + 32 : 0;
      const footnotesTotalLines = footnoteLinesList.reduce(
        (acc, l) => acc + l.length,
        0,
      );
      const footnotesHeight =
        footnotes.length > 0
          ? 48 + footnotesTotalLines * 36 + footnotes.length * 12
          : 0;

      const headerBlockHeight = isStory ? 190 : 145;
      const footerBlockHeight = isStory ? 140 : 110;
      const calculatedContentHeight =
        headerBlockHeight +
        totalPhotosHeight +
        titleHeight +
        bodyHeight +
        footnotesHeight +
        footerBlockHeight;

      const height = Math.max(targetHeight, calculatedContentHeight + 60);
      canvas.width = width;
      canvas.height = height;

      // Background fill
      ctx.fillStyle = activePalette.bg;
      ctx.fillRect(0, 0, width, height);

      // Inset archival border
      ctx.strokeStyle = activePalette.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      const extraVerticalSpace = Math.max(0, height - calculatedContentHeight);
      let currentY =
        padding + Math.round(extraVerticalSpace * (isStory ? 0.42 : 0.3));

      // Header
      ctx.fillStyle = activePalette.muted;
      ctx.font = "600 20px 'Urbanist', sans-serif";
      ctx.textAlign = "center";
      const spaceLabel = (space?.name || "FIELD NOTES").toUpperCase();
      const dateStr = formatNoteDate(note.createdAt).toUpperCase();
      ctx.fillText(`${spaceLabel}   ·   ${dateStr}`, width / 2, currentY);
      currentY += 34;

      if (note.locationName) {
        ctx.font = "italic 21px 'Newsreader', Georgia, serif";
        ctx.fillStyle = activePalette.sub;
        ctx.fillText(note.locationName, width / 2, currentY);
        currentY += 30;
      }

      currentY += 14;
      ctx.strokeStyle = activePalette.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 90, currentY);
      ctx.lineTo(width / 2 + 90, currentY);
      ctx.stroke();
      currentY += isStory ? 54 : 38;

      // Photos
      for (let i = 0; i < photosToDraw.length; i++) {
        const rawPhoto = photosToDraw[i];
        let resolvedSrc = rawPhoto;
        let blobUrlToRevoke: string | null = null;

        // If remote URL, pre-fetch as blob to guarantee no canvas tainting on export
        if (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://")) {
          try {
            const resp = await fetch(rawPhoto, { mode: "cors" });
            if (resp.ok) {
              const b = await resp.blob();
              resolvedSrc = URL.createObjectURL(b);
              blobUrlToRevoke = resolvedSrc;
            }
          } catch {
            // Keep original src if fetch fails
          }
        }

        const img = new Image();
        if (resolvedSrc.startsWith("http")) {
          img.crossOrigin = "anonymous";
        }
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = resolvedSrc;
        });

        if (blobUrlToRevoke) {
          URL.revokeObjectURL(blobUrlToRevoke);
        }

        ctx.fillStyle = activePalette.cardBg;
        ctx.fillRect(
          padding - 10,
          currentY - 10,
          innerWidth + 20,
          photoHeight + 20,
        );

        ctx.save();
        ctx.beginPath();
        ctx.rect(padding, currentY, innerWidth, photoHeight);
        ctx.clip();

        const meta = note.photosMeta?.[i];
        if (meta?.filter === "silver") {
          ctx.filter = "grayscale(100%) contrast(128%) brightness(96%)";
        } else if (meta?.filter === "trix") {
          ctx.filter =
            "grayscale(100%) contrast(112%) brightness(102%) sepia(10%)";
        } else if (meta?.filter === "sepia") {
          ctx.filter =
            "sepia(68%) contrast(106%) brightness(92%) hue-rotate(-12deg)";
        } else if (meta?.filter === "editorial") {
          ctx.filter = "saturate(65%) contrast(96%) brightness(104%)";
        }

        const imgAspect = (img.width || 4) / (img.height || 3);
        const targetImgAspect = innerWidth / photoHeight;
        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;

        if (imgAspect > targetImgAspect) {
          sWidth = img.height * targetImgAspect;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / targetImgAspect;
          sy = (img.height - sHeight) / 2;
        }

        if (img.width > 0 && img.height > 0) {
          ctx.drawImage(
            img,
            sx,
            sy,
            sWidth,
            sHeight,
            padding,
            currentY,
            innerWidth,
            photoHeight,
          );
        }
        ctx.filter = "none";
        ctx.restore();

        if (meta?.caption) {
          ctx.save();
          ctx.font = '400 12px "Courier Prime", monospace';
          ctx.fillStyle = activePalette.sub;
          ctx.textAlign = "center";
          ctx.fillText(meta.caption, width / 2, currentY + photoHeight + 14);
          ctx.restore();
        }

        currentY += photoHeight + (meta?.caption ? photoGap + 18 : photoGap);
      }

      if (photosToDraw.length > 0) {
        currentY += isStory ? 18 : 10;
      }

      // Title
      const align =
        note.textAlign === "center"
          ? "center"
          : note.textAlign === "right"
            ? "right"
            : "left";
      const textX =
        align === "center"
          ? width / 2
          : align === "right"
            ? width - padding
            : padding;

      if (note.title) {
        ctx.fillStyle = activePalette.ink;
        ctx.font = `bold ${isStory ? 42 : 36}px 'Newsreader', Georgia, serif`;
        ctx.textAlign = align;
        ctx.fillText(note.title, textX, currentY);
        currentY += isStory ? 60 : 48;
      }

      // Content
      if (bodyLines.length > 0) {
        ctx.fillStyle = activePalette.ink;
        ctx.font = `${bodyFontSize}px 'Newsreader', Georgia, serif`;
        ctx.textAlign = align;

        for (const line of bodyLines) {
          if (line === "") {
            currentY += Math.round(bodyLineHeight * 0.55);
          } else {
            ctx.fillText(line, textX, currentY);
            currentY += bodyLineHeight;
          }
        }
        currentY += 20;
      }

      // Footnotes
      if (footnotes.length > 0) {
        currentY += 12;
        ctx.strokeStyle = activePalette.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, currentY);
        ctx.lineTo(padding + 140, currentY);
        ctx.stroke();
        currentY += 38;

        ctx.textAlign = "left";
        ctx.font = "italic 24px 'Newsreader', Georgia, serif";
        ctx.fillStyle = activePalette.sub;

        footnoteLinesList.forEach((lines) => {
          lines.forEach((l) => {
            ctx.fillText(l, padding, currentY);
            currentY += 36;
          });
          currentY += 12;
        });
      }

      // Colophon
      ctx.fillStyle = activePalette.muted;
      ctx.font = "600 18px 'Urbanist', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "NOTICED   ·   FOR THINGS YOU DON'T WANT TO FORGET",
        width / 2,
        height - 64,
      );

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setExportedStatus("Export failed");
          setTimeout(() => setExportedStatus(null), 2500);
          return;
        }

        const fileName = `noticed-${aspectRatio.replace(":", "x")}-${note.id.substring(0, 6)}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        const isMobileDevice =
          typeof navigator !== "undefined" &&
          (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 2));

        // ========================================================
        // CASE 1: SAVE CARD (MOBILE GALLERY / CAMERA ROLL OR DESKTOP)
        // ========================================================
        if (mode === "download") {
          // On iOS/Android, native Web Share with files triggers the iOS/Android
          // system action sheet containing "Save Image" ("Simpan Gambar") directly into Photos/Gallery.
          if (
            isMobileDevice &&
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({ files: [file] })
          ) {
            try {
              await navigator.share({
                title: space?.name || "Noticed Excerpt",
                files: [file],
              });
              triggerSuccessHaptic();
              setExportedStatus("Saved to Gallery");
              setTimeout(() => setExportedStatus(null), 3000);
              return;
            } catch (err: unknown) {
              if (err instanceof Error && err.name === "AbortError") {
                // User dismissed native sheet
                return;
              }
            }
          }

          // Desktop fallback or when share is unavailable: anchor download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 200);

          triggerSuccessHaptic();
          setExportedStatus("Saved to device");
          setTimeout(() => setExportedStatus(null), 2500);
          return;
        }

        // ========================================================
        // CASE 2: SHARE (FILE -> TEXT -> CLIPBOARD COPY)
        // ========================================================
        if (mode === "share") {
          // 2.A: Native Share Sheet with Image File
          if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({ files: [file] })
          ) {
            try {
              await navigator.share({
                title: space?.name || "Noticed Excerpt",
                text: note.content || "for things you don't want to forget",
                files: [file],
              });
              triggerSuccessHaptic();
              setExportedStatus("Shared");
              setTimeout(() => setExportedStatus(null), 2500);
              return;
            } catch (err: unknown) {
              if (err instanceof Error && err.name === "AbortError") {
                return;
              }
            }
          }

          // 2.B: Native Share Sheet with Text/Title (if file sharing unsupported)
          if (navigator.share) {
            try {
              await navigator.share({
                title: space?.name || "Noticed Excerpt",
                text: `${note.title ? `${note.title}\n\n` : ""}${note.content || ""}\n\n— noticed`,
              });
              triggerSuccessHaptic();
              setExportedStatus("Shared");
              setTimeout(() => setExportedStatus(null), 2500);
              return;
            } catch (err: unknown) {
              if (err instanceof Error && err.name === "AbortError") {
                return;
              }
            }
          }

          // 2.C: Clipboard Fallback (Copy PNG Image to system clipboard)
          try {
            if (
              navigator.clipboard &&
              typeof (window as any).ClipboardItem !== "undefined"
            ) {
              const ClipboardItemClass = (window as any).ClipboardItem;
              await navigator.clipboard.write([
                new ClipboardItemClass({ "image/png": blob }),
              ]);
              triggerSuccessHaptic();
              setExportedStatus("Image copied to clipboard");
              setTimeout(() => setExportedStatus(null), 3000);
              return;
            }
          } catch {
            // Fall through to text clipboard copy
          }

          // 2.D: Text Clipboard Copy
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(
              `${note.title ? `${note.title}\n\n` : ""}${note.content || ""}\n\n— noticed`,
            );
            triggerSuccessHaptic();
            setExportedStatus("Excerpt copied to clipboard");
            setTimeout(() => setExportedStatus(null), 2500);
            return;
          }

          // 2.E: Desktop fallback: file download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 200);
          triggerSuccessHaptic();
          setExportedStatus("Saved to device");
          setTimeout(() => setExportedStatus(null), 2500);
        }
      }, "image/png");
    } catch (err) {
      console.error("Export error:", err);
      setExportedStatus("Export failed");
      setTimeout(() => setExportedStatus(null), 2500);
    } finally {
      setIsExporting(false);
    }
  };

  const previewPhotos =
    layoutMode === "photostrip" ? photos : hasPhotos ? [photos[0]] : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col justify-between bg-black/40 backdrop-blur-md"
        >
          {/* 1. Top Controls Bar: Twin Apple Dynamic Island Pods */}
          <div
            className="w-full max-w-xl mx-auto px-4 z-20 flex items-center justify-between gap-2.5"
            style={{
              paddingTop:
                "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
            }}
          >
            {/* Left Pod: Ratio & Layout Segments */}
            <div className="dynamic-island-shell p-1.5 flex items-center gap-1.5 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.2)]">
              <div className="dynamic-island-specular-rim" />

              {/* Layout Mode (if multiple photos) */}
              {photos.length > 1 && (
                <div className="apple-segmented-track">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setLayoutMode("excerpt");
                    }}
                    className={`apple-segmented-btn ${
                      layoutMode === "excerpt"
                        ? "apple-segmented-btn-active"
                        : ""
                    } flex items-center gap-1 !py-1 !px-2.5`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Excerpt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setLayoutMode("photostrip");
                    }}
                    className={`apple-segmented-btn ${
                      layoutMode === "photostrip"
                        ? "apple-segmented-btn-active"
                        : ""
                    } flex items-center gap-1 !py-1 !px-2.5`}
                  >
                    <Film className="w-3 h-3" />
                    <span>Strip</span>
                  </button>
                </div>
              )}

              {/* Aspect Ratio */}
              <div className="apple-segmented-track">
                {(["4:5", "9:16"] as CardAspectRatio[]).map((ratio) => {
                  const isActive = aspectRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setAspectRatio(ratio);
                      }}
                      className={`apple-segmented-btn ${
                        isActive ? "apple-segmented-btn-active" : ""
                      } flex items-center gap-1 !py-1 !px-2.5`}
                    >
                      <RectangleVertical
                        className={ratio === "9:16" ? "w-2.5 h-3.5" : "w-3 h-3"}
                      />
                      <span>{ratio}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pod: Jewel Themes & Close */}
            <div className="dynamic-island-shell p-1.5 flex items-center gap-2 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.2)]">
              <div className="dynamic-island-specular-rim" />

              {/* 5 Jewel Swatches */}
              <div className="flex items-center gap-1.5 px-0.5">
                {PAPER_PALETTES.map((p) => {
                  const isSelected = paperTheme === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setPaperTheme(p.id);
                      }}
                      className="relative w-6 h-6 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer group"
                      style={{
                        backgroundColor: p.bg,
                        boxShadow: isSelected
                          ? "0 4px 12px -1px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.4)"
                          : "0 2px 6px -1px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.35)",
                        border: isSelected
                          ? "1.5px solid rgba(255, 255, 255, 0.9)"
                          : "1px solid rgba(0, 0, 0, 0.08)",
                      }}
                      title={p.name}
                      aria-label={p.name}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/10 pointer-events-none" />
                      {isSelected && (
                        <Check
                          className={`w-3 h-3 stroke-[2.8] relative z-10 transition-transform scale-100 ${
                            p.isDark ? "text-white" : "text-neutral-800"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
          </div>

          {/* 2. Center Stage: Card Preview */}
          <div
            className="flex-1 overflow-y-auto no-scrollbar px-4 pt-2 pb-24 flex items-center justify-center"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
          >
            <motion.div
              layout
              key={`${paperTheme}-${layoutMode}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              style={{
                backgroundColor: activePalette.bg,
                color: activePalette.ink,
                borderColor: activePalette.border,
                aspectRatio:
                  layoutMode === "photostrip" && photos.length > 1
                    ? undefined
                    : isStory
                      ? "9 / 16"
                      : "4 / 5",
              }}
              className={`rounded-[28px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.32)] border flex flex-col justify-between transition-all duration-300 my-auto ${
                isStory
                  ? "w-full max-w-[280px] sm:max-w-[305px] p-5 sm:p-6"
                  : "w-full max-w-[340px] sm:max-w-[375px] p-5 sm:p-6"
              }`}
            >
              {/* Header */}
              <div
                className="text-center pb-3 space-y-1 border-b shrink-0"
                style={{ borderColor: activePalette.border }}
              >
                <div
                  className="text-[9.5px] font-sans font-semibold tracking-[0.18em] uppercase"
                  style={{ color: activePalette.muted }}
                >
                  {space?.name || "Field Notes"} ·{" "}
                  {formatNoteDate(note.createdAt)}
                </div>
                {note.locationName && (
                  <div
                    className="text-[10.5px] font-serif italic inline-flex items-center justify-center gap-1"
                    style={{ color: activePalette.sub }}
                  >
                    <MapPin className="w-2.5 h-2.5 inline" />
                    <span>{note.locationName}</span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div
                className={`my-auto flex flex-col justify-center ${
                  isStory ? "py-4 space-y-3.5" : "py-2.5 space-y-2.5"
                }`}
              >
                {previewPhotos.length > 0 && (
                  <div className="space-y-2.5">
                    {previewPhotos.map((src, index) => {
                      const meta = note.photosMeta?.[index];
                      const filterClass = meta?.filter
                        ? `film-filter-${meta.filter}`
                        : "";
                      return (
                        <div
                          key={index}
                          className="p-1.5 rounded-2xl shadow-xs"
                          style={{
                            backgroundColor: activePalette.cardBg,
                            border: `1px solid ${activePalette.border}`,
                          }}
                        >
                          <div
                            className={`relative rounded-xl overflow-hidden bg-black/5 ${
                              layoutMode === "photostrip"
                                ? "aspect-[4/3]"
                                : isStory
                                  ? "aspect-[4/3] max-h-[165px] w-full"
                                  : "aspect-[16/10] max-h-[130px] w-full"
                            }`}
                          >
                            <img
                              src={src}
                              alt={`Frame ${index + 1}`}
                              className={`w-full h-full object-cover transition-all duration-300 ${filterClass}`}
                            />
                            {meta?.hasGrain && (
                              <div className="film-grain-overlay" />
                            )}
                          </div>
                          {meta?.caption?.trim() && (
                            <p
                              className="font-typewriter text-[10.5px] text-center pt-1.5 opacity-85 truncate px-1"
                              style={{ color: activePalette.sub }}
                            >
                              {meta.caption}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {note.title && (
                  <h3
                    className={`font-serif font-bold leading-snug tracking-tight ${
                      isStory ? "text-[16px]" : "text-[15px]"
                    } ${
                      note.textAlign === "center"
                        ? "text-center"
                        : note.textAlign === "right"
                          ? "text-right"
                          : "text-left"
                    }`}
                  >
                    {note.title}
                  </h3>
                )}

                {note.content && (
                  <p
                    className={`font-serif whitespace-pre-wrap ${
                      isStory
                        ? "text-[13.5px] leading-[1.68] line-clamp-[9]"
                        : "text-[13px] leading-[1.58] line-clamp-[6]"
                    } ${
                      note.textAlign === "center"
                        ? "text-center"
                        : note.textAlign === "right"
                          ? "text-right"
                          : note.textAlign === "justify"
                            ? "text-justify"
                            : "text-left"
                    }`}
                  >
                    {note.content}
                    {footnotes.length > 0 && (
                      <span className="inline-flex items-baseline gap-0.5 ml-0.5 font-bold text-[10.5px] align-super opacity-75">
                        {footnotes
                          .map((fn) => toSuperscriptNumber(fn.num))
                          .join("")}
                      </span>
                    )}
                  </p>
                )}

                {/* Footnotes */}
                {footnotes.length > 0 && (
                  <div className="pt-1.5 space-y-1 text-left">
                    <div
                      className="w-10 h-px mb-1.5"
                      style={{ backgroundColor: activePalette.border }}
                    />
                    {footnotes.slice(0, 2).map((fn) => (
                      <div
                        key={fn.num}
                        className="text-[11px] leading-snug font-serif line-clamp-2"
                        style={{ color: activePalette.sub }}
                      >
                        <span
                          className="font-bold mr-1"
                          style={{ color: activePalette.ink }}
                        >
                          {toSuperscriptNumber(fn.num)}
                        </span>
                        {fn.anchor && (
                          <span className="italic opacity-80 mr-1">
                            "{fn.anchor}" —
                          </span>
                        )}
                        <span className="italic">{fn.content}</span>
                        {fn.citation && (
                          <span
                            className="font-mono text-[9.5px] uppercase tracking-wider ml-1.5 not-italic"
                            style={{ color: activePalette.muted }}
                          >
                            — {fn.citation}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Colophon */}
              <div
                className="pt-2.5 border-t flex items-center justify-between text-[9px] font-sans tracking-[0.18em] uppercase shrink-0"
                style={{
                  borderColor: activePalette.border,
                  color: activePalette.muted,
                }}
              >
                <span>NOTICED</span>
                <span>FOR THINGS YOU DON'T WANT TO FORGET</span>
              </div>
            </motion.div>
          </div>

          {/* 3. Floating Bottom Action Pill */}
          <div
            className="fixed bottom-0 left-0 right-0 pointer-events-none z-30 flex flex-col items-center justify-center px-4"
            style={{
              paddingBottom:
                "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
            }}
          >
            {exportedStatus && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="mb-2 px-3.5 py-1.5 rounded-full dynamic-island-shell text-[var(--text-primary)] text-xs font-medium flex items-center gap-1.5 shadow-lg pointer-events-auto border border-[var(--glass-border)]"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                <span>{exportedStatus}</span>
              </motion.div>
            )}

            <div className="pointer-events-auto p-1.5 rounded-full dynamic-island-shell border border-[var(--glass-border)] flex items-center gap-1.5 shadow-[0_20px_45px_-8px_rgba(0,0,0,0.32)]">
              <div className="dynamic-island-specular-rim" />

              <button
                type="button"
                onClick={() => handleExport("download")}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>{isExporting ? "Rendering..." : "Save Card"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport("share")}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-full inner-pseudo-glass text-[var(--text-primary)] text-xs font-medium active:scale-95 transition-transform disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5 stroke-[2]" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
