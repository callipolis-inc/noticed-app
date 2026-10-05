import { supabase, getCurrentUser } from "./supabase";
import { Space, FieldNote } from "@/types";
import { saveToAtelierDB, safeLocalStorageSet } from "./storage";

export interface SyncResult {
  spaces: Space[];
  notes: FieldNote[];
  synced: boolean;
  timestamp?: string;
  error?: string;
}

// ============================================================================
// CONVERTERS: Typescript CamelCase <-> PostgreSQL Snake_Case
// ============================================================================

function spaceToDb(space: Space, userId: string) {
  return {
    id: space.id,
    user_id: userId,
    name: space.name,
    type: space.type || "personal",
    description: space.description || null,
    icon_name: space.iconName || "book-open",
    cover_style: space.coverStyle || "klein",
    custom_color: space.customColor || null,
    font_choice: space.fontChoice || "editorial",
    is_shared: Boolean(space.isShared),
    invite_code: space.inviteCode || null,
    partner_name: space.partnerName || null,
    members_count: space.membersCount || 1,
    created_at: space.createdAt || new Date().toISOString(),
  };
}

function dbToSpace(row: any): Space {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description || undefined,
    iconName: row.icon_name || "book-open",
    coverStyle: row.cover_style || "klein",
    customColor: row.custom_color || undefined,
    fontChoice: row.font_choice || "editorial",
    isShared: Boolean(row.is_shared),
    inviteCode: row.invite_code || undefined,
    partnerName: row.partner_name || undefined,
    membersCount: row.members_count || 1,
    createdAt: row.created_at,
  };
}

function noteToDb(note: FieldNote, userId: string) {
  return {
    id: note.id,
    space_id: note.spaceId,
    user_id: userId,
    title: note.title || null,
    content: note.content || "",
    text_align: note.textAlign || "left",
    location_name: note.locationName || null,
    photos: note.photos || [],
    videos: note.videos || [],
    voice_memo: note.voiceMemo || null,
    tags: note.tags || [],
    pinned: Boolean(note.pinned),
    photostrip_layout: note.photostripLayout || "strip",
    marginalia: note.marginalia || null,
    quote_source: note.quoteSource || null,
    marginalia_items: note.marginaliaItems || [],
    highlights: note.highlights || [],
    author: note.author || null,
    created_at: note.createdAt || new Date().toISOString(),
  };
}

function dbToNote(row: any): FieldNote {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title || undefined,
    content: row.content || "",
    textAlign: row.text_align || "left",
    locationName: row.location_name || undefined,
    photos: Array.isArray(row.photos) ? row.photos : [],
    videos: Array.isArray(row.videos) ? row.videos : [],
    voiceMemo: row.voice_memo || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    pinned: Boolean(row.pinned),
    photostripLayout: row.photostrip_layout || "strip",
    marginalia: row.marginalia || undefined,
    quoteSource: row.quote_source || undefined,
    marginaliaItems: Array.isArray(row.marginalia_items)
      ? row.marginalia_items
      : [],
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    author: row.author || undefined,
    createdAt: row.created_at,
  };
}

// ============================================================================
// SEAMLESS TWO-WAY MERGE ENGINE
// ============================================================================

export async function syncWithCloud(
  localSpaces: Space[],
  localNotes: FieldNote[],
  userName?: string,
  avatarPhoto?: string | null
): Promise<SyncResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      spaces: localSpaces,
      notes: localNotes,
      synced: false,
      error: "User is not signed in",
    };
  }

  try {
    // 1. Sync User Profile
    if (userName || avatarPhoto) {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          display_name: userName || "Author",
          avatar_url: avatarPhoto || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    // 2. Push Local Spaces (Upsert)
    if (localSpaces.length > 0) {
      const dbSpaces = localSpaces.map((s) => spaceToDb(s, user.id));
      const { error: pushSpaceError } = await supabase
        .from("spaces")
        .upsert(dbSpaces, { onConflict: "id" });
      if (pushSpaceError) {
        console.warn("[SyncEngine] Failed to push spaces:", pushSpaceError);
      }
    }

    // 3. Push Local Notes (Upsert)
    if (localNotes.length > 0) {
      const dbNotes = localNotes.map((n) => noteToDb(n, user.id));
      const { error: pushNoteError } = await supabase
        .from("field_notes")
        .upsert(dbNotes, { onConflict: "id" });
      if (pushNoteError) {
        console.warn("[SyncEngine] Failed to push notes:", pushNoteError);
      }
    }

    // 4. Pull Remote Spaces
    const { data: remoteSpacesData, error: pullSpacesError } = await supabase
      .from("spaces")
      .select("*");
    if (pullSpacesError) throw pullSpacesError;

    // 5. Pull Remote Notes
    const { data: remoteNotesData, error: pullNotesError } = await supabase
      .from("field_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (pullNotesError) throw pullNotesError;

    // 6. Merge Spaces (Deduplicate by ID, prefer cloud or newer)
    const spacesMap = new Map<string, Space>();
    // First fill local
    localSpaces.forEach((s) => spacesMap.set(s.id, s));
    // Overlay remote
    if (remoteSpacesData) {
      remoteSpacesData.forEach((row) => {
        const remoteSpace = dbToSpace(row);
        spacesMap.set(remoteSpace.id, remoteSpace);
      });
    }
    const mergedSpaces = Array.from(spacesMap.values());

    // 7. Merge Notes (Deduplicate by ID, prefer cloud or newer)
    const notesMap = new Map<string, FieldNote>();
    localNotes.forEach((n) => notesMap.set(n.id, n));
    if (remoteNotesData) {
      remoteNotesData.forEach((row) => {
        const remoteNote = dbToNote(row);
        notesMap.set(remoteNote.id, remoteNote);
      });
    }
    const mergedNotes = Array.from(notesMap.values());

    // 8. Persist Merged Dataset into Offline Storage (IndexedDB + localStorage safe mirror)
    await saveToAtelierDB("sidenotes_spaces", mergedSpaces);
    await saveToAtelierDB("sidenotes_notes", mergedNotes);
    safeLocalStorageSet("sidenotes_spaces", JSON.stringify(mergedSpaces));
    safeLocalStorageSet("sidenotes_notes", JSON.stringify(mergedNotes));

    const syncTimestamp = new Date().toISOString();
    localStorage.setItem("sidenotes_last_synced_at", syncTimestamp);

    return {
      spaces: mergedSpaces,
      notes: mergedNotes,
      synced: true,
      timestamp: syncTimestamp,
    };
  } catch (err: any) {
    console.error("[SyncEngine] Sync error:", err);
    return {
      spaces: localSpaces,
      notes: localNotes,
      synced: false,
      error: err?.message || "Sync failed",
    };
  }
}
