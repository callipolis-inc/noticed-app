import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
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
} from "lucide-react";
import { AuthModal } from "./AuthModal";
import { getTimeGreeting } from "@/lib/greetings";
import { processPhotoFile } from "@/lib/mediaStorage";
import { loadFromAtelierDB } from "@/lib/storage";

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  avatarPhoto?: string | null;
  onUpdateAvatarPhoto: (photo: string | null) => void;
  totalVolumes: number;
  totalNotes: number;
  onExportArchive: () => void;
  onImportArchive: (file: File) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  onAuthSuccess?: (email: string) => void;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
  onTriggerSync?: () => Promise<void> | void;
}

export function ProfileSheet({
  isOpen,
  onClose,
  userName = "Afa",
  onUpdateUserName,
  avatarPhoto,
  onUpdateAvatarPhoto,
  totalVolumes = 6,
  totalNotes = 8,
  onExportArchive,
  onImportArchive,
  userEmail,
  onSignOut,
  onAuthSuccess,
  isSyncing = false,
  lastSyncedAt,
  onTriggerSync,
}: ProfileSheetProps) {
  const timeGreeting = useMemo(() => getTimeGreeting(), []);

  // Local state for inline author name editing
  const [editingName, setEditingName] = useState(userName);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Cloud Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // File Inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);

  // Sync userName prop with local editing state
  useEffect(() => {
    setEditingName(userName);
  }, [userName]);

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

  // Accurate Local Vault (IndexedDB + localStorage) Usage Calculation
  const [storageStats, setStorageStats] = useState<{
    label: string;
    percent: number;
  }>({ label: "0 KB", percent: 4 });

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
        totalBytes = 48000;
      }

      if (isCancelled) return;
      const kb = Math.max(1, Math.round(totalBytes / 1024));
      const label =
        kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
      // Scale percentage relative to a 25 MB local vault reference (clamped 4% - 100%)
      const percent = Math.max(
        4,
        Math.min(100, Math.round((totalBytes / (25 * 1024 * 1024)) * 100)),
      );
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

  return (
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
                <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
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
                className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                title="Close"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
              {/* Welcoming Time-based Greeting Header */}
              <div className="px-1 pt-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)] font-semibold block">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <h2 className="text-lg font-serif font-bold text-[var(--text-primary)] tracking-tight mt-0.5 whitespace-nowrap truncate">
                  {timeGreeting}, {userName || "Author"}
                </h2>
              </div>

              {/* Profile Card */}
              <div className="p-3.5 rounded-2xl apple-card flex items-center gap-3.5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
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
                    <span>{totalNotes} Notes</span>
                  </div>
                </div>
              </div>

              {/* Group: Account & Access */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] px-2">
                  Account & Access
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
                            isSyncing ? (
                              <span className="flex items-center gap-1 text-sky-500">
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
                            triggerHaptic("medium");
                            onTriggerSync?.();
                          }}
                          disabled={isSyncing}
                          title="Sync changes now"
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
                </div>
              </div>

              {/* Group: Storage & Backup */}
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

        </div>
      )}
    </AnimatePresence>
  );
}
