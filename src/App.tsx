import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Space,
  FieldNote,
  ThemePalette,
  CoverStyle,
  FontChoice,
  MarginaliaItem,
  TextHighlight,
  StreamSortOrder,
  TextAlign,
  ImageFrameSize,
} from "@/types";
import { NoteEntry } from "@/components/notes/NoteEntry";
import { DateGroupDivider } from "@/components/notes/DateGroupDivider";
import { BookshelfView } from "@/components/spaces/BookshelfModal";
import { DynamicFlyout } from "@/components/ui/DynamicFlyout";

const CreateNoteSheet = lazy(() =>
  import("@/components/notes/CreateNoteSheet").then((m) => ({
    default: m.CreateNoteSheet,
  })),
);
const PhotostripModal = lazy(() =>
  import("@/components/notes/PhotostripModal").then((m) => ({
    default: m.PhotostripModal,
  })),
);
const QuickAnnotatorModal = lazy(() =>
  import("@/components/notes/QuickAnnotatorModal").then((m) => ({
    default: m.QuickAnnotatorModal,
  })),
);
const NotebookIndexSheet = lazy(() =>
  import("@/components/notes/NotebookIndexSheet").then((m) => ({
    default: m.NotebookIndexSheet,
  })),
);
const ThemeSelectorSheet = lazy(() =>
  import("@/components/ui/ThemeSelectorSheet").then((m) => ({
    default: m.ThemeSelectorSheet,
  })),
);
const ProfileSheet = lazy(() =>
  import("@/components/ui/ProfileSheet").then((m) => ({
    default: m.ProfileSheet,
  })),
);
const SettingsSheet = lazy(() =>
  import("@/components/ui/SettingsSheet").then((m) => ({
    default: m.SettingsSheet,
  })),
);
const SpotlightSearchModal = lazy(() =>
  import("@/components/ui/SpotlightSearchModal").then((m) => ({
    default: m.SpotlightSearchModal,
  })),
);
import { triggerHaptic } from "@/lib/haptics";
import { generateId, getDateGroupKey } from "@/lib/utils";
import {
  loadFromAtelierDB,
  saveToAtelierDB,
  clearAtelierDB,
  safeLocalStorageSet,
} from "@/lib/storage";
import {
  getCurrentUser,
  onAuthStateChange,
  signOutUser,
} from "@/lib/supabase";
import {
  syncWithCloud,
  queueCloudDeleteNote,
  queueCloudDeleteSpace,
} from "@/lib/syncEngine";
import {
  ArrowLeft,
  Palette,
  PenLine,
  Search,
  BookOpen,
  ListTree,
  Minimize2,
  SlidersHorizontal,
  ArrowUpDown,
  X,
} from "lucide-react";

// Initial starter notebooks
const INITIAL_SPACES: Space[] = [
  {
    id: "space-1",
    name: "Animal Farm",
    type: "personal",
    description:
      "Reflections on revolutions, literature and allegories of power",
    iconName: "book-open",
    coverStyle: "klein",
    fontChoice: "editorial",
    isShared: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "space-2",
    name: "Field Notes",
    type: "personal",
    description:
      "Everyday fleeting thoughts, ordinary wonders & quiet noticing",
    iconName: "compass",
    coverStyle: "ultramarine",
    fontChoice: "editorial",
    isShared: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "space-3",
    name: "Cozy Stash",
    type: "cozy_stash",
    description: "Shared journal, mutual memories & unhurried moments together",
    iconName: "coffee",
    coverStyle: "alabaster",
    fontChoice: "sans",
    isShared: true,
    partnerName: "Maya",
    inviteCode: "SN-COZY-742",
    membersCount: 2,
    createdAt: new Date().toISOString(),
  },
];

