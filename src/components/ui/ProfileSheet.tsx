import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  X,
  Camera,
  Lock,
  Cloud,
  ChevronRight,
  LogOut,
  Mail,
  Trash2,
  Check,
  ShieldCheck,
  KeyRound,
  HardDrive,
  Download,
  Upload,
} from "lucide-react";

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  avatarPhoto?: string | null;
  onUpdateAvatarPhoto: (photo: string | null) => void;
  totalVolumes: number;
  totalNotes: number;
  hasPin: boolean;
  onSetPin: (pin: string | null) => void;
  onLockSession: () => void;
  onExportArchive: () => void;
  onImportArchive: (file: File) => void;
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
  hasPin,
  onSetPin,
  onLockSession,
  onExportArchive,
  onImportArchive,
}: ProfileSheetProps) {
  // Local state for inline author name editing
  const [editingName, setEditingName] = useState(userName);
  const [saveIndicator, setSaveIndicator] = useState(false);

  // Cloud Account State
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidenotes_user_email") || null;
    }
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmailInput, setAuthEmailInput] = useState("");

  // PIN Passcode Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState("");

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

  // Photo Upload Handler (<2MB base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onUpdateAvatarPhoto(result);
        triggerSuccessHaptic();
        setSaveIndicator(true);
        setTimeout(() => setSaveIndicator(false), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetPhoto = () => {
    triggerHaptic("medium");
    onUpdateAvatarPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  // Auth Handlers
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmailInput.trim() || !authEmailInput.includes("@")) return;
    triggerSuccessHaptic();
    const cleanEmail = authEmailInput.trim().toLowerCase();
    setUserEmail(cleanEmail);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidenotes_user_email", cleanEmail);
    }
    setIsAuthModalOpen(false);
    setAuthEmailInput("");
  };

  const handleSignOut = () => {
    triggerHaptic("medium");
    setUserEmail(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sidenotes_user_email");
    }
  };

  // PIN Handlers
  const handleSavePin = () => {
    if (newPin.length === 4) {
      triggerSuccessHaptic();
      onSetPin(newPin);
      setIsPinModalOpen(false);
      setNewPin("");
    }
  };

  const handleRemovePin = () => {
    triggerHaptic("medium");
    onSetPin(null);
    setIsPinModalOpen(false);
    setNewPin("");
  };

  // Local Storage Usage Calculation
  const storageUsageText = useMemo(() => {
    if (typeof window === "undefined") return "0 KB";
    let totalBytes = 0;
    try {
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalBytes += (localStorage[key]?.length || 0) * 2;
        }
      }
    } catch {
      totalBytes = 48000;
    }
    const kb = Math.round(totalBytes / 1024);
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
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
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white backdrop-blur-[2px]"
                      title="Upload Avatar"
                    >
                      <Camera className="w-4 h-4 stroke-[2]" />
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
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          {userEmail ? "Cloud Synced" : "On-device only"}
                        </div>
                      </div>
                    </div>

                    {userEmail ? (
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="px-2.5 py-1 rounded-full inner-pseudo-glass text-[11px] font-medium text-[var(--text-secondary)] hover:text-rose-500 active:scale-95 transition-all cursor-pointer shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
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

                  {/* Passcode Row */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                        {hasPin ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <KeyRound className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          Passcode
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          {hasPin ? "Configured" : "Off"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsPinModalOpen(true);
                      }}
                      className="px-3 py-1 rounded-full inner-pseudo-glass text-xs font-medium text-[var(--text-primary)] active:scale-95 transition-transform cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]"
                    >
                      {hasPin ? "Change" : "Turn On"}
                    </button>
                  </div>

                  {/* Lock Screen Row */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      onClose();
                      onLockSession();
                    }}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[var(--text-primary)]/3 active:opacity-70 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                        <Lock className="w-3.5 h-3.5 opacity-80" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          Lock Session
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          Immediate lock
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-60" />
                  </button>
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
                        {storageUsageText}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
                      <div
                        className="h-full bg-[var(--text-primary)] rounded-full transition-all duration-500 shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
                        style={{ width: "12%" }}
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

          {/* Sub-Modal: Cloud Sign-In */}
          <AnimatePresence>
            {isAuthModalOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAuthModalOpen(false)}
                  className="fixed inset-0 bg-black/45 backdrop-blur-md"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 8 }}
                  className="relative w-full max-w-[280px] rounded-3xl p-5 dynamic-island-shell z-10 space-y-4 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.35)]"
                >
                  <div className="dynamic-island-specular-rim" />
                  <div className="text-center space-y-1">
                    <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)]/8 flex items-center justify-center text-[var(--text-primary)] mx-auto mb-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Sign In
                    </h4>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      Sync notes across your devices
                    </p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-3">
                    <input
                      type="email"
                      value={authEmailInput}
                      onChange={(e) => setAuthEmailInput(e.target.value)}
                      placeholder="name@email.com"
                      autoFocus
                      required
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none font-mono text-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(false)}
                        className="flex-1 py-1.5 rounded-xl inner-pseudo-glass text-xs font-medium text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer shadow-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold active:scale-95 transition-transform cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                      >
                        Continue
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Sub-Modal: PIN Passcode Setup */}
          <AnimatePresence>
            {isPinModalOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPinModalOpen(false)}
                  className="fixed inset-0 bg-black/45 backdrop-blur-md"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 8 }}
                  className="relative w-full max-w-[280px] rounded-3xl p-5 dynamic-island-shell z-10 space-y-4 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.35)]"
                >
                  <div className="dynamic-island-specular-rim" />
                  <div className="text-center space-y-1">
                    <div className="w-9 h-9 rounded-xl bg-[var(--text-primary)]/8 flex items-center justify-center text-[var(--text-primary)] mx-auto mb-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {hasPin ? "Change PIN" : "Set PIN"}
                    </h4>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      Enter a 4-digit passcode
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <input
                        type="password"
                        maxLength={4}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        autoFocus
                        value={newPin}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4);
                          setNewPin(val);
                        }}
                        placeholder="••••"
                        className="w-32 text-center text-xl font-mono tracking-widest px-3 py-1.5 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                      />
                    </div>

                    <div className="flex gap-2">
                      {hasPin && (
                        <button
                          type="button"
                          onClick={handleRemovePin}
                          className="flex-1 py-1.5 rounded-xl bg-rose-500/10 text-xs font-semibold text-rose-500 active:scale-95 transition-transform cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsPinModalOpen(false)}
                        className="flex-1 py-1.5 rounded-xl inner-pseudo-glass text-xs font-medium text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer shadow-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={newPin.length !== 4}
                        onClick={handleSavePin}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform cursor-pointer ${
                          newPin.length === 4
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                            : "bg-[var(--text-primary)]/10 text-[var(--text-tertiary)] cursor-not-allowed"
                        }`}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
