import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Space, FieldNote, TextAlign, FontChoice, PhotoMeta, ImagePosition } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { generateId } from "@/lib/utils";
import { markdownToHtml, htmlToMarkdown } from "@/lib/editorSerializer";
import {
  processPhotoFile,
  processVideoFile,
  processAudioBlob,
  processAudioFile,
  inspectAudioFile,
} from "@/lib/mediaStorage";
import {
  isProUser,
  canUseFeature,
  FREE_MAX_PHOTOS,
  FREE_MAX_NOTES_PER_SPACE,
  type ProFeature,
} from "@/lib/proManager";
import { AtelierProModal } from "@/components/ui/AtelierProModal";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import {
  isSpeechRecognitionSupported,
  appendTranscribedSegment,
} from "@/lib/speechRecognition";
import { AudioTrimmerModal } from "./AudioTrimmerModal";
import { collectNoteMediaUrls } from "@/lib/syncEngine";
import { DarkroomModal } from "./DarkroomModal";
import { CreateNoteHeader } from "./create/CreateNoteHeader";
import {
  CreateNoteMarkdownToolbar,
  type RichFormatAction,
} from "./create/CreateNoteMarkdownToolbar";
import { CreateNoteMediaSection } from "./create/CreateNoteMediaSection";
import {
  Camera,
  Image as ImageIcon,
  Video,
  Mic,
  Upload,
  Square,
  MapPin,
  X,
  Type,
  AlertTriangle,
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
  defaultFontChoice?: FontChoice;
  defaultImagePosition?: ImagePosition;
  editingNote?: FieldNote | null;
  notesCountMap?: Record<string, number>;
  userName?: string;
  avatarPhoto?: string | null;
  currentUserId?: string | null;
  onSaveNote: (note: FieldNote) => void;
  onUpdateNote?: (note: FieldNote, removedMediaUrls?: string[]) => void;
}

