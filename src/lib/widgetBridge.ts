import { registerPlugin } from '@capacitor/core';
import type { Space, FieldNote } from '../types';

export interface WidgetBookSpine {
  id: string;
  title: string;
  volumeNumber: string;
  coverStyle: string;
  colorHex: string;
  foilColor: string;
  notesCount: number;
  latestNoteTitle: string;
  latestNoteExcerpt: string;
  latestNoteDate: string;
}

export interface WidgetHeatmapDay {
  dayLabel: string;
  dayName: string;
  dateStr: string;
  words: number;
  intensity: number;
  isToday: boolean;
}

export interface WidgetNoteSnippet {
  id: string;
  title: string;
  excerpt: string;
  dateFormatted: string;
  spaceTitle: string;
  marginalia: string;
  hasAudio: boolean;
  audioDurationFormatted?: string;
  hasPhoto: boolean;
  photoUrl?: string;
  locationName?: string;
}

export interface NoticedWidgetSnapshot {
  language: 'en' | 'id';
  theme: 'light' | 'dark';
  authorName: string;
  activeSpaceId: string;
  activeSpaceTitle: string;
  activeSpaceCoverColor: string;
  activeSpaceFoil: string;
  totalSpacesCount: number;
  totalNotesCount: number;
  totalWordsCount: number;
  streakDays: number;
  weeklyWordsCount: number;
  weeklyHeatmap: WidgetHeatmapDay[];
  bookshelves: WidgetBookSpine[];
  latestNote: WidgetNoteSnippet;
  dailyWhisper: {
    title: string;
    quote: string;
    sourceOrSpace: string;
    progressPercent: number;
    wordCount: number;
  };
  lastSyncedTimestamp: number;
}

