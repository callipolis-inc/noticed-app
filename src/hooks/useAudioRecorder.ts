import { useState, useRef, useEffect, useCallback } from "react";
import { TactileAudioRecorder, RecordedAudio } from "@/lib/audioRecorder";
import { triggerHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { MAX_AUDIO_DURATION_SECONDS, processAudioBlob } from "@/lib/mediaStorage";
import { isProUser, FREE_MAX_AUDIO_DURATION } from "@/lib/proManager";

interface UseAudioRecorderOptions {
  onAutoTranscribeStart?: () => void;
  onAutoTranscribeStop?: () => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const { onAutoTranscribeStart, onAutoTranscribeStop } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(() => Array(14).fill(15));
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRecorderRef = useRef<TactileAudioRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  const cancelRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
      audioRecorderRef.current = null;
    }
    onAutoTranscribeStop?.();
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioLevels(Array(14).fill(15));
  }, [onAutoTranscribeStop]);

  const stopRecording = useCallback(async (): Promise<RecordedAudio | null> => {
    if (!audioRecorderRef.current || !isRecording) return null;
    triggerHaptic("medium");

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    onAutoTranscribeStop?.();

    try {
      const audio = await audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
      setRecordingSeconds(0);
      setAudioLevels(Array(14).fill(15));

      if (audio) {
        let persistedUrl = audio.url;
        try {
          persistedUrl = await processAudioBlob(audio.blob, audio.url);
        } catch (storageErr) {
          console.warn("[useAudioRecorder] processAudioBlob warning:", storageErr);
        }
        if (persistedUrl && persistedUrl !== audio.url && audio.url.startsWith("blob:")) {
          URL.revokeObjectURL(audio.url);
        }
        const savedAudio: RecordedAudio = {
          ...audio,
          url: persistedUrl || audio.url,
        };
        setRecordedAudio(savedAudio);
        triggerSuccessHaptic();
        return savedAudio;
      }
      return null;
    } catch (err: unknown) {
      console.error("[useAudioRecorder] Error stopping:", err);
      const msg = err instanceof Error ? err.message : "Failed to save audio recording.";
      setAudioError(msg);
      setIsRecording(false);
      return null;
    }
  }, [isRecording, onAutoTranscribeStop]);

  const startRecording = useCallback(async () => {
    try {
      triggerHaptic("medium");
      const recorder = new TactileAudioRecorder();
      audioRecorderRef.current = recorder;

      const started = await recorder.start((levels) => {
        setAudioLevels(levels);
      });

      if (!started) {
        setAudioError("Microphone permission was denied or unavailable.");
        setTimeout(() => setAudioError(null), 3500);
        return false;
      }

      setIsRecording(true);
      setRecordingSeconds(0);
      onAutoTranscribeStart?.();

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          const maxSecs = isProUser()
            ? MAX_AUDIO_DURATION_SECONDS
            : FREE_MAX_AUDIO_DURATION;
          if (prev >= maxSecs) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      return true;
    } catch (err: unknown) {
      console.error("[useAudioRecorder] Start error:", err);
      const msg = err instanceof Error ? err.message : "Could not access microphone.";
      setAudioError(msg);
      setTimeout(() => setAudioError(null), 3500);
      return false;
    }
  }, [onAutoTranscribeStart, stopRecording]);

  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  return {
    isRecording,
    recordingSeconds,
    audioLevels,
    recordedAudio,
    setRecordedAudio,
    audioError,
    setAudioError,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
