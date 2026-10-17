import { useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { FieldNote } from "@/types";
import { dbToNote } from "@/lib/syncEngine";

interface UseSpaceRealtimeOptions {
  spaceId: string | null;
  isShared: boolean;
  currentUserId: string | null;
  currentUserName: string;
  onRemoteNoteSaved: (
    note: FieldNote,
    isNew: boolean,
    authorName: string,
  ) => void;
  onRemoteNoteDeleted: (noteId: string, authorName?: string) => void;
}

export function useSpaceRealtime({
  spaceId,
  isShared,
  currentUserId,
  currentUserName,
  onRemoteNoteSaved,
  onRemoteNoteDeleted,
}: UseSpaceRealtimeOptions) {
  const channelRef = useRef<any>(null);

  // Keep latest callbacks in refs to avoid recreating the channel subscription on every render
  const onSavedRef = useRef(onRemoteNoteSaved);
  onSavedRef.current = onRemoteNoteSaved;

  const onDeletedRef = useRef(onRemoteNoteDeleted);
  onDeletedRef.current = onRemoteNoteDeleted;

  useEffect(() => {
    if (!spaceId || !isShared || !isSupabaseConfigured) {
      return;
    }

    const channelName = `space:${spaceId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // 1. Fast-Path: Broadcast Listeners (sub-100ms real-time peer messaging)
    channel
      .on("broadcast", { event: "note_saved" }, (payload: any) => {
        const note: FieldNote = payload?.payload?.note;
        if (!note || !note.id) return;

        // Ignore events authored by the local user to avoid duplicate notifications
        if (note.author?.userId && currentUserId && note.author.userId === currentUserId) {
          return;
        }

        const isNew = Boolean(payload?.payload?.isNew);
        const authorName =
          note.author?.name || payload?.payload?.authorName || "Partner";

        onSavedRef.current(note, isNew, authorName);
      })
      .on("broadcast", { event: "note_deleted" }, (payload: any) => {
        const noteId = payload?.payload?.noteId;
        if (!noteId) return;

        if (payload?.payload?.userId && currentUserId && payload.payload.userId === currentUserId) {
          return;
        }

        const authorName = payload?.payload?.authorName || "Partner";
        onDeletedRef.current(noteId, authorName);
      });

    // 2. Authoritative Fallback: Supabase Postgres Changes (DB level replication)
    channel.on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: "field_notes",
        filter: `space_id=eq.${spaceId}`,
      },
      (payload: any) => {
        try {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId) {
              onDeletedRef.current(deletedId);
            }
            return;
          }

          if (payload.new && payload.new.id) {
            // Ignore if authored by current user (already saved locally)
            if (
              payload.new.user_id &&
              currentUserId &&
              payload.new.user_id === currentUserId
            ) {
              return;
            }

            const note = dbToNote(payload.new);
            const isNew = payload.eventType === "INSERT";
            const authorName = note.author?.name || "Partner";
            onSavedRef.current(note, isNew, authorName);
          }
        } catch (err) {
          console.warn("[RealtimeCollab] Failed to parse postgres change:", err);
        }
      },
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(`[RealtimeCollab] Channel error on ${channelName}`);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [spaceId, isShared, currentUserId]);

  // Outgoing broadcast helper for local saves/edits
  const broadcastNoteSaved = useCallback(
    (note: FieldNote, isNew: boolean = false) => {
      if (!channelRef.current || !isShared) return;
      try {
        channelRef.current.send({
          type: "broadcast",
          event: "note_saved",
          payload: {
            note,
            isNew,
            authorName: currentUserName,
            userId: currentUserId,
          },
        });
      } catch (err) {
        console.warn("[RealtimeCollab] Failed to send broadcast save:", err);
      }
    },
    [isShared, currentUserName, currentUserId],
  );

  // Outgoing broadcast helper for local deletes
  const broadcastNoteDeleted = useCallback(
    (noteId: string) => {
      if (!channelRef.current || !isShared) return;
      try {
        channelRef.current.send({
          type: "broadcast",
          event: "note_deleted",
          payload: {
            noteId,
            authorName: currentUserName,
            userId: currentUserId,
          },
        });
      } catch (err) {
        console.warn("[RealtimeCollab] Failed to send broadcast delete:", err);
      }
    },
    [isShared, currentUserName, currentUserId],
  );

  return {
    broadcastNoteSaved,
    broadcastNoteDeleted,
  };
}
