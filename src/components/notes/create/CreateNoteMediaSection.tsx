import { PhotoMeta } from "@/types";
import { RecordedAudio } from "@/lib/audioRecorder";
import { triggerHaptic } from "@/lib/haptics";
import { InlineVideoPlayer } from "../InlineVideoPlayer";
import { TactileAudioPlayer } from "../TactileAudioPlayer";
import { Sliders, Plus, X, Trash2 } from "lucide-react";

interface CreateNoteMediaSectionProps {
  photos: string[];
  photosMeta: PhotoMeta[];
  onTriggerAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onOpenDarkroom: (index: number) => void;
  videos: string[];
  onRemoveVideo: (index: number) => void;
  isPhotoProcessing?: boolean;
  isVideoProcessing: boolean;
  mediaProgressMessage?: string | null;
  videoError: string | null;
  audioError: string | null;
  recordedAudio: RecordedAudio | null;
  onRemoveAudio: () => void;
}

export function CreateNoteMediaSection({
  photos,
  photosMeta,
  onTriggerAddPhoto,
  onRemovePhoto,
  onOpenDarkroom,
  videos,
  onRemoveVideo,
  isPhotoProcessing = false,
  isVideoProcessing,
  mediaProgressMessage = null,
  videoError,
  audioError,
  recordedAudio,
  onRemoveAudio,
}: CreateNoteMediaSectionProps) {
  return (
    <>
      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="mt-2 space-y-3">
          {photos.length === 1 && (
            <div className="relative rounded-2xl overflow-hidden shadow-sm border border-[var(--glass-border)] aspect-[4/3] group">
              <img
                src={photos[0]}
                alt="Captured moment"
                className={`w-full h-full object-cover transition-all duration-300 ${
                  photosMeta[0]?.filter
                    ? `film-filter-${photosMeta[0].filter}`
                    : ""
                }`}
              />
              {photosMeta[0]?.hasGrain && (
                <div className="film-grain-overlay" />
              )}

              {/* Top Overlay Controls */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onOpenDarkroom(0);
                  }}
                  className={`px-2.5 py-1 rounded-full text-white text-[11px] font-sans font-medium flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs ${
                    photosMeta[0]?.filter &&
                    photosMeta[0].filter !== "natural"
                      ? "bg-stone-900 border border-white/30"
                      : "bg-black/65 hover:bg-black/85"
                  }`}
                  title="Analog Darkroom"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Darkroom</span>
                </button>
                <button
                  type="button"
                  onClick={onTriggerAddPhoto}
                  className="px-2.5 py-1 rounded-full bg-black/65 text-white text-[11px] font-sans font-medium flex items-center gap-1 hover:bg-black/85 active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs"
                  title="Add another photo"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemovePhoto(0)}
                  className="w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/85 active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inscription preview badge if present */}
              {photosMeta[0]?.caption?.trim() && (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-black/65 backdrop-blur-xs text-white font-typewriter text-[11px] truncate z-10">
                  {photosMeta[0].caption}
                </div>
              )}
            </div>
          )}

          {photos.length === 2 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                {photos.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl overflow-hidden shadow-sm border border-[var(--glass-border)] aspect-[3/4] group"
                  >
                    <img
                      src={p}
                      alt={`Photo ${idx + 1}`}
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        photosMeta[idx]?.filter
                          ? `film-filter-${photosMeta[idx].filter}`
                          : ""
                      }`}
                    />
                    {photosMeta[idx]?.hasGrain && (
                      <div className="film-grain-overlay" />
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          onOpenDarkroom(idx);
                        }}
                        className={`w-6 h-6 rounded-full text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs ${
                          photosMeta[idx]?.filter &&
                          photosMeta[idx].filter !== "natural"
                            ? "bg-stone-900 border border-white/30"
                            : "bg-black/65 hover:bg-black/85"
                        }`}
                        title="Darkroom"
                      >
                        <Sliders className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(idx)}
                        className="w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/85 active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {photosMeta[idx]?.caption?.trim() && (
                      <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg bg-black/65 backdrop-blur-xs text-white font-typewriter text-[10px] truncate z-10">
                        {photosMeta[idx].caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onTriggerAddPhoto}
                className="w-full py-2 rounded-xl inner-pseudo-glass border border-dashed border-[var(--glass-border)] flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photo</span>
              </button>
            </div>
          )}

          {photos.length >= 3 && (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
              {photos.map((p, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl overflow-hidden shadow-sm border border-[var(--glass-border)] w-36 aspect-[3/4] shrink-0 group"
                >
                  <img
                    src={p}
                    alt={`Filmstrip ${idx + 1}`}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      photosMeta[idx]?.filter
                        ? `film-filter-${photosMeta[idx].filter}`
                        : ""
                    }`}
                  />
                  {photosMeta[idx]?.hasGrain && (
                    <div className="film-grain-overlay" />
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        onOpenDarkroom(idx);
                      }}
                      className={`w-6 h-6 rounded-full text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs ${
                        photosMeta[idx]?.filter &&
                        photosMeta[idx].filter !== "natural"
                          ? "bg-stone-900 border border-white/30"
                          : "bg-black/60 hover:bg-black/80"
                      }`}
                      title="Darkroom"
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(idx)}
                      className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {photosMeta[idx]?.caption?.trim() && (
                    <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg bg-black/65 backdrop-blur-xs text-white font-typewriter text-[10px] truncate z-10">
                      {photosMeta[idx].caption}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={onTriggerAddPhoto}
                className="w-20 aspect-[3/4] rounded-2xl inner-pseudo-glass border-2 border-dashed border-[var(--glass-border)] flex flex-col items-center justify-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[10px] font-medium">Add</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Video Previews */}
      {videos.length > 0 && (
        <div className="mt-2 space-y-3">
          {videos.map((vid, idx) => (
            <div key={idx} className="relative group">
              <InlineVideoPlayer
                src={vid}
                className="w-full max-h-72"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveVideo(idx);
                }}
                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/85 active:scale-95 transition-all cursor-pointer shadow-sm backdrop-blur-xs z-30"
                title="Remove video"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Status & Progress Feedback */}
      {(isPhotoProcessing || isVideoProcessing) && (
        <div className="mt-2 p-2.5 rounded-xl inner-pseudo-glass text-xs text-[var(--text-secondary)] flex items-center justify-between gap-2 shadow-2xs border border-[var(--glass-border)] animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[var(--text-primary)] animate-ping shrink-0" />
            <span className="truncate">
              {mediaProgressMessage ||
                (isVideoProcessing
                  ? "Processing video clip..."
                  : "Processing photos...")}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider shrink-0">
            {isVideoProcessing ? "Video" : "Photo"}
          </span>
        </div>
      )}
      {videoError && (
        <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-sans">
          {videoError}
        </div>
      )}
      {audioError && (
        <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-sans">
          {audioError}
        </div>
      )}

      {/* Voice Memo Capsule */}
      {recordedAudio && (
        <div className="mt-2 p-2.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.035] shadow-2xs flex items-center justify-between gap-3">
          <div className="flex-1 overflow-hidden">
            <TactileAudioPlayer
              audioUrl={recordedAudio.url}
              durationSeconds={recordedAudio.durationSeconds}
              sourceId="create-note-audio-preview"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onRemoveAudio();
            }}
            className="p-2 text-[var(--text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer shrink-0"
            title="Delete voice memo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
