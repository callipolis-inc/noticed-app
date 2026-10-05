import { supabase, isSupabaseConfigured, getCurrentUser } from "./supabase";
import { Space, FieldNote } from "@/types";
import { saveToAtelierDB, safeLocalStorageSet } from "./storage";
import {
  ensureRemoteMediaUrls,
  deleteMediaUrlsFromSupabase,
} from "./mediaStorage";

export interface SyncResult {
  spaces: Space[];
  notes: FieldNote[];
  userName?: string;
  avatarPhoto?: string | null;
  synced: boolean;
  timestamp?: string;
  error?: string;
}

interface PendingDeletes {
  noteIds: string[];
  spaceIds: string[];
  mediaUrls: string[];
}

const PENDING_DELETES_KEY = "sidenotes_pending_deletes";

export const LEGACY_DUMMY_SPACE_IDS = new Set(["space-1", "space-3"]);
export const LEGACY_DUMMY_NOTE_IDS = new Set([
  "note-af-1",
  "note-af-2",
  "note-af-3",
  "note-fn-1",
  "note-fn-2",
  "note-cs-1",
  "note-cs-2",
]);
const LEGACY_DUMMY_NOTE_PREFIXES = ["note-af-", "note-fn-", "note-cs-"];

export function isLegacyDummyNoteId(id: string): boolean {
  return (
    LEGACY_DUMMY_NOTE_IDS.has(id) ||
    LEGACY_DUMMY_NOTE_PREFIXES.some((prefix) => id.startsWith(prefix))
  );
}

function getPendingDeletes(): PendingDeletes {
  try {
    const raw = localStorage.getItem(PENDING_DELETES_KEY);
    if (!raw) return { noteIds: [], spaceIds: [], mediaUrls: [] };
    const parsed = JSON.parse(raw);
    return {
      noteIds: Array.isArray(parsed.noteIds) ? parsed.noteIds : [],
      spaceIds: Array.isArray(parsed.spaceIds) ? parsed.spaceIds : [],
      mediaUrls: Array.isArray(parsed.mediaUrls) ? parsed.mediaUrls : [],
    };
  } catch {
    return { noteIds: [], spaceIds: [], mediaUrls: [] };
  }
}

function savePendingDeletes(pending: PendingDeletes) {
  safeLocalStorageSet(
    PENDING_DELETES_KEY,
    JSON.stringify({
      noteIds: Array.from(new Set(pending.noteIds)),
      spaceIds: Array.from(new Set(pending.spaceIds)),
      mediaUrls: Array.from(new Set(pending.mediaUrls)),
    }),
  );
}

function collectNoteMediaUrls(note: FieldNote): string[] {
  const urls: string[] = [];
  if (note.photos?.length) urls.push(...note.photos);
  if (note.videos?.length) urls.push(...note.videos);
  if (note.voiceMemo?.audioUrl) urls.push(note.voiceMemo.audioUrl);
  return urls.filter((u) => Boolean(u) && u.startsWith("http"));
}

/**
 * Queues a note deletion and immediately attempts to purge its media from
 * 'noticed-media' bucket and delete its row in Supabase PostgreSQL.
 * If offline, the deletion stays queued and flushes on next sync.
 */
export async function queueCloudDeleteNote(note: FieldNote): Promise<void> {
  const pending = getPendingDeletes();
  pending.noteIds.push(note.id);
  pending.mediaUrls.push(...collectNoteMediaUrls(note));
  savePendingDeletes(pending);

  await flushPendingDeletes();
}

/**
 * Queues a notebook (space) deletion along with all notes inside it,
 * purging all associated media files from 'noticed-media' bucket.
 */
export async function queueCloudDeleteSpace(
  spaceId: string,
  spaceNotes: FieldNote[],
): Promise<void> {
  const pending = getPendingDeletes();
  pending.spaceIds.push(spaceId);
  for (const note of spaceNotes) {
    pending.noteIds.push(note.id);
    pending.mediaUrls.push(...collectNoteMediaUrls(note));
  }
  savePendingDeletes(pending);

  await flushPendingDeletes();
}

/**
 * Flushes any queued note/space deletions and purges their storage files.
 */
