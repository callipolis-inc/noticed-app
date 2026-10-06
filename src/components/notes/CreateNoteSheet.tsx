import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space, FieldNote, TextAlign, FontChoice } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { generateId, formatTimeOnly } from "@/lib/utils";
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
  type ProFeature,
} from "@/lib/proManager";
import { AtelierProModal } from "@/components/ui/AtelierProModal";
import { TactileAudioRecorder, RecordedAudio } from "@/lib/audioRecorder";
import {
  TactileSpeechRecognizer,
  isSpeechRecognitionSupported,
  getSavedDictationLang,
  setSavedDictationLang,
  getSavedAutoTranscribe,
  setSavedAutoTranscribe,
  appendTranscribedSegment,
  type DictationLang,
} from "@/lib/speechRecognition";
import { InlineVideoPlayer } from "./InlineVideoPlayer";
import { TactileAudioPlayer } from "./TactileAudioPlayer";
import { AudioTrimmerModal } from "./AudioTrimmerModal";
import {
  X,
  Check,
  Camera,
  Image as ImageIcon,
  Video,
  Mic,
  Upload,
  Square,
  MapPin,
  Trash2,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  Code,
  Minus,
  Type,
} from "lucide-react";
import { EditorialMarkdown } from "@/lib/markdownRenderer";

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
  defaultFontChoice = "editorial",
  editingNote = null,
  onSaveNote,
  onUpdateNote,
}: CreateNoteSheetProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [textAlign, setTextAlign] = useState<TextAlign>(defaultTextAlign);
  const [fontChoice, setFontChoice] = useState<FontChoice>(() => {
    if (editingNote?.fontChoice) return editingNote.fontChoice;
    const s = spaces.find((sp) => sp.id === defaultSpaceId);
    return s?.fontChoice || defaultFontChoice || "editorial";
  });
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

  // Audio recording state & popover menu
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(14).fill(15));
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(
    null,
  );
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // Live Voice-to-Text Dictation state
  const [isDictatingOnly, setIsDictatingOnly] = useState(false);
  const [dictationLang, setDictationLang] = useState<DictationLang>(() =>
    getSavedDictationLang(),
  );
  const [autoTranscribeMemo, setAutoTranscribeMemo] = useState<boolean>(() =>
    getSavedAutoTranscribe(),
  );
  const [interimSpeechText, setInterimSpeechText] = useState<string>("");
  const speechRecognizerRef = useRef<TactileSpeechRecognizer | null>(null);

  // Atelier Pro membership modal state
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proTriggerFeature, setProTriggerFeature] = useState<ProFeature | null>(
    null,
  );

  // Audio Trimmer Modal state
  const [isTrimmerOpen, setIsTrimmerOpen] = useState(false);
  const [fileToTrim, setFileToTrim] = useState<File | null>(null);

  // Inline Hybrid Editing & Formatting Drawer state
  const [isEditingContent, setIsEditingContent] = useState(true);
  const [isFormattingOpen, setIsFormattingOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<TactileAudioRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync or reset form state whenever sheet opens or editingNote changes
  useEffect(() => {
    if (!isOpen) {
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stop();
        speechRecognizerRef.current = null;
      }
      setIsDictatingOnly(false);
      setInterimSpeechText("");
      return;
    }

    setIsFormattingOpen(false);
    setIsEditingContent(true);
    setIsDictatingOnly(false);
    setInterimSpeechText("");

    if (editingNote) {
      setContent(editingNote.content || "");
      setTitle(editingNote.title || "");
      setTextAlign(editingNote.textAlign || defaultTextAlign);
      setFontChoice(editingNote.fontChoice || "editorial");
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
      setAudioError(null);

      const d = new Date(editingNote.createdAt);
      const validDate = !isNaN(d.getTime()) ? d : new Date();
      setNoteDate(toDateInputString(validDate));
      setNoteTime(toTimeInputString(validDate));
    } else {
      setContent("");
      setTitle("");
      setTextAlign(defaultTextAlign);
      const s = spaces.find((sp) => sp.id === defaultSpaceId);
      setFontChoice(s?.fontChoice || defaultFontChoice || "editorial");
      setSelectedSpaceId(defaultSpaceId);
      setLocationName("");
      setPhotos([]);
      setVideos([]);
      setVideoError(null);
      setAudioError(null);
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
  }, [
    isOpen,
    editingNote,
    defaultSpaceId,
    defaultTextAlign,
    defaultFontChoice,
  ]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioRecorderRef.current) audioRecorderRef.current.cancel();
      if (speechRecognizerRef.current) speechRecognizerRef.current.stop();
    };
  }, []);

  const currentSpace =
    spaces.find((s) => s.id === selectedSpaceId) || spaces[0];

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

    try {
      for (const file of selectedFiles) {
        const photoUrl = await processPhotoFile(file);
        if (photoUrl) {
          setPhotos((prev) => [...prev, photoUrl]);
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

  const startSpeechRecognizerSession = (lang: DictationLang) => {
    if (!isSpeechRecognitionSupported()) return false;
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
    }
    const recognizer = new TactileSpeechRecognizer(lang, {
      onInterim: (interim) => {
        setInterimSpeechText(interim);
      },
      onFinal: (finalSegment) => {
        setContent((prev) => appendTranscribedSegment(prev, finalSegment));
        setInterimSpeechText("");
      },
      onError: (msg) => {
        setAudioError(msg);
        setTimeout(() => setAudioError(null), 4000);
      },
    });
    speechRecognizerRef.current = recognizer;
    return recognizer.start();
  };

  const stopSpeechRecognizerSession = () => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
      speechRecognizerRef.current = null;
    }
    setInterimSpeechText("");
  };

  const handleToggleDictationLang = () => {
    triggerHaptic("light");
    const nextLang: DictationLang =
      dictationLang === "id-ID" ? "en-US" : "id-ID";
    setDictationLang(nextLang);
    setSavedDictationLang(nextLang);
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.setLanguage(nextLang);
    }
  };

  const handleToggleAutoTranscribe = () => {
    triggerHaptic("light");
    const next = !autoTranscribeMemo;
    setAutoTranscribeMemo(next);
    setSavedAutoTranscribe(next);

    if (isRecording) {
      if (next) {
        startSpeechRecognizerSession(dictationLang);
      } else {
        stopSpeechRecognizerSession();
      }
    }
  };

  const handleStartDictationOnly = () => {
    triggerHaptic("medium");
    setAudioError(null);

    if (!isSpeechRecognitionSupported()) {
      setAudioError(
        "Voice-to-text dictation is not supported on this browser.",
      );
      triggerHaptic("heavy");
      setTimeout(() => setAudioError(null), 4000);
      return;
    }

    const started = startSpeechRecognizerSession(dictationLang);
    if (started) {
      setIsDictatingOnly(true);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setAudioError(
        "Could not start voice dictation. Check microphone permissions.",
      );
      triggerHaptic("heavy");
      setTimeout(() => setAudioError(null), 4000);
    }
  };

  const handleStopDictationOnly = () => {
    triggerSuccessHaptic();
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    stopSpeechRecognizerSession();
    setIsDictatingOnly(false);
  };

  const handleStartRecording = async () => {
    triggerHaptic("medium");
    setAudioError(null);
    const recorder = new TactileAudioRecorder();
    audioRecorderRef.current = recorder;

    const started = await recorder.start((levels) => {
      setAudioLevels(levels);
    });

    if (started) {
      setIsRecording(true);
      setRecordingSeconds(0);
      if (autoTranscribeMemo && isSpeechRecognitionSupported()) {
        startSpeechRecognizerSession(dictationLang);
      }
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      audioRecorderRef.current = null;
      setAudioError("Microphone access is required to record a voice memo.");
      triggerHaptic("heavy");
      setTimeout(() => setAudioError(null), 4000);
    }
  };

  const handleStopRecording = async () => {
    triggerHaptic("medium");
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    stopSpeechRecognizerSession();

    if (audioRecorderRef.current) {
      const audioResult = await audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      if (audioResult) {
        const persistedUrl = await processAudioBlob(
          audioResult.blob,
          audioResult.url,
        );
        setRecordedAudio({
          ...audioResult,
          url: persistedUrl || audioResult.url,
        });
        triggerSuccessHaptic();
      }
    }

    setIsRecording(false);
  };

  const handleAudioFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioError(null);
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
        setRecordedAudio({
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
      setAudioError(msg);
      triggerHaptic("heavy");
      setTimeout(() => setAudioError(null), 5000);
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
      setRecordedAudio({
        blob: trimmed.blob,
        url: persistedUrl || trimmed.url,
        durationSeconds: trimmed.duration,
      });
      triggerSuccessHaptic();
    } catch (err) {
      console.error("Failed to persist trimmed audio:", err);
      setRecordedAudio({
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
    if (
      !content.trim() &&
      !marginaliaText.trim() &&
      photos.length === 0 &&
      videos.length === 0 &&
      !recordedAudio
    ) {
      onClose();
      return;
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
        content: content.trim(),
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
    setIsFormattingOpen(false);
    setIsEditingContent(true);
    setPhotos([]);
    setVideos([]);
    setRecordedAudio(null);
    setLocationName("");
    onClose();
  };

  const applyMarkdownWrap = (
    prefix: string,
    suffix: string,
    placeholder: string = "text",
  ) => {
    triggerHaptic("light");
    setIsEditingContent(true);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = content;
    const selectedText = currentVal.substring(start, end);

    if (selectedText.length > 0) {
      const nextVal =
        currentVal.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        currentVal.substring(end);
      setContent(nextVal);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 10);
    } else {
      const insertText = `${prefix}${placeholder}${suffix}`;
      const nextVal =
        currentVal.substring(0, start) + insertText + currentVal.substring(end);
      setContent(nextVal);

      setTimeout(() => {
        textarea.focus();
        const selStart = start + prefix.length;
        const selEnd = selStart + placeholder.length;
        textarea.setSelectionRange(selStart, selEnd);
      }, 10);
    }
  };

  const applyMarkdownBlock = (prefix: string, placeholder: string = "text") => {
    triggerHaptic("light");
    setIsEditingContent(true);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = content;
    const selectedText = currentVal.substring(start, end);

    const textBefore = currentVal.substring(0, start);
    const needsLeadingNewline =
      textBefore.length > 0 && !textBefore.endsWith("\n");
    const leading = needsLeadingNewline ? "\n" : "";

    if (prefix === "---\n") {
      const dividerInsert = `${leading}---\n`;
      const nextVal =
        currentVal.substring(0, start) +
        dividerInsert +
        currentVal.substring(end);
      setContent(nextVal);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + dividerInsert.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 10);
      return;
    }

    if (selectedText.length > 0) {
      const lines = selectedText.split("\n");
      const transformed = lines.map((l) => `${prefix}${l}`).join("\n");
      const nextVal =
        currentVal.substring(0, start) +
        leading +
        transformed +
        currentVal.substring(end);
      setContent(nextVal);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + leading.length,
          start + leading.length + transformed.length,
        );
      }, 10);
    } else {
      const blockInsert = `${leading}${prefix}${placeholder}\n`;
      const nextVal =
        currentVal.substring(0, start) +
        blockInsert +
        currentVal.substring(end);
      setContent(nextVal);

      setTimeout(() => {
        textarea.focus();
        const selStart = start + leading.length + prefix.length;
        const selEnd = selStart + placeholder.length;
        textarea.setSelectionRange(selStart, selEnd);
      }, 10);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;

    if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      applyMarkdownWrap("**", "**", "bold");
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      applyMarkdownWrap("*", "*", "italic");
    } else if ((e.key === "x" || e.key === "X") && e.shiftKey) {
      e.preventDefault();
      applyMarkdownWrap("~~", "~~", "strikethrough");
    } else if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      applyMarkdownWrap("`", "`", "code");
    }
  };

  const canSave =
    content.trim().length > 0 ||
    marginaliaText.trim().length > 0 ||
    photos.length > 0 ||
    videos.length > 0 ||
    recordedAudio !== null;

  const previewDateObj = new Date(`${noteDate}T${noteTime || "00:00"}`);
  const validPreviewDate = !isNaN(previewDateObj.getTime())
    ? previewDateObj
    : new Date();
  const formattedPreviewTime = formatTimeOnly(validPreviewDate);
  const formattedPreviewDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
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
            <header className="px-4 py-3 border-b border-[var(--glass-border)]/50 flex items-center justify-between gap-2 shrink-0 relative z-10 bg-[var(--sheet-bg)]/80 backdrop-blur-md">
              {/* Kiri: Close Button (HANYA X YANG DIBUNGKUS GLASS) */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs shrink-0"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              {/* Tengah: Notebook Picker & Date/Time strictly 1 BARIS */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 flex-1 text-center">
                {/* Space Picker */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setShowSpacePicker(!showSpacePicker);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 transition-opacity cursor-pointer group"
                  >
                    <span className="truncate max-w-[110px] sm:max-w-[140px]">
                      {currentSpace?.name || "Field Notes"}
                    </span>
                  </button>
                </div>

                <span className="text-[11px] text-[var(--text-tertiary)] opacity-40 select-none">
                  ·
                </span>

                {/* Inline Date & Time */}
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] font-sans not-italic select-none truncate">
                  <label
                    className="relative inline-flex items-center cursor-pointer hover:text-[var(--text-primary)] transition-colors truncate"
                    title="Change date"
                  >
                    <span>{formattedPreviewDate}</span>
                    <input
                      type="date"
                      value={noteDate}
                      onChange={(e) => setNoteDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>

                  <span className="opacity-40">·</span>

                  <label
                    className="relative inline-flex items-center cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                    title="Change time"
                  >
                    <span>{formattedPreviewTime}</span>
                    <input
                      type="time"
                      value={noteTime}
                      onChange={(e) => setNoteTime(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>

              {/* Kanan: Primary Action (Notice / Save) */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="px-3.5 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center gap-1 disabled:opacity-30 active:scale-95 transition-transform cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.12)] shrink-0"
                title={editingNote ? "Save changes" : "Notice into timeline"}
              >
                <span>{editingNote ? "Save" : "Notice"}</span>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </header>

            {/* 2. Writing Pad Content */}
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
                style={{
                  fontSize: "calc(var(--note-font-size, 16px) * 1.16)",
                }}
                className={`w-full bg-transparent border-0 p-0 font-serif font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/40 focus:outline-none tracking-tight ${
                  textAlign === "center"
                    ? "text-center"
                    : textAlign === "right"
                      ? "text-right"
                      : "text-left"
                }`}
              />

              {/* Hybrid Inline Markdown Editing */}
              {isEditingContent ? (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  onBlur={(e) => {
                    const related = e.relatedTarget as HTMLElement | null;
                    if (
                      related?.closest(".formatting-toolbar") ||
                      related?.closest(".formatting-btn")
                    ) {
                      return;
                    }
                    if (content.trim()) {
                      setIsEditingContent(false);
                    }
                  }}
                  placeholder="What caught your eye today?"
                  rows={6}
                  style={{ fontSize: "var(--note-font-size, 16px)" }}
                  className={`w-full bg-transparent resize-none border-0 p-0 leading-relaxed font-content text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 placeholder:font-serif placeholder:italic focus:outline-none ${
                    textAlign === "center"
                      ? "text-center"
                      : textAlign === "right"
                        ? "text-right"
                        : textAlign === "justify"
                          ? "text-justify"
                          : "text-left"
                  }`}
                />
              ) : (
                <div
                  onClick={() => {
                    triggerHaptic("light");
                    setIsEditingContent(true);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  style={{ fontSize: "var(--note-font-size, 16px)" }}
                  className={`w-full min-h-[140px] leading-relaxed font-content text-[var(--text-primary)] cursor-text select-text ${
                    textAlign === "center"
                      ? "text-center"
                      : textAlign === "right"
                        ? "text-right"
                        : textAlign === "justify"
                          ? "text-justify"
                          : "text-left"
                  }`}
                  title="Click to edit"
                >
                  <EditorialMarkdown content={content} />
                </div>
              )}

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
                          onClick={handleTriggerPhotoSelect}
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
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleTriggerPhotoSelect}
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
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleTriggerPhotoSelect}
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
                      <InlineVideoPlayer
                        src={vid}
                        className="w-full max-h-72"
                      />
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

              {/* Status Toasts */}
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
              {audioError && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-sans">
                  {audioError}
                </div>
              )}

              {/* Voice Memo Capsule */}
              {recordedAudio && (
                <div className="mt-2 p-2.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.035] shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex-1 overflow-hidden">
                    <TactileAudioPlayer
                      audioUrl={recordedAudio.url}
                      durationSeconds={recordedAudio.durationSeconds}
                      sourceId="create-note-audio-preview"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setRecordedAudio(null);
                    }}
                    className="p-2 text-[var(--text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                    title="Delete voice memo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </main>

            {/* 3. Laci Format Teks "Aa" */}
            <AnimatePresence>
              {isFormattingOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="formatting-toolbar px-4 py-2.5 border-t border-[var(--glass-border)]/50 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden shrink-0 z-10 space-y-2"
                >
                  {/* Baris 1: Font Family & Paragraph Alignment */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Font Choice */}
                    <div className="apple-segmented-track p-0.5">
                      {(
                        [
                          { id: "editorial", label: "Serif" },
                          { id: "sans", label: "Sans" },
                          { id: "display", label: "Classic" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setFontChoice(f.id);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] transition-all cursor-pointer ${
                            fontChoice === f.id
                              ? "bg-white dark:bg-neutral-800 text-[var(--text-primary)] font-semibold shadow-xs"
                              : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Paragraph Alignment */}
                    <div className="apple-segmented-track p-0.5">
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
                        ] as const
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
                                ? "bg-white dark:bg-neutral-800 text-[var(--text-primary)] shadow-xs"
                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            }`}
                            title={opt.label}
                          >
                            <Icon className="w-3 h-3 stroke-[2]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Baris 2: Markdown Quick Actions */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      type="button"
                      onClick={() => applyMarkdownWrap("**", "**", "bold")}
                      className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer font-bold shrink-0"
                      title="Bold (Cmd+B)"
                    >
                      <Bold className="w-3.5 h-3.5 stroke-[2.4]" />
                      <span className="text-[11px]">Bold</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMarkdownWrap("*", "*", "italic")}
                      className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer italic font-serif shrink-0"
                      title="Italic (Cmd+I)"
                    >
                      <Italic className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span className="text-[11px]">Italic</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        applyMarkdownWrap("~~", "~~", "strikethrough")
                      }
                      className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer line-through opacity-80 shrink-0"
                      title="Strikethrough (Cmd+Shift+X)"
                    >
                      <Strikethrough className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="text-[11px]">Strike</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMarkdownWrap("`", "`", "code")}
                      className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer font-mono shrink-0"
                      title="Inline Code (Cmd+E)"
                    >
                      <Code className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="text-[11px]">Code</span>
                    </button>

                    <div className="w-px h-3.5 bg-[var(--glass-border)] mx-1 shrink-0" />

                    <button
                      type="button"
                      onClick={() => applyMarkdownBlock("> ", "quote")}
                      className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      title="Quote block"
                    >
                      <Quote className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="text-[11px]">Quote</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMarkdownBlock("- ", "item")}
                      className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      title="Bullet list"
                    >
                      <List className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="text-[11px]">Bullet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMarkdownBlock("1. ", "item")}
                      className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      title="Numbered list"
                    >
                      <ListOrdered className="w-3.5 h-3.5 stroke-[2]" />
                      <span className="text-[11px]">Number</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMarkdownBlock("---\n", "")}
                      className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      title="Horizontal divider"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span className="text-[11px]">Divider</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Interim Speech Whisper Bar */}
            <AnimatePresence>
              {interimSpeechText && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 py-1.5 bg-[var(--text-primary)]/[0.035] border-t border-[var(--glass-border)]/40 flex items-center justify-between gap-2 text-xs font-serif italic text-[var(--text-secondary)] overflow-hidden shrink-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] animate-pulse shrink-0" />
                    <span className="truncate">“{interimSpeechText}...”</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] shrink-0">
                    {dictationLang === "id-ID" ? "ID" : "EN"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 4. Bottom Action Bar: Polos Tanpa Bungkus Glass */}
            <footer className="px-3.5 py-2 border-t border-[var(--glass-border)]/50 flex items-center justify-between gap-2 shrink-0 relative z-10 bg-[var(--sheet-bg)]/80 backdrop-blur-md">
              {/* Audio Menu Popover */}
              <AnimatePresence>
                {showAudioMenu && !isRecording && !isDictatingOnly && (
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
                              if (dictationLang !== "id-ID") {
                                handleToggleDictationLang();
                              }
                            }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              dictationLang === "id-ID"
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
                              if (dictationLang !== "en-US") {
                                handleToggleDictationLang();
                              }
                            }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              dictationLang === "en-US"
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
                          handleStartDictationOnly();
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
                              {dictationLang === "id-ID"
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
                            handleStartRecording();
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
                              {autoTranscribeMemo
                                ? "Audio + Auto-Transcribe"
                                : "Audio strip only"}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAutoTranscribe();
                          }}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 border ${
                            autoTranscribeMemo
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] border-transparent"
                              : "bg-transparent text-[var(--text-tertiary)] border-[var(--glass-border)] hover:text-[var(--text-primary)]"
                          }`}
                          title="Toggle simultaneous text transcription while recording"
                        >
                          {autoTranscribeMemo ? "Auto-Text ON" : "Text OFF"}
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

              {!isRecording && !isDictatingOnly ? (
                <div className="flex items-center justify-between w-full">
                  {/* Klaster Kiri: Input Media (Polos tanpa glass) */}
                  <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      type="button"
                      onClick={handleTriggerPhotoSelect}
                      className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-90 transition-all cursor-pointer shrink-0"
                      title="Add photos"
                    >
                      <ImageIcon className="w-4 h-4 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerCameraSelect}
                      className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-90 transition-all cursor-pointer shrink-0"
                      title="Take photo"
                    >
                      <Camera className="w-4 h-4 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerVideoSelect}
                      disabled={isVideoProcessing}
                      className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-90 transition-all cursor-pointer disabled:opacity-50 shrink-0"
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
                      className={`p-2 rounded-xl active:scale-90 transition-all cursor-pointer shrink-0 ${
                        showAudioMenu
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
                      }`}
                      title="Audio & dictation"
                    >
                      <Mic className="w-4 h-4 stroke-[1.85]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsEditingLocation(!isEditingLocation);
                      }}
                      className={`p-2 rounded-xl active:scale-90 transition-all cursor-pointer shrink-0 ${
                        locationName
                          ? "text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
                      }`}
                      title="Add location"
                    >
                      <MapPin className="w-4 h-4 stroke-[1.85]" />
                    </button>
                  </div>

                  {/* Klaster Kanan: Anotasi, Laci Format "Aa", & Counter (Polos tanpa glass) */}
                  <div className="flex items-center gap-1 shrink-0">
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
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-serif transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 ${
                        isMarginaliaOpen || marginaliaText
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-bold"
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
                      className={`formatting-btn px-2.5 py-1.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 ${
                        isFormattingOpen
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-bold"
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
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono hidden sm:inline select-none pl-1">
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
                      {Math.floor(recordingSeconds / 60)}:
                      {(recordingSeconds % 60).toString().padStart(2, "0")}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--text-secondary)]">
                      {isDictatingOnly ? "Dictating" : "Rec"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleDictationLang}
                      className="px-2 py-0.5 rounded-lg border border-[var(--glass-border)] text-[10px] font-mono font-bold text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer"
                      title="Switch language"
                    >
                      {dictationLang === "id-ID" ? "ID" : "EN"}
                    </button>

                    {isRecording && isSpeechRecognitionSupported() && (
                      <button
                        type="button"
                        onClick={handleToggleAutoTranscribe}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer border ${
                          autoTranscribeMemo
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] border-transparent"
                            : "bg-transparent text-[var(--text-tertiary)] border-[var(--glass-border)]"
                        }`}
                        title="Toggle transcription"
                      >
                        {autoTranscribeMemo ? "Text ON" : "Text OFF"}
                      </button>
                    )}

                    {isRecording && (
                      <div className="hidden sm:flex items-center gap-1 h-5">
                        {audioLevels.slice(0, 10).map((lvl, idx) => (
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
                      isDictatingOnly
                        ? handleStopDictationOnly
                        : handleStopRecording
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
        </div>
      )}
    </AnimatePresence>
  );
}
