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
  LEGACY_DUMMY_SPACE_IDS,
  isLegacyDummyNoteId,
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

// Default starter notebook for a fresh installation or factory reset
const DEFAULT_STARTER_SPACE: Space = {
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
};

const INITIAL_SPACES: Space[] = [DEFAULT_STARTER_SPACE];
const INITIAL_NOTES: FieldNote[] = [];

function sanitizeLegacyDummyData(
  rawSpaces: Space[],
  rawNotes: FieldNote[],
): { spaces: Space[]; notes: FieldNote[] } {
  const cleanedNotes = rawNotes.filter((n) => !isLegacyDummyNoteId(n.id));
  const realNoteSpaceIds = new Set(cleanedNotes.map((n) => n.spaceId));
  const cleanedSpaces = rawSpaces
    .filter(
      (s) => !LEGACY_DUMMY_SPACE_IDS.has(s.id) || realNoteSpaceIds.has(s.id),
    )
    .map((s) => ({
      ...s,
      isShared: false,
      partnerName: undefined,
      inviteCode: undefined,
    }));
  return { spaces: cleanedSpaces, notes: cleanedNotes };
}

export function App() {
  const [theme, setTheme] = useState<ThemePalette>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        "sidenotes_theme_palette",
      ) as ThemePalette;
      if (
        saved &&
        [
          "alabaster",
          "clean_white",
          "sage",
          "obsidian",
          "espresso",
          "oxford",
        ].includes(saved)
      ) {
        return saved;
      }
    }
    return "alabaster";
  });

  const initialSanitized = useMemo(() => {
    try {
      const savedSpacesStr =
        typeof window !== "undefined"
          ? localStorage.getItem("sidenotes_spaces")
          : null;
      const savedNotesStr =
        typeof window !== "undefined"
          ? localStorage.getItem("sidenotes_notes")
          : null;
      const rawSpaces: Space[] = savedSpacesStr
        ? JSON.parse(savedSpacesStr)
        : INITIAL_SPACES;
      const rawNotes: FieldNote[] = savedNotesStr
        ? JSON.parse(savedNotesStr)
        : INITIAL_NOTES;
      return sanitizeLegacyDummyData(rawSpaces, rawNotes);
    } catch {
      return { spaces: INITIAL_SPACES, notes: INITIAL_NOTES };
    }
  }, []);

  const [spaces, setSpaces] = useState<Space[]>(initialSanitized.spaces);
  const [notes, setNotes] = useState<FieldNote[]>(initialSanitized.notes);

  const [activeSpaceId, setActiveSpaceId] = useState<string>(() => {
    return initialSanitized.spaces[0]?.id || DEFAULT_STARTER_SPACE.id;
  });

  const [currentView, setCurrentView] = useState<"bookshelf" | "notebook">(
    "bookshelf",
  );
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidenotes_username");
      if (saved && saved !== "Afa") return saved;
    }
    return "Author";
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
        const nameChanged =
          Boolean(result.userName) && result.userName !== userName;
        const avatarChanged =
          result.avatarPhoto !== undefined &&
          result.avatarPhoto !== avatarPhoto;

        if (spacesChanged || notesChanged || nameChanged || avatarChanged) {
          isApplyingRemoteSyncRef.current = true;
          if (spacesChanged) setSpaces(result.spaces);
          if (notesChanged) setNotes(result.notes);
          if (nameChanged && result.userName) {
            setUserName(result.userName);
            localStorage.setItem("sidenotes_username", result.userName);
          }
          if (avatarChanged && result.avatarPhoto !== undefined) {
            setAvatarPhoto(result.avatarPhoto);
            if (result.avatarPhoto) {
              localStorage.setItem(
                "sidenotes_avatar_photo",
                result.avatarPhoto,
              );
            }
          }
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

  // Hydrate spaces & notes from IndexedDB and purge any legacy dummy records
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const [idbSpaces, idbNotes] = await Promise.all([
        loadFromAtelierDB<Space[]>("sidenotes_spaces"),
        loadFromAtelierDB<FieldNote[]>("sidenotes_notes"),
      ]);
      if (!isMounted) return;
      const rawIdbSpaces =
        idbSpaces && Array.isArray(idbSpaces) && idbSpaces.length > 0
          ? idbSpaces
          : null;
      const rawIdbNotes =
        idbNotes && Array.isArray(idbNotes) && idbNotes.length > 0
          ? idbNotes
          : null;
      if (rawIdbSpaces || rawIdbNotes) {
        const sanitized = sanitizeLegacyDummyData(
          rawIdbSpaces ?? initialSanitized.spaces,
          rawIdbNotes ?? initialSanitized.notes,
        );
        if (rawIdbSpaces) setSpaces(sanitized.spaces);
        if (rawIdbNotes) setNotes(sanitized.notes);
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("sidenotes_is_locked");
        localStorage.removeItem("sidenotes_pin_code");
        localStorage.removeItem("sidenotes_partner_name");
        if (localStorage.getItem("sidenotes_username") === "Afa") {
          localStorage.removeItem("sidenotes_username");
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [initialSanitized]);

  // Settings Handlers
  const handleUpdateUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem("sidenotes_username", name);
    setFlyoutMessage(`Author set to ${name}`);
    setTimeout(() => setFlyoutMessage(null), 2000);
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
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      user: userName,
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
          const sanitized = sanitizeLegacyDummyData(data.spaces, data.notes);
          setSpaces(sanitized.spaces);
          setNotes(sanitized.notes);
          if (data.user) handleUpdateUserName(data.user);
          setFlyoutMessage(`Restored ${sanitized.notes.length} notices`);
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
    setSpaces([DEFAULT_STARTER_SPACE]);
    setNotes([]);
    setActiveSpaceId(DEFAULT_STARTER_SPACE.id);
    setCurrentView("bookshelf");
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

    // Sync native mobile status bar and browser chrome color with active theme
    const themeColors: Record<ThemePalette, string> = {
      obsidian: "#111113",
      espresso: "#191716",
      oxford: "#101520",
      alabaster: "#f7f5f0",
      clean_white: "#ffffff",
      sage: "#eff3ef",
    };
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", themeColors[theme] || "#111113");
    }
  }, [theme]);

  useEffect(() => {
    safeLocalStorageSet("sidenotes_spaces", JSON.stringify(spaces));
    saveToAtelierDB("sidenotes_spaces", spaces);
  }, [spaces]);

  useEffect(() => {
    safeLocalStorageSet("sidenotes_notes", JSON.stringify(notes));
    saveToAtelierDB("sidenotes_notes", notes);
  }, [notes]);

  const activeSpace =
    spaces.find((s) => s.id === activeSpaceId) ||
    spaces[0] ||
    DEFAULT_STARTER_SPACE;
  const currentNotebookFont: FontChoice =
    activeSpace?.fontChoice || "editorial";

  useEffect(() => {
    if (spaces.length === 0 && currentView === "notebook") {
      setCurrentView("bookshelf");
    }
  }, [spaces.length, currentView]);

  const handleCreateSpace = (
    name: string,
    _isShared: boolean,
    coverStyle?: CoverStyle,
    description?: string,
    customColor?: string,
    fontChoice?: FontChoice,
  ) => {
    const newSpace: Space = {
      id: generateId(),
      name,
      description: description || "Everyday fleeting thoughts & quiet noticing",
      type: "personal",
      iconName: "book-open",
      coverStyle: coverStyle || "klein",
      customColor,
      fontChoice: fontChoice || "editorial",
      isShared: false,
      membersCount: 1,
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
      if (remaining.length === 0) {
        setActiveSpaceId("");
        setCurrentView("bookshelf");
      } else if (activeSpaceId === spaceId) {
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
              {groupedNotes.length === 0 ? (
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
                  {groupedNotes.map((group) => {
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

