import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsQR from "jsqr";
import { Space, FieldNote } from "@/types";
import { FREE_MAX_SPACES } from "@/lib/proManager";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { dbToSpace, dbToNote } from "@/lib/syncEngine";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  X,
  QrCode,
  Keyboard,
  Camera,
  Image as ImageIcon,
  ArrowRight,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Edit3,
  Eye,
  RefreshCw,
} from "lucide-react";

interface JoinSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string | null;
  existingSpaces: Space[];
  isPro: boolean;
  onTriggerPro: (feature: "spaces_limit") => void;
  onJoinSuccess: (space: Space, notes: FieldNote[]) => void;
}

export function JoinSpaceModal({
  isOpen,
  onClose,
  initialCode,
  existingSpaces,
  isPro,
  onTriggerPro,
  onJoinSuccess,
}: JoinSpaceModalProps) {
  const [activeTab, setActiveTab] = useState<"scan" | "type">("scan");
  const [inputCode, setInputCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundSpace, setFoundSpace] = useState<Space | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to parse code from text or URL (e.g. https://noticed.app/join/ABCD1234 or noticed://space/join?code=ABCD1234)
  const extractCode = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    try {
      if (trimmed.includes("://") || trimmed.startsWith("http")) {
        const url = new URL(trimmed);
        const codeParam = url.searchParams.get("code") || url.searchParams.get("join");
        if (codeParam) return codeParam.trim().toUpperCase();
        const segments = url.pathname.split("/").filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        if (lastSegment && lastSegment !== "join") {
          return lastSegment.trim().toUpperCase();
        }
      }
    } catch {
      // Not a valid URL, treat as raw code
    }
    return trimmed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12).toUpperCase();
  };

  // Perform search in Supabase by invite_code or space id
  const performSearch = useCallback(
    async (codeToSearch: string) => {
      const code = extractCode(codeToSearch);
      if (!code) {
        setSearchError("Masukkan kode undangan yang valid.");
        return;
      }

      setSearchError(null);
      setFoundSpace(null);
      setIsSearching(true);
      triggerHaptic("light");

      try {
        if (!isSupabaseConfigured) {
          throw new Error("Koneksi Supabase belum terkonfigurasi. Pastikan koneksi internet stabil.");
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "preview_space_by_invite",
          { p_invite_code: code },
        );

        if (rpcError) {
          throw rpcError;
        }

        const rawSpace = rpcData?.space;
        if (!rawSpace) {
          setSearchError("Notebook tidak ditemukan atau izin berbagi belum diaktifkan oleh pemiliknya.");
          triggerHaptic("heavy");
          return;
        }

        // Check if already in existing spaces
        const alreadyJoined = existingSpaces.some(
          (s) => s.id === rawSpace.id || (s.inviteCode && s.inviteCode.toUpperCase() === code),
        );
        if (alreadyJoined) {
          setSearchError("Notebook ini sudah ada di rak buku Anda.");
          triggerHaptic("medium");
          return;
        }

        const resolvedSpace = dbToSpace(rawSpace);
        if (rpcData?.owner_name) {
          resolvedSpace.partnerName = rpcData.owner_name;
        }
        setFoundSpace(resolvedSpace);
        triggerSuccessHaptic();
      } catch (err: any) {
        console.error("[JoinSpaceModal] Search error:", err);
        setSearchError(err?.message || "Gagal mencari notebook. Periksa koneksi internet Anda.");
        triggerHaptic("heavy");
      } finally {
        setIsSearching(false);
      }
    },
    [existingSpaces],
  );

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Frame processing loop with jsQR
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      const extracted = extractCode(code.data);
      if (extracted) {
        triggerSuccessHaptic();
        stopCamera();
        setInputCode(extracted);
        setActiveTab("type");
        performSearch(extracted);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [performSearch, stopCamera]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Kamera tidak didukung di browser atau perangkat ini.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn("[JoinSpaceModal] Camera access error:", err);
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Izin kamera ditolak. Silakan berikan izin di pengaturan perangkat atau gunakan ketik kode manual."
          : "Tidak dapat mengakses kamera belakang.",
      );
      setCameraActive(false);
    }
  }, [scanFrame, stopCamera]);

  // Handle uploaded image for QR scan
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          const extracted = extractCode(code.data);
          if (extracted) {
            triggerSuccessHaptic();
            setInputCode(extracted);
            setActiveTab("type");
            performSearch(extracted);
            return;
          }
        }
        setSearchError("Tidak ditemukan kode QR yang valid pada gambar yang diunggah.");
        triggerHaptic("heavy");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setFoundSpace(null);
      setSearchError(null);
      setInputCode("");
      return;
    }

    if (initialCode) {
      const extracted = extractCode(initialCode);
      setInputCode(extracted);
      setActiveTab("type");
      performSearch(extracted);
    } else {
      setActiveTab("scan");
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, initialCode, performSearch, startCamera, stopCamera]);

  // Tab switch
  const handleTabSwitch = (tab: "scan" | "type") => {
    triggerHaptic("light");
    setActiveTab(tab);
    setSearchError(null);
    if (tab === "scan") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Confirm join action
  const handleConfirmJoin = async () => {
    if (!foundSpace) return;

    // 1. Quota Check for Free Tier
    if (!isPro && existingSpaces.length >= FREE_MAX_SPACES) {
      triggerHaptic("medium");
      onClose();
      onTriggerPro("spaces_limit");
      return;
    }

    setIsJoining(true);
    triggerHaptic("medium");

    try {
      // 2. Call join_space_by_invite RPC to safely register membership in database
      const { data: joinResult, error: joinError } = await supabase.rpc(
        "join_space_by_invite",
        { p_invite_code: foundSpace.inviteCode || foundSpace.id },
      );

      if (joinError) {
        throw joinError;
      }

      const assignedRole = joinResult?.role || foundSpace.defaultRole || "editor";
      const returnedSpace = joinResult?.space ? dbToSpace(joinResult.space) : foundSpace;

      // 3. Fetch all field notes for this space (now permitted by RLS since user is in space_members!)
      const { data: notesData, error: notesError } = await supabase
        .from("field_notes")
        .select("*")
        .eq("space_id", foundSpace.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (notesError) {
        console.warn("[JoinSpaceModal] Note fetch warning:", notesError);
      }

      const convertedNotes = (notesData || []).map((row) => dbToNote(row));

      // 4. Mark space as joined collaborator with assigned role
      const spaceToJoin: Space = {
        ...returnedSpace,
        isShared: true,
        memberRole: assignedRole,
        membersCount: returnedSpace.membersCount || (foundSpace.membersCount || 1) + 1,
        updatedAt: new Date().toISOString(),
      };

      triggerSuccessHaptic();
      onJoinSuccess(spaceToJoin, convertedNotes);
      onClose();
    } catch (err: any) {
      console.error("[JoinSpaceModal] Failed to join space:", err);
      setSearchError(err?.message || "Gagal bergabung ke notebook. Silakan coba beberapa saat lagi.");
      triggerHaptic("heavy");
    } finally {
      setIsJoining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-[32px] overflow-hidden bg-[var(--sheet-bg)] backdrop-blur-[40px] saturate-[190%] border border-[var(--glass-border)] shadow-[0_28px_64px_-12px_rgba(0,0,0,0.32)] flex flex-col max-h-[88dvh] p-5 relative text-[var(--text-primary)]"
          style={{
            marginTop: "max(calc(env(safe-area-inset-top, 0px) + 16px), 24px)",
          }}
        >
          <div className="dynamic-island-specular-rim" />

          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--glass-border)]/50 relative z-10">
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
            <div className="text-center">
              <span className="text-[9px] font-semibold tracking-widest uppercase text-[var(--text-tertiary)] block">
                Atelier Collaboration
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Gabung ke Space
              </span>
            </div>
            <div className="w-7 h-7" />
          </div>

          <div className="pt-3.5 space-y-3.5 overflow-y-auto no-scrollbar relative z-10">
            {/* View Segmented Selector (Pindai QR vs Ketik Kode) */}
            {!foundSpace && (
              <div className="flex items-center justify-center p-0.5 rounded-xl inner-pseudo-glass border border-[var(--glass-border)]/50">
                <button
                  type="button"
                  onClick={() => handleTabSwitch("scan")}
                  className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "scan"
                      ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Pindai QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch("type")}
                  className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "type"
                      ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Ketik Kode</span>
                </button>
              </div>
            )}

            {/* Error Message */}
            {searchError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{searchError}</span>
              </div>
            )}

            {/* STATE 1: FOUND SPACE PREVIEW */}
            {foundSpace ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Notebook Ditemukan
                  </span>
                </div>

                {/* Notebook Card Preview */}
                <div className="p-4 rounded-2xl apple-card border border-[var(--glass-border)] shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-16 rounded-lg shadow-md flex flex-col justify-between p-2 shrink-0 border border-black/20"
                      style={{
                        backgroundColor: foundSpace.customColor || "#2b3543",
                      }}
                    >
                      <div className="w-3 h-0.5 rounded-full bg-white/40" />
                      <BookOpen className="w-4 h-4 text-white/90 self-center" />
                      <div className="w-full h-0.5 rounded-full bg-white/20" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold font-serif text-[var(--text-primary)] truncate">
                        {foundSpace.name}
                      </h3>
                      <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-2 mt-0.5">
                        {foundSpace.description || "Notebook kolaborasi tanpa deskripsi tambahan."}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-sans font-semibold bg-[var(--text-primary)]/10 text-[var(--text-primary)] border border-[var(--glass-border)] flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          <span>{foundSpace.membersCount || 1} Anggota</span>
                        </span>

                        <span className="text-[9px] px-2 py-0.5 rounded-full font-sans font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          {foundSpace.memberRole === "viewer" ? (
                            <>
                              <Eye className="w-2.5 h-2.5" />
                              <span>Hanya Baca</span>
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>Bisa Edit</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--glass-border)]/50 text-[10px] text-[var(--text-secondary)]">
                    {foundSpace.memberRole === "viewer"
                      ? "Anda akan bergabung sebagai pembaca (read-only). Anda dapat menjelajahi seluruh catatan di dalamnya."
                      : "Anda akan bergabung sebagai kolaborator penuh. Anda dapat membaca dan menambahkan catatan baru."}
                  </div>
                </div>

                {/* Confirm & Cancel Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={isJoining}
                    onClick={handleConfirmJoin}
                    className="w-full h-11 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(0,0,0,0.18)] hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menghubungkan ke Space...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                        <span>Gabung ke Notebook</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setFoundSpace(null);
                    }}
                    className="w-full h-9 rounded-full inner-pseudo-glass text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-98 transition-all cursor-pointer"
                  >
                    Cari Notebook Lain
                  </button>
                </div>
              </div>
            ) : activeTab === "scan" ? (
              /* STATE 2: SCAN QR VIEW */
              <div className="space-y-3">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/80 border border-[var(--glass-border)] flex items-center justify-center shadow-inner">
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Viewfinder Target Reticle */}
                      <div className="absolute inset-8 rounded-2xl border-2 border-dashed border-white/60 pointer-events-none flex flex-col justify-between p-2">
                        <div className="flex justify-between">
                          <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                          <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                        </div>
                        <div className="flex justify-between">
                          <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                          <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                        </div>
                      </div>

                      <div className="absolute bottom-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white/80 font-sans pointer-events-none">
                        Arahkan ke QR Code Noticed
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center space-y-2">
                      <Camera className="w-8 h-8 text-[var(--text-tertiary)] mx-auto opacity-70" />
                      <p className="text-xs text-[var(--text-secondary)]">
                        {cameraError || "Menyiapkan sensor kamera..."}
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="h-8 px-3 rounded-full inner-pseudo-glass text-[11px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer mt-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Coba Akses Lagi</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Upload QR Image Fallback */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-9 rounded-xl inner-pseudo-glass text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[var(--glass-border)]/50"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Pilih dari Galeri Foto / Screenshot</span>
                </button>
              </div>
            ) : (
              /* STATE 3: MANUAL CODE ENTRY */
              <div className="space-y-4 pt-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    performSearch(inputCode);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
                      Kode Undangan Notebook (8 Karakter)
                    </label>
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder="CONTOH: 7K9N2P4X"
                      maxLength={14}
                      autoFocus
                      className="w-full h-12 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]/60 px-4 text-base font-mono font-bold tracking-widest text-center text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 focus:outline-hidden focus:border-[var(--text-primary)] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !inputCode.trim()}
                    className="w-full h-11 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(0,0,0,0.18)] hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mencari Notebook...</span>
                      </>
                    ) : (
                      <>
                        <span>Cari & Pratinjau</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-[10px] text-center text-[var(--text-tertiary)] leading-relaxed">
                  Kode undangan diberikan oleh pemilik notebook melalui tombol Bagikan di rak buku mereka.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