export async function flushPendingDeletes(): Promise<void> {
  if (
    !isSupabaseConfigured ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  ) {
    return;
  }

  const pending = getPendingDeletes();
  if (
    pending.noteIds.length === 0 &&
    pending.spaceIds.length === 0 &&
    pending.mediaUrls.length === 0
  ) {
    return;
  }

  const user = await getCurrentUser();
  if (!user) return;

  try {
    // 1. Purge media files from 'noticed-media' bucket
    if (pending.mediaUrls.length > 0) {
      await deleteMediaUrlsFromSupabase(pending.mediaUrls);
    }

    // 2. Delete notes from PostgreSQL
    if (pending.noteIds.length > 0) {
      const { error: noteDelError } = await supabase
        .from("field_notes")
        .delete()
        .in("id", pending.noteIds);
      if (noteDelError) {
        console.warn("[SyncEngine] Pending note delete warning:", noteDelError);
        return;
      }
    }

    // 3. Delete spaces (and any remaining child notes) from PostgreSQL
    if (pending.spaceIds.length > 0) {
      await supabase
        .from("field_notes")
        .delete()
        .in("space_id", pending.spaceIds);

      const { error: spaceDelError } = await supabase
        .from("spaces")
        .delete()
        .in("id", pending.spaceIds);
      if (spaceDelError) {
        console.warn(
          "[SyncEngine] Pending space delete warning:",
          spaceDelError,
        );
        return;
      }
    }

    // Clear queue on success
    savePendingDeletes({ noteIds: [], spaceIds: [], mediaUrls: [] });
  } catch (err) {
    console.warn("[SyncEngine] Could not flush pending deletes yet:", err);
  }
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
  avatarPhoto?: string | null,
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
    // 0. Flush any pending offline deletions & purge their media files first
    await flushPendingDeletes();
    const remainingPending = getPendingDeletes();
    const pendingDeletedSpaceIds = new Set(remainingPending.spaceIds);
    const pendingDeletedNoteIds = new Set(remainingPending.noteIds);

    // 1. Two-Way Profile Sync (Pull remote profile first, then merge & upsert)
    const { data: remoteProfile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    let resolvedUserName = userName?.trim() || "Author";
    if (
      (resolvedUserName === "Author" || !resolvedUserName) &&
      remoteProfile?.display_name &&
      remoteProfile.display_name !== "Author"
    ) {
      resolvedUserName = remoteProfile.display_name;
    }

    let resolvedAvatarUrl = avatarPhoto ?? remoteProfile?.avatar_url ?? null;
    if (resolvedAvatarUrl && resolvedAvatarUrl.startsWith("data:")) {
      const uploaded = await ensureRemoteMediaUrls(
        [resolvedAvatarUrl],
        "avatars",
      );
      resolvedAvatarUrl = uploaded[0] || resolvedAvatarUrl;
    }

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: resolvedUserName,
        avatar_url: resolvedAvatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    // 2. Pull Existing Remote Spaces & Remote Notes
    const { data: existingRemoteSpaces, error: initialPullSpacesError } =
      await supabase.from("spaces").select("*");
    if (initialPullSpacesError) throw initialPullSpacesError;

    const { data: existingRemoteNotes, error: initialPullNotesError } =
      await supabase
        .from("field_notes")
        .select("*")
        .order("created_at", { ascending: false });
    if (initialPullNotesError) throw initialPullNotesError;

    // 2.5 Automatically purge any legacy dummy notes/spaces found in Supabase
    const remoteDummyNoteIds = (existingRemoteNotes || [])
      .filter((r: any) => isLegacyDummyNoteId(r.id))
      .map((r: any) => r.id);

    if (remoteDummyNoteIds.length > 0) {
      await supabase.from("field_notes").delete().in("id", remoteDummyNoteIds);
    }

    const realRemoteNotes = (existingRemoteNotes || []).filter(
      (r: any) => !isLegacyDummyNoteId(r.id),
    );
    const realLocalNotes = localNotes.filter(
      (n) => !isLegacyDummyNoteId(n.id) && !pendingDeletedNoteIds.has(n.id),
    );

    // A legacy dummy space ('space-1' Animal Farm or 'space-3' Cozy Stash) is purged
    // unless the user wrote real custom notes inside it.
    const spaceIdsWithRealNotes = new Set<string>([
      ...realRemoteNotes.map((r: any) => r.space_id),
      ...realLocalNotes.map((n) => n.spaceId),
    ]);

    const remoteDummySpaceIds = (existingRemoteSpaces || [])
      .filter(
        (r: any) =>
          LEGACY_DUMMY_SPACE_IDS.has(r.id) && !spaceIdsWithRealNotes.has(r.id),
      )
      .map((r: any) => r.id);

    if (remoteDummySpaceIds.length > 0) {
      await supabase.from("spaces").delete().in("id", remoteDummySpaceIds);
    }

    const cleanRemoteSpaces = (existingRemoteSpaces || []).filter(
      (r: any) =>
        !LEGACY_DUMMY_SPACE_IDS.has(r.id) || spaceIdsWithRealNotes.has(r.id),
    );

    const remoteSpaceIds = new Set(cleanRemoteSpaces.map((r: any) => r.id));
    const remoteNoteIds = new Set(realRemoteNotes.map((r: any) => r.id));

    const cloudAlreadyHasData =
      remoteSpaceIds.size > 0 || remoteNoteIds.size > 0;

    // Filter local spaces & notes
    const activeLocalSpaces = localSpaces.filter((s) => {
      if (pendingDeletedSpaceIds.has(s.id)) return false;
      if (
        LEGACY_DUMMY_SPACE_IDS.has(s.id) &&
        !spaceIdsWithRealNotes.has(s.id)
      ) {
        return false;
      }
      if (
        cloudAlreadyHasData &&
        s.id === "space-2" &&
        !remoteSpaceIds.has("space-2") &&
        !spaceIdsWithRealNotes.has("space-2")
      ) {
        return false;
      }
      return true;
    });

    const activeLocalSpaceIds = new Set(activeLocalSpaces.map((s) => s.id));
    for (const rId of remoteSpaceIds) {
      activeLocalSpaceIds.add(rId);
    }

    const activeLocalNotes = realLocalNotes.filter((n) => {
      if (pendingDeletedSpaceIds.has(n.spaceId)) {
        return false;
      }
      if (!activeLocalSpaceIds.has(n.spaceId)) {
        return false;
      }
      return true;
    });

    // 3. Push Local Spaces (Upsert)
    if (activeLocalSpaces.length > 0) {
      const dbSpaces = activeLocalSpaces.map((s) => spaceToDb(s, user.id));
      const { error: pushSpaceError } = await supabase
        .from("spaces")
        .upsert(dbSpaces, { onConflict: "id" });
      if (pushSpaceError) {
        console.warn("[SyncEngine] Failed to push spaces:", pushSpaceError);
      }
    }

    // 4. Push Local Notes (Offload any pending offline base64 photos, videos, and audio to 'noticed-media' bucket first)
    const hydratedLocalNotes: FieldNote[] = [];
    for (const note of activeLocalNotes) {
      const remotePhotos = note.photos?.length
        ? await ensureRemoteMediaUrls(note.photos, "photos")
        : [];
      const remoteVideos = note.videos?.length
        ? await ensureRemoteMediaUrls(note.videos, "videos")
        : [];

      let remoteVoiceMemo = note.voiceMemo;
      if (
        note.voiceMemo?.audioUrl &&
        note.voiceMemo.audioUrl.startsWith("data:")
      ) {
        const uploadedAudio = await ensureRemoteMediaUrls(
          [note.voiceMemo.audioUrl],
          "audio",
        );
        if (uploadedAudio[0]) {
          remoteVoiceMemo = {
            ...note.voiceMemo,
            audioUrl: uploadedAudio[0],
          };
        }
      }

      hydratedLocalNotes.push({
        ...note,
        photos: remotePhotos,
        videos: remoteVideos,
        voiceMemo: remoteVoiceMemo,
      });
    }

    if (hydratedLocalNotes.length > 0) {
      const dbNotes = hydratedLocalNotes.map((n) => noteToDb(n, user.id));
      const { error: pushNoteError } = await supabase
        .from("field_notes")
        .upsert(dbNotes, { onConflict: "id" });
      if (pushNoteError) {
        console.warn("[SyncEngine] Failed to push notes:", pushNoteError);
      }
    }

    // 5. Pull Final Remote Spaces & Notes after Upsert
    const { data: remoteSpacesData, error: pullSpacesError } = await supabase
      .from("spaces")
      .select("*");
    if (pullSpacesError) throw pullSpacesError;

    const { data: remoteNotesData, error: pullNotesError } = await supabase
      .from("field_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (pullNotesError) throw pullNotesError;

    // 6. Merge Spaces (Local changes take precedence for local edits, plus any cloud-only spaces)
    const spacesMap = new Map<string, Space>();
    if (remoteSpacesData) {
      remoteSpacesData.forEach((row) => {
        if (
          !pendingDeletedSpaceIds.has(row.id) &&
          (!LEGACY_DUMMY_SPACE_IDS.has(row.id) ||
            spaceIdsWithRealNotes.has(row.id))
        ) {
          const remoteSpace = dbToSpace(row);
          spacesMap.set(remoteSpace.id, remoteSpace);
        }
      });
    }
    activeLocalSpaces.forEach((s) => spacesMap.set(s.id, s));
    const mergedSpaces = Array.from(spacesMap.values());

    // 7. Merge Notes (Local hydrated notes + cloud notes, excluding deleted & legacy dummy)
    const notesMap = new Map<string, FieldNote>();
    if (remoteNotesData) {
      remoteNotesData.forEach((row) => {
        if (
          !pendingDeletedNoteIds.has(row.id) &&
          !pendingDeletedSpaceIds.has(row.space_id) &&
          !isLegacyDummyNoteId(row.id)
        ) {
          const remoteNote = dbToNote(row);
          notesMap.set(remoteNote.id, remoteNote);
        }
      });
    }
    hydratedLocalNotes.forEach((n) => notesMap.set(n.id, n));
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
      userName: resolvedUserName,
      avatarPhoto: resolvedAvatarUrl,
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


