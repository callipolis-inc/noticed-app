import { useState, useEffect, useCallback } from "react";
import { setSavedDictationLang } from "./speechRecognition";

export type AppLanguage = "id" | "en";

export const APP_LANG_STORAGE_KEY = "noticed_app_lang";
const LANG_CHANGE_EVENT = "noticed-language-changed";

export function getSavedAppLanguage(): AppLanguage {
  if (typeof window === "undefined") return "id";
  try {
    const saved = localStorage.getItem(APP_LANG_STORAGE_KEY);
    if (saved === "id" || saved === "en") return saved;

    // Fallback to browser/system language if available
    if (navigator.language && navigator.language.toLowerCase().startsWith("id")) {
      return "id";
    }
    if (navigator.language && navigator.language.toLowerCase().startsWith("en")) {
      return "en";
    }
  } catch {}
  return "id";
}

export function setSavedAppLanguage(lang: AppLanguage): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(APP_LANG_STORAGE_KEY, lang);
    // Also synchronize speech dictation engine language
    setSavedDictationLang(lang === "id" ? "id-ID" : "en-US");
    window.dispatchEvent(
      new CustomEvent(LANG_CHANGE_EVENT, { detail: lang }),
    );
  } catch {}
}

export interface TranslationDictionary {
  app: {
    name: string;
    tagline: string;
    version: string;
  };
  greetings: {
    morning: string;
    afternoon: string;
    lateAfternoon: string;
    evening: string;
    author: string;
    syncing: string;
  };
  dates: {
    today: string;
    yesterday: string;
    atTime: string;
  };
  bookshelf: {
    spinesLayout: string;
    coversLayout: string;
    activeTab: string;
    archivedTab: string;
    emptyShelfTitle: string;
    emptyShelfDesc: string;
    bindFirstVolume: string;
    emptyArchivedTitle: string;
    emptyArchivedDesc: string;
    openVolume: string;
    editVolume: string;
    archiveVolume: string;
    restoreVolume: string;
    deleteVolume: string;
    exportManuscript: string;
    shareSpace: string;
    joinSpace: string;
    syncing: string;
    cloudSynced: string;
    liveSpine: string;
  };
  settings: {
    title: string;
    close: string;
    appearance: string;
    theme: string;
    shelfLayout: string;
    defaultDisplay: string;
    spines: string;
    covers: string;
    textSize: string;
    language: string;
    languageDesc: string;
    langId: string;
    langEn: string;
    membership: string;
    atelierPro: string;
    statusActive: string;
    statusStandard: string;
    proActiveDesc: string;
    proStandardDesc: string;
    upgrade: string;
    unlocked: string;
    privilegeDetails: string;
    viewPrivileges: string;
    restorePurchases: string;
    restorePurchasesDesc: string;
    restoreButton: string;
    restoring: string;
    feedback: string;
    haptics: string;
    hapticsDesc: string;
    testVibration: string;
    pulse: string;
    storage: string;
    deviceStorage: string;
    calculatingSpace: string;
    usedAcrossNotices: string;
    notices: string;
    optimizeSpace: string;
    compactingSpace: string;
    cleanDangling: string;
    dangerZone: string;
    resetAllData: string;
    resetConfirmTitle: string;
    resetConfirmDesc: string;
    cancel: string;
    confirm: string;
    privacyPolicy: string;
    termsOfService: string;
  };
  reminders: {
    sectionTitle: string;
    sectionSubtitle: string;
    morningPrompt: string;
    morningPromptDesc: string;
    eveningPrompt: string;
    eveningPromptDesc: string;
    morningTime: string;
    eveningTime: string;
    permissionDeniedTitle: string;
    permissionDeniedDesc: string;
    morningDefaultTitle: string;
    morningDefaultBody: string;
    eveningDefaultTitle: string;
    eveningDefaultBody: string;
  };
  common: {
    cancel: string;
    save: string;
    done: string;
    create: string;
    search: string;
    delete: string;
    edit: string;
    back: string;
    loading: string;
    profile: string;
  };
}

