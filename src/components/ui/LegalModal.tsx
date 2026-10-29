import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useAppLanguage } from "@/lib/i18n";
import {
  X,
  ShieldCheck,
  FileText,
  ExternalLink,
  Lock,
  Database,
  Sparkles,
  DownloadCloud,
} from "lucide-react";

export type LegalTab = "privacy" | "terms";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export function LegalModal({
  isOpen,
  onClose,
  initialTab = "privacy",
}: LegalModalProps) {
  useLockBodyScroll(isOpen);
  const [currentLang] = useAppLanguage();
  const isId = currentLang === "id";

  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleTabChange = (tab: LegalTab) => {
    triggerHaptic("light");
    setActiveTab(tab);
  };

  const handleOpenWeb = () => {
    triggerHaptic("medium");
    const isOnline = typeof navigator !== "undefined" && navigator.onLine;
    const url = isOnline
      ? activeTab === "privacy"
        ? "https://noticed.app/privacy"
        : "https://noticed.app/terms"
      : activeTab === "privacy"
        ? "/privacy.html"
        : "/terms.html";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
          {/* Ambient Backdrop Dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="fixed inset-0 bg-black/45 backdrop-blur-[8px] pointer-events-auto"
          />

          {/* Liquid Glass Dynamic Island Container */}
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="
              pointer-events-auto relative w-full max-w-lg
              dynamic-island-shell overflow-hidden z-10 flex flex-col
              shadow-[0_28px_60px_-12px_rgba(0,0,0,0.35),0_10px_24px_-4px_rgba(0,0,0,0.15)]
              rounded-3xl border border-[var(--glass-border)]
            "
            style={{
              maxHeight: "calc(100dvh - 48px)",
            }}
          >
            {/* Top Specular Rim */}
            <div className="dynamic-island-specular-rim" />

            {/* Header with Title and Close Button */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)]/40 shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                  {isId ? "Hukum & Kedaulatan Data" : "Legal & Sovereignty"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--text-primary)]/8 text-[var(--text-secondary)]">
                  v1.0.0
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenWeb}
                  className="h-7 px-2.5 rounded-full inner-pseudo-glass flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shadow-xs"
                  title={isId ? "Buka di jendela baru" : "Open in new window"}
                >
                  <ExternalLink className="w-3 h-3 stroke-[2]" />
                  <span className="hidden sm:inline">
                    {isId ? "Versi Web" : "Web View"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="w-7 h-7 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                  title={isId ? "Tutup" : "Close"}
                >
                  <X className="w-3.5 h-3.5 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* Segmented Tab Bar */}
            <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] border-b border-[var(--glass-border)]/30 shrink-0">
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--text-primary)]/5 border border-[var(--glass-border)]/30 gap-1">
                <button
                  type="button"
                  onClick={() => handleTabChange("privacy")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "privacy"
                      ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isId ? "Kebijakan Privasi" : "Privacy Policy"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("terms")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "terms"
                      ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isId ? "Ketentuan Layanan" : "Terms of Service"}</span>
                </button>
              </div>
            </div>

            {/* Quick Guarantees Carousel / Grid */}
            <div className="px-4 pt-3 pb-1 grid grid-cols-2 gap-2 shrink-0">
              {activeTab === "privacy" ? (
                <>
                  <div className="p-2.5 rounded-xl bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)]/40 flex items-start gap-2">
                    <Database className="w-3.5 h-3.5 mt-0.5 text-[var(--text-primary)] opacity-75 shrink-0" />
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                        {isId ? "Utamakan Lokal" : "Offline-First"}
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                        {isId
                          ? "Tersimpan di IndexedDB perangkat"
                          : "Stored in local IndexedDB"}
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)]/40 flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 mt-0.5 text-[var(--text-primary)] opacity-75 shrink-0" />
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                        {isId ? "Nol Pelacak Iklan" : "Zero Ad Trackers"}
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                        {isId
                          ? "Tanpa pelacakan lintas aplikasi"
                          : "No cross-app surveillance"}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded-xl bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)]/40 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 text-[var(--text-primary)] opacity-75 shrink-0" />
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                        {isId ? "100% Milik Penulis" : "100% User Ownership"}
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                        {isId
                          ? "Hak cipta penuh atas catatan Anda"
                          : "Full copyright over all notes"}
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--text-primary)]/[0.03] border border-[var(--glass-border)]/40 flex items-start gap-2">
                    <DownloadCloud className="w-3.5 h-3.5 mt-0.5 text-[var(--text-primary)] opacity-75 shrink-0" />
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                        {isId ? "Portabilitas JSON" : "Full JSON Portability"}
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                        {isId
                          ? "Ekspor pustaka kapan saja"
                          : "Export library anytime"}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed relative z-10">
              {activeTab === "privacy" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl p-3.5 bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)]/50 space-y-1">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId
                        ? "1. Filosofi Privasi Kami"
                        : "1. Our Privacy Philosophy"}
                    </span>
                    <p>
                      {isId
                        ? "Di Noticed, jurnal, refleksi lapangan, rekaman suara, dan manuskrip Anda adalah ruang pribadi yang sakral. Kami tidak menjual atau memonetisasi data pribadi, tidak memasang pelacak iklan, dan tidak melatih model AI generatif menggunakan buku catatan pribadi Anda."
                        : "At Noticed, your journals, field reflections, recordings, and manuscripts are sacred. We do not sell or monetize personal data, employ advertising trackers, or train generative AI models on your private notebooks."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId
                        ? "2. Penyimpanan Lokal & Sinkronisasi Cloud Opsional"
                        : "2. Local-First Storage & Optional Cloud Sync"}
                    </span>
                    <p>
                      {isId ? (
                        <>
                          Secara bawaan, seluruh catatan, marginalia, foto kamar
                          gelap, memo audio, dan buku Anda tersimpan langsung di{" "}
                          <code>IndexedDB</code> perangkat Anda.
                        </>
                      ) : (
                        <>
                          By default, all your notes, marginalia, darkroom
                          photos, audio memos, and spaces reside in your
                          device&apos;s sandboxed <code>IndexedDB</code>.
                        </>
                      )}
                    </p>
                    <p>
                      {isId
                        ? "Jika Anda mengaktifkan Sinkronisasi Cloud secara opsional, data yang dikirimkan dienkripsi menggunakan TLS 1.3 dan dilindungi dengan enkripsi AES-256 di server."
                        : "If you optionally enable Cloud Sync via Supabase, synchronized data in transit is encrypted using TLS 1.3, and data at rest is protected with AES-256 encryption."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId ? "3. Izin Perangkat" : "3. Device Permissions"}
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                      <li>
                        <strong>{isId ? "Mikrofon:" : "Microphone:"}</strong>{" "}
                        {isId
                          ? "Diminta hanya saat Anda merekam Memo Suara atau mengaktifkan Dikte Suara."
                          : "Requested only when you record a Voice Memo or activate Voice Dictation."}
                      </li>
                      <li>
                        <strong>
                          {isId ? "Kamera & Foto:" : "Camera & Photos:"}
                        </strong>{" "}
                        {isId
                          ? "Digunakan hanya saat mengambil foto/video lampiran atau memindai kode QR undangan ruang."
                          : "Used only when capturing or attaching photos/videos or scanning a notebook invite QR code."}
                      </li>
                      <li>
                        <strong>
                          {isId ? "Biometrik & Haptik:" : "Biometrics & Haptics:"}
                        </strong>{" "}
                        {isId
                          ? "Digunakan secara lokal untuk Kunci Privasi Face ID / Touch ID dan umpan balik taktil."
                          : "Powers optional local Face ID / Touch ID App Lock and subtle tactile feedback."}
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId
                        ? "4. Hak Anda & Penghapusan Akun Permanen (Guideline 5.1.1(v))"
                        : "4. Your Rights & Permanent Account Deletion (Guideline 5.1.1(v))"}
                    </span>
                    <p>
                      {isId ? (
                        <>
                          Anda berhak mengekspor arsip JSON lengkap kapan saja
                          melalui <strong>Pengaturan &gt; Ekspor Arsip</strong>,
                          menghapus seluruh data lokal melalui{" "}
                          <strong>Reset Seluruh Data</strong>, serta menghapus
                          akun cloud beserta seluruh data dan media di server
                          secara permanen kapan saja langsung di dalam aplikasi
                          melalui <strong>Profil &gt; Hapus Akun</strong>.
                        </>
                      ) : (
                        <>
                          You have the right to export a complete unencrypted
                          JSON archive at any time via{" "}
                          <strong>Settings &gt; Export Archive</strong>, erase
                          local data via <strong>Reset All Data</strong>, and
                          permanently delete your cloud account and all
                          associated server data directly inside the app via{" "}
                          <strong>Profile &gt; Delete Account</strong>.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--glass-border)]/40 text-[11px] text-[var(--text-tertiary)] flex flex-col gap-1">
                    <span>Publisher: Callipolis Inc.</span>
                    <span>
                      Contact:{" "}
                      <a
                        href="mailto:sidenotes.inc@gmail.com?subject=[Noticed%20Privacy]%20Inquiry"
                        className="underline hover:text-[var(--text-primary)]"
                      >
                        sidenotes.inc@gmail.com
                      </a>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl p-3.5 bg-[var(--text-primary)]/[0.02] border border-[var(--glass-border)]/50 space-y-1">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId
                        ? "1. 100% Kedaulatan & Kepemilikan Konten"
                        : "1. 100% Content Sovereignty & Ownership"}
                    </span>
                    <p>
                      {isId
                        ? "Anda memegang kepemilikan tunggal dan hak cipta penuh atas seluruh tulisan, foto, dan rekaman yang Anda buat atau simpan di Noticed. Kami tidak mengklaim hak apa pun atas karya Anda."
                        : "You retain sole, exclusive ownership and full copyright of all content you create, store, or import into Noticed. We claim zero rights, titles, or moral rights over your writing."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId
                        ? "2. Langganan Atelier Pro & Ketentuan Apple EULA"
                        : "2. Atelier Pro Subscriptions & Apple Standard EULA"}
                    </span>
                    <p>
                      {isId
                        ? "Fitur pencatatan inti dan penyimpanan lokal tersedia gratis. Atelier Pro membuka sinkronisasi cloud, kolaborasi ruang, lampiran media tanpa batas, pemotong audio, dan tema arsip eksklusif."
                        : "Core note-taking and offline storage are free. Atelier Pro unlocks cloud sync, shared spaces, unlimited media attachments, audio trimming, and bespoke archival themes."}
                    </p>
                    <p>
                      {isId ? (
                        <>
                          Pembelian dalam aplikasi (In-App Purchase) diproses
                          melalui Apple App Store (Apple ID) atau Google Play
                          dan tunduk pada{" "}
                          <a
                            href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-[var(--text-primary)]"
                          >
                            Perjanjian Lisensi Pengguna Akhir Standar Apple
                            (Standard EULA)
                          </a>
                          . Langganan diperpanjang otomatis kecuali dibatalkan
                          minimal 24 jam sebelum akhir periode berjalan di
                          pengaturan langganan Apple ID Anda.
                        </>
                      ) : (
                        <>
                          In-app purchases are processed via Apple App Store or
                          Google Play and are governed by the{" "}
                          <a
                            href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-[var(--text-primary)]"
                          >
                            Apple Standard End User License Agreement (EULA)
                          </a>
                          . Subscriptions auto-renew unless cancelled at least
                          24 hours before the end of the current billing period
                          in your Apple ID account settings.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId
                        ? "3. Tanggung Jawab Cadangan Lokal"
                        : "3. Offline-First Backup Responsibility"}
                    </span>
                    <p>
                      {isId
                        ? "Karena Noticed menyimpan data secara lokal di perangkat Anda, menghapus aplikasi atau membersihkan penyimpanan perangkat tanpa mengaktifkan Cloud Sync atau mengekspor cadangan JSON akan menghapus catatan lokal secara permanen."
                        : "Because Noticed stores data locally on your device, deleting the app or clearing device storage without Cloud Sync or a JSON backup will permanently erase local notes."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId
                        ? "4. Hak Kekayaan Intelektual Callipolis Inc."
                        : "4. Intellectual Property of Callipolis Inc."}
                    </span>
                    <p>
                      {isId
                        ? "Perangkat lunak Noticed, desain estetika, algoritma simulasi kamar gelap, komposisi tipografi, dan merek dagang adalah kekayaan intelektual eksklusif Callipolis Inc."
                        : "The Noticed software, visual aesthetics, darkroom simulation algorithms, typography compositions, and brand marks are the exclusive intellectual property of Callipolis Inc."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      {isId
                        ? "5. Batasan Jaminan & Tanggung Jawab"
                        : "5. Warranties & Liability"}
                    </span>
                    <p>
                      {isId
                        ? "Layanan disediakan sebagaimana adanya tanpa jaminan tersurat maupun tersirat. Callipolis Inc. tidak bertanggung jawab atas kehilangan data akibat kerusakan perangkat keras atau penghapusan penyimpanan lokal oleh pengguna."
                        : "The Service is provided “as is” without warranties of any kind. Callipolis Inc. is not liable for data loss arising from local storage eviction or hardware failure."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--glass-border)]/40 text-[11px] text-[var(--text-tertiary)] flex flex-col gap-1">
                    <span>Governing Law: State of Delaware, United States</span>
                    <span>
                      Apple Standard EULA:{" "}
                      <a
                        href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-[var(--text-primary)]"
                      >
                        apple.com/legal/internet-services/itunes/dev/stdeula/
                      </a>
                    </span>
                    <span>
                      Contact:{" "}
                      <a
                        href="mailto:sidenotes.inc@gmail.com?subject=[Noticed%20Legal]%20Inquiry"
                        className="underline hover:text-[var(--text-primary)]"
                      >
                        sidenotes.inc@gmail.com
                      </a>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Actions */}
            <div className="p-3 border-t border-[var(--glass-border)]/40 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
              <span className="text-[10px] text-[var(--text-tertiary)] pl-2">
                {isId
                  ? "Diperbarui: Oktober 2026"
                  : "Last updated: Oct 13, 2026"}
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold active:scale-95 transition-transform cursor-pointer shadow-xs"
              >
                {isId ? "Mengerti" : "Understood"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