export function CreateNoteSheet({
  isOpen,
  onClose,
  spaces,
  defaultSpaceId,
  defaultTextAlign = "left",
  defaultFontChoice = "editorial",
  defaultImagePosition = "bottom",
  editingNote = null,
  notesCountMap,
  userName = "Author",
  avatarPhoto = null,
  currentUserId = null,
  onSaveNote,
  onUpdateNote,
}: CreateNoteSheetProps) {
  useLockBodyScroll(isOpen);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [textAlign, setTextAlign] = useState<TextAlign>(defaultTextAlign);
  const [fontChoice, setFontChoice] = useState<FontChoice>(() => {
    if (editingNote?.fontChoice) return editingNote.fontChoice;
    const s = spaces.find((sp) => sp.id === defaultSpaceId);
    return s?.fontChoice || defaultFontChoice || "editorial";
  });
  const [imagePosition, setImagePosition] = useState<ImagePosition>(
    () => editingNote?.imagePosition || defaultImagePosition || "bottom",
  );
  const [selectionText, setSelectionText] = useState("");
  const [formatStates, setFormatStates] = useState({
    bold: false,
    italic: false,
    strike: false,
    quote: false,
    code: false,
  });
  const [selectedSpaceId, setSelectedSpaceId] = useState(defaultSpaceId);
  const [locationName, setLocationName] = useState("");
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosMeta, setPhotosMeta] = useState<PhotoMeta[]>([]);
  const [darkroomIndex, setDarkroomIndex] = useState<number | null>(null);
  const [videos, setVideos] = useState<string[]>([]);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [mediaProgressMessage, setMediaProgressMessage] = useState<string | null>(null);

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

  // Audio recording popover menu
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // Atelier Pro membership modal state
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proTriggerFeature, setProTriggerFeature] = useState<ProFeature | null>(
    null,
  );

  // Audio Trimmer Modal state
  const [isTrimmerOpen, setIsTrimmerOpen] = useState(false);
  const [fileToTrim, setFileToTrim] = useState<File | null>(null);

  // Formatting Drawer state
  const [isFormattingOpen, setIsFormattingOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Speech Dictation Hook
  const speech = useSpeechDictation({
    onAppendText: useCallback((text: string) => {
      setContent((prev) => {
        const next = appendTranscribedSegment(prev, text);
        if (editorRef.current) {
          editorRef.current.innerHTML = markdownToHtml(next);
        }
        return next;
      });
    }, []),
    onError: useCallback((msg: string) => {
      recorder.setAudioError(msg);
      setTimeout(() => recorder.setAudioError(null), 4000);
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
  });

  // Audio Recording Hook
  const recorder = useAudioRecorder({
    onAutoTranscribeStart: useCallback(() => {
      if (speech.autoTranscribeMemo) {
        speech.startLiveTranscription();
      }
    }, [speech.autoTranscribeMemo, speech.startLiveTranscription]),
    onAutoTranscribeStop: useCallback(() => {
      speech.stopLiveTranscription();
    }, [speech.stopLiveTranscription]),
  });

  // Sync or reset form state whenever sheet opens or editingNote changes
  useEffect(() => {
    if (!isOpen) {
      speech.stopDictation();
      recorder.cancelRecording();
      return;
    }

    setIsFormattingOpen(false);

    if (editingNote) {
      setContent(editingNote.content || "");
      setTitle(editingNote.title || "");
      setTextAlign(editingNote.textAlign || defaultTextAlign);
      setFontChoice(editingNote.fontChoice || "editorial");
      setSelectedSpaceId(editingNote.spaceId || defaultSpaceId);
      setLocationName(editingNote.locationName || "");
      setPhotos(editingNote.photos ? [...editingNote.photos] : []);
      setPhotosMeta(editingNote.photosMeta ? [...editingNote.photosMeta] : []);
      setDarkroomIndex(null);
      setVideos(editingNote.videos ? [...editingNote.videos] : []);

      const firstMarg = editingNote.marginaliaItems?.[0];
      const margText = editingNote.marginalia || firstMarg?.content || "";
      const citText = editingNote.quoteSource || firstMarg?.citation || "";
      setMarginaliaText(margText);
      setCitationText(citText);
      setIsMarginaliaOpen(Boolean(margText || citText));

      if (editingNote.voiceMemo) {
        recorder.setRecordedAudio({
          blob: new Blob(),
          url: editingNote.voiceMemo.audioUrl || "",
          durationSeconds: editingNote.voiceMemo.durationSeconds,
        });
      } else {
        recorder.setRecordedAudio(null);
      }
      recorder.setAudioError(null);

      const d = new Date(editingNote.createdAt);
      const validDate = !isNaN(d.getTime()) ? d : new Date();
      setNoteDate(toDateInputString(validDate));
      setNoteTime(toTimeInputString(validDate));
      setImagePosition(
        editingNote.imagePosition || defaultImagePosition || "bottom",
      );
      setSelectionText("");
      if (editorRef.current) {
        editorRef.current.innerHTML = markdownToHtml(editingNote.content || "");
      }
    } else {
      setContent("");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setTitle("");
      setTextAlign(defaultTextAlign);
      const s = spaces.find((sp) => sp.id === defaultSpaceId);
      setFontChoice(s?.fontChoice || defaultFontChoice || "editorial");
      setSelectedSpaceId(defaultSpaceId);
      setLocationName("");
      setPhotos([]);
      setPhotosMeta([]);
      setDarkroomIndex(null);
      setVideos([]);
      setVideoError(null);
      recorder.setAudioError(null);
      setMarginaliaText("");
      setCitationText("");
      setIsMarginaliaOpen(false);
      recorder.setRecordedAudio(null);
      const now = new Date();
      setNoteDate(toDateInputString(now));
      setNoteTime(toTimeInputString(now));
      setImagePosition(defaultImagePosition || "bottom");
      setSelectionText("");
    }

    setTimeout(() => {
      editorRef.current?.focus();
    }, 150);
  }, [
    isOpen,
    editingNote,
    defaultSpaceId,
    defaultTextAlign,
    defaultFontChoice,
    defaultImagePosition,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTriggerPhotoSelect = () => {
    if (!canUseFeature("unlimited_photos", photos.length)) {
      triggerHaptic("heavy");
      setProTriggerFeature("unlimited_photos");
      setIsProModalOpen(true);
      return;
    }
    triggerHaptic("light");
    fileInputRef.current?.click();
  };

  const handleTriggerCameraSelect = () => {
    if (!canUseFeature("unlimited_photos", photos.length)) {
      triggerHaptic("heavy");
      setProTriggerFeature("unlimited_photos");
      setIsProModalOpen(true);
      return;
    }
    triggerHaptic("light");
    cameraInputRef.current?.click();
  };

  const handleTriggerVideoSelect = () => {
    if (!canUseFeature("video")) {
      triggerHaptic("heavy");
      setProTriggerFeature("video");
      setIsProModalOpen(true);
      return;
    }
    triggerHaptic("light");
    videoInputRef.current?.click();
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    let selectedFiles = Array.from(fileList);
    if (!isProUser()) {
      const remainingSlots = Math.max(0, FREE_MAX_PHOTOS - photos.length);
      if (remainingSlots <= 0) {
        triggerHaptic("heavy");
        setProTriggerFeature("unlimited_photos");
        setIsProModalOpen(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        return;
      }
      if (selectedFiles.length > remainingSlots) {
        selectedFiles = selectedFiles.slice(0, remainingSlots);
        setProTriggerFeature("unlimited_photos");
        setIsProModalOpen(true);
      }
    }

    setIsPhotoProcessing(true);
    setMediaProgressMessage(
      `Processing ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""}...`,
    );
    try {
      let count = 0;
      for (const file of selectedFiles) {
        count++;
        setMediaProgressMessage(
          `Optimizing photo ${count} of ${selectedFiles.length}...`,
        );
        const photoUrl = await processPhotoFile(file);
        if (photoUrl) {
          setPhotos((prev) => [...prev, photoUrl]);
          triggerHaptic("light");
        }
      }
    } catch (err) {
      console.error("Error processing selected photo:", err);
    } finally {
      setIsPhotoProcessing(false);
      setMediaProgressMessage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    triggerHaptic("light");
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotosMeta((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVideoProcessing(true);
    setMediaProgressMessage("Analyzing and preparing video clip...");
    setVideoError(null);
    try {
      const result = await processVideoFile(file);
      setVideos((prev) => [...prev, result.url]);
      triggerSuccessHaptic();
    } catch (err: unknown) {
      console.error("Video processing error:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to process video";
      setVideoError(msg);
      triggerHaptic("heavy");
      setTimeout(() => setVideoError(null), 4000);
    } finally {
      setIsVideoProcessing(false);
      setMediaProgressMessage(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleRemoveVideo = (index: number) => {
    triggerHaptic("light");
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAudioFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    recorder.setAudioError(null);
    try {
      const inspection = await inspectAudioFile(file);
      if (!inspection.valid) {
        throw new Error(inspection.error || "Invalid audio file format.");
      }

      if (inspection.needsTrimming) {
        triggerHaptic("medium");
        setFileToTrim(file);
        setIsTrimmerOpen(true);
      } else {
        const result = await processAudioFile(file);
        recorder.setRecordedAudio({
          blob: result.blob,
          url: result.url,
          durationSeconds: result.duration,
        });
        triggerSuccessHaptic();
      }
    } catch (err: unknown) {
      console.error("Audio import error:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to process audio file.";
      recorder.setAudioError(msg);
      triggerHaptic("heavy");
      setTimeout(() => recorder.setAudioError(null), 5000);
    } finally {
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  };

  const handleTrimComplete = async (trimmed: {
    blob: Blob;
    url: string;
    duration: number;
  }) => {
    try {
      const persistedUrl = await processAudioBlob(trimmed.blob, trimmed.url);
      recorder.setRecordedAudio({
        blob: trimmed.blob,
        url: persistedUrl || trimmed.url,
        durationSeconds: trimmed.duration,
      });
      if (
        persistedUrl &&
        persistedUrl !== trimmed.url &&
        trimmed.url.startsWith("blob:")
      ) {
        URL.revokeObjectURL(trimmed.url);
      }
      triggerSuccessHaptic();
    } catch (err) {
      console.error("Failed to persist trimmed audio:", err);
      recorder.setRecordedAudio({
        blob: trimmed.blob,
        url: trimmed.url,
        durationSeconds: trimmed.duration,
      });
    } finally {
      setIsTrimmerOpen(false);
      setFileToTrim(null);
    }
  };

  const handleSave = () => {
    const activeContent = editorRef.current
      ? htmlToMarkdown(editorRef.current).trim()
      : content.trim();

    if (
      !title.trim() &&
      !activeContent &&
      !marginaliaText.trim() &&
      photos.length === 0 &&
      videos.length === 0 &&
      !recorder.recordedAudio
    ) {
      onClose();
      return;
    }

    // Enforce Freemium per-notebook capacity limit (100 notes per notebook for free users)
    if (!editingNote && !isProUser()) {
      const currentSpaceNotesCount = notesCountMap?.[selectedSpaceId] ?? 0;
      if (currentSpaceNotesCount >= FREE_MAX_NOTES_PER_SPACE) {
        triggerHaptic("medium");
        setProTriggerFeature("notes_limit");
        setIsProModalOpen(true);
        return;
      }
    }

    triggerSuccessHaptic();

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
        content: activeContent,
        textAlign,
        fontChoice,
        marginalia: marginaliaText.trim() || undefined,
        quoteSource: citationText.trim() || undefined,
        marginaliaItems:
          updatedMarginaliaItems.length > 0
            ? updatedMarginaliaItems
            : undefined,
        locationName: locationName.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        photosMeta: photosMeta.length > 0 ? photosMeta : undefined,
        videos: videos.length > 0 ? videos : undefined,
        voiceMemo: recorder.recordedAudio
          ? {
              durationSeconds: recorder.recordedAudio.durationSeconds,
              audioUrl: recorder.recordedAudio.url || undefined,
            }
          : undefined,
        imagePosition,
        createdAt: finalCreatedAt,
        author: editingNote.author || {
          name: userName || "Author",
          avatarUrl: avatarPhoto || undefined,
          userId: currentUserId || undefined,
        },
      };

      // Collect orphan media files removed during this edit session
      const oldMedia = collectNoteMediaUrls(editingNote);
      const newMedia = collectNoteMediaUrls(updatedNote);
      const removedMedia = oldMedia.filter((url) => !newMedia.includes(url));

      if (onUpdateNote) {
        onUpdateNote(updatedNote, removedMedia);
      }
      onClose();
      return;
    }

    const newNote: FieldNote = {
      id: generateId(),
      spaceId: selectedSpaceId,
      title: title.trim() || undefined,
      content: activeContent,
      textAlign,
      fontChoice,
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
      photosMeta: photosMeta.length > 0 ? photosMeta : undefined,
      videos: videos.length > 0 ? videos : undefined,
      voiceMemo: recorder.recordedAudio
        ? {
            durationSeconds: recorder.recordedAudio.durationSeconds,
            audioUrl: recorder.recordedAudio.url || undefined,
          }
        : undefined,
      imagePosition,
      createdAt: finalCreatedAt,
      author: {
        name: userName || "Author",
        avatarUrl: avatarPhoto || undefined,
        userId: currentUserId || undefined,
      },
    };

    onSaveNote(newNote);
    setContent("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setTitle("");
    setTextAlign(defaultTextAlign);
    setMarginaliaText("");
    setCitationText("");
    setIsMarginaliaOpen(false);
    setIsFormattingOpen(false);
    setSelectionText("");
    setImagePosition(defaultImagePosition || "bottom");
    setPhotos([]);
    setVideos([]);
    recorder.setRecordedAudio(null);
    setLocationName("");
    onClose();
  };

  const updateSelection = useCallback(() => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelectionText("");
    } else {
      setSelectionText(sel.toString());
    }

    const bold = document.queryCommandState("bold");
    const italic = document.queryCommandState("italic");
    const strike = document.queryCommandState("strikeThrough");

    let quote = false;
    let code = false;
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName.toUpperCase() === "BLOCKQUOTE") quote = true;
        if (node.nodeName.toUpperCase() === "CODE") code = true;
        node = node.parentNode;
      }
    }

    setFormatStates({ bold, italic, strike, quote, code });
  }, []);

  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const md = htmlToMarkdown(editorRef.current);
    setContent(md);
    updateSelection();
  }, [updateSelection]);

  const toggleCodeFormat = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    let node: Node | null = range.commonAncestorContainer;
    let codeEl: HTMLElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeName.toUpperCase() === "CODE") {
        codeEl = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (codeEl) {
      const parent = codeEl.parentNode;
      while (codeEl.firstChild) {
        parent?.insertBefore(codeEl.firstChild, codeEl);
      }
      parent?.removeChild(codeEl);
    } else {
      if (!range.collapsed) {
        const el = document.createElement("code");
        el.appendChild(range.extractContents());
        range.insertNode(el);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(el);
        sel.addRange(newRange);
      } else {
        document.execCommand("insertHTML", false, "<code> </code>");
      }
    }
  }, []);

  const toggleQuoteFormat = useCallback(() => {
    if (formatStates.quote) {
      document.execCommand("formatBlock", false, "<p>");
    } else {
      document.execCommand("formatBlock", false, "<blockquote>");
    }
  }, [formatStates.quote]);

  const handleFormatAction = useCallback(
    (action: RichFormatAction) => {
      triggerHaptic("light");
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();

      switch (action) {
        case "bold":
          document.execCommand("bold");
          break;
        case "italic":
          document.execCommand("italic");
          break;
        case "strike":
          document.execCommand("strikeThrough");
          break;
        case "code":
          toggleCodeFormat();
          break;
        case "quote":
          toggleQuoteFormat();
          break;
        case "bullet":
          document.execCommand("insertUnorderedList");
          break;
        case "number":
          document.execCommand("insertOrderedList");
          break;
        case "divider":
          document.execCommand("insertHorizontalRule");
          break;
      }

      handleEditorInput();
    },
    [toggleCodeFormat, toggleQuoteFormat, handleEditorInput]
  );

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;

    if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      handleFormatAction("bold");
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      handleFormatAction("italic");
    } else if ((e.key === "x" || e.key === "X") && e.shiftKey) {
      e.preventDefault();
      handleFormatAction("strike");
    } else if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      handleFormatAction("code");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    handleEditorInput();
  };

  const canSave =
    title.trim().length > 0 ||
    content.trim().length > 0 ||
    marginaliaText.trim().length > 0 ||
    photos.length > 0 ||
    videos.length > 0 ||
    recorder.recordedAudio !== null;

  const handleRequestClose = () => {
    if (canSave) {
      triggerHaptic("medium");
      setIsDiscardConfirmOpen(true);
    } else {
      triggerHaptic("light");
      onClose();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none">
          {/* Ambient Dimming Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={handleRequestClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
          />

          {/* Top Floating High-Density Liquid Glass Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={editingNote ? "Edit Catatan" : "Tulis Catatan Baru"}
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="
              pointer-events-auto relative w-full max-w-md
              rounded-[32px] overflow-hidden z-10 flex flex-col
              bg-[var(--sheet-bg)]
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

            {/* Hidden Inputs for Gallery, Camera, Video, & Audio */}
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
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*,audio/mpeg,audio/mp4,audio/m4a,audio/wav,audio/aac,audio/x-m4a,.mp3,.m4a,.wav,.aac,.ogg"
              onClick={(e) => e.stopPropagation()}
              onChange={handleAudioFileSelect}
              className="hidden"
            />

            {/* 1. Header Bar: Strict 1-Row Layout */}
            <CreateNoteHeader
              spaces={spaces}
              selectedSpaceId={selectedSpaceId}
              onSelectSpace={setSelectedSpaceId}
              noteDate={noteDate}
              setNoteDate={setNoteDate}
              noteTime={noteTime}
              setNoteTime={setNoteTime}
              canSave={canSave}
              isEditing={Boolean(editingNote)}
              onClose={handleRequestClose}
              onSave={handleSave}
            />

            {/* Reusable Media Section */}
            {(() => {
              const mediaSectionJsx = (
                <CreateNoteMediaSection
                  photos={photos}
                  photosMeta={photosMeta}
                  onTriggerAddPhoto={handleTriggerPhotoSelect}
                  onRemovePhoto={handleRemovePhoto}
                  onOpenDarkroom={(idx) => setDarkroomIndex(idx)}
                  videos={videos}
                  onRemoveVideo={handleRemoveVideo}
                  isPhotoProcessing={isPhotoProcessing}
                  isVideoProcessing={isVideoProcessing}
                  mediaProgressMessage={mediaProgressMessage}
                  videoError={videoError}
                  audioError={recorder.audioError}
                  recordedAudio={recorder.recordedAudio}
                  onRemoveAudio={() => recorder.setRecordedAudio(null)}
                  imagePosition={imagePosition}
                  onToggleImagePosition={() =>
                    setImagePosition((prev) =>
                      prev === "top" ? "bottom" : "top",
                    )
                  }
                />
              );

              return (
                <main
                  data-font={fontChoice}
                  className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col gap-3 relative z-10"
                >
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
                        autoCapitalize="words"
                        autoFocus
                        className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none font-sans select-text"
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

                  {/* Top Media Placement (Above Title/Content) */}
                  {imagePosition === "top" && mediaSectionJsx}

                  {/* Medium-style Floating Format Bubble */}
                  <AnimatePresence>
                    {selectionText.trim().length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="sticky top-0 z-30 self-center mx-auto mb-1.5 px-2 py-1 rounded-full bg-[var(--sheet-bg)]/95 backdrop-blur-2xl border border-[var(--glass-border)] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.22)] flex items-center gap-1 shrink-0"
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFormatAction("bold");
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold text-xs ${
                            formatStates.bold
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-2xs"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
                          }`}
                          title="Bold (toggles on/off)"
                        >
                          <span className="font-serif font-black text-xs">B</span>
                        </button>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFormatAction("italic");
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs ${
                            formatStates.italic
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-2xs font-bold"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
                          }`}
                          title="Italic (toggles on/off)"
                        >
                          <span className="font-serif italic font-bold text-xs">i</span>
                        </button>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFormatAction("strike");
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs ${
                            formatStates.strike
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-2xs font-bold"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
                          }`}
                          title="Strikethrough (toggles on/off)"
                        >
                          <span className="line-through text-xs font-medium">S</span>
                        </button>

                        <div className="w-px h-3.5 bg-[var(--glass-border)] opacity-60 mx-0.5" />

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFormatAction("quote");
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs ${
                            formatStates.quote
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-2xs font-bold"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
                          }`}
                          title="Quote (toggles on/off)"
                        >
                          <span className="font-serif font-bold text-xs leading-none">“</span>
                        </button>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFormatAction("code");
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer font-mono text-xs ${
                            formatStates.code
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-2xs font-bold"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
                          }`}
                          title="Inline Code (toggles on/off)"
                        >
                          <span className="text-[11px] font-mono leading-none">&lt;&gt;</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Title Field */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Optional title..."
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    style={{
                      fontSize: "calc(var(--note-font-size, 16px) * 1.16)",
                    }}
                    className={`w-full bg-transparent border-0 p-0 font-serif font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/40 focus:outline-none tracking-tight select-text ${
                      textAlign === "center"
                        ? "text-center"
                        : textAlign === "right"
                          ? "text-right"
                          : "text-left"
                    }`}
                  />

                  {/* Visual Inline WYSIWYG Content Editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="What caught your eye today?"
                    data-empty={!content.trim()}
                    onInput={handleEditorInput}
                    onSelect={updateSelection}
                    onKeyUp={updateSelection}
                    onMouseUp={updateSelection}
                    onTouchEnd={updateSelection}
                    onKeyDown={handleEditorKeyDown}
                    onPaste={handlePaste}
                    style={{ fontSize: "var(--note-font-size, 16px)" }}
                    className={`editorial-editable w-full min-h-[160px] bg-transparent border-0 p-0 leading-relaxed font-content text-[var(--text-primary)] focus:outline-none select-text ${
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
                        style={{
                          fontSize: "calc(var(--note-font-size, 16px) * 0.88)",
                        }}
                        className="w-full bg-transparent resize-none border-0 p-0 leading-relaxed font-serif italic text-[var(--text-secondary)] placeholder:text-[var(--text-tertiary)]/40 focus:outline-none"
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

                  {/* Bottom Media Placement (Below Content & Marginalia) */}
                  {imagePosition === "bottom" && mediaSectionJsx}
                </main>
              );
            })()}

            {/* 3. Laci Format Teks "Aa" */}
            <CreateNoteMarkdownToolbar
              isOpen={isFormattingOpen}
              fontChoice={fontChoice}
              setFontChoice={setFontChoice}
              textAlign={textAlign}
              setTextAlign={setTextAlign}
              onFormatAction={handleFormatAction}
              formatStates={formatStates}
            />

            {/* Live Interim Speech Whisper Bar */}
            <AnimatePresence>
              {speech.interimSpeechText && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 py-1.5 bg-[var(--text-primary)]/[0.035] border-t border-[var(--glass-border)]/40 flex items-center justify-between gap-2 text-xs font-serif italic text-[var(--text-secondary)] overflow-hidden shrink-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] animate-pulse shrink-0" />
                    <span className="truncate">“{speech.interimSpeechText}...”</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] shrink-0">
                    {speech.dictationLang === "id-ID" ? "ID" : "EN"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 4. Bottom Action Bar: Polos Tanpa Bungkus Glass */}
            <footer className="px-3.5 py-2 border-t border-[var(--glass-border)]/50 flex items-center justify-between gap-2 shrink-0 relative z-10 bg-[var(--sheet-bg)]/80 backdrop-blur-md">
              {/* Audio Menu Popover */}
              <AnimatePresence>
                {showAudioMenu &&
                  !recorder.isRecording &&
                  !speech.isDictatingOnly && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowAudioMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="absolute bottom-[calc(100%+8px)] left-4 sm:left-16 z-40 w-64 rounded-2xl bg-[var(--sheet-bg)] border border-[var(--glass-border)] shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl"
                      >
                        <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[var(--glass-border)]/50 mb-0.5">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                            Voice Language
                          </span>
                          <div className="apple-segmented-track p-0.5 flex items-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (speech.dictationLang !== "id-ID") {
                                  speech.toggleDictationLang();
                                }
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                speech.dictationLang === "id-ID"
                                  ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-2xs"
                                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              ID
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (speech.dictationLang !== "en-US") {
                                  speech.toggleDictationLang();
                                }
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                speech.dictationLang === "en-US"
                                  ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-2xs"
                                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              EN
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAudioMenu(false);
                            speech.startDictation();
                          }}
                          className="w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-xs text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-98 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shrink-0">
                              <Type className="w-3.5 h-3.5 stroke-[2]" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">
                                Dictate to Text
                              </div>
                              <div className="text-[10px] text-[var(--text-tertiary)]">
                                Live speech to manuscript (
                                {speech.dictationLang === "id-ID"
                                  ? "Indonesia"
                                  : "English"}
                                )
                              </div>
                            </div>
                          </div>
                        </button>

                        <div className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAudioMenu(false);
                              recorder.startRecording();
                            }}
                            className="flex items-center gap-2.5 text-left flex-1 cursor-pointer active:scale-98 transition-transform"
                          >
                            <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shrink-0">
                              <Mic className="w-3.5 h-3.5 stroke-[2]" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">
                                Record Voice Memo
                              </div>
                              <div className="text-[10px] text-[var(--text-tertiary)]">
                                {speech.autoTranscribeMemo
                                  ? "Audio + Auto-Transcribe"
                                  : "Audio strip only"}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speech.toggleAutoTranscribe();
                            }}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 border ${
                              speech.autoTranscribeMemo
                                ? "bg-[var(--text-primary)] text-[var(--accent-ink)] border-transparent"
                                : "bg-transparent text-[var(--text-tertiary)] border-[var(--glass-border)] hover:text-[var(--text-primary)]"
                            }`}
                            title="Toggle simultaneous text transcription while recording"
                          >
                            {speech.autoTranscribeMemo
                              ? "Auto-Text ON"
                              : "Text OFF"}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAudioMenu(false);
                            if (!canUseFeature("audio_import")) {
                              triggerHaptic("heavy");
                              setProTriggerFeature("audio_import");
                              setIsProModalOpen(true);
                              return;
                            }
                            triggerHaptic("light");
                            audioFileInputRef.current?.click();
                          }}
                          className="w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-xs text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-98 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center shrink-0">
                              <Upload className="w-3.5 h-3.5 stroke-[2]" />
                            </div>
                            <div>
                              <div className="font-medium text-xs">
                                Import Audio File
                              </div>
                              <div className="text-[10px] text-[var(--text-tertiary)]">
                                Max 3 min · With Trimmer
                              </div>
                            </div>
                          </div>
                          {!isProUser() && (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              PRO
                            </span>
                          )}
                        </button>
                      </motion.div>
                    </>
                  )}
              </AnimatePresence>

              {!recorder.isRecording && !speech.isDictatingOnly ? (
                <div className="flex items-center justify-between w-full min-w-0 gap-1.5">
                  {/* Klaster Kiri: Input Media & Metadata */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
                    <button
                      type="button"
                      onClick={handleTriggerPhotoSelect}
                      aria-label="Unggah foto dari galeri"
                      className="relative w-8.5 h-8.5 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-90 transition-all cursor-pointer shrink-0 before:absolute before:-inset-1.5 before:content-['']"
                      title="Add photos"
                    >
                      <ImageIcon className="w-4 h-4 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerCameraSelect}
                      aria-label="Ambil foto dengan kamera"
                      className="relative w-8.5 h-8.5 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-90 transition-all cursor-pointer shrink-0 before:absolute before:-inset-1.5 before:content-['']"
                      title="Take photo"
                    >
                      <Camera className="w-4 h-4 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerVideoSelect}
                      disabled={isVideoProcessing}
                      aria-label="Unggah rekaman video"
                      className="relative w-8.5 h-8.5 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-90 transition-all cursor-pointer disabled:opacity-50 shrink-0 before:absolute before:-inset-1.5 before:content-['']"
                      title="Add video"
                    >
                      <Video className="w-4 h-4 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setShowAudioMenu((prev) => !prev);
                      }}
                      aria-label="Menu audio dan rekaman suara"
                      className={`relative w-8.5 h-8.5 rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer shrink-0 before:absolute before:-inset-1.5 before:content-[''] ${
                        showAudioMenu
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
                      }`}
                      title="Audio & dictation"
                    >
                      <Mic className="w-4 h-4 stroke-[1.85]" />
                    </button>

                    <div className="w-px h-3.5 bg-[var(--glass-border)] opacity-60 mx-0.5 shrink-0" />

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsEditingLocation(!isEditingLocation);
                      }}
                      aria-label={locationName ? `Lokasi saat ini: ${locationName}. Ketuk untuk mengubah.` : "Tambahkan metadata lokasi"}
                      className={`relative w-8.5 h-8.5 rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer shrink-0 before:absolute before:-inset-1.5 before:content-[''] ${
                        locationName
                          ? "text-[var(--text-primary)] font-semibold bg-[var(--text-primary)]/10"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
                      }`}
                      title={locationName ? `Location: ${locationName}` : "Add location"}
                    >
                      <MapPin className="w-4 h-4 stroke-[1.85]" />
                      {locationName && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />
                      )}
                    </button>
                  </div>

                  {/* Klaster Kanan: Anotasi, Laci Format "Aa", & Counter */}
                  <div className="flex items-center gap-1.5 shrink-0">
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
                      aria-label="Tambahkan catatan samping atau marginalia"
                      aria-pressed={Boolean(isMarginaliaOpen || marginaliaText)}
                      className={`relative h-8.5 px-2.5 rounded-xl text-xs font-serif transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 before:absolute before:-inset-1 before:content-[''] ${
                        isMarginaliaOpen || marginaliaText
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-bold shadow-2xs"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
                      }`}
                      title="Attach sidenote"
                    >
                      <span className="font-bold">¹</span>
                      <span className="font-sans font-medium text-[11px]">
                        Note
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsFormattingOpen((prev) => !prev);
                      }}
                      aria-label="Buka bilah format tipografi"
                      aria-pressed={isFormattingOpen}
                      className={`relative formatting-btn h-8.5 px-2.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 before:absolute before:-inset-1 before:content-[''] ${
                        isFormattingOpen
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-bold shadow-2xs"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
                      }`}
                      title="Formatting & Typography"
                    >
                      <Type className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="font-sans font-medium text-[11px]">
                        Aa
                      </span>
                    </button>

                    {content.length > 0 && (
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono hidden md:inline select-none pl-0.5">
                        {content.length}c
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Active Recording / Live Dictation Bar */
                <div className="flex items-center justify-between w-full px-1 py-0.5 gap-2">
                  <div className="flex items-center gap-2 text-rose-500 font-sans font-medium text-xs shrink-0">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-mono">
                      {Math.floor(
                        (speech.isDictatingOnly
                          ? 0
                          : recorder.recordingSeconds) / 60,
                      )}
                      :
                      {(
                        (speech.isDictatingOnly
                          ? 0
                          : recorder.recordingSeconds) % 60
                      )
                        .toString()
                        .padStart(2, "0")}
                    </span>
                    {!speech.isDictatingOnly && (
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)] opacity-70">
                        / {isProUser() ? "3:00" : "1:00"}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--text-secondary)]">
                      {speech.isDictatingOnly ? "Dictating" : "Rec"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={speech.toggleDictationLang}
                      className="px-2 py-0.5 rounded-lg border border-[var(--glass-border)] text-[10px] font-mono font-bold text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer"
                      title="Switch language"
                    >
                      {speech.dictationLang === "id-ID" ? "ID" : "EN"}
                    </button>

                    {recorder.isRecording &&
                      isSpeechRecognitionSupported() && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextActive = speech.toggleAutoTranscribe();
                            if (nextActive) {
                              speech.startLiveTranscription();
                            } else {
                              speech.stopLiveTranscription();
                            }
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer border ${
                            speech.autoTranscribeMemo
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] border-transparent"
                              : "bg-transparent text-[var(--text-tertiary)] border-[var(--glass-border)]"
                          }`}
                          title="Toggle transcription"
                        >
                          {speech.autoTranscribeMemo ? "Text ON" : "Text OFF"}
                        </button>
                      )}

                    {recorder.isRecording && (
                      <div className="hidden sm:flex items-center gap-1 h-5">
                        {recorder.audioLevels.slice(0, 10).map((lvl, idx) => (
                          <span
                            key={idx}
                            className="w-0.5 bg-rose-500 rounded-full transition-all duration-75"
                            style={{ height: `${Math.max(4, lvl * 0.22)}px` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      speech.isDictatingOnly
                        ? speech.stopDictation
                        : recorder.stopRecording
                    }
                    className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer shadow-xs shrink-0"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Done</span>
                  </button>
                </div>
              )}
            </footer>
          </motion.div>

          {/* Atelier Pro Membership Modal */}
          <AtelierProModal
            isOpen={isProModalOpen}
            onClose={() => setIsProModalOpen(false)}
            triggerFeature={proTriggerFeature}
          />

          {/* Archival Waveform Trimmer Modal */}
          <AudioTrimmerModal
            isOpen={isTrimmerOpen}
            onClose={() => {
              setIsTrimmerOpen(false);
              setFileToTrim(null);
            }}
            file={fileToTrim}
            onTrimComplete={handleTrimComplete}
          />

          {/* Analog Darkroom & Polaroid Studio Modal */}
          {darkroomIndex !== null && photos[darkroomIndex] && (
            <DarkroomModal
              isOpen={darkroomIndex !== null}
              onClose={() => setDarkroomIndex(null)}
              photoUrl={photos[darkroomIndex]}
              photoIndex={darkroomIndex}
              initialMeta={photosMeta[darkroomIndex]}
              onSave={(idx, meta) => {
                setPhotosMeta((prev) => {
                  const next = [...prev];
                  next[idx] = meta;
                  return next;
                });
              }}
            />
          )}

          {/* Discard Draft Confirmation Dialog */}
          <AnimatePresence>
            {isDiscardConfirmOpen && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDiscardConfirmOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="relative w-full max-w-xs dynamic-island-shell rounded-3xl p-5 z-10 border border-[var(--glass-border)] shadow-2xl text-center"
                >
                  <div className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                    Discard Draft?
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 mb-4 leading-relaxed">
                    You have unsaved changes in this notice. Are you sure you want to discard them?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsDiscardConfirmOpen(false);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-[var(--glass-border)] text-xs font-medium text-[var(--text-primary)] inner-pseudo-glass cursor-pointer"
                    >
                      Keep Editing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("heavy");
                        setIsDiscardConfirmOpen(false);
                        onClose();
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