export const DICTIONARY: Record<AppLanguage, TranslationDictionary> = {
  id: {
    app: {
      name: "Noticed",
      tagline: "Pengamatan hening & catatan harian",
      version: "Versi 1.0.0",
    },
    greetings: {
      morning: "Selamat Pagi",
      afternoon: "Selamat Siang",
      lateAfternoon: "Selamat Sore",
      evening: "Selamat Malam",
      author: "Penulis",
      syncing: "Menyinkronkan",
    },
    dates: {
      today: "Hari ini",
      yesterday: "Kemarin",
      atTime: "pukul",
    },
    bookshelf: {
      spinesLayout: "Punggung Buku",
      coversLayout: "Sampul 3D",
      activeTab: "Aktif",
      archivedTab: "Diarsipkan",
      emptyShelfTitle: "Rak Buku Anda Masih Kosong",
      emptyShelfDesc:
        "Jilid buku pertama Anda untuk mulai mengabadikan pengamatan hening, foto, dan catatan tepi.",
      bindFirstVolume: "Jilid Buku Pertama",
      emptyArchivedTitle: "Tidak Ada Buku yang Diarsipkan",
      emptyArchivedDesc:
        "Buku catatan yang diarsipkan akan tersimpan rapi di sini tanpa menghilang.",
      openVolume: "Buka Buku",
      editVolume: "Edit Buku",
      archiveVolume: "Arsipkan",
      restoreVolume: "Pulihkan",
      deleteVolume: "Hapus",
      exportManuscript: "Ekspor Manuskrip",
      shareSpace: "Bagikan Buku",
      joinSpace: "Gabung Buku",
      syncing: "Menyinkronkan...",
      cloudSynced: "Tersinkron ke Cloud",
      liveSpine: "Spine Langsung",
    },
    settings: {
      title: "Pengaturan",
      close: "Tutup",
      appearance: "Tampilan",
      theme: "Tema",
      shelfLayout: "Tata Letak Rak",
      defaultDisplay: "Tampilan bawaan rak",
      spines: "Punggung",
      covers: "Sampul",
      textSize: "Ukuran Teks",
      language: "Bahasa",
      languageDesc: "Pilihan bahasa antarmuka aplikasi",
      langId: "Indonesia",
      langEn: "English",
      membership: "Keanggotaan",
      atelierPro: "Atelier Pro",
      statusActive: "Aktif",
      statusStandard: "Standar",
      proActiveDesc: "Semua jilid, sinkronisasi cloud & multimedia terbuka",
      proStandardDesc: "Jilid tanpa batas, sinkronisasi cloud & multimedia",
      upgrade: "Tingkatkan",
      unlocked: "Terbuka",
      privilegeDetails: "Rincian Hak Istimewa",
      viewPrivileges: "Lihat Hak Istimewa",
      restorePurchases: "Pulihkan Pembelian",
      restorePurchasesDesc:
        "Pulihkan keanggotaan dari akun App Store / Google Play",
      restoreButton: "Pulihkan",
      restoring: "Memulihkan...",
      feedback: "Umpan Balik",
      haptics: "Haptik",
      hapticsDesc: "Umpan balik getaran taktil",
      testVibration: "Uji getaran",
      pulse: "Getar",
      storage: "Penyimpanan Perangkat",
      deviceStorage: "Penyimpanan Perangkat",
      calculatingSpace: "Menghitung ruang...",
      usedAcrossNotices: "digunakan di",
      notices: "catatan",
      optimizeSpace: "Optimalkan Ruang",
      compactingSpace: "Mengompresi...",
      cleanDangling: "Bersihkan cache tak terpakai & kompres DB",
      dangerZone: "Zona Bahaya",
      resetAllData: "Reset Semua Data",
      resetConfirmTitle: "Reset Semua Data?",
      resetConfirmDesc:
        "Semua jilid dan catatan akan hilang permanen. Ketik RESET untuk melanjutkan.",
      cancel: "Batal",
      confirm: "Konfirmasi",
      privacyPolicy: "Kebijakan Privasi",
      termsOfService: "Ketentuan Layanan",
    },
    reminders: {
      sectionTitle: "Pengingat & Kebiasaan",
      sectionSubtitle: "Pengingat hening untuk merawat rutinitas menulis",
      morningPrompt: "Intensi Pagi",
      morningPromptDesc: "Pertanyaan reflektif untuk memulai hari dengan penuh kesadaran",
      eveningPrompt: "Refleksi Malam",
      eveningPromptDesc: "Momen hening untuk mengendapkan hal-hal bermakna hari ini",
      morningTime: "Waktu Pagi",
      eveningTime: "Waktu Malam",
      permissionDeniedTitle: "Izin Notifikasi Ditolak",
      permissionDeniedDesc: "Aktifkan izin notifikasi di Pengaturan Sistem perangkat untuk menerima pengingat hening ini.",
      morningDefaultTitle: "Niat Hari Ini",
      morningDefaultBody: "Apa satu hal bermakna yang ingin kamu perhatikan hari ini?",
      eveningDefaultTitle: "Refleksi Hening",
      eveningDefaultBody: "Apa momen kecil atau rasa syukur yang hadir hari ini?",
    },
    common: {
      cancel: "Batal",
      save: "Simpan",
      done: "Selesai",
      create: "Buat",
      search: "Cari",
      delete: "Hapus",
      edit: "Edit",
      back: "Kembali",
      loading: "Memuat...",
      profile: "Profil",
    },
  },
  en: {
    app: {
      name: "Noticed",
      tagline: "Quiet observations & daily marginalia",
      version: "Version 1.0.0",
    },
    greetings: {
      morning: "Good Morning",
      afternoon: "Good Afternoon",
      lateAfternoon: "Good Afternoon",
      evening: "Good Evening",
      author: "Author",
      syncing: "Syncing",
    },
    dates: {
      today: "Today",
      yesterday: "Yesterday",
      atTime: "at",
    },
    bookshelf: {
      spinesLayout: "Spines",
      coversLayout: "Covers",
      activeTab: "Active",
      archivedTab: "Archived",
      emptyShelfTitle: "Your Bookshelf is Empty",
      emptyShelfDesc:
        "Bind your first volume to begin capturing quiet observations, photographs, and marginalia.",
      bindFirstVolume: "Bind Your First Volume",
      emptyArchivedTitle: "No Archived Volumes",
      emptyArchivedDesc:
        "Archived notebooks will be kept securely here without being deleted.",
      openVolume: "Open Notebook",
      editVolume: "Edit Volume",
      archiveVolume: "Archive",
      restoreVolume: "Restore",
      deleteVolume: "Delete",
      exportManuscript: "Export Manuscript",
      shareSpace: "Share Notebook",
      joinSpace: "Join Notebook",
      syncing: "Syncing...",
      cloudSynced: "Cloud Synced",
      liveSpine: "Live Spine",
    },
    settings: {
      title: "Settings",
      close: "Close",
      appearance: "Appearance",
      theme: "Theme",
      shelfLayout: "Shelf Layout",
      defaultDisplay: "Default display",
      spines: "Spines",
      covers: "Covers",
      textSize: "Text Size",
      language: "Language",
      languageDesc: "App interface language preference",
      langId: "Indonesia",
      langEn: "English",
      membership: "Membership",
      atelierPro: "Atelier Pro",
      statusActive: "Active",
      statusStandard: "Standard",
      proActiveDesc: "All volumes, cloud sync & multimedia unlocked",
      proStandardDesc: "Unlimited volumes, cloud sync & multimedia",
      upgrade: "Upgrade",
      unlocked: "Unlocked",
      privilegeDetails: "Privilege details",
      viewPrivileges: "View Privileges",
      restorePurchases: "Restore Purchases",
      restorePurchasesDesc:
        "Restore membership from your App Store / Google Play account",
      restoreButton: "Restore",
      restoring: "Restoring...",
      feedback: "Feedback",
      haptics: "Haptics",
      hapticsDesc: "Tactile impulse feedback",
      testVibration: "Test vibration",
      pulse: "Pulse",
      storage: "Storage & Device Space",
      deviceStorage: "Device Storage",
      calculatingSpace: "Calculating space...",
      usedAcrossNotices: "used across",
      notices: "notices",
      optimizeSpace: "Optimize Space",
      compactingSpace: "Compacting...",
      cleanDangling: "Clean dangling cache & compact DB",
      dangerZone: "Danger Zone",
      resetAllData: "Reset All Data",
      resetConfirmTitle: "Reset All Data?",
      resetConfirmDesc:
        "All volumes and notes will be lost. Type RESET to proceed.",
      cancel: "Cancel",
      confirm: "Confirm",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
    },
    reminders: {
      sectionTitle: "Habits & Reminders",
      sectionSubtitle: "Quiet prompts to nurture your daily writing practice",
      morningPrompt: "Morning Intention",
      morningPromptDesc: "Reflective question to begin your day with mindfulness",
      eveningPrompt: "Evening Reflection",
      eveningPromptDesc: "Quiet moment to distill meaningful thoughts from today",
      morningTime: "Morning Time",
      eveningTime: "Evening Time",
      permissionDeniedTitle: "Notification Permission Denied",
      permissionDeniedDesc: "Please enable notification permissions in device settings to receive quiet reminders.",
      morningDefaultTitle: "Today's Intention",
      morningDefaultBody: "What is one meaningful thing you wish to notice today?",
      eveningDefaultTitle: "Evening Reflection",
      eveningDefaultBody: "What small moment or gratitude was present today?",
    },
    common: {
      cancel: "Cancel",
      save: "Save",
      done: "Done",
      create: "Create",
      search: "Search",
      delete: "Delete",
      edit: "Edit",
      back: "Back",
      loading: "Loading...",
      profile: "Profile",
    },
  },
};

export function getTranslation(lang: AppLanguage = getSavedAppLanguage()): TranslationDictionary {
  return DICTIONARY[lang] || DICTIONARY.id;
}

export function useAppLanguage(): [AppLanguage, (lang: AppLanguage) => void, TranslationDictionary] {
  const [lang, setLangState] = useState<AppLanguage>(() => getSavedAppLanguage());

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<AppLanguage>;
      if (customEvent.detail && (customEvent.detail === "id" || customEvent.detail === "en")) {
        setLangState(customEvent.detail);
      } else {
        setLangState(getSavedAppLanguage());
      }
    };

    window.addEventListener(LANG_CHANGE_EVENT, handleLangChange);
    return () => {
      window.removeEventListener(LANG_CHANGE_EVENT, handleLangChange);
    };
  }, []);

  const changeLanguage = useCallback((newLang: AppLanguage) => {
    setSavedAppLanguage(newLang);
    setLangState(newLang);
  }, []);

  const t = DICTIONARY[lang] || DICTIONARY.id;

  return [lang, changeLanguage, t];
}