// Initial field notes matching authentic literary reference
const INITIAL_NOTES: FieldNote[] = [
  {
    id: "note-af-1",
    spaceId: "space-1",
    content:
      "Saya baru sampai Chapter VI. Menarik apabila Animal Farm dilihat sebagai satu alegori tentang revolusi dan politik kuasa.",
    photos: [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop",
    ],
    marginalia:
      "Catatan permulaan bab: Menggambarkan transformasi beransur-ansur windmill menjadi simbol cita-cita dan beban haiwan.",
    quoteSource: "Komentar Bab VI",
    marginaliaItems: [
      {
        id: "m-af-1",
        content:
          "Catatan permulaan bab: Menggambarkan transformasi beransur-ansur windmill menjadi simbol cita-cita dan beban haiwan.",
        citation: "Komentar Bab VI",
        targetSentence: "Saya baru sampai Chapter VI.",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "note-af-2",
    spaceId: "space-1",
    content:
      'Awalnya, haiwan-haiwan tu cuba melakukan revolusi untuk membebaskan diri daripada eksploitasi Mr Jones. Selepas mereka berjaya, mereka bina sebuah sistem yang lebih adil dan meletakkan prinsip bahawa "All animals are equal."\n\nTapi bila kuasa mula berfokus pada satu kelompok, struktur kuasa yang baru pun terbentuk. Dalam hal ni, babi-babi yang ada kelebihan dari segi pendidikan dan akses kepada pengetahuan yang pegang tampuk kepimpinan.',
    photos: [
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop",
    ],
    marginalia:
      "Bab 3: Slogan asal 'All animals are equal' kemudiannya dipinda secara senyap di dinding lumbung kepada '...but some animals are more equal than others.'",
    quoteSource: "George Orwell (1945)",
    marginaliaItems: [
      {
        id: "m-af-2",
        content:
          "Bab 3: Slogan asal 'All animals are equal' kemudiannya dipinda secara senyap di dinding lumbung kepada '...but some animals are more equal than others.'",
        citation: "George Orwell (1945)",
        targetSentence:
          'Selepas mereka berjaya, mereka bina sebuah sistem yang lebih adil dan meletakkan prinsip bahawa "All animals are equal."',
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
  },
  {
    id: "note-af-3",
    spaceId: "space-1",
    content:
      "Ironinya, kelompok yang pada awalnya menentang eksploitasi akhirnya mula menikmati keistimewaan elit: makanan terbaik, tempat tinggal yang lebih baik, sedangkan kelompok lain terus kerja keras.\n\nAdakah sebuah revolusi benar-benar mampu menghapuskan penindasan atau sekadar memindahkan kuasa daripada satu kelompok dominan kepada kelompok yang lain?",
    photos: [
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop",
    ],
    marginalia:
      "Lord Acton: 'Power tends to corrupt, and absolute power corrupts absolutely.' — Surat kepada Uskup Mandell Creighton.",
    quoteSource: "Acton (1887)",
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "note-fn-1",
    spaceId: "space-2",
    content:
      "24.09.2026 (3pm)- Pergi tuaran untuk stay satu malam. Berbaloi ambil room ada bathtub, sbb dah sampai lewat petang xmandi kolam. Sampai ja petang ambil peluang g pantai skejap..siap terbangkan drone & ambil2 sikit gambar/video ••\n\n7.40pm - Pergi dinner •",
    photos: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=800&auto=format&fit=crop",
    ],
    marginalia:
      "Bawa lensa 35mm f/1.8 lain kali; pencahayaan twilight di pantai sangat lembut untuk tangkapan refleksi air.",
    quoteSource: "Catatan Lensa & Sudut",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "note-fn-2",
    spaceId: "space-2",
    content:
      "9.00pm(24.09.2026) ❤️\nMenyempat duduk santai dekat open area atas cafe, ambil angin malam and snap gambar ala estetik gituhh.. maklumlah mau jgk feeling romantis.\n\nAngin malam pun lumayan, sepoi basah dengan Angin Bayu laut. Habis santai around 5minit balik bilik untuk ready to sleep",
    photos: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23.5).toISOString(),
  },
  {
    id: "note-cs-1",
    spaceId: "space-3",
    content:
      "The afternoon sun filtering through the linen curtains looked like diluted honey. Reminded me of that old cafe in Shimokitazawa.",
    author: {
      name: "Maya",
    },
    photos: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800&auto=format&fit=crop",
    ],
    marginalia:
      "Maya: 'Lagu Bill Evans — Peace Piece tengah main di kafe masa tu kan? Rasa damai sangat.'",
    quoteSource: "Memori Shimokitazawa",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "note-cs-2",
    spaceId: "space-3",
    content:
      "Made iced hojicha and roasted sweet potatoes while waiting for the evening rain. The kettle whistle matched the copper wind chimes.",
    author: {
      name: "Afa",
    },
    photos: [
      "https://images.unsplash.com/photo-1545048702-7936659f77f0?q=80&w=800&auto=format&fit=crop",
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

export function App() {
  const [theme, setTheme] = useState<ThemePalette>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        "sidenotes_theme_palette",
      ) as ThemePalette;
      if (
        saved &&
        ["alabaster", "clean_white", "linen", "obsidian", "espresso"].includes(
          saved,
        )
      ) {
        return saved;
      }
    }
    return "alabaster";
  });

  const [spaces, setSpaces] = useState<Space[]>(() => {
    try {
      const saved = localStorage.getItem("sidenotes_spaces");
      return saved ? JSON.parse(saved) : INITIAL_SPACES;
    } catch {
      return INITIAL_SPACES;
    }
  });

  const [notes, setNotes] = useState<FieldNote[]>(() => {
    try {
      const saved = localStorage.getItem("sidenotes_notes");
      return saved ? JSON.parse(saved) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  });

  const [activeSpaceId, setActiveSpaceId] = useState<string>(() => {
    return spaces[0]?.id || "space-1";
  });

  const [currentView, setCurrentView] = useState<"bookshelf" | "notebook">(
    "bookshelf",
  );
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidenotes_username") || "Afa";
    }
    return "Afa";
  });
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidenotes_avatar_photo") || null;
    }
    return null;
  });

  const handleUpdateAvatarPhoto = (photo: string | null) => {
    setAvatarPhoto(photo);
    if (photo) {
      localStorage.setItem("sidenotes_avatar_photo", photo);
    } else {
      localStorage.removeItem("sidenotes_avatar_photo");
    }
  };
  const [partnerName, setPartnerName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidenotes_partner_name") || "Maya";
    }
    return "Maya";
  });
  const [defaultShelfLayout, setDefaultShelfLayout] = useState<
    "spines" | "covers"
  >(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("sidenotes_default_shelf_layout") as
          | "spines"
          | "covers") || "spines"
      );
    }
    return "spines";
  });
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidenotes_haptics_enabled") !== "false";
    }
    return true;
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<FieldNote | null>(null);
  const [photostripNote, setPhotostripNote] = useState<FieldNote | null>(null);
  const [annotatorNote, setAnnotatorNote] = useState<FieldNote | null>(null);
  const [flyoutMessage, setFlyoutMessage] = useState<string | null>(null);

  // Cloud Auth & Sync State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidenotes_last_synced_at") || null;
    }
    return null;
  });

  // Listen to Supabase session state
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    const { data: authListener } = onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      } else {
        setUserEmail(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const isApplyingRemoteSyncRef = useRef(false);
  const autoSyncTimerRef = useRef<number | null>(null);

  // Two-way synchronization handler (supports silent background mode or manual user trigger)
  const handleCloudSync = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncWithCloud(spaces, notes, userName, avatarPhoto);
      if (result.synced) {
        const spacesChanged =
          JSON.stringify(result.spaces) !== JSON.stringify(spaces);
        const notesChanged =
          JSON.stringify(result.notes) !== JSON.stringify(notes);

        if (spacesChanged || notesChanged) {
          isApplyingRemoteSyncRef.current = true;
          if (spacesChanged) setSpaces(result.spaces);
          if (notesChanged) setNotes(result.notes);
          setTimeout(() => {
            isApplyingRemoteSyncRef.current = false;
          }, 150);
        }

        if (result.timestamp) setLastSyncedAt(result.timestamp);
        if (!silent) {
          setFlyoutMessage("Cloud synchronized");
          setTimeout(() => setFlyoutMessage(null), 2000);
        }
      } else if (
        !silent &&
        result.error &&
        result.error !== "User is not signed in"
      ) {
        setFlyoutMessage(`Sync: ${result.error}`);
        setTimeout(() => setFlyoutMessage(null), 2500);
      }
    } catch (err: any) {
      console.error("[Noticed] Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger silent sync when user signs in
  useEffect(() => {
    if (userEmail) {
      handleCloudSync({ silent: true });
    }
  }, [userEmail]);

  // Debounced Silent Auto-Sync whenever notes, spaces, or profile change
  useEffect(() => {
    if (!userEmail || isApplyingRemoteSyncRef.current) return;

    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = window.setTimeout(() => {
      handleCloudSync({ silent: true });
    }, 1500);

    return () => {
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [spaces, notes, userName, avatarPhoto, userEmail]);

  // Trigger silent sync when device reconnects online or returns to foreground
  useEffect(() => {
    const handleOnline = () => {
      if (userEmail) {
        handleCloudSync({ silent: true });
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userEmail) {
        handleCloudSync({ silent: true });
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userEmail, spaces, notes, userName, avatarPhoto]);

  const handleAuthSuccess = (email: string) => {
    setUserEmail(email);
    setFlyoutMessage(`Signed in as ${email}`);
    setTimeout(() => setFlyoutMessage(null), 2500);
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUserEmail(null);
      setFlyoutMessage("Signed out from cloud");
      setTimeout(() => setFlyoutMessage(null), 2000);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Hydrate spaces & notes from IndexedDB
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const [idbSpaces, idbNotes] = await Promise.all([
        loadFromAtelierDB<Space[]>("sidenotes_spaces"),
        loadFromAtelierDB<FieldNote[]>("sidenotes_notes"),
      ]);
      if (!isMounted) return;
      if (idbSpaces && Array.isArray(idbSpaces) && idbSpaces.length > 0) {
        setSpaces(idbSpaces);
      }
      if (idbNotes && Array.isArray(idbNotes) && idbNotes.length > 0) {
        setNotes(idbNotes);
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("sidenotes_is_locked");
        localStorage.removeItem("sidenotes_pin_code");
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Settings Handlers
  const handleUpdateUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem("sidenotes_username", name);
    setFlyoutMessage(`Author set to ${name}`);
    setTimeout(() => setFlyoutMessage(null), 2000);
  };

  const handleUpdatePartnerName = (name: string) => {
    setPartnerName(name);
    localStorage.setItem("sidenotes_partner_name", name);
  };

  const handleUpdateDefaultShelfLayout = (layout: "spines" | "covers") => {
    setDefaultShelfLayout(layout);
    localStorage.setItem("sidenotes_default_shelf_layout", layout);
    setFlyoutMessage(
      `Default view: ${layout === "spines" ? "Spines" : "Covers"}`,
    );
    setTimeout(() => setFlyoutMessage(null), 2000);
  };

  const handleToggleHaptics = (enabled: boolean) => {
    setHapticsEnabled(enabled);
    localStorage.setItem(
      "sidenotes_haptics_enabled",
      enabled ? "true" : "false",
    );
    setFlyoutMessage(enabled ? "Tactile haptics enabled" : "Haptics disabled");
    setTimeout(() => setFlyoutMessage(null), 2000);
  };


  const handleExportArchive = () => {
    const archive = {
      app: "noticed",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      user: userName,
      partner: partnerName,
      spaces,
      notes,
    };
    const blob = new Blob([JSON.stringify(archive, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noticed-archive-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFlyoutMessage("Archive exported (JSON)");
    setTimeout(() => setFlyoutMessage(null), 2500);
  };

  const handleImportArchive = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (
          data.spaces &&
          Array.isArray(data.spaces) &&
          data.notes &&
          Array.isArray(data.notes)
        ) {
          setSpaces(data.spaces);
          setNotes(data.notes);
          if (data.user) handleUpdateUserName(data.user);
          if (data.partner) handleUpdatePartnerName(data.partner);
          setFlyoutMessage(`Restored ${data.notes.length} notices`);
          setTimeout(() => setFlyoutMessage(null), 2500);
        } else {
          setFlyoutMessage("Invalid backup format");
          setTimeout(() => setFlyoutMessage(null), 2500);
        }
      } catch {
        setFlyoutMessage("Could not parse JSON archive");
        setTimeout(() => setFlyoutMessage(null), 2500);
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    setSpaces(INITIAL_SPACES);
    setNotes(INITIAL_NOTES);
    setActiveSpaceId(INITIAL_SPACES[0].id);
    localStorage.removeItem("sidenotes_spaces");
    localStorage.removeItem("sidenotes_notes");
    clearAtelierDB();
    setFlyoutMessage("All data reset to defaults");
    setTimeout(() => setFlyoutMessage(null), 2500);
  };

  // Zen Reading Mode State
  const [isReadingMode, setIsReadingMode] = useState(false);
  const readingProgressBarRef = useRef<HTMLDivElement>(null);

  // Bottom Morphing Dock Expanded State
  const [isTopFlyoutOpen, setIsTopFlyoutOpen] = useState(false);

  // Stream sorting order state
  const [streamSortOrder, setStreamSortOrder] = useState<StreamSortOrder>(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("sidenotes_sort_order");
        if (saved === "newest" || saved === "oldest") return saved;
      }
      return "newest";
    },
  );

  const handleToggleSortOrder = () => {
    triggerHaptic("medium");
    const next: StreamSortOrder =
      streamSortOrder === "newest" ? "oldest" : "newest";
    setStreamSortOrder(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidenotes_sort_order", next);
    }
    setFlyoutMessage(
      next === "newest" ? "Stream: Newest first" : "Stream: Chronological",
    );
    setTimeout(() => setFlyoutMessage(null), 2000);
  };

  // Quick Date Filter state
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(
    null,
  );
  const [isFilterMode, setIsFilterMode] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        triggerHaptic("light");
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Escape key listener for Zen Reading Mode
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (
        annotatorNote ||
        isSearchOpen ||
        isIndexOpen ||
        isThemeSelectorOpen ||
        isProfileOpen ||
        isSettingsOpen ||
        photostripNote ||
        isCreateOpen ||
        editingNote
      ) {
        return;
      }

      if (e.key === "Escape" && isReadingMode) {
        e.preventDefault();
        triggerHaptic("light");
        setIsReadingMode(false);
        setFlyoutMessage("Exited Zen Mode");
        setTimeout(() => setFlyoutMessage(null), 2000);
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [
    isReadingMode,
    annotatorNote,
    isSearchOpen,
    isIndexOpen,
    isThemeSelectorOpen,
    isProfileOpen,
    isSettingsOpen,
    photostripNote,
    isCreateOpen,
    editingNote,
  ]);

  useEffect(() => {
    setSelectedDateFilter(null);
    setIsFilterMode(false);
  }, [activeSpaceId]);

  // Scroll listener for reading progress bar (RAF-throttled DOM ref update — 0 React re-renders)
  useEffect(() => {
    if (currentView !== "notebook" || !isReadingMode) return;
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const bar = readingProgressBarRef.current;
        if (!bar) return;
        const totalScroll =
          document.documentElement.scrollHeight - window.innerHeight;
        if (totalScroll > 0) {
          const current = Math.min(
            100,
            Math.max(0, (window.scrollY / totalScroll) * 100),
          );
          bar.style.width = `${current}%`;
        }
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [currentView, isReadingMode]);

  const handleSelectSearchNote = (spaceId: string, noteId: string) => {
    setIsSearchOpen(false);
    setSelectedDateFilter(null);
    setIsFilterMode(false);
    setActiveSpaceId(spaceId);
    setCurrentView("notebook");
    setHighlightedNoteId(noteId);

    setTimeout(() => {
      const el = document.getElementById(`note-${noteId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 280);

    setTimeout(() => {
      setHighlightedNoteId(null);
    }, 2500);
  };

  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidenotes_font_size");
      if (saved) return Number(saved);
    }
    return 15.5;
  });

  const handleSelectFontSize = (size: number) => {
    setFontSize(size);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidenotes_font_size", size.toString());
    }
  };

  const [defaultTextAlign, setDefaultTextAlign] = useState<TextAlign>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidenotes_text_align") as TextAlign;
      if (
        saved === "left" ||
        saved === "center" ||
        saved === "right" ||
        saved === "justify"
      ) {
        return saved;
      }
    }
    return "left";
  });

  const handleSelectTextAlign = (align: TextAlign) => {
    setDefaultTextAlign(align);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidenotes_text_align", align);
    }
    setFlyoutMessage(`Align: ${align}`);
    setTimeout(() => setFlyoutMessage(null), 2000);
  };

  const [imageFrameSize, setImageFrameSize] = useState<ImageFrameSize>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        "sidenotes_image_frame_size",
      ) as ImageFrameSize;
      if (saved === "compact" || saved === "editorial" || saved === "full") {
        return saved;
      }
    }
    return "editorial";
  });

  const handleSelectImageFrameSize = (size: ImageFrameSize) => {
    setImageFrameSize(size);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidenotes_image_frame_size", size);
    }
    setFlyoutMessage(`Frame: ${size}`);
    setTimeout(() => setFlyoutMessage(null), 2000);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "obsidian" || theme === "espresso") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("sidenotes_theme_palette", theme);
  }, [theme]);

  useEffect(() => {
    safeLocalStorageSet("sidenotes_spaces", JSON.stringify(spaces));
    saveToAtelierDB("sidenotes_spaces", spaces);
  }, [spaces]);

  useEffect(() => {
    safeLocalStorageSet("sidenotes_notes", JSON.stringify(notes));
    saveToAtelierDB("sidenotes_notes", notes);
  }, [notes]);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];
  const currentNotebookFont: FontChoice =
    activeSpace?.fontChoice || "editorial";

  const handleCreateSpace = (
    name: string,
    isShared: boolean,
    coverStyle?: CoverStyle,
    description?: string,
    customColor?: string,
  ) => {
    const newSpace: Space = {
      id: generateId(),
      name,
      description: description || "Everyday fleeting thoughts & quiet noticing",
      type: isShared ? "cozy_stash" : "personal",
      iconName: isShared ? "coffee" : "book-open",
      coverStyle: coverStyle || "klein",
      customColor,
      fontChoice: "editorial",
      isShared,
      membersCount: isShared ? 2 : 1,
      partnerName: isShared ? "Maya" : undefined,
      createdAt: new Date().toISOString(),
    };

    setSpaces((prev) => [...prev, newSpace]);
    setActiveSpaceId(newSpace.id);
    setCurrentView("notebook");
    setFlyoutMessage(`Opened notebook: ${name}`);
    setTimeout(() => setFlyoutMessage(null), 2500);
  };

  const handleUpdateSpace = (updated: Space) => {
    setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setFlyoutMessage(`Updated: ${updated.name}`);
    setTimeout(() => setFlyoutMessage(null), 2500);
  };

  const handleDeleteSpace = (spaceId: string) => {
    const spaceNotes = notes.filter((n) => n.spaceId === spaceId);
    setSpaces((prev) => {
      const remaining = prev.filter((s) => s.id !== spaceId);
      if (activeSpaceId === spaceId && remaining.length > 0) {
        setActiveSpaceId(remaining[0].id);
      }
      return remaining;
    });
    setNotes((prev) => prev.filter((n) => n.spaceId !== spaceId));
    queueCloudDeleteSpace(spaceId, spaceNotes);
    setFlyoutMessage("Notebook archived");
    setTimeout(() => setFlyoutMessage(null), 2000);
  };

  const handleSaveNote = (newNote: FieldNote) => {
    setNotes((prev) => [newNote, ...prev]);
    setFlyoutMessage("Notice added");
    setTimeout(() => setFlyoutMessage(null), 2500);
  };

  const handleUpdateNote = (updatedNote: FieldNote) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)),
    );
    setEditingNote(null);
    setFlyoutMessage("Notice updated");
    setTimeout(() => setFlyoutMessage(null), 2200);
  };

  const handleSaveMarginalia = (
    noteId: string,
    marginaliaItems: MarginaliaItem[],
    marginalia?: string,
    quoteSource?: string,
  ) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              marginalia,
              quoteSource,
              marginaliaItems:
                marginaliaItems.length > 0 ? marginaliaItems : undefined,
            }
          : n,
      ),
    );
    setFlyoutMessage("Sidenote updated");
    setTimeout(() => setFlyoutMessage(null), 2200);
  };

  const handleUpdateNoteHighlights = useCallback(
    (noteId: string, highlights: TextHighlight[]) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, highlights } : n)),
      );
    },
    [],
  );

  const handleUpdateNoteTextAlign = useCallback(
    (noteId: string, align: TextAlign) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, textAlign: align } : n)),
      );
    },
    [],
  );

  const handlePinToggle = useCallback((noteId: string) => {
    triggerHaptic("light");
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n)),
    );
  }, []);

  const handleEditNoteCallback = useCallback((note: FieldNote) => {
    setEditingNote(note);
  }, []);

  const handleOpenPhotostripCallback = useCallback((note: FieldNote) => {
    setPhotostripNote(note);
  }, []);

  const handleOpenQuickAnnotatorCallback = useCallback((note: FieldNote) => {
    setAnnotatorNote(note);
  }, []);

  // Soft-Delete 5-Second Undo Buffer State
  const [flyoutAction, setFlyoutAction] = useState<{
    label: string;
    onClick: () => void;
  } | null>(null);
  const pendingDeleteRef = useRef<{
    note: FieldNote;
    index: number;
    timerId: number;
  } | null>(null);

  const commitPendingDelete = useCallback(() => {
    if (pendingDeleteRef.current) {
      window.clearTimeout(pendingDeleteRef.current.timerId);
      queueCloudDeleteNote(pendingDeleteRef.current.note);
      pendingDeleteRef.current = null;
    }
  }, []);

  // Flush any pending soft-deleted note if the tab is closed before the 5s window expires
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingDeleteRef.current) {
        queueCloudDeleteNote(pendingDeleteRef.current.note);
        pendingDeleteRef.current = null;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      triggerHaptic("medium");
      commitPendingDelete();

      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === noteId);
        if (idx === -1) return prev;
        const targetNote = prev[idx];

        const timerId = window.setTimeout(() => {
          queueCloudDeleteNote(targetNote);
          pendingDeleteRef.current = null;
          setFlyoutAction(null);
          setFlyoutMessage((msg) => (msg === "Notice removed" ? null : msg));
        }, 5000);

        pendingDeleteRef.current = {
          note: targetNote,
          index: idx,
          timerId,
        };

        setFlyoutMessage("Notice removed");
        setFlyoutAction({
          label: "Undo",
          onClick: () => {
            if (pendingDeleteRef.current?.note.id === targetNote.id) {
              window.clearTimeout(pendingDeleteRef.current.timerId);
              const restored = pendingDeleteRef.current.note;
              const restoreIdx = pendingDeleteRef.current.index;
              pendingDeleteRef.current = null;
              setNotes((current) => {
                if (current.some((n) => n.id === restored.id)) return current;
                const next = [...current];
                next.splice(Math.min(restoreIdx, next.length), 0, restored);
                return next;
              });
              setFlyoutAction(null);
              setFlyoutMessage("Notice restored");
              window.setTimeout(() => {
                setFlyoutMessage((msg) =>
                  msg === "Notice restored" ? null : msg,
                );
              }, 2200);
            }
          },
        });

        return prev.filter((n) => n.id !== noteId);
      });
    },
    [commitPendingDelete],
  );

  const handleSelectFont = (font: FontChoice) => {
    if (activeSpace) {
      const updated = { ...activeSpace, fontChoice: font };
      setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      const fontName =
        font === "editorial"
          ? "Newsreader"
          : font === "sans"
            ? "Urbanist"
            : "Cormorant";
      setFlyoutMessage(`Font: ${fontName}`);
      setTimeout(() => setFlyoutMessage(null), 2500);
    }
  };

  const notesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const note of notes) {
      map[note.spaceId] = (map[note.spaceId] || 0) + 1;
    }
    return map;
  }, [notes]);

  const notebookNotes = useMemo(() => {
    return notes.filter((n) => n.spaceId === activeSpace.id);
  }, [notes, activeSpace.id]);

  const groupedNotes = useMemo(() => {
    const groups: { dateKey: string; notes: FieldNote[] }[] = [];
    const map = new Map<string, FieldNote[]>();

    const sorted = [...notebookNotes].sort((a, b) => {
      const diff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return streamSortOrder === "oldest" ? -diff : diff;
    });

    for (const note of sorted) {
      const key = getDateGroupKey(note.createdAt);
      if (!map.has(key)) {
        map.set(key, []);
        groups.push({ dateKey: key, notes: map.get(key)! });
      }
      map.get(key)!.push(note);
    }

    for (const group of groups) {
      group.notes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const diff =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return streamSortOrder === "oldest" ? -diff : diff;
      });
    }

    return groups;
  }, [notebookNotes, streamSortOrder]);

  const displayGroupedNotes = useMemo(() => {
    if (selectedDateFilter && isFilterMode) {
      return groupedNotes.filter((g) => g.dateKey === selectedDateFilter);
    }
    return groupedNotes;
  }, [groupedNotes, selectedDateFilter, isFilterMode]);

  const notebookSubtitle = useMemo(() => {
    const noteCount = notebookNotes.length;
    const noteCountText = `${noteCount} ${noteCount === 1 ? "notice" : "notices"}`;

    if (notebookNotes.length > 0) {
      const targetNote =
        streamSortOrder === "oldest"
          ? notebookNotes[notebookNotes.length - 1]
          : notebookNotes[0];
      const latestDate = new Date(targetNote.createdAt);
      const dateText = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      })
        .format(latestDate)
        .toLowerCase();
      return `${dateText} · ${noteCountText}`;
    }

    return `today · ${noteCountText}`;
  }, [notebookNotes, streamSortOrder]);

  const notebookFontClass =
    currentNotebookFont === "sans"
      ? "font-sans"
      : currentNotebookFont === "display"
        ? "font-display"
        : "font-serif";

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Dynamic island flyout alert */}
      <DynamicFlyout
        message={flyoutMessage}
        type="success"
        actionLabel={flyoutAction?.label}
        onAction={flyoutAction?.onClick}
        onClose={() => {
          setFlyoutMessage(null);
          setFlyoutAction(null);
        }}
      />

      {/* Zen Reading Mode Progress Bar */}
      {isReadingMode && currentView === "notebook" && (
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-[var(--text-primary)]/10 z-50 pointer-events-none">
          <div
            ref={readingProgressBarRef}
            className="h-full bg-gradient-to-r from-transparent via-[var(--text-primary)] to-[var(--text-primary)] transition-[width] duration-100"
            style={{ width: "0%" }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentView === "bookshelf" ? (
          <motion.div
            key="view-bookshelf"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08, filter: "blur(4px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full min-h-screen"
          >
            <BookshelfView
              spaces={spaces}
              activeSpaceId={activeSpace.id}
              notesCountMap={notesCountMap}
              userName={userName}
              avatarPhoto={avatarPhoto}
              defaultShelfLayout={defaultShelfLayout}
              isSyncing={isSyncing}
              isCloudConnected={Boolean(userEmail)}
              onSelectSpace={(id) => {
                setActiveSpaceId(id);
                setCurrentView("notebook");
              }}
              onCreateSpace={handleCreateSpace}
              onUpdateSpace={handleUpdateSpace}
              onDeleteSpace={handleDeleteSpace}
              onReorderSpaces={setSpaces}
              onOpenThemeSelector={() => setIsThemeSelectorOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenSearch={() => setIsSearchOpen(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`view-notebook-${activeSpace.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            data-font={currentNotebookFont}
            style={
              { "--note-font-size": `${fontSize}px` } as React.CSSProperties
            }
            className={`min-h-screen paper-texture ${notebookFontClass}`}
          >
            {/* Scrollable Canvas */}
            <main
              className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-5 sm:px-8 pb-32 paper-micro-grain"
              style={{
                paddingTop:
                  "max(calc(env(safe-area-inset-top, 0px) + 24px), 32px)",
              }}
            >
              {/* Literary Folio Header */}
              {!isReadingMode ? (
                <header className="pt-2 pb-6 text-center space-y-2.5 select-none">
                  {/* Metadata Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full inner-pseudo-glass text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--text-tertiary)] shadow-xs">
                    <span>{notebookSubtitle}</span>
                    {activeSpace.isShared && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                          <span>Shared</span>
                        </span>
                      </>
                    )}
                    {userEmail && (
                      <>
                        <span>·</span>
                        <span
                          title={
                            isSyncing
                              ? "Syncing with cloud"
                              : "Cloud synchronized"
                          }
                          className="inline-flex items-center gap-1 text-[var(--text-secondary)]"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSyncing
                                ? "bg-sky-500 animate-pulse"
                                : "bg-emerald-500/80"
                            }`}
                          />
                          <span>{isSyncing ? "Syncing" : "Cloud"}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="font-serif text-3xl sm:text-[40px] font-normal tracking-tight leading-[1.15] text-[var(--text-primary)] pt-1">
                    {activeSpace.name}
                  </h1>

                  {/* Description */}
                  {activeSpace.description && (
                    <p className="font-serif italic text-[14px] sm:text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-xs sm:max-w-md mx-auto">
                      {activeSpace.description}
                    </p>
                  )}

                  {/* Collaborative Stash Info */}
                  {activeSpace.isShared && (
                    <div className="text-[11px] opacity-60 font-sans">
                      {activeSpace.partnerName
                        ? `Noticing in tandem with ${activeSpace.partnerName}`
                        : "Shared Stash Edition"}
                    </div>
                  )}

                  {/* Caustic Ornament Divider */}
                  <div className="pt-3 flex items-center justify-center gap-3 opacity-30">
                    <div className="w-8 sm:w-10 h-px bg-[var(--text-primary)]" />
                    <div className="w-1 h-1 rotate-45 bg-[var(--text-primary)]" />
                    <div className="w-8 sm:w-10 h-px bg-[var(--text-primary)]" />
                  </div>
                </header>
              ) : (
                /* Streamlined Manuscript Header in Zen Mode */
                <header className="pt-2 pb-8 text-center space-y-2 select-none">
                  <div className="text-[10.5px] uppercase tracking-[0.24em] font-sans opacity-40">
                    {activeSpace.name} · {notebookSubtitle}
                  </div>
                  <div className="pt-1 w-16 mx-auto border-b border-[var(--glass-border)] opacity-35" />
                </header>
              )}

              {/* Note Stream */}
              {displayGroupedNotes.length === 0 ? (
                <div className="py-24 text-center space-y-3">
                  <p className="text-sm text-[var(--text-tertiary)] italic">
                    A blank page awaits your notice.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setIsCreateOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--accent-ink)] text-xs font-semibold cursor-pointer active:scale-95 transition-transform shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                  >
                    Notice something
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {displayGroupedNotes.map((group) => {
                    const sectionId = `date-group-${encodeURIComponent(
                      group.dateKey.toLowerCase().replace(/\s+/g, "-"),
                    )}`;

                    return (
                      <section
                        key={group.dateKey}
                        id={sectionId}
                        data-date-key={group.dateKey}
                        className="space-y-4 date-group-section transition-all scroll-mt-32 sm:scroll-mt-36"
                      >
                        <DateGroupDivider
                          dateKey={group.dateKey}
                          noteCount={group.notes.length}
                        />

                        <div className="space-y-2">
                          {group.notes.map((note, noteIdx) => (
                            <NoteEntry
                              key={note.id}
                              note={note}
                              isHighlighted={note.id === highlightedNoteId}
                              isSharedSpace={activeSpace.isShared}
                              isReadingMode={isReadingMode}
                              isFirstInGroup={noteIdx === 0}
                              defaultTextAlign={defaultTextAlign}
                              imageFrameSize={imageFrameSize}
                              onPinToggle={handlePinToggle}
                              onDeleteNote={handleDeleteNote}
                              onEditNote={handleEditNoteCallback}
                              onOpenPhotostrip={handleOpenPhotostripCallback}
                              onOpenQuickAnnotator={
                                handleOpenQuickAnnotatorCallback
                              }
                              onUpdateHighlights={handleUpdateNoteHighlights}
                              onUpdateTextAlign={handleUpdateNoteTextAlign}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  <div className="pt-8 pb-4 text-center text-xs text-[var(--text-tertiary)] italic select-none opacity-50">
                    ¹ captured with noticed — for things you don't want to forget
                  </div>
                </div>
              )}
            </main>

            {/* 2. Unified Floating Bottom Dock (Apple Dynamic Island Pods) */}
            {!isReadingMode ? (
              <>
                {isTopFlyoutOpen && (
                  <div
                    className="fixed inset-0 z-40 pointer-events-auto"
                    onClick={() => setIsTopFlyoutOpen(false)}
                  />
                )}

                <div
                  className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-5 sm:px-8 pointer-events-none z-50 flex items-center justify-center"
                  style={{
                    paddingBottom:
                      "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
                  }}
                >
                  <AnimatePresence mode="wait">
                    {!isTopFlyoutOpen ? (
                      /* Default Tri-Control Dock: [ ← ] [ noticing ] [ sliders ] */
                      <motion.div
                        key="bottom-dock-default"
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.18 }}
                        className="pointer-events-auto flex items-center justify-center gap-2.5"
                      >
                        {/* Back to Bookshelf */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setCurrentView("bookshelf");
                          }}
                          className="w-11 h-11 rounded-full dynamic-island-shell flex items-center justify-center text-[var(--text-primary)] hover:opacity-90 active:scale-95 transition-transform shadow-[0_12px_28px_-6px_rgba(0,0,0,0.22)] cursor-pointer border border-[var(--glass-border)]"
                          title="Bookshelf"
                        >
                          <ArrowLeft className="w-4 h-4 stroke-[2]" />
                        </button>

                        {/* Compose "noticing" Pill */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("medium");
                            setIsCreateOpen(true);
                          }}
                          className="
                            h-11 flex items-center gap-2 px-6 rounded-full
                            dynamic-island-shell text-[var(--text-primary)]
                            font-semibold text-xs tracking-wide
                            border border-[var(--glass-border)]
                            shadow-[0_16px_36px_-6px_rgba(0,0,0,0.28)]
                            transition-all active:scale-95 hover:opacity-95 cursor-pointer relative
                          "
                          title="Compose Entry"
                        >
                          <div className="dynamic-island-specular-rim" />
                          <PenLine className="w-4 h-4 stroke-[2]" />
                          <span>noticing</span>
                        </button>

                        {/* Tools Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setIsTopFlyoutOpen(true);
                          }}
                          className="w-11 h-11 rounded-full dynamic-island-shell flex items-center justify-center text-[var(--text-primary)] hover:opacity-90 active:scale-95 transition-transform shadow-[0_12px_28px_-6px_rgba(0,0,0,0.22)] cursor-pointer border border-[var(--glass-border)]"
                          title="Menu"
                        >
                          <SlidersHorizontal className="w-4 h-4 stroke-[2]" />
                        </button>
                      </motion.div>
                    ) : (
                      /* Morphed Tools Dock */
                      <motion.div
                        key="bottom-dock-tools"
                        initial={{ opacity: 0, scale: 0.92, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 6 }}
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 30,
                        }}
                        className="pointer-events-auto h-11 flex items-center gap-1.5 px-2 rounded-full dynamic-island-shell border border-[var(--glass-border)] shadow-[0_20px_45px_-8px_rgba(0,0,0,0.32)]"
                      >
                        <div className="inner-pseudo-glass" />

                        {/* Search */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setIsTopFlyoutOpen(false);
                            setIsSearchOpen(true);
                          }}
                          className="w-8 h-8 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                          title="Search (Cmd+K)"
                        >
                          <Search className="w-3.5 h-3.5 stroke-[2]" />
                        </button>

                        {/* Index */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setIsTopFlyoutOpen(false);
                            setIsIndexOpen(true);
                          }}
                          className="w-8 h-8 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                          title="Index"
                        >
                          <ListTree className="w-3.5 h-3.5 stroke-[2]" />
                        </button>

                        {/* Zen Mode */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("medium");
                            setIsTopFlyoutOpen(false);
                            setIsReadingMode(true);
                            setFlyoutMessage("Zen Mode · Press Esc to exit");
                            setTimeout(() => setFlyoutMessage(null), 2500);
                          }}
                          className="w-8 h-8 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                          title="Zen Mode"
                        >
                          <BookOpen className="w-3.5 h-3.5 stroke-[2]" />
                        </button>

                        {/* Sort Order */}
                        <button
                          type="button"
                          onClick={handleToggleSortOrder}
                          className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer ${
                            streamSortOrder === "oldest"
                              ? "bg-[var(--text-primary)] text-[var(--accent-ink)] font-semibold shadow-xs"
                              : "inner-pseudo-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-xs"
                          }`}
                          title={
                            streamSortOrder === "newest"
                              ? "Newest First"
                              : "Oldest First"
                          }
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 stroke-[2]" />
                        </button>

                        {/* Theme */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setIsTopFlyoutOpen(false);
                            setIsThemeSelectorOpen(true);
                          }}
                          className="w-8 h-8 rounded-full inner-pseudo-glass flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer shadow-xs"
                          title="Themes"
                        >
                          <Palette className="w-3.5 h-3.5 stroke-[2]" />
                        </button>

                        <div className="w-px h-3.5 bg-[var(--glass-border)] opacity-60 mx-0.5" />

                        {/* Close Dock */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setIsTopFlyoutOpen(false);
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.2]" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Zen Mode Floating Exit Pill */
              <div
                className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-5 sm:px-8 pointer-events-none z-50 flex items-center justify-center"
                style={{
                  paddingBottom:
                    "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setIsReadingMode(false);
                    setFlyoutMessage("Exited Zen Mode");
                    setTimeout(() => setFlyoutMessage(null), 2000);
                  }}
                  className="
                    pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full
                    dynamic-island-shell text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                    transition-all text-xs active:scale-95 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.22)] cursor-pointer border border-[var(--glass-border)]
                  "
                  title="Exit Zen Mode (Esc)"
                >
                  <div className="dynamic-island-specular-rim" />
                  <Minimize2 className="w-3.5 h-3.5 stroke-[2]" />
                  <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">
                    Exit Zen
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        {/* Quick Annotator Modal */}
        {Boolean(annotatorNote) && (
          <QuickAnnotatorModal
            isOpen={Boolean(annotatorNote)}
            onClose={() => setAnnotatorNote(null)}
            note={annotatorNote}
            onSaveMarginalia={handleSaveMarginalia}
          />
        )}

        {/* Create / Edit Note Sheet */}
        {(isCreateOpen || Boolean(editingNote)) && (
          <CreateNoteSheet
            isOpen={isCreateOpen || Boolean(editingNote)}
            onClose={() => {
              setIsCreateOpen(false);
              setEditingNote(null);
            }}
            spaces={spaces}
            defaultSpaceId={activeSpace.id}
            defaultTextAlign={defaultTextAlign}
            editingNote={editingNote}
            onSaveNote={handleSaveNote}
            onUpdateNote={handleUpdateNote}
          />
        )}

        {/* Photostrip Modal */}
        {Boolean(photostripNote) && (
          <PhotostripModal
            isOpen={Boolean(photostripNote)}
            onClose={() => setPhotostripNote(null)}
            note={photostripNote}
            space={activeSpace}
            defaultTheme={theme}
          />
        )}

        {/* Table of Contents Index */}
        {isIndexOpen && (
          <NotebookIndexSheet
            isOpen={isIndexOpen}
            onClose={() => setIsIndexOpen(false)}
            space={activeSpace}
            groupedNotes={groupedNotes}
            onSelectNote={(noteId) =>
              handleSelectSearchNote(activeSpace.id, noteId)
            }
          />
        )}

        {/* Theme Selector Sheet */}
        {isThemeSelectorOpen && (
          <ThemeSelectorSheet
            isOpen={isThemeSelectorOpen}
            onClose={() => setIsThemeSelectorOpen(false)}
            currentTheme={theme}
            onSelectTheme={(newTheme) => setTheme(newTheme)}
            currentFont={currentNotebookFont}
            onSelectFont={handleSelectFont}
            fontSize={fontSize}
            onSelectFontSize={handleSelectFontSize}
            textAlign={defaultTextAlign}
            onSelectTextAlign={handleSelectTextAlign}
            imageFrameSize={imageFrameSize}
            onSelectImageFrameSize={handleSelectImageFrameSize}
            notebookName={activeSpace.name}
          />
        )}

        {/* Profile Sheet */}
        {isProfileOpen && (
          <ProfileSheet
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            userName={userName}
            onUpdateUserName={handleUpdateUserName}
            avatarPhoto={avatarPhoto}
            onUpdateAvatarPhoto={handleUpdateAvatarPhoto}
            totalVolumes={spaces.length}
            totalNotes={notes.length}
            onExportArchive={handleExportArchive}
            onImportArchive={handleImportArchive}
            userEmail={userEmail}
            onSignOut={handleSignOut}
            onAuthSuccess={handleAuthSuccess}
            isSyncing={isSyncing}
            lastSyncedAt={lastSyncedAt}
            onTriggerSync={() => handleCloudSync({ silent: false })}
          />
        )}

        {/* Settings Sheet */}
        {isSettingsOpen && (
          <SettingsSheet
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            defaultShelfLayout={defaultShelfLayout}
            onUpdateDefaultShelfLayout={handleUpdateDefaultShelfLayout}
            hapticsEnabled={hapticsEnabled}
            onToggleHaptics={handleToggleHaptics}
            onResetAllData={handleResetAllData}
            currentTheme={theme}
            onSelectTheme={setTheme}
          />
        )}

        {/* Spotlight Search Modal */}
        {isSearchOpen && (
          <SpotlightSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            spaces={spaces}
            notes={notes}
            activeSpaceId={
              currentView === "notebook" ? activeSpace.id : undefined
            }
            onSelectNote={handleSelectSearchNote}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;

