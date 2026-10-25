import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Space, FieldNote } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import {
  X,
  Camera,
  Cloud,
  LogOut,
  Trash2,
  Check,
  HardDrive,
  Download,
  Upload,
  RotateCw,
  KeyRound,
  Eye,
  EyeOff,
  FileText,
  Quote,
  Mic,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { AuthModal } from "./AuthModal";
import { processPhotoFile } from "@/lib/mediaStorage";
import { loadFromAtelierDB } from "@/lib/storage";
import { updateUserPassword } from "@/lib/supabase";
import { useProStatus } from "@/lib/proManager";
import { AtelierProModal } from "./AtelierProModal";

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  authorBio?: string;
  onUpdateAuthorBio?: (bio: string) => void;
  avatarPhoto?: string | null;
  onUpdateAvatarPhoto: (photo: string | null) => void;
  totalVolumes: number;
  totalNotes: number;
  notes?: FieldNote[];
  spaces?: Space[];
  onExportArchive: () => void;
  onImportArchive: (file: File) => void;
  onUnarchiveNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  onAuthSuccess?: (email: string) => void;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
  onTriggerSync?: () => Promise<void> | void;
  onDeleteAccount?: () => Promise<void> | void;
}

export function ProfileSheet({
  isOpen,
  onClose,
  userName = "Author",
  onUpdateUserName,
  authorBio = "Quiet observations & daily marginalia",
  onUpdateAuthorBio,
  avatarPhoto,
  onUpdateAvatarPhoto,
  totalVolumes = 0,
  totalNotes = 0,
  notes = [],
  spaces = [],
  onExportArchive,
  onImportArchive,
  userEmail,
  onSignOut,
  onAuthSuccess,
  isSyncing = false,
  lastSyncedAt,
  onTriggerSync,
  onDeleteAccount,
}: ProfileSheetProps) {
  useLockBodyScroll(isOpen);

  // Local state for inline author name and bio editing
  const [editingName, setEditingName] = useState(userName);
  const [editingBio, setEditingBio] = useState(authorBio);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Cloud Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Atelier Pro Monetization State
  const isPro = useProStatus();
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  // Account Deletion State (Apple 5.1.1(v) & Google Play Compliance)
  const [isDeleteAccountConfirmOpen, setIsDeleteAccountConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // Password Change Sub-Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [passwordModalSuccess, setPasswordModalSuccess] = useState(false);

  // File Inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);

  // Sync props with local state
  useEffect(() => {
    setEditingName(userName);
  }, [userName]);

  useEffect(() => {
    setEditingBio(authorBio);
  }, [authorBio]);

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced auto-save for user name
  const saveNameNow = (nameToSave: string) => {
    const trimmed = nameToSave.trim();
    if (trimmed && trimmed !== userName) {
      onUpdateUserName(trimmed);
      triggerSuccessHaptic();
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (editingName.trim() && editingName.trim() !== userName) {
        saveNameNow(editingName);
      }
    }, 750);
    return () => clearTimeout(timer);
  }, [editingName, userName]);

  // Debounced auto-save for author bio / motto
  const saveBioNow = (bioToSave: string) => {
    const trimmed = bioToSave.trim();
    if (trimmed !== authorBio) {
      onUpdateAuthorBio?.(trimmed);
      triggerSuccessHaptic();
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (editingBio.trim() !== authorBio) {
        saveBioNow(editingBio);
      }
    }, 750);
    return () => clearTimeout(timer);
  }, [editingBio, authorBio]);

  // Compressed + Cloud-Synced Avatar Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const processedUrl = await processPhotoFile(file);
      onUpdateAvatarPhoto(processedUrl);
      triggerSuccessHaptic();
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    } catch (err) {
      console.error("[Noticed] Avatar upload failed:", err);
    } finally {
      setIsUploadingAvatar(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleResetPhoto = () => {
    triggerHaptic("medium");
    onUpdateAvatarPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  // Auth Handlers
  const handleSignOut = () => {
    triggerHaptic("medium");
    onSignOut?.();
  };

  // Handle in-app password update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      triggerHaptic("heavy");
      setPasswordModalError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerHaptic("heavy");
      setPasswordModalError("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordModalError(null);
    try {
      await updateUserPassword(newPassword);
      triggerSuccessHaptic();
      setPasswordModalSuccess(true);
      setTimeout(() => {
        setPasswordModalSuccess(false);
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
      }, 1500);
    } catch (err: unknown) {
      triggerHaptic("heavy");
      const message = err instanceof Error ? err.message : "Failed to update password.";
      setPasswordModalError(message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const archivedVolumesCount = useMemo(() => {
    return spaces.filter((s) => Boolean(s.archived)).length;
  }, [spaces]);

  // Literary Portfolio Statistics calculation
  const literaryStats = useMemo(() => {
    let wordCount = 0;
    let footnoteCount = 0;
    let photoCount = 0;
    let audioCount = 0;

    for (const note of notes) {
      if (note.content) {
        wordCount += note.content.trim().split(/\s+/).filter(Boolean).length;
      }
      if (note.marginaliaItems && note.marginaliaItems.length > 0) {
        footnoteCount += note.marginaliaItems.length;
      } else if (note.marginalia) {
        footnoteCount += 1;
      }
      if (note.highlights) {
        footnoteCount += note.highlights.filter((h) => Boolean(h.marginalia)).length;
      }
      if (note.photos) {
        photoCount += note.photos.length;
      }
      if (note.voiceMemo) {
        audioCount += 1;
      }
    }

    return { wordCount, footnoteCount, photoCount, audioCount };
  }, [notes]);

  // Accurate Local Vault (IndexedDB + localStorage) Usage Calculation
  const [storageStats, setStorageStats] = useState<{
    label: string;
    percent: number;
  }>({ label: "0 KB", percent: 0 });

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    let isCancelled = false;

    (async () => {
      let totalBytes = 0;
      try {
        for (const key in localStorage) {
          if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            totalBytes += (localStorage[key]?.length || 0) * 2;
          }
        }
        const [idbNotes, idbSpaces] = await Promise.all([
          loadFromAtelierDB<unknown>("sidenotes_notes"),
          loadFromAtelierDB<unknown>("sidenotes_spaces"),
        ]);
        if (idbNotes) {
          totalBytes += JSON.stringify(idbNotes).length * 2;
        }
        if (idbSpaces) {
          totalBytes += JSON.stringify(idbSpaces).length * 2;
        }
      } catch {
        totalBytes = 0;
      }

      if (isCancelled) return;
      const kb = Math.round(totalBytes / 1024);
      const label =
        kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
      const percent =
        totalBytes > 0
          ? Math.max(
              2,
              Math.min(100, Math.round((totalBytes / (25 * 1024 * 1024)) * 100)),
            )
          : 0;
      setStorageStats({ label, percent });
    })();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, totalNotes, totalVolumes, avatarPhoto]);

  // Archive Import Handler
  const handleArchiveFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic("medium");
      onImportArchive(file);
      if (archiveInputRef.current) archiveInputRef.current.value = "";
      onClose();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pointer-events-none">
          {/* Subtle Ambient Dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="fixed inset-0 bg-black/35 backdrop-blur-[6px] pointer-events-auto"
          />

          {/* Top Floating Liquid Glass Island */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-sheet-title"
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="
              pointer-events-auto relative w-full max-w-sm sm:max-w-md
              dynamic-island-shell overflow-hidden z-10 flex flex-col
              shadow-[0_24px_50px_-12px_rgba(0,0,0,0.18),0_8px_20px_-4px_rgba(0,0,0,0.08)]
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

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--glass-border)]/40 shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <span
                  id="profile-sheet-title"
                  className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
                >
                  Profile
                </span>
                {saveIndicator && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] animate-in fade-in duration-150">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    Saved
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                aria-label="Tutup Profil"
                className="relative w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs before:absolute before:-inset-2 before:content-['']"
                title="Close"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
              {/* 1. TOP AUTHOR PROFILE CARD (Directly at top!) */}
              <div className="p-3.5 rounded-2xl apple-card space-y-3 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                <div className="flex items-center gap-3.5">
                  <div className="relative group shrink-0">
                    <div className="w-13 h-13 rounded-2xl overflow-hidden border border-white/60 dark:border-white/15 bg-[var(--text-primary)]/5 flex items-center justify-center relative shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.5)]">
                      {avatarPhoto ? (
                        <img
                          src={avatarPhoto}
                          alt={userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-serif font-bold text-[var(--text-primary)]">
                          {userName.charAt(0).toUpperCase() || "A"}
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={isUploadingAvatar}
                        onClick={() => photoInputRef.current?.click()}
                        className={`absolute inset-0 bg-black/40 ${
                          isUploadingAvatar
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        } flex items-center justify-center transition-opacity cursor-pointer text-white backdrop-blur-[2px]`}
                        title="Upload Avatar"
                      >
                        {isUploadingAvatar ? (
                          <RotateCw className="w-4 h-4 stroke-[2] animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 stroke-[2]" />
                        )}
                      </button>
                    </div>

                    {avatarPhoto && (
                      <button
                        type="button"
                        onClick={handleResetPhoto}
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/20 text-[var(--text-secondary)] hover:text-rose-500 flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}

                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-0.5">
                      Author
                    </div>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveNameNow(editingName)}
                      placeholder="Name"
                      className="w-full bg-transparent text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none tracking-tight"
                    />
                    <div className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5 mt-0.5">
                      <span>{totalVolumes} Volumes</span>
                      <span>•</span>
                      <span>{notes.length} Notes</span>
                      {archivedVolumesCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[var(--text-secondary)] font-medium">
                            {archivedVolumesCount} Archived
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ex Libris / Author Bio / Motto */}
                <div className="pt-2.5 border-t border-[var(--glass-border)]/40 space-y-1">
                  <div className="text-[9.5px] font-mono uppercase tracking-widest text-[var(--text-tertiary)] font-semibold flex items-center justify-between">
                    <span>Ex Libris · Motto</span>
                    <span className="italic font-serif normal-case opacity-60">Personal Inscription</span>
                  </div>
                  <input
                    type="text"
                    value={editingBio}
                    onChange={(e) => setEditingBio(e.target.value)}
                    onBlur={() => saveBioNow(editingBio)}
                    placeholder="e.g. Quiet observations & daily thoughts..."
                    className="w-full bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--glass-border)]/50 rounded-xl px-3 py-1.5 text-xs font-serif italic text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 focus:outline-none focus:border-[var(--text-primary)]/40 transition-colors"
                  />
                </div>
              </div>

              {/* 2. LITERARY PORTFOLIO INSIGHTS (STATS) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Literary Insights
                </span>

                <div className="p-3 rounded-2xl apple-card shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Words */}
                    <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--glass-border)]/40 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)] shrink-0">
                        <FileText className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold font-mono tracking-tight text-[var(--text-primary)] leading-tight">
                          {literaryStats.wordCount.toLocaleString()}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-mono mt-0.5">
                          Words Written
                        </div>
                      </div>
                    </div>

                    {/* Sidenotes / Footnotes */}
                    <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--glass-border)]/40 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)] shrink-0">
                        <Quote className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold font-mono tracking-tight text-[var(--text-primary)] leading-tight">
                          {literaryStats.footnoteCount}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-mono mt-0.5">
                          Footnotes
                        </div>
                      </div>
                    </div>

                    {/* Polaroids / Photos */}
                    <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--glass-border)]/40 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)] shrink-0">
                        <Camera className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold font-mono tracking-tight text-[var(--text-primary)] leading-tight">
                          {literaryStats.photoCount}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-mono mt-0.5">
                          Polaroids
                        </div>
                      </div>
                    </div>

                    {/* Audio Memos */}
                    <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--glass-border)]/40 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)] shrink-0">
                        <Mic className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold font-mono tracking-tight text-[var(--text-primary)] leading-tight">
                          {literaryStats.audioCount}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-mono mt-0.5">
                          Voice Memos
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. ACCOUNT & SECURITY (Includes Password Change) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Account & Security
                </span>

                <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {/* Account Row */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                        {userEmail ? (
                          <Cloud className="w-3.5 h-3.5 opacity-80" />
                        ) : (
                          <HardDrive className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {userEmail ? userEmail : "Local Storage"}
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                          {userEmail ? (
                            !isPro ? (
                              <span className="text-[var(--text-secondary)] font-medium">
                                On-device (Cloud Sync Pro)
                              </span>
                            ) : isSyncing ? (
                              <span className="flex items-center gap-1 text-[var(--text-primary)]">
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                                <span>Syncing...</span>
                              </span>
                            ) : (
                              <span className="text-emerald-500/90">
                                {lastSyncedAt
                                  ? "Synced with Cloud"
                                  : "Cloud Connected"}
                              </span>
                            )
                          ) : (
                            "On-device only"
                          )}
                        </div>
                      </div>
                    </div>

                    {userEmail ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isPro) {
                              triggerHaptic("medium");
                              setIsProModalOpen(true);
                              return;
                            }
                            triggerHaptic("medium");
                            onTriggerSync?.();
                          }}
                          disabled={isSyncing}
                          title={isPro ? "Sync changes now" : "Upgrade to Pro to sync"}
                          className="px-2.5 py-1 rounded-full inner-pseudo-glass text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-40 shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]"
                        >
                          <RotateCw
                            className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`}
                          />
                          <span className="text-[10px]">Sync</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSignOut}
                          title="Sign Out"
                          className="p-1.5 rounded-full inner-pseudo-glass text-[11px] font-medium text-[var(--text-secondary)] hover:text-rose-500 active:scale-95 transition-all cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]"
                        >
                          <LogOut className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("medium");
                          setIsAuthModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold active:scale-95 transition-transform cursor-pointer shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)]"
                      >
                        Sign In
                      </button>
                    )}
                  </div>

                  {/* Password Reset / Change Row for Logged-In Users */}
                  {userEmail && (
                    <div className="p-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          <span>Password & Security</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          Update your cloud account password
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("medium");
                          setPasswordModalError(null);
                          setPasswordModalSuccess(false);
                          setNewPassword("");
                          setConfirmPassword("");
                          setIsPasswordModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-full inner-pseudo-glass text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Change</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. STORAGE & BACKUP */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Storage & Backup
                </span>

                <div className="rounded-2xl apple-card divide-y divide-[var(--glass-border)]/50 overflow-hidden shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {/* Storage Meter */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Usage
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-secondary)] font-medium">
                        {storageStats.label}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
                      <div
                        className="h-full bg-[var(--text-primary)] rounded-full transition-all duration-500 shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
                        style={{ width: `${storageStats.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Backup / Restore */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        Archive
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">
                        Backup & restore
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          triggerSuccessHaptic();
                          onExportArchive();
                        }}
                        className="px-3 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)]"
                      >
                        <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                        <span>Export</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => archiveInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-full inner-pseudo-glass text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]"
                      >
                        <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
                        <span>Import</span>
                      </button>
                      <input
                        ref={archiveInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleArchiveFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. DANGER ZONE / ACCOUNT & DATA ERASURE (App Store 5.1.1(v) & Google Play Compliance) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium tracking-wide text-rose-500/80 px-2">
                  Account & Data Privacy
                </span>

                <div className="rounded-2xl apple-card border border-rose-500/20 overflow-hidden shadow-[0_8px_24px_-6px_rgba(244,63,94,0.08)]">
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-rose-500 flex items-center gap-1.5">
                        <UserX className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                        <span>Delete Account & Data</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-snug">
                        Permanently purge cloud profile, all journals, media attachments, and local caches
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("heavy");
                        setDeleteConfirmInput("");
                        setIsDeleteAccountConfirmOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-500 border border-rose-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Trash2 className="w-3 h-3 stroke-[2.2]" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sub-Modal: Cloud 6-Digit OTP Sign-In */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={(newEmail) => {
              onAuthSuccess?.(newEmail);
              setIsAuthModalOpen(false);
            }}
          />

          {/* Sub-Modal: Change Password In-App Dialog */}
          <AnimatePresence>
            {isPasswordModalOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-[6px]"
                />
                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  className="relative w-full max-w-sm rounded-3xl dynamic-island-shell p-5 border border-[var(--glass-border)] shadow-2xl z-10 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[var(--glass-border)]/40 pb-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[var(--text-primary)]" />
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Change Account Password
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPasswordModalOpen(false)}
                      className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                    {passwordModalError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                        {passwordModalError}
                      </div>
                    )}
                    {passwordModalSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-1.5 font-medium">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        Password updated successfully!
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full px-3 py-2 pr-9 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 focus:outline-none focus:border-[var(--text-primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 focus:outline-none focus:border-[var(--text-primary)]"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPasswordModalOpen(false)}
                        className="px-3.5 py-1.5 rounded-full inner-pseudo-glass text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingPassword || passwordModalSuccess}
                        className="px-4 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isUpdatingPassword ? (
                          <>
                            <RotateCw className="w-3 h-3 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <span>Update Password</span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Sub-Modal: In-App Delete Account Confirmation Dialog (Apple 5.1.1(v) & Google Play Compliance) */}
          <AnimatePresence>
            {isDeleteAccountConfirmOpen && (
              <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    if (!isDeletingAccount) {
                      triggerHaptic("light");
                      setDeleteConfirmInput("");
                      setIsDeleteAccountConfirmOpen(false);
                    }
                  }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-[6px]"
                />
                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  className="relative w-full max-w-xs sm:max-w-sm rounded-3xl dynamic-island-shell p-5 border border-rose-500/30 shadow-2xl z-10 space-y-4 text-center pointer-events-auto"
                >
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/25 shadow-xs">
                    <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
                      Permanently Delete Account?
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      This action is <strong className="text-rose-500 font-semibold">irreversible</strong>. In compliance with Apple & Google Play privacy standards, your cloud account, synchronised notebooks, media archives, and local device records will be permanently erased.
                    </p>
                  </div>

                  {/* Verification Input (Type DELETE to confirm) */}
                  <div className="text-left space-y-1.5 pt-1">
                    <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                      Type <span className="font-mono font-bold text-rose-500">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                      value={deleteConfirmInput}
                      onChange={(e) => setDeleteConfirmInput(e.target.value)}
                      placeholder="DELETE"
                      disabled={isDeletingAccount}
                      className="w-full px-3 py-2 rounded-xl text-center font-mono font-bold text-xs uppercase tracking-wider bg-black/5 dark:bg-white/5 border border-rose-500/30 focus:border-rose-500 focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/40 transition-colors"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={() => {
                        triggerHaptic("light");
                        setDeleteConfirmInput("");
                        setIsDeleteAccountConfirmOpen(false);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-[var(--glass-border)] text-xs font-medium text-[var(--text-primary)] inner-pseudo-glass active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingAccount || deleteConfirmInput.trim().toUpperCase() !== "DELETE"}
                      onClick={async () => {
                        triggerHaptic("heavy");
                        setIsDeletingAccount(true);
                        try {
                          await onDeleteAccount?.();
                          setDeleteConfirmInput("");
                          setIsDeleteAccountConfirmOpen(false);
                        } finally {
                          setIsDeletingAccount(false);
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      {isDeletingAccount ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Atelier Pro Showcase Modal */}
          <AtelierProModal
            isOpen={isProModalOpen}
            onClose={() => setIsProModalOpen(false)}
          />
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
