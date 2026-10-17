import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { Space, SpaceMember } from "@/types";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  X,
  Share2,
  Copy,
  Check,
  Printer,
  Users,
  Sparkles,
  Link as LinkIcon,
  BookOpen,
  QrCode,
  Edit3,
  Eye,
  UserMinus,
  LogOut,
} from "lucide-react";

interface SpaceShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space | null;
  notesCount: number;
  currentUserId?: string | null;
  onOpenPrintFolio: (space: Space) => void;
  onUpdateSpace?: (space: Space) => void;
  onLeaveSpace?: (spaceId: string) => void;
}

export function SpaceShareModal({
  isOpen,
  onClose,
  space,
  notesCount,
  currentUserId = null,
  onOpenPrintFolio,
  onUpdateSpace,
  onLeaveSpace,
}: SpaceShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeShareTab, setActiveShareTab] = useState<"link" | "qr">("link");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const isCurrentSpaceOwner = Boolean(
    space && currentUserId && space.userId === currentUserId,
  );

  const inviteCode =
    space?.inviteCode ||
    space?.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() ||
    "";

  const shareUrl = `https://noticed.app/join/${inviteCode}`;
  const deepLink = `noticed://space/join?code=${inviteCode}`;

  useEffect(() => {
    if (!shareUrl) return;
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: "#14171f",
        light: "#ffffff",
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.warn("[SpaceShareModal] QR generation failed:", err));
  }, [shareUrl]);

  if (!isOpen || !space) return null;

  const currentRole = space.defaultRole || space.memberRole || "editor";

  const handleCopyLink = async () => {
    triggerSuccessHaptic();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // ignore clipboard error
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleNativeShare = async () => {
    triggerHaptic("medium");
    const roleText = currentRole === "viewer" ? "baca" : "kolaborasi";
    const shareText = `Baca dan ${roleText} di notebook "${space.name}" di Noticed. Gabung dengan kode ${inviteCode}.`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${space.name} - Noticed Space`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          handleCopyLink();
        }
        return;
      }
    }
    handleCopyLink();
  };

  const loadMembers = useCallback(async () => {
    if (!space?.id || !isSupabaseConfigured) return;
    setIsLoadingMembers(true);
    try {
      const { data, error } = await supabase.rpc("get_space_members", {
        p_space_id: space.id,
      });
      if (!error && Array.isArray(data)) {
        setMembers(
          data.map((m: any) => ({
            id: m.id,
            spaceId: m.space_id,
            userId: m.user_id,
            role: m.role,
            createdAt: m.created_at,
            displayName: m.display_name,
            avatarUrl: m.avatar_url,
          })),
        );
      }
    } catch (err) {
      console.warn("[SpaceShareModal] Failed to fetch members:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [space?.id]);

  useEffect(() => {
    if (isOpen && space?.isShared) {
      loadMembers();
    }
  }, [isOpen, space?.isShared, loadMembers]);

  const handleRevokeMember = async (
    targetUserId: string,
    targetName: string,
  ) => {
    triggerHaptic("heavy");
    if (!space?.id) return;
    if (!window.confirm(`Keluarkan ${targetName} dari notebook ini?`)) return;
    try {
      const { error } = await supabase.rpc("revoke_space_member", {
        p_space_id: space.id,
        p_target_user_id: targetUserId,
      });
      if (!error) {
        triggerSuccessHaptic();
        loadMembers();
        if (onUpdateSpace) {
          onUpdateSpace({
            ...space,
            membersCount: Math.max(1, (space.membersCount || 2) - 1),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn("[SpaceShareModal] Revoke error:", err);
    }
  };

  const handleToggleCollaboration = () => {
    triggerHaptic("medium");
    if (!onUpdateSpace) return;
    const nextShared = !space.isShared;
    onUpdateSpace({
      ...space,
      isShared: nextShared,
      inviteCode: nextShared ? inviteCode : undefined,
      defaultRole: space.defaultRole || "editor",
      partnerName: `role:${space.defaultRole || "editor"}`,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRoleChange = (role: "editor" | "viewer") => {
    triggerHaptic("medium");
    if (!onUpdateSpace) return;
    onUpdateSpace({
      ...space,
      defaultRole: role,
      partnerName: `role:${role}`,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-[32px] overflow-hidden bg-[var(--sheet-bg)] backdrop-blur-[40px] saturate-[190%] border border-[var(--glass-border)] shadow-[0_28px_64px_-12px_rgba(0,0,0,0.28)] flex flex-col max-h-[88dvh] p-5 relative text-[var(--text-primary)]"
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
                Collaboration & Export
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Bagikan Notebook
              </span>
            </div>
            <div className="w-7 h-7" />
          </div>

          <div className="pt-4 space-y-4 overflow-y-auto no-scrollbar relative z-10">
            {/* Space Cover & Details Pill */}
            <div className="p-3.5 rounded-2xl apple-card border border-[var(--glass-border)]/60 flex items-center gap-3 shadow-xs">
              <div
                className="w-10 h-13 rounded-lg shadow-sm flex flex-col justify-between p-1.5 shrink-0 border border-black/15"
                style={{
                  backgroundColor: space.customColor || "#2b3543",
                }}
              >
                <div className="w-2.5 h-0.5 rounded-full bg-white/40" />
                <BookOpen className="w-3.5 h-3.5 text-white/80 self-center" />
                <div className="w-full h-0.5 rounded-full bg-white/20" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold font-serif text-[var(--text-primary)] truncate">
                    {space.name}
                  </h3>
                  {space.isShared && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-sans font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                      Shared
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                  {notesCount} catatan tersimpan
                  {space.description ? ` · ${space.description}` : ""}
                </p>
              </div>
            </div>

            {/* Space Collaboration & Invite Section */}
            <div className="p-3.5 rounded-2xl apple-card space-y-3.5 border border-[var(--glass-border)]/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                  <Users className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span>Akses Kolaborasi Space</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleCollaboration}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                    space.isShared
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "inner-pseudo-glass text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {space.isShared ? "Aktif" : "Aktifkan"}
                </button>
              </div>

              {space.isShared ? (
                <>
                  {/* Permission Role Selector */}
                  <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]/40 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Izin Akses Anggota
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRoleChange("editor")}
                        className={`h-8 rounded-lg px-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          currentRole === "editor"
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                            : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Bisa Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRoleChange("viewer")}
                        className={`h-8 rounded-lg px-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          currentRole === "viewer"
                            ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                            : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Hanya Baca</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] leading-tight pt-0.5">
                      {currentRole === "editor"
                        ? "Anggota dapat membaca semua catatan dan membuat/mengedit catatan mereka sendiri."
                        : "Anggota hanya dapat membaca dan menjelajahi catatan tanpa dapat mengubah isi."}
                    </p>
                  </div>

                  {/* Share Method Tabs (Tautan vs QR Code) */}
                  <div className="flex items-center justify-center p-0.5 rounded-xl inner-pseudo-glass border border-[var(--glass-border)]/50">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setActiveShareTab("link");
                      }}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeShareTab === "link"
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Tautan & Kode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setActiveShareTab("qr");
                      }}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeShareTab === "qr"
                          ? "bg-[var(--text-primary)] text-[var(--accent-ink)] shadow-xs"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <QrCode className="w-3 h-3" />
                      <span>Kode QR</span>
                    </button>
                  </div>

                  {/* Tab Content: Link & Code */}
                  {activeShareTab === "link" ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]/40 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-1.5 text-xs font-mono">
                          <LinkIcon className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                          <span className="text-[var(--text-primary)] font-bold tracking-wider truncate">
                            {inviteCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="h-7 px-2.5 rounded-lg inner-pseudo-glass text-[11px] font-medium text-[var(--text-primary)] hover:opacity-80 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                            title="Salin Tautan Undangan"
                          >
                            {copied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleNativeShare}
                            className="h-7 px-2.5 rounded-lg bg-[var(--text-primary)] text-[var(--accent-ink)] text-[11px] font-semibold active:scale-95 transition-transform flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Bagikan Tautan Undangan"
                          >
                            <Share2 className="w-3 h-3 stroke-[2.2]" />
                            <span>Bagikan</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-[var(--text-tertiary)] font-mono truncate px-1">
                        {deepLink}
                      </div>
                    </div>
                  ) : (
                    /* Tab Content: QR Code View */
                    <div className="p-3 rounded-2xl bg-white border border-black/10 shadow-sm flex flex-col items-center justify-center text-center space-y-2.5 animate-in fade-in duration-200">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QR Code ${space.name}`}
                          className="w-44 h-44 rounded-lg object-contain"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center text-xs text-neutral-400">
                          Memuat QR Code...
                        </div>
                      )}
                      <div>
                        <div className="text-[11px] font-bold text-neutral-900 tracking-wider font-mono">
                          {inviteCode}
                        </div>
                        <p className="text-[10px] text-neutral-500 max-w-[200px] leading-tight mt-0.5">
                          Arahkan kamera smartphone ke kode QR untuk langsung bergabung.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Active Members List */}
                  {members.length > 0 && (
                    <div className="pt-2 border-t border-[var(--glass-border)]/40 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)] px-0.5">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>Anggota Aktif ({members.length})</span>
                        </span>
                        {isLoadingMembers && (
                          <span className="text-[10px] opacity-50">Menyinkronkan...</span>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {members.map((m) => {
                          const isMemberOwner = m.role === "owner";
                          const isMe = Boolean(
                            currentUserId && m.userId === currentUserId,
                          );
                          return (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]/30 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {m.avatarUrl ? (
                                  <img
                                    src={m.avatarUrl}
                                    alt={m.displayName || "Member"}
                                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-[var(--glass-border)]"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {(m.displayName || "A").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-[11px] font-medium text-[var(--text-primary)] truncate flex items-center gap-1">
                                    <span>{m.displayName || "Scribe"}</span>
                                    {isMe && (
                                      <span className="text-[9px] opacity-60">
                                        (Anda)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-[var(--text-tertiary)] uppercase font-mono">
                                    {isMemberOwner
                                      ? "Pemilik"
                                      : m.role === "viewer"
                                        ? "Hanya Baca"
                                        : "Editor"}
                                  </div>
                                </div>
                              </div>

                              {isCurrentSpaceOwner && !isMemberOwner && !isMe && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRevokeMember(
                                      m.userId,
                                      m.displayName || "Anggota",
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Keluarkan anggota dari notebook"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans">
                  Aktifkan akses kolaborasi untuk mengundang partner membaca atau menulis catatan bersama melalui tautan, kode, atau kode QR.
                </p>
              )}
            </div>

            {/* Leave Space Button (For Non-Owner Collaborators) */}
            {!isCurrentSpaceOwner && space.isShared && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("heavy");
                    if (
                      window.confirm(
                        `Yakin ingin meninggalkan notebook "${space.name}"?`,
                      )
                    ) {
                      onLeaveSpace?.(space.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Tinggalkan Notebook Ini</span>
                </button>
              </div>
            )}

            {/* Secondary Compact Section: Cetak & Ekspor PDF */}
            <div className="pt-1">
              <div className="p-3 rounded-2xl apple-card border border-[var(--glass-border)]/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                    <Printer className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Cetak Folio Manuscript
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                      Ekspor buku catatan ke format PDF / Cetak Fisik
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onOpenPrintFolio(space);
                  }}
                  className="h-7.5 px-3 rounded-full inner-pseudo-glass text-[11px] font-semibold text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs border border-[var(--glass-border)]"
                  title="Buka Format Cetak & PDF"
                >
                  <Sparkles className="w-3 h-3 text-amber-500/80" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
