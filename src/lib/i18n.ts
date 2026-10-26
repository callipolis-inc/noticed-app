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
    if (
      navigator.language &&
      navigator.language.toLowerCase().startsWith("id")
    ) {
      return "id";
    }
    if (
      navigator.language &&
      navigator.language.toLowerCase().startsWith("en")
    ) {
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
    window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: lang }));
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
  spaceShare: {
    collaborationAndExport: string;
    shareNotebook: string;
    noticesSaved: string;
    sharedBadge: string;
    collabAccess: string;
    activeStatus: string;
    enableStatus: string;
    collabDesc: string;
    memberRoleTitle: string;
    roleEditor: string;
    roleViewer: string;
    roleEditorDesc: string;
    roleViewerDesc: string;
    tabLink: string;
    tabQr: string;
    copyLink: string;
    copiedLink: string;
    shareLink: string;
    qrInstruction: string;
    activeMembers: string;
    syncingMembers: string;
    removeMemberConfirm: string;
    leaveNotebook: string;
    leaveNotebookConfirm: string;
    printFolioTitle: string;
    printFolioDesc: string;
    printFolioButton: string;
  };
  joinSpace: {
    title: string;
    scanTab: string;
    typeTab: string;
    scanInstruction: string;
    typeInstruction: string;
    inputPlaceholder: string;
    searchButton: string;
    searching: string;
    readOnlyRole: string;
    editorRole: string;
    membersCount: string;
    joinButton: string;
    joiningButton: string;
    cancelButton: string;
    foundTitle: string;
    viewerDesc: string;
    editorDesc: string;
    alreadyInShelf: string;
    notFound: string;
    invalidCode: string;
    uploadQr: string;
  };
  manuscript: {
    title: string;
    subtitle: string;
    a4Format: string;
    a5Format: string;
    options: string;
    copyMarkdown: string;
    copied: string;
    unlockFull: string;
    pro: string;
    freePreviewTitle: string;
    freePreviewDesc: string;
    unlockFullButton: string;
    printPdf: string;
  };
  atelierPro: {
    membership: string;
    title: string;
    defaultDesc: string;
    planSelection: string;
    privilegesTitle: string;
    privileges: {
      unlimitedVolumes: string;
      cloudSync: string;
      motionClips: string;
      audioStudio: string;
      unlimitedPhotos: string;
      printPdf: string;
    };
    oneTimeNotice: string;
    subscriptionDisclosure: string;
    processing: string;
    continueStandard: string;
    restorePurchases: string;
    terms: string;
    privacy: string;
    eula: string;
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
  sync: {
    offlineNotice: string;
    cloudSynced: string;
    cloudSyncRequiresPro: string;
    signedOutFromCloud: string;
    signedInAs: string;
    conflictCopySuffix: string;
    untitledConflictCopy: string;
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
      spinesLayout: "Samping Buku",
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
      spines: "Samping",
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
      morningPromptDesc:
        "Pertanyaan reflektif untuk memulai hari dengan penuh kesadaran",
      eveningPrompt: "Refleksi Malam",
      eveningPromptDesc:
        "Momen hening untuk mengendapkan hal-hal bermakna hari ini",
      morningTime: "Waktu Pagi",
      eveningTime: "Waktu Malam",
      permissionDeniedTitle: "Izin Notifikasi Ditolak",
      permissionDeniedDesc:
        "Aktifkan izin notifikasi di Pengaturan Sistem perangkat untuk menerima pengingat hening ini.",
      morningDefaultTitle: "Niat Hari Ini",
      morningDefaultBody:
        "Apa satu hal bermakna yang ingin kamu perhatikan hari ini?",
      eveningDefaultTitle: "Refleksi Hening",
      eveningDefaultBody:
        "Apa momen kecil atau rasa syukur yang hadir hari ini?",
    },
    spaceShare: {
      collaborationAndExport: "Kolaborasi & Ekspor",
      shareNotebook: "Bagikan Notebook",
      noticesSaved: "catatan tersimpan",
      sharedBadge: "Bersama",
      collabAccess: "Akses Kolaborasi Space",
      activeStatus: "Aktif",
      enableStatus: "Aktifkan",
      collabDesc:
        "Aktifkan akses kolaborasi untuk mengundang partner membaca atau menulis catatan bersama melalui tautan, kode, atau kode QR.",
      memberRoleTitle: "Izin Akses Anggota",
      roleEditor: "Bisa Edit",
      roleViewer: "Hanya Baca",
      roleEditorDesc:
        "Anggota dapat membaca semua catatan dan membuat/mengedit catatan mereka sendiri.",
      roleViewerDesc:
        "Anggota hanya dapat membaca dan menjelajahi catatan tanpa dapat mengubah isi.",
      tabLink: "Tautan & Kode",
      tabQr: "Kode QR",
      copyLink: "Salin",
      copiedLink: "Tersalin!",
      shareLink: "Bagikan",
      qrInstruction:
        "Pindai kode QR ini menggunakan kamera ponsel atau pembaca QR untuk bergabung ke notebook ini secara instan.",
      activeMembers: "Anggota Aktif",
      syncingMembers: "Menyinkronkan...",
      removeMemberConfirm: "Keluarkan {name} dari notebook ini?",
      leaveNotebook: "Tinggalkan Notebook Ini",
      leaveNotebookConfirm:
        "Apakah Anda yakin ingin meninggalkan notebook kolaborasi ini? Anda tidak akan dapat mengakses catatan di dalamnya kecuali diundang kembali.",
      printFolioTitle: "Cetak Folio Manuscript",
      printFolioDesc:
        "Ekspor buku catatan ke format PDF siap cetak dengan tata letak editorial berkualitas tinggi.",
      printFolioButton: "Cetak PDF",
    },
    joinSpace: {
      title: "Gabung ke Notebook",
      scanTab: "Pindai QR",
      typeTab: "Ketik Kode",
      scanInstruction:
        "Arahkan kamera ke kode QR notebook atau unggah gambar QR dari galeri.",
      typeInstruction:
        "Masukkan 8-karakter kode undangan notebook atau tempel tautan undangan.",
      inputPlaceholder: "Contoh: SPACE1 atau https://noticed.app/join/...",
      searchButton: "Cari Notebook",
      searching: "Mencari...",
      readOnlyRole: "Hanya Baca",
      editorRole: "Bisa Edit",
      membersCount: "Anggota",
      joinButton: "Gabung ke Notebook",
      joiningButton: "Menghubungkan ke Space...",
      cancelButton: "Batal",
      foundTitle: "Notebook Ditemukan",
      viewerDesc:
        "Anda akan bergabung sebagai pembaca (read-only). Anda dapat menjelajahi seluruh catatan di dalamnya.",
      editorDesc:
        "Anda akan bergabung sebagai kolaborator penuh. Anda dapat membaca dan menambahkan catatan baru.",
      alreadyInShelf: "Notebook ini sudah ada di rak buku Anda.",
      notFound:
        "Notebook tidak ditemukan atau izin berbagi belum diaktifkan oleh pemiliknya.",
      invalidCode: "Masukkan kode undangan yang valid.",
      uploadQr: "Unggah QR",
    },
    manuscript: {
      title: "Edisi Manuskrip Folio",
      subtitle: "notices",
      a4Format: "A4 FOLIO",
      a5Format: "A5 OCTAVO",
      options: "Opsi",
      copyMarkdown: "Salin Markdown",
      copied: "Tersalin",
      unlockFull: "Buka Seluruh Folio",
      pro: "Pro",
      freePreviewTitle: "Pratinjau Edisi Standar",
      freePreviewDesc: "Menampilkan 5 dari {total} catatan dalam volume ini.",
      unlockFullButton: "Buka Lengkap",
      printPdf: "Cetak PDF",
    },
    atelierPro: {
      membership: "Keanggotaan Atelier",
      title: "Atelier Pro",
      defaultDesc:
        "Kapasitas tanpa batas, sinkronisasi cloud real-time, dan kebebasan mengarsipkan catatan seumur hidup.",
      planSelection: "Pilih Paket Keanggotaan",
      privilegesTitle: "Hak Istimewa Anggota Pro",
      privileges: {
        unlimitedVolumes: "Volume & Halaman Tanpa Batas",
        cloudSync: "Cloud Sync Multi-Device",
        motionClips: "Motion Video Clips 30s",
        audioStudio: "Impor Audio Studio 3 Menit",
        unlimitedPhotos: "Foto per Catatan Tanpa Batas",
        printPdf: "Ekspor Manuskrip Cetak PDF",
      },
      oneTimeNotice:
        "Pembelian satu kali. Akses keanggotaan Atelier Pro permanen tanpa biaya langganan berulang.",
      subscriptionDisclosure:
        "Pembayaran dibebankan ke akun Apple ID / Google Play Anda saat konfirmasi pembelian. Langganan otomatis diperpanjang seharga {price} {period} kecuali dibatalkan setidaknya 24 jam sebelum akhir periode berjalan. Kelola atau batalkan langganan kapan saja di Pengaturan Akun App Store.",
      processing: "Memproses...",
      continueStandard: "Lanjutkan dengan Edisi Standar",
      restorePurchases: "Restore Purchases",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      eula: "Apple Standard EULA",
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
    sync: {
      offlineNotice: "Sedang offline — perubahan tersimpan di perangkat",
      cloudSynced: "Tersinkronisasi dengan cloud",
      cloudSyncRequiresPro: "Sinkronisasi cloud membutuhkan Atelier Pro",
      signedOutFromCloud: "Keluar dari cloud",
      signedInAs: "Masuk sebagai",
      conflictCopySuffix: " (Salinan Konflik)",
      untitledConflictCopy: "Catatan Tanpa Judul (Salinan Konflik)",
    },
  },
  en: {
    app: {
      name: "Noticed",
      tagline: "Notes on Noticing",
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
      morningPromptDesc:
        "Reflective question to begin your day with mindfulness",
      eveningPrompt: "Evening Reflection",
      eveningPromptDesc:
        "Quiet moment to distill meaningful thoughts from today",
      morningTime: "Morning Time",
      eveningTime: "Evening Time",
      permissionDeniedTitle: "Notification Permission Denied",
      permissionDeniedDesc:
        "Please enable notification permissions in device settings to receive quiet reminders.",
      morningDefaultTitle: "Today's Intention",
      morningDefaultBody:
        "What is one meaningful thing you wish to notice today?",
      eveningDefaultTitle: "Evening Reflection",
      eveningDefaultBody: "What small moment or gratitude was present today?",
    },
    spaceShare: {
      collaborationAndExport: "Collaboration & Export",
      shareNotebook: "Share Notebook",
      noticesSaved: "notices saved",
      sharedBadge: "Shared",
      collabAccess: "Space Collaboration Access",
      activeStatus: "Active",
      enableStatus: "Enable",
      collabDesc:
        "Enable collaboration access to invite partners to read or write notices together via link, code, or QR code.",
      memberRoleTitle: "Member Access Role",
      roleEditor: "Can Edit",
      roleViewer: "Read Only",
      roleEditorDesc:
        "Members can read all notices and create/edit their own notices.",
      roleViewerDesc:
        "Members can only read and explore notices without modifying content.",
      tabLink: "Link & Code",
      tabQr: "QR Code",
      copyLink: "Copy",
      copiedLink: "Copied!",
      shareLink: "Share",
      qrInstruction:
        "Scan this QR code using a mobile camera or QR reader to join this notebook instantly.",
      activeMembers: "Active Members",
      syncingMembers: "Syncing...",
      removeMemberConfirm: "Remove {name} from this notebook?",
      leaveNotebook: "Leave This Notebook",
      leaveNotebookConfirm:
        "Are you sure you want to leave this shared notebook? You will lose access to its notices unless invited again.",
      printFolioTitle: "Print Folio Manuscript",
      printFolioDesc:
        "Export notebook to a print-ready PDF with high-quality editorial typesetting.",
      printFolioButton: "Print PDF",
    },
    joinSpace: {
      title: "Join Notebook",
      scanTab: "Scan QR",
      typeTab: "Enter Code",
      scanInstruction:
        "Point your camera at a notebook QR code or upload an image from your gallery.",
      typeInstruction:
        "Enter the 8-character notebook invite code or paste the invite link.",
      inputPlaceholder: "e.g., SPACE1 or https://noticed.app/join/...",
      searchButton: "Find Notebook",
      searching: "Searching...",
      readOnlyRole: "Read Only",
      editorRole: "Can Edit",
      membersCount: "Members",
      joinButton: "Join Notebook",
      joiningButton: "Connecting to Space...",
      cancelButton: "Cancel",
      foundTitle: "Notebook Found",
      viewerDesc:
        "You will join as a reader (read-only). You can explore all notices inside.",
      editorDesc:
        "You will join as a full collaborator. You can read and write new notices.",
      alreadyInShelf: "This notebook is already on your bookshelf.",
      notFound:
        "Notebook not found or sharing has not been enabled by the owner.",
      invalidCode: "Please enter a valid invite code.",
      uploadQr: "Upload QR",
    },
    manuscript: {
      title: "Folio Manuscript Edition",
      subtitle: "notices",
      a4Format: "A4 FOLIO",
      a5Format: "A5 OCTAVO",
      options: "Options",
      copyMarkdown: "Copy Markdown",
      copied: "Copied",
      unlockFull: "Unlock Full Folio",
      pro: "Pro",
      freePreviewTitle: "Standard Edition Preview",
      freePreviewDesc: "Showing 5 of {total} notices in this volume.",
      unlockFullButton: "Unlock Full",
      printPdf: "Print PDF",
    },
    atelierPro: {
      membership: "Atelier Membership",
      title: "Atelier Pro",
      defaultDesc:
        "Boundless capacity, real-time cloud sync, and the freedom to preserve a lifetime of marginalia.",
      planSelection: "Choose Membership Tier",
      privilegesTitle: "Pro Member Privileges",
      privileges: {
        unlimitedVolumes: "Unlimited Volumes & Marginalia",
        cloudSync: "Multi-Device Encrypted Cloud Sync",
        motionClips: "30s Motion Video Memories",
        audioStudio: "3-Min High Fidelity Audio Studio",
        unlimitedPhotos: "Boundless Photographs per Entry",
        printPdf: "Print-Ready PDF Manuscript Export",
      },
      oneTimeNotice:
        "One-time purchase. Permanent Atelier Pro membership without recurring subscription fees.",
      subscriptionDisclosure:
        "Payment will be charged to your Apple ID / Google Play account at confirmation of purchase. Subscription automatically renews for {price} {period} unless canceled at least 24 hours before the end of the current period. Manage or cancel anytime in App Store Account Settings.",
      processing: "Processing...",
      continueStandard: "Continue with Standard Edition",
      restorePurchases: "Restore Purchases",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      eula: "Apple Standard EULA",
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
    sync: {
      offlineNotice: "Offline — changes saved on device",
      cloudSynced: "Cloud synchronized",
      cloudSyncRequiresPro: "Cloud sync requires Atelier Pro",
      signedOutFromCloud: "Signed out from cloud",
      signedInAs: "Signed in as",
      conflictCopySuffix: " (Conflict Copy)",
      untitledConflictCopy: "Untitled Note (Conflict Copy)",
    },
  },
};

export function getTranslation(
  lang: AppLanguage = getSavedAppLanguage(),
): TranslationDictionary {
  return DICTIONARY[lang] || DICTIONARY.id;
}

export function useAppLanguage(): [
  AppLanguage,
  (lang: AppLanguage) => void,
  TranslationDictionary,
] {
  const [lang, setLangState] = useState<AppLanguage>(() =>
    getSavedAppLanguage(),
  );

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<AppLanguage>;
      if (
        customEvent.detail &&
        (customEvent.detail === "id" || customEvent.detail === "en")
      ) {
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
