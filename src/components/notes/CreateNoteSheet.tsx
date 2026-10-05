import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space, FieldNote, TextAlign } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { generateId, formatTimeOnly } from "@/lib/utils";
import { compressImageFile } from "@/lib/storage";
import { processVideoFile } from "@/lib/mediaStorage";
import { TactileAudioRecorder, RecordedAudio } from "@/lib/audioRecorder";
import { InlineVideoPlayer } from "./InlineVideoPlayer";
import {
  X,
  Check,
  ChevronDown,
  Camera,
  Image as ImageIcon,
  Video,
  Mic,
  Square,
  Play,
  Pause,
  MapPin,
  Trash2,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Calendar,
  Clock,
} from "lucide-react";

function toDateInputString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInputString(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

interface CreateNoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: Space[];
  defaultSpaceId: string;
  defaultTextAlign?: TextAlign;
  editingNote?: FieldNote | null;
  onSaveNote: (note: FieldNote) => void;
  onUpdateNote?: (note: FieldNote) => void;
}

export function CreateNoteSheet({
  isOpen,
  onClose,
  spaces,
  defaultSpaceId,
  defaultTextAlign = "left",
  editingNote = null,
  onSaveNote,
  onUpdateNote,
}: CreateNoteSheetProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [textAlign, setTextAlign] = useState<TextAlign>(defaultTextAlign);
  const [selectedSpaceId, setSelectedSpaceId] = useState(defaultSpaceId);
  const [showSpacePicker, setShowSpacePicker] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);

  // Direct Inline Date & Time state
  const [noteDate, setNoteDate] = useState<string>(() =>
    toDateInputString(new Date()),
  );
  const [noteTime, setNoteTime] = useState<string>(() =>
    toTimeInputString(new Date()),
  );

  // Marginalia companion state
  const [isMarginaliaOpen, setIsMarginaliaOpen] = useState(false);
  const [marginaliaText, setMarginaliaText] = useState("");
  const [citationText, setCitationText] = useState("");
  const marginaliaTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(14).fill(15));
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(
    null,
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<TactileAudioRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync or reset form state whenever sheet opens or editingNote changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingNote) {
      setContent(editingNote.content || "");
      setTitle(editingNote.title || "");
      setTextAlign(editingNote.textAlign || defaultTextAlign);
      setSelectedSpaceId(editingNote.spaceId || defaultSpaceId);
      setLocationName(editingNote.locationName || "");
      setPhotos(editingNote.photos ? [...editingNote.photos] : []);
      setVideos(editingNote.videos ? [...editingNote.videos] : []);

      const firstMarg = editingNote.marginaliaItems?.[0];
      const margText = editingNote.marginalia || firstMarg?.content || "";
      const citText = editingNote.quoteSource || firstMarg?.citation || "";
      setMarginaliaText(margText);
      setCitationText(citText);
      setIsMarginaliaOpen(Boolean(margText || citText));

      if (editingNote.voiceMemo) {
        setRecordedAudio({
          blob: new Blob(),
          url: editingNote.voiceMemo.audioUrl || "",
          durationSeconds: editingNote.voiceMemo.durationSeconds,
        });
      } else {
        setRecordedAudio(null);
      }

      const d = new Date(editingNote.createdAt);
      const validDate = !isNaN(d.getTime()) ? d : new Date();
      setNoteDate(toDateInputString(validDate));
      setNoteTime(toTimeInputString(validDate));
    } else {
      setContent("");
      setTitle("");
      setTextAlign(defaultTextAlign);
      setSelectedSpaceId(defaultSpaceId);
      setLocationName("");
      setPhotos([]);
      setVideos([]);
      setVideoError(null);
      setMarginaliaText("");
      setCitationText("");
      setIsMarginaliaOpen(false);
      setRecordedAudio(null);
      const now = new Date();
      setNoteDate(toDateInputString(now));
      setNoteTime(toTimeInputString(now));
    }

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);
  }, [isOpen, editingNote, defaultSpaceId, defaultTextAlign]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioRecorderRef.current) audioRecorderRef.current.cancel();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const currentSpace =
    spaces.find((s) => s.id === selectedSpaceId) || spaces[0];

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const selectedFiles = Array.from(fileList);

    try {
      for (const file of selectedFiles) {
        const compressedDataUrl = await compressImageFile(file, 1600, 0.82);
        if (compressedDataUrl) {
          setPhotos((prev) => [...prev, compressedDataUrl]);
          triggerHaptic("light");
        }
      }
    } catch (err) {
      console.error("Error processing selected photo:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    triggerHaptic("light");
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVideoProcessing(true);
    setVideoError(null);
    try {
      const result = await processVideoFile(file);
      setVideos((prev) => [...prev, result.url]);
      triggerSuccessHaptic();
    } catch (err: any) {
      console.error("Video processing error:", err);
      setVideoError(err?.message || "Failed to process video");
      triggerHaptic("heavy");
      setTimeout(() => setVideoError(null), 4000);
    } finally {
      setIsVideoProcessing(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleRemoveVideo = (index: number) => {
    triggerHaptic("light");
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartRecording = async () => {
    triggerHaptic("medium");
    const recorder = new TactileAudioRecorder();
    audioRecorderRef.current = recorder;

    const started = await recorder.start((levels) => {
      setAudioLevels(levels);
    });

    if (started) {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
        setAudioLevels(
          Array.from({ length: 14 }, () => Math.floor(Math.random() * 65) + 15),
        );
      }, 1000);
    }
  };

  const handleStopRecording = async () => {
    triggerHaptic("medium");
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (audioRecorderRef.current) {
      const audioResult = await audioRecorderRef.current.stop();
      if (audioResult) {
        setRecordedAudio(audioResult);
      } else {
        setRecordedAudio({
          blob: new Blob(),
          url: "",
          durationSeconds: Math.max(1, recordingSeconds),
        });
      }
      audioRecorderRef.current = null;
    } else {
      setRecordedAudio({
        blob: new Blob(),
        url: "",
        durationSeconds: Math.max(1, recordingSeconds),
      });
    }

    setIsRecording(false);
    triggerSuccessHaptic();
  };

  const toggleAudioPlayback = () => {
    if (!recordedAudio) return;
    triggerHaptic("light");

    if (!recordedAudio.url) {
      setIsPlayingAudio(!isPlayingAudio);
      return;
    }

    if (!previewAudioRef.current) {
      const audio = new Audio(recordedAudio.url);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      previewAudioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      previewAudioRef.current.play().catch(console.error);
      setIsPlayingAudio(true);
    }
  };

  const handleSave = () => {
    if (
      !content.trim() &&
      !marginaliaText.trim() &&
      photos.length === 0 &&
      !recordedAudio
    ) {
      onClose();
      return;
    }

    triggerSuccessHaptic();

    // Parse custom Date & Time
    const parsedDate = new Date(`${noteDate}T${noteTime || "00:00"}`);
    const finalCreatedAt = !isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : editingNote?.createdAt || new Date().toISOString();

    if (editingNote && onUpdateNote) {
      const existingMarginaliaItems = editingNote.marginaliaItems || [];
      let updatedMarginaliaItems = existingMarginaliaItems;

      if (marginaliaText.trim()) {
        if (existingMarginaliaItems.length > 0) {
          updatedMarginaliaItems = [
            {
              ...existingMarginaliaItems[0],
              content: marginaliaText.trim(),
              citation: citationText.trim() || undefined,
            },
            ...existingMarginaliaItems.slice(1),
          ];
        } else {
          updatedMarginaliaItems = [
            {
              id: generateId(),
              content: marginaliaText.trim(),
              citation: citationText.trim() || undefined,
              createdAt: new Date().toISOString(),
            },
          ];
        }
      } else if (existingMarginaliaItems.length <= 1) {
        updatedMarginaliaItems = [];
      }

      const updatedNote: FieldNote = {
        ...editingNote,
        spaceId: selectedSpaceId,
        title: title.trim() || undefined,
        content: content.trim(),
        textAlign,
        marginalia: marginaliaText.trim() || undefined,
        quoteSource: citationText.trim() || undefined,
        marginaliaItems:
          updatedMarginaliaItems.length > 0
            ? updatedMarginaliaItems
            : undefined,
        locationName: locationName.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        videos: videos.length > 0 ? videos : undefined,
        voiceMemo: recordedAudio
          ? {
              durationSeconds: recordedAudio.durationSeconds,
              audioUrl: recordedAudio.url || undefined,
            }
          : undefined,
        createdAt: finalCreatedAt,
      };

      onUpdateNote(updatedNote);
      onClose();
      return;
    }

    const newNote: FieldNote = {
      id: generateId(),
      spaceId: selectedSpaceId,
      title: title.trim() || undefined,
      content: content.trim(),
      textAlign,
      marginalia: marginaliaText.trim() || undefined,
      quoteSource: citationText.trim() || undefined,
      marginaliaItems: marginaliaText.trim()
        ? [
            {
              id: generateId(),
              content: marginaliaText.trim(),
              citation: citationText.trim() || undefined,
              createdAt: new Date().toISOString(),
            },
          ]
        : undefined,
      locationName: locationName.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
      videos: videos.length > 0 ? videos : undefined,
      voiceMemo: recordedAudio
        ? {
            durationSeconds: recordedAudio.durationSeconds,
            audioUrl: recordedAudio.url || undefined,
          }
        : undefined,
      createdAt: finalCreatedAt,
    };

    onSaveNote(newNote);
    setContent("");
    setTitle("");
    setTextAlign(defaultTextAlign);
    setMarginaliaText("");
    setCitationText("");
    setIsMarginaliaOpen(false);
    setPhotos([]);
    setRecordedAudio(null);
    setLocationName("");
    onClose();
  };

  const canSave =
    content.trim().length > 0 ||
    marginaliaText.trim().length > 0 ||
    photos.length > 0 ||
    recordedAudio !== null;

  const previewDateObj = new Date(`${noteDate}T${noteTime || "00:00"}`);
  const validPreviewDate = !isNaN(previewDateObj.getTime())
    ? previewDateObj
    : new Date();
  const formattedPreviewTime = formatTimeOnly(validPreviewDate);
  const formattedPreviewDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(validPreviewDate);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none">
          {/* Ambient Dimming Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
          />

          {/* Top Floating High-Density Liquid Glass Modal */}
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="
              pointer-events-auto relative w-full max-w-md
              rounded-[32px] overflow-hidden z-10 flex flex-col
              bg-white/95 dark:bg-[#18181c]/95
              backdrop-blur-[40px] saturate-[190%]
              border border-[var(--glass-border)]
              shadow-[0_28px_64px_-12px_rgba(0,0,0,0.24),0_8px_24px_-4px_rgba(0,0,0,0.08)]
              text-[var(--text-primary)]
            "
            style={{
              marginTop:
                "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
              maxHeight:
                "calc(100dvh - max(calc(env(safe-area-inset-top, 0px) + 12px), 20px) - 24px)",
            }}
          >
            {/* Top Specular Rim Reflection */}
            <div className="dynamic-island-specular-rim" />

            {/* Hidden Inputs for Gallery & Camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onClick={(e) => e.stopPropagation()}
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onClick={(e) => e.stopPropagation()}
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onClick={(e) => e.stopPropagation()}
              onChange={handleVideoSelect}
              className="hidden"
            />

            {/* 1. Header Bar */}
            <header className="px-5 py-3.5 border-b border-[var(--glass-border)]/50 flex items-center justify-between gap-3 shrink-0 relative z-10">
              {/* Left Metadata: Space Picker & Date/Time */}
              <div className="flex flex-col min-w-0">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setShowSpacePicker(!showSpacePicker);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 transition-opacity cursor-pointer group"
                  >
                    <span className="truncate max-w-[160px]">
                      {currentSpace?.name || "Field Notes"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
                  </button>

                  {/* Space Dropdown */}
                  {showSpacePicker && (
                    <div className="absolute top-7 left-0 z-50 w-52 rounded-2xl bg-white dark:bg-[#202024] border border-[var(--glass-border)] shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150">
                      {spaces.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setSelectedSpaceId(s.id);
                            setShowSpacePicker(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            s.id === selectedSpaceId
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs"
                              : "text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          {s.id === selectedSpaceId && (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline Date & Time */}
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] font-sans not-italic mt-0.5 select-none">
                  <label
                    className="relative inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                    title="Change date"
                  >
                    <Calendar className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                    <input
                      type="date"
                      value={noteDate}
                      onChange={(e) => setNoteDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span>{formattedPreviewDate}</span>
                  </label>

                  <span className="opacity-40">·</span>

                  <label
                    className="relative inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                    title="Change time"
                  >
                    <Clock className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                    <input
                      type="time"
                      value={noteTime}
                      onChange={(e) => setNoteTime(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span>{formattedPreviewTime}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      const now = new Date();
                      setNoteDate(toDateInputString(now));
                      setNoteTime(toTimeInputString(now));
                    }}
                    className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors ml-0.5 cursor-pointer font-semibold"
                    title="Reset to current time"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Right Action Cluster */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.2]" />
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="px-3.5 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 active:scale-95 transition-transform cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                  title={editingNote ? "Save changes" : "Notice into timeline"}
                >
                  <span>{editingNote ? "Save" : "Notice"}</span>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </header>

            {/* 2. Writing Pad Content */}
            <main className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col gap-3 relative z-10">
              {/* Location Tag */}
              {locationName && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-sans">
                  <MapPin className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                  <span
                    onClick={() => setIsEditingLocation(true)}
                    className="cursor-pointer hover:underline"
                  >
                    {locationName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setLocationName("");
                    }}
                    className="p-0.5 text-[var(--text-tertiary)] hover:text-rose-500 transition-colors ml-0.5 cursor-pointer"
                    title="Remove location"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Location Editing Input */}
              {isEditingLocation && (
                <div className="p-3 rounded-2xl apple-card flex items-center gap-2 animate-in fade-in duration-150">
                  <MapPin className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Kyoto, Kansai, Tuaran..."
                    autoFocus
                    className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingLocation(false)}
                    className="text-xs font-semibold text-[var(--text-primary)] px-2.5 py-1 rounded-lg inner-pseudo-glass cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Title Field */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title..."
                className={`w-full bg-transparent border-0 p-0 text-[18px] sm:text-[20px] font-serif font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/40 focus:outline-none tracking-tight ${
                  textAlign === "center"
                    ? "text-center"
                    : textAlign === "right"
                      ? "text-right"
                      : "text-left"
                }`}
              />

              {/* Main Content Area */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What caught your eye today?"
                rows={6}
                className={`w-full bg-transparent resize-none border-0 p-0 text-[16px] sm:text-[17px] leading-relaxed font-content text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 placeholder:font-serif placeholder:italic focus:outline-none ${
                  textAlign === "center"
                    ? "text-center"
                    : textAlign === "right"
                      ? "text-right"
                      : textAlign === "justify"
                        ? "text-justify"
                        : "text-left"
                }`}
              />

              {/* Companion Sidenote Field */}
              {(isMarginaliaOpen || marginaliaText) && (
                <div className="p-3.5 rounded-2xl apple-card space-y-2 mt-1 animate-in fade-in duration-150 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <div className="flex items-center justify-between text-[11px] font-sans font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                      <span className="marginalia-stamp font-serif font-bold text-xs">
                        ¹
                      </span>
                      <span>Companion Sidenote</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        if (!marginaliaText.trim() && !citationText.trim()) {
                          setIsMarginaliaOpen(false);
                        } else {
                          setMarginaliaText("");
                          setCitationText("");
                          setIsMarginaliaOpen(false);
                        }
                      }}
                      className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-0.5 cursor-pointer"
                      title="Remove sidenote"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    ref={marginaliaTextareaRef}
                    value={marginaliaText}
                    onChange={(e) => setMarginaliaText(e.target.value)}
                    placeholder="Side commentary, footnote, or companion thought..."
                    rows={3}
                    className="w-full bg-transparent resize-none border-0 p-0 text-[13.5px] leading-relaxed font-serif italic text-[var(--text-secondary)] placeholder:text-[var(--text-tertiary)]/40 focus:outline-none"
                  />

                  <div className="pt-2 border-t border-[var(--glass-border)]/50 flex items-center gap-2">
                    <span className="text-[10px] font-sans uppercase tracking-wider text-[var(--text-tertiary)] select-none">
                      Citation:
                    </span>
                    <input
                      type="text"
                      value={citationText}
                      onChange={(e) => setCitationText(e.target.value)}
                      placeholder="e.g. Orwell (1945), p. 42 (optional)"
                      className="flex-1 bg-transparent border-0 p-0 text-[12px] font-sans text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/40 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Photo Previews */}
              {photos.length > 0 && (
                <div className="mt-2 space-y-3">
                  {photos.length === 1 && (
                    <div className="relative rounded-2xl overflow-hidden shadow-sm border border-[var(--glass-border)] aspect-[4/3] group">
                      <img
                        src={photos[0]}
                        alt="Captured moment"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            fileInputRef.current?.click();
                          }}
                          className="px-2.5 py-1 rounded-full bg-black/65 text-white text-[11px] font-sans font-medium flex items-center gap-1 hover:bg-black/85 active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs"
                          title="Add another photo"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(0)}
                          className="w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/85 active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {photos.length === 2 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2.5">
                        {photos.map((p, idx) => (
                          <div
                            key={idx}
                            className="relative rounded-2xl overflow-hidden shadow-sm border border-[var(--glass-border)] aspect-[3/4] group"
                          >
                            <img
                              src={p}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/85 active:scale-95 transition-all cursor-pointer shadow-sm"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          fileInputRef.current?.click();
                        }}
                        className="w-full py-2 rounded-xl inner-pseudo-glass border border-dashed border-[var(--glass-border)] flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Photo</span>
                      </button>
                    </div>
                  )}

                  {photos.length >= 3 && (
                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                      {photos.map((p, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-2xl overflow-hidden shadow-sm border border-[var(--glass-border)] w-36 aspect-[3/4] shrink-0 group"
                        >
                          <img
                            src={p}
                            alt={`Filmstrip ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 aspect-[3/4] rounded-2xl inner-pseudo-glass border-2 border-dashed border-[var(--glass-border)] flex flex-col items-center justify-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[10px] font-medium">Add</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Video Previews */}
              {videos.length > 0 && (
                <div className="mt-2 space-y-3">
                  {videos.map((vid, idx) => (
                    <div key={idx} className="relative group">
                      <InlineVideoPlayer src={vid} className="w-full max-h-72" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveVideo(idx);
                        }}
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/85 active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs z-30"
                        title="Remove video"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Video Processing or Error Toast */}
              {isVideoProcessing && (
                <div className="mt-2 p-2.5 rounded-xl apple-card text-xs text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--text-primary)] animate-ping" />
                  <span>Processing video clip...</span>
                </div>
              )}
              {videoError && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-sans">
                  {videoError}
                </div>
              )}

              {/* Voice Memo Capsule */}
              {recordedAudio && (
                <div className="mt-2 p-3 rounded-2xl apple-card shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={toggleAudioPlayback}
                      className="w-8 h-8 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        Voice Memo
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
                        0:
                        {recordedAudio.durationSeconds
                          .toString()
                          .padStart(2, "0")}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setRecordedAudio(null);
                    }}
                    className="p-2 text-[var(--text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer"
                    title="Delete voice memo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </main>

            {/* 3. Bottom Action Bar */}
            <footer className="px-4 py-2.5 border-t border-[var(--glass-border)]/50 flex items-center justify-between gap-2 shrink-0 relative z-10">
              {!isRecording ? (
                <div className="flex items-center justify-between w-full">
                  {/* Media Tool Icons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        fileInputRef.current?.click();
                      }}
                      className="w-7.5 h-7.5 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer"
                      title="Add photos"
                    >
                      <ImageIcon className="w-3.5 h-3.5 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        cameraInputRef.current?.click();
                      }}
                      className="w-7.5 h-7.5 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer"
                      title="Take photo"
                    >
                      <Camera className="w-3.5 h-3.5 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        videoInputRef.current?.click();
                      }}
                      disabled={isVideoProcessing}
                      className="w-7.5 h-7.5 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
                      title="Add short video clip"
                    >
                      <Video className="w-3.5 h-3.5 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="w-7.5 h-7.5 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer"
                      title="Record audio"
                    >
                      <Mic className="w-3.5 h-3.5 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsEditingLocation(!isEditingLocation);
                      }}
                      className={`w-7.5 h-7.5 rounded-full inner-pseudo-glass flex items-center justify-center active:scale-95 transition-transform cursor-pointer ${
                        locationName
                          ? "text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                      title="Add location"
                    >
                      <MapPin className="w-3.5 h-3.5 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsMarginaliaOpen((prev) => {
                          const next = !prev;
                          if (next) {
                            setTimeout(
                              () => marginaliaTextareaRef.current?.focus(),
                              100,
                            );
                          }
                          return next;
                        });
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-serif font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                        isMarginaliaOpen || marginaliaText
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                          : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                      title="Attach sidenote"
                    >
                      <span>¹</span>
                      <span className="font-sans font-medium text-[11px]">
                        Note
                      </span>
                    </button>
                  </div>

                  {/* Alignment & Counter */}
                  <div className="flex items-center gap-2">
                    <div className="apple-segmented-track">
                      {(
                        [
                          { id: "left", icon: AlignLeft, label: "Left" },
                          { id: "center", icon: AlignCenter, label: "Center" },
                          { id: "right", icon: AlignRight, label: "Right" },
                          {
                            id: "justify",
                            icon: AlignJustify,
                            label: "Justify",
                          },
                        ] as {
                          id: TextAlign;
                          icon: typeof AlignLeft;
                          label: string;
                        }[]
                      ).map((opt) => {
                        const Icon = opt.icon;
                        const isActive = textAlign === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic("light");
                              setTextAlign(opt.id);
                            }}
                            className={`p-1 rounded-full transition-all cursor-pointer ${
                              isActive
                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-[0_2px_6px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]"
                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            }`}
                            title={opt.label}
                          >
                            <Icon className="w-3 h-3 stroke-[2]" />
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono hidden sm:inline select-none">
                      {content.length > 0 ? `${content.length}c` : "draft"}
                    </span>
                  </div>
                </div>
              ) : (
                /* Live Waveform */
                <div className="flex items-center justify-between w-full px-2 py-0.5">
                  <div className="flex items-center gap-2 text-rose-500 font-sans font-medium text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>
                      0:{recordingSeconds.toString().padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 h-5">
                    {audioLevels.slice(0, 12).map((lvl, idx) => (
                      <span
                        key={idx}
                        className="w-0.5 bg-rose-500 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(4, lvl * 0.22)}px` }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer shadow-xs"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Done</span>
                  </button>
                </div>
              )}
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