interface WidgetBridgePluginInterface {
  updateSnapshot(options: { snapshot: NoticedWidgetSnapshot }): Promise<{ success: boolean }>;
  getPendingAction(): Promise<{ action?: string; spaceId?: string }>;
  clearPendingAction(): Promise<{ success: boolean }>;
  saveThumbnail(options: { base64Data: string; fileName: string }): Promise<{ success: boolean; filePath?: string }>;
  reloadWidgets(): Promise<{ success: boolean }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePluginInterface>('WidgetBridge');

/**
 * Calculates continuous writing streak in consecutive days based on note creation and update timestamps.
 */
export function calculateWritingStreak(notes: FieldNote[]): number {
  if (!notes || notes.length === 0) return 0;

  const datesWithActivity = new Set<string>();
  for (const n of notes) {
    if (n.createdAt) {
      datesWithActivity.add(new Date(n.createdAt).toISOString().slice(0, 10));
    }
    if (n.updatedAt) {
      datesWithActivity.add(new Date(n.updatedAt).toISOString().slice(0, 10));
    }
  }

  const today = new Date();
  let streak = 0;
  let checkDate = new Date(today);

  // Check if today has activity
  const todayStr = checkDate.toISOString().slice(0, 10);
  const activeToday = datesWithActivity.has(todayStr);

  if (!activeToday) {
    // Check if yesterday had activity; if neither, streak is 0
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().slice(0, 10);
    if (!datesWithActivity.has(yesterdayStr)) {
      return 0;
    }
  }

  // Iterate backwards day by day to count consecutive active days
  while (true) {
    const dStr = checkDate.toISOString().slice(0, 10);
    if (datesWithActivity.has(dStr)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Generates the current week's 7-day heatmap matrix (Monday through Sunday)
 * computing words written and visual intensity (0-4).
 */
export function calculateWeeklyHeatmap(notes: FieldNote[]): { heatmap: WidgetHeatmapDay[]; weeklyWords: number } {
  const now = new Date();
  // Monday is 1, Sunday is 0 -> adjust so Monday is first day of week
  const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const daysShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const days: WidgetHeatmapDay[] = [];
  let totalWeeklyWords = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(monday);
    curDate.setDate(monday.getDate() + i);
    const dateStr = curDate.toISOString().slice(0, 10);
    const isToday = dateStr === now.toISOString().slice(0, 10);

    // Sum words in notes created or updated on this day
    let words = 0;
    for (const note of notes) {
      const createdStr = note.createdAt ? new Date(note.createdAt).toISOString().slice(0, 10) : '';
      const updatedStr = note.updatedAt ? new Date(note.updatedAt).toISOString().slice(0, 10) : '';
      if (createdStr === dateStr || updatedStr === dateStr) {
        if (note.content) {
          words += note.content.trim().split(/\s+/).filter(Boolean).length;
        }
      }
    }

    totalWeeklyWords += words;

    // Intensity scale 0 to 4
    let intensity = 0;
    if (words > 600) intensity = 4;
    else if (words > 300) intensity = 3;
    else if (words > 100) intensity = 2;
    else if (words > 0) intensity = 1;

    days.push({
      dayLabel: daysShort[i],
      dayName: dayNames[i],
      dateStr,
      words,
      intensity,
      isToday
    });
  }

  return { heatmap: days, weeklyWords: totalWeeklyWords };
}

/**
 * Converts space cover style and color to corresponding hex color codes.
 */
function resolveCoverHex(style?: string, customColor?: string): string {
  if (customColor) return customColor;
  switch (style) {
    case 'kraft': return '#C2410C';
    case 'marble': return '#4A1521';
    case 'linen': return '#064E3B';
    case 'obsidian': return '#1C1917';
    case 'espresso': return '#38220F';
    case 'oxford': return '#1E293B';
    case 'klein': return '#1D4ED8';
    case 'electric': return '#4338CA';
    case 'ultramarine': return '#312E81';
    case 'sage': return '#2D4A3E';
    case 'alabaster': return '#FAF8F5';
    default: return '#C2410C';
  }
}

/**
 * Roman numeral formatter for volume sequence (I, II, III, IV, etc.)
 */
function toRoman(num: number): string {
  const romanMap: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let result = '';
  let n = num;
  for (const [val, sym] of romanMap) {
    while (n >= val) {
      result += sym;
      n -= val;
    }
  }
  return result || 'I';
}

/**
 * Formats timestamps into human-readable relative or short dates.
 */
function formatShortDate(isoString?: string, language: 'en' | 'id' = 'en'): string {
  if (!isoString) return language === 'id' ? 'Hari ini' : 'Today';
  const d = new Date(isoString);
  const now = new Date();
  const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24 && d.getDate() === now.getDate()) {
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return (language === 'id' ? 'Hari ini, ' : 'Today, ') + `${hours}:${mins}`;
  }

  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const months = language === 'id' ? monthsId : monthsEn;
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Constructs the unified NoticedWidgetSnapshot from live application state.
 */
export function buildWidgetSnapshot(
  spaces: Space[],
  notes: FieldNote[],
  activeSpaceId: string | null,
  language: 'en' | 'id' = 'en',
  theme: 'light' | 'dark' = 'dark',
  authorName: string = 'Author'
): NoticedWidgetSnapshot {
  const nonArchivedSpaces = spaces.filter((s) => !s.archived);
  const nonArchivedNotes = notes.filter((n) => !n.archived);

  // Literary stats
  let totalWordsCount = 0;
  for (const n of nonArchivedNotes) {
    if (n.content) {
      totalWordsCount += n.content.trim().split(/\s+/).filter(Boolean).length;
    }
  }

  const streakDays = calculateWritingStreak(nonArchivedNotes);
  const { heatmap: weeklyHeatmap, weeklyWords: weeklyWordsCount } = calculateWeeklyHeatmap(nonArchivedNotes);

  // Active space
  const currentSpace = nonArchivedSpaces.find((s) => s.id === activeSpaceId) || nonArchivedSpaces[0] || {
    id: 'default',
    name: language === 'id' ? 'Catatan Lapangan' : 'Field Notes',
    coverStyle: 'kraft',
    foilColor: 'gold'
  };

  // Build bookshelf spines (up to 6 spaces)
  const bookshelves: WidgetBookSpine[] = nonArchivedSpaces.slice(0, 6).map((space, idx) => {
    const spaceNotes = nonArchivedNotes.filter((n) => n.spaceId === space.id);
    const sortedSpaceNotes = [...spaceNotes].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    const latest = sortedSpaceNotes[0];

    return {
      id: space.id,
      title: space.name || (language === 'id' ? `Jilid ${idx + 1}` : `Volume ${idx + 1}`),
      volumeNumber: `VOL. ${toRoman(idx + 1)}`,
      coverStyle: space.coverStyle || 'kraft',
      colorHex: resolveCoverHex(space.coverStyle, space.customColor),
      foilColor: space.foilColor || 'gold',
      notesCount: spaceNotes.length,
      latestNoteTitle: latest?.title || (language === 'id' ? 'Draf Tanpa Judul' : 'Untitled Draft'),
      latestNoteExcerpt: latest?.content?.slice(0, 120) || (language === 'id' ? 'Belum ada catatan di jilid ini.' : 'No entries yet in this folio.'),
      latestNoteDate: formatShortDate(latest?.updatedAt || latest?.createdAt, language)
    };
  });

  // Sort notes by recency
  const sortedNotes = [...nonArchivedNotes].sort((a, b) => {
    const dateA = a.updatedAt || a.createdAt;
    const dateB = b.updatedAt || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  const mostRecent = sortedNotes[0];

  // Resolve space title of most recent note
  const mostRecentSpace = nonArchivedSpaces.find((s) => s.id === mostRecent?.spaceId);

  // Find latest marginalia excerpt
  let activeMarginalia = '';
  for (const n of sortedNotes) {
    if (n.marginaliaItems && n.marginaliaItems.length > 0) {
      activeMarginalia = n.marginaliaItems[0].content;
      break;
    } else if (n.marginalia) {
      activeMarginalia = n.marginalia;
      break;
    }
  }
  if (!activeMarginalia && mostRecent?.content) {
    activeMarginalia = mostRecent.content.slice(0, 100);
  }
  if (!activeMarginalia) {
    activeMarginalia = language === 'id'
      ? 'Hening di antara dua kalimat menyimpan lebih banyak kebenaran dibanding dua puluh halaman prosa.'
      : 'Silence between two sentences holds more truth than twenty pages of prose.';
  }

  // Format audio duration
  let audioDurationFormatted = '';
  if (mostRecent?.voiceMemo?.durationSeconds) {
    const sec = mostRecent.voiceMemo.durationSeconds;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    audioDurationFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const defaultNoteTitle = language === 'id' ? 'Catatan Lapangan' : 'Field Notes';
  const defaultNoteExcerpt = language === 'id'
    ? 'Setiap pemikiran yang diperhatikan adalah perlindungan dari kelupaan.'
    : 'Every thought noticed is a preservation against forgetfulness.';

  const latestNote: WidgetNoteSnippet = {
    id: mostRecent?.id || 'empty',
    title: mostRecent?.title || defaultNoteTitle,
    excerpt: mostRecent?.content?.slice(0, 140) || defaultNoteExcerpt,
    dateFormatted: mostRecent ? formatShortDate(mostRecent.updatedAt || mostRecent.createdAt, language) : '',
    spaceTitle: mostRecentSpace?.name || currentSpace.name,
    marginalia: activeMarginalia,
    hasAudio: Boolean(mostRecent?.voiceMemo),
    audioDurationFormatted: audioDurationFormatted || '',
    hasPhoto: Boolean(mostRecent?.photos && mostRecent.photos.length > 0),
    photoUrl: mostRecent?.photos?.[0],
    locationName: mostRecent?.locationName || undefined
  };

  const dailyWhisper = {
    title: mostRecent?.title || (language === 'id' ? 'Bisikan Harian' : 'Daily Whisper'),
    quote: activeMarginalia,
    sourceOrSpace: mostRecentSpace?.name || currentSpace.name,
    progressPercent: Math.min(100, Math.round((totalWordsCount % 1000) / 10)),
    wordCount: mostRecent?.content ? mostRecent.content.trim().split(/\s+/).filter(Boolean).length : 0
  };

  const cleanAuthorName = authorName?.trim() || (language === 'id' ? 'Penulis' : 'Author');

  return {
    language,
    theme,
    authorName: cleanAuthorName,
    activeSpaceId: currentSpace.id,
    activeSpaceTitle: currentSpace.name,
    activeSpaceCoverColor: resolveCoverHex(currentSpace.coverStyle, currentSpace.customColor),
    activeSpaceFoil: currentSpace.foilColor || 'gold',
    totalSpacesCount: nonArchivedSpaces.length,
    totalNotesCount: nonArchivedNotes.length,
    totalWordsCount,
    streakDays,
    weeklyWordsCount,
    weeklyHeatmap,
    bookshelves,
    latestNote,
    dailyWhisper,
    lastSyncedTimestamp: Date.now()
  };
}

/**
 * Transmits the latest snapshot into App Group UserDefaults via WidgetBridgePlugin.
 * Fails gracefully in web browser / mock environment.
 */
export async function syncWidgetSnapshot(snapshot: NoticedWidgetSnapshot): Promise<boolean> {
  try {
    const result = await WidgetBridge.updateSnapshot({ snapshot });
    return result?.success ?? true;
  } catch (err) {
    // Graceful fallback for web/dev environments where Capacitor bridge is not native
    console.debug('[WidgetBridge] Native bridge update skipped (not running in native iOS):', err);
    try {
      localStorage.setItem('noticed_widget_snapshot_preview', JSON.stringify(snapshot));
    } catch {
      // Ignore localStorage issues
    }
    return false;
  }
}

/**
 * Checks if a widget triggered a deep link or back-tap action.
 */
export async function getPendingWidgetAction(): Promise<{ action?: string; spaceId?: string }> {
  try {
    return await WidgetBridge.getPendingAction();
  } catch {
    return {};
  }
}

/**
 * Clears handled widget action.
 */
export async function clearPendingWidgetAction(): Promise<void> {
  try {
    await WidgetBridge.clearPendingAction();
  } catch {
    // Ignore
  }
}

/**
 * Saves a note's primary photo thumbnail into the shared App Group sandbox.
 */
export async function saveThumbnailForWidget(base64Data: string, fileName: string): Promise<string | null> {
  try {
    const res = await WidgetBridge.saveThumbnail({ base64Data, fileName });
    return res.filePath || null;
  } catch {
    return null;
  }
}
