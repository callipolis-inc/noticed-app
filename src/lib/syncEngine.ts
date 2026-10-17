import { supabase, isSupabaseConfigured, getCurrentUser } from "./supabase";
import { Space, FieldNote } from "@/types";
import { isProUser, setProUser } from "./proManager";
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

// Default starter notebook for a fresh installation or factory reset
export const DEFAULT_STARTER_SPACE: Space = {
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

export function collectNoteMediaUrls(note?: FieldNote | null): string[] {
  if (!note) return [];
  const urls: string[] = [];
  if (note.photos?.length) urls.push(...note.photos);
  if (note.videos?.length) urls.push(...note.videos);
  if (note.voiceMemo?.audioUrl) urls.push(note.voiceMemo.audioUrl);
  return urls.filter((u) => Boolean(u) && u.startsWith("http"));
}

export async function queueCloudDeleteMediaUrls(urls: string[]): Promise<void> {
  const validUrls = urls.filter((u) => Boolean(u) && u.startsWith("http"));
  if (validUrls.length === 0) return;
  const pending = getPendingDeletes();
  pending.mediaUrls.push(...validUrls);
  savePendingDeletes(pending);
  await flushPendingDeletes();
}

/**
 * Checks whether content between a local and remote note has diverged.
 * Used for Safe Forking when remote is newer than local.
 */
export function isNoteContentDiverged(local: FieldNote, remote: FieldNote): boolean {
  if ((local.title || "") !== (remote.title || "")) return true;
  if ((local.content || "").trim() !== (remote.content || "").trim()) return true;
  if (Boolean(local.pinned) !== Boolean(remote.pinned)) return true;
  if (Boolean(local.archived) !== Boolean(remote.archived)) return true;
  if ((local.marginalia || "") !== (remote.marginalia || "")) return true;
  if ((local.quoteSource || "") !== (remote.quoteSource || "")) return true;
  if ((local.textAlign || "left") !== (remote.textAlign || "left")) return true;
  if ((local.photostripLayout || "strip") !== (remote.photostripLayout || "strip")) return true;
  if ((local.imagePosition || "bottom") !== (remote.imagePosition || "bottom")) return true;
  if (JSON.stringify(local.photosMeta || []) !== JSON.stringify(remote.photosMeta || [])) return true;

  const localPhotos = local.photos || [];
  const remotePhotos = remote.photos || [];
  if (localPhotos.length !== remotePhotos.length) return true;

  const localVideos = local.videos || [];
  const remoteVideos = remote.videos || [];
  if (localVideos.length !== remoteVideos.length) return true;

  if (Boolean(local.voiceMemo?.audioUrl) !== Boolean(remote.voiceMemo?.audioUrl)) return true;

  return false;
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

function parseMemberRole(row: any): "editor" | "viewer" {
  if (row.member_role === "viewer" || row.member_role === "editor") {
    return row.member_role;
  }
  if (
    typeof row.partner_name === "string" &&
    row.partner_name.startsWith("role:")
  ) {
    const r = row.partner_name.replace("role:", "").trim();
    if (r === "viewer" || r === "editor") return r;
  }
  return "editor";
}

export function spaceToDb(space: Space, userId: string) {
  const resolvedRole = space.memberRole || "editor";
  const partnerNameWithRole =
    space.partnerName || `role:${resolvedRole}`;

  return {
    id: space.id,
    user_id: userId,
    name: space.name,
    type: space.type || "personal",
    description: space.description || null,
    icon_name: space.iconName || "book-open",
    cover_style: space.coverStyle || "klein",
    custom_color: space.customColor || null,
    foil_color: space.foilColor || null,
    font_choice: space.fontChoice || "editorial",
    is_shared: Boolean(space.isShared),
    invite_code: space.inviteCode || null,
    partner_name: partnerNameWithRole,
    members_count: space.membersCount || 1,
    default_role: space.defaultRole || "editor",
    archived: Boolean(space.archived),
    created_at: space.createdAt || new Date().toISOString(),
    updated_at: space.updatedAt || space.createdAt || new Date().toISOString(),
  };
}

export function dbToSpace(
  row: any,
  currentUserId?: string | null,
  membershipRole?: "owner" | "editor" | "viewer",
): Space {
  const isOwner = Boolean(currentUserId && row.user_id === currentUserId);
  const resolvedRole: "owner" | "editor" | "viewer" = isOwner
    ? "owner"
    : membershipRole || parseMemberRole(row);

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description || undefined,
    iconName: row.icon_name || "book-open",
    coverStyle: row.cover_style || "klein",
    customColor: row.custom_color || undefined,
    foilColor: row.foil_color || undefined,
    fontChoice: row.font_choice || "editorial",
    isShared: Boolean(row.is_shared),
    inviteCode: row.invite_code || undefined,
    partnerName: row.partner_name || undefined,
    membersCount: row.members_count || 1,
    defaultRole: row.default_role === "viewer" ? "viewer" : "editor",
    archived: Boolean(row.archived),
    userId: row.user_id || undefined,
    memberRole: resolvedRole,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export function noteToDb(note: FieldNote, userId: string) {
  return {
    id: note.id,
    space_id: note.spaceId,
    user_id: userId,
    title: note.title || null,
    content: note.content || "",
    text_align: note.textAlign || "left",
    location_name: note.locationName || null,
    photos: note.photos || [],
    photos_meta: note.photosMeta || [],
    videos: note.videos || [],
    voice_memo: note.voiceMemo || null,
    tags: note.tags || [],
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
    image_position: note.imagePosition || "bottom",
    photostrip_layout: note.photostripLayout || "strip",
    marginalia: note.marginalia || null,
    quote_source: note.quoteSource || null,
    marginalia_items: note.marginaliaItems || [],
    highlights: note.highlights || [],
    author: note.author || null,
    created_at: note.createdAt || new Date().toISOString(),
    updated_at: note.updatedAt || note.createdAt || new Date().toISOString(),
  };
}

export function dbToNote(row: any): FieldNote {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title || undefined,
    content: row.content || "",
    textAlign: row.text_align || "left",
    locationName: row.location_name || undefined,
    photos: Array.isArray(row.photos) ? row.photos : [],
    photosMeta: Array.isArray(row.photos_meta) ? row.photos_meta : [],
    videos: Array.isArray(row.videos) ? row.videos : [],
    voiceMemo: row.voice_memo || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived),
    imagePosition: row.image_position || "bottom",
    photostripLayout: row.photostrip_layout || "strip",
    marginalia: row.marginalia || undefined,
    quoteSource: row.quote_source || undefined,
    marginaliaItems: Array.isArray(row.marginalia_items)
      ? row.marginalia_items
      : [],
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    author: row.author || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
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

    // Retrieve last successful sync timestamp for 3-way merge and tombstone detection
    const lastSyncedAt =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("sidenotes_last_synced_at")
        : null;
    const lastSyncTime = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;

    // 1. Two-Way Profile Sync (Pull remote profile first, then merge & upsert)
    const { data: remoteProfile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, is_pro")
      .eq("id", user.id)
      .maybeSingle();

    const localIsPro = isProUser();
    const finalIsPro = Boolean(remoteProfile?.is_pro || localIsPro);
    if (finalIsPro) {
      setProUser(true);
    }

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
        is_pro: finalIsPro,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    // 2. Pull Existing Remote Spaces, Memberships & Remote Notes
    const { data: existingRemoteSpaces, error: initialPullSpacesError } =
      await supabase.from("spaces").select("*");
    if (initialPullSpacesError) throw initialPullSpacesError;

    const { data: userMemberships } = await supabase
      .from("space_members")
      .select("space_id, role")
      .eq("user_id", user.id);

    const membershipRoleMap = new Map<string, "owner" | "editor" | "viewer">();
    (userMemberships || []).forEach((m: any) => {
      membershipRoleMap.set(m.space_id, m.role);
    });

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
      // Only discard default starter space "space-2" if it was NEVER customized and has no notes
      const isUntouchedStarter =
        s.id === "space-2" &&
        s.name === "Field Notes" &&
        !s.customColor &&
        !s.foilColor;
      if (
        cloudAlreadyHasData &&
        isUntouchedStarter &&
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

    // 3. Push Local Spaces (Upsert newer local spaces, protect remote edits)
    const remoteSpacesLookup = new Map<string, any>(
      cleanRemoteSpaces.map((r: any) => [r.id, r]),
    );
    const spacesToPush: Space[] = [];
    activeLocalSpaces.forEach((s) => {
      // Guard: Do not push spaces that belong to another user. Collaborators
      // should never overwrite owner's space metadata or trigger RLS 403 Forbidden.
      if (s.userId && s.userId !== user.id) {
        return;
      }
      const remote = remoteSpacesLookup.get(s.id);
      if (!remote) {
        const localSpaceTime = new Date(
          s.updatedAt || s.createdAt || 0,
        ).getTime();
        // Ghost resurrection check:
        // If space was already synced in a prior session, but no longer exists on remote,
        // it was deleted on the cloud. Do NOT push back to cloud.
        if (lastSyncTime > 0 && localSpaceTime <= lastSyncTime) {
          return;
        }
        spacesToPush.push(s);
      } else {
        const localTime = new Date(s.updatedAt || s.createdAt || 0).getTime();
        const remoteTime = new Date(
          remote.updated_at || remote.created_at || 0,
        ).getTime();
        if (localTime >= remoteTime) {
          spacesToPush.push(s);
        }
      }
    });

    if (spacesToPush.length > 0) {
      const dbSpaces = spacesToPush.map((s) => spaceToDb(s, user.id));
      const { error: pushSpaceError } = await supabase
        .from("spaces")
        .upsert(dbSpaces, { onConflict: "id" });
      if (pushSpaceError) {
        console.warn("[SyncEngine] Failed to push spaces:", pushSpaceError);
      }
    }

    // 4. Hydrate Local Media (Offload base64 to 'noticed-media' bucket)
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
        (note.voiceMemo.audioUrl.startsWith("data:") ||
          note.voiceMemo.audioUrl.startsWith("blob:"))
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

    // 5. Hybrid Last-Write-Wins (LWW) with Safe Forking
    const remoteNotesMap = new Map<string, FieldNote>();
    realRemoteNotes.forEach((row: any) => {
      if (
        !pendingDeletedNoteIds.has(row.id) &&
        !pendingDeletedSpaceIds.has(row.space_id)
      ) {
        remoteNotesMap.set(row.id, dbToNote(row));
      }
    });

    const notesToPush: FieldNote[] = [];
    const finalNotesMap = new Map<string, FieldNote>();

    for (const localNote of hydratedLocalNotes) {
      const remoteNote = remoteNotesMap.get(localNote.id);

      if (!remoteNote) {
        const localNoteTime = new Date(
          localNote.updatedAt || localNote.createdAt || 0,
        ).getTime();

        // Ghost resurrection check:
        // If note was already synced in a prior session (updatedAt <= lastSyncTime),
        // but no longer exists on remote, it was deleted on the cloud or by a collaborator.
        if (lastSyncTime > 0 && localNoteTime <= lastSyncTime) {
          // Prune locally: do not push to cloud and do not include in finalNotesMap
          continue;
        }

        // New note created locally or edited offline after last sync -> push to cloud
        notesToPush.push(localNote);
        finalNotesMap.set(localNote.id, localNote);
      } else {
        const localTime = new Date(
          localNote.updatedAt || localNote.createdAt || 0,
        ).getTime();
        const remoteTime = new Date(
          remoteNote.updatedAt || remoteNote.createdAt || 0,
        ).getTime();

        if (localTime >= remoteTime) {
          // Local is newer -> push to cloud (Local LWW wins)
          notesToPush.push(localNote);
          finalNotesMap.set(localNote.id, localNote);
        } else {
          // Remote is strictly newer.
          // True 3-Way Merge: Only create conflict copy if BOTH sides modified since last sync.
          const isLocallyModified =
            lastSyncTime > 0 && localTime > lastSyncTime;

          if (
            isLocallyModified &&
            isNoteContentDiverged(localNote, remoteNote)
          ) {
            // Safe Forking: fork local changes to prevent data loss
            const conflictCopy: FieldNote = {
              ...localNote,
              id: `${localNote.id}-conflict-${Date.now()}`,
              title: localNote.title
                ? `${localNote.title} (Conflict Copy)`
                : "Untitled Note (Conflict Copy)",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            notesToPush.push(conflictCopy);
            finalNotesMap.set(conflictCopy.id, conflictCopy);
            // Canonical ID takes remote note
            finalNotesMap.set(remoteNote.id, remoteNote);
          } else {
            // Clean LWW Fast-Forward: Local note was an older unmodified cache; remote wins cleanly
            finalNotesMap.set(remoteNote.id, remoteNote);
          }
        }
      }
    }

    // Add any remaining remote notes created on another device
    remoteNotesMap.forEach((remoteNote, id) => {
      if (!finalNotesMap.has(id)) {
        finalNotesMap.set(id, remoteNote);
      }
    });

    if (notesToPush.length > 0) {
      const dbNotes = notesToPush.map((n) => noteToDb(n, user.id));
      const { error: pushNoteError } = await supabase
        .from("field_notes")
        .upsert(dbNotes, { onConflict: "id" });
      if (pushNoteError) {
        console.warn("[SyncEngine] Failed to push notes:", pushNoteError);
      }
    }

    // 6. Merge Spaces (Preserve local shelf ordering, apply newer cloud space edits)
    const cleanRemoteSpacesMap = new Map<string, Space>();
    cleanRemoteSpaces.forEach((row: any) => {
      cleanRemoteSpacesMap.set(
        row.id,
        dbToSpace(row, user.id, membershipRoleMap.get(row.id)),
      );
    });

    const mergedSpaces: Space[] = [];
    const addedSpaceIds = new Set<string>();

    activeLocalSpaces.forEach((localSpace) => {
      const remote = cleanRemoteSpacesMap.get(localSpace.id);
      if (remote) {
        const localTime = new Date(
          localSpace.updatedAt || localSpace.createdAt || 0,
        ).getTime();
        const remoteTime = new Date(
          remote.updatedAt || remote.createdAt || 0,
        ).getTime();
        mergedSpaces.push(remoteTime > localTime ? remote : localSpace);
        addedSpaceIds.add(localSpace.id);
      } else {
        // Space not present on remote.
        // If it was a shared space owned by someone else, membership was revoked or space was deleted:
        if (localSpace.userId && localSpace.userId !== user.id) {
          return; // Prune zombie shared space
        }
        // If owned by current user, check if it was deleted on cloud:
        const localSpaceTime = new Date(
          localSpace.updatedAt || localSpace.createdAt || 0,
        ).getTime();
        if (lastSyncTime > 0 && localSpaceTime <= lastSyncTime) {
          return; // Prune locally deleted space
        }
        mergedSpaces.push(localSpace);
        addedSpaceIds.add(localSpace.id);
      }
    });

    cleanRemoteSpacesMap.forEach((remoteSpace, id) => {
      if (!addedSpaceIds.has(id)) {
        // Merge remote space if user owns it or has an active membership in it.
        // Zero-leak RLS already prevents foreign unauthorized spaces from being queried.
        if (
          !remoteSpace.userId ||
          remoteSpace.userId === user.id ||
          membershipRoleMap.has(id)
        ) {
          mergedSpaces.push(remoteSpace);
          addedSpaceIds.add(id);
        }
      }
    });

    if (mergedSpaces.length === 0) {
      mergedSpaces.push(DEFAULT_STARTER_SPACE);
    }

    const mergedNotes = Array.from(finalNotesMap.values());

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


