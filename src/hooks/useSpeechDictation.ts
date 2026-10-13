import { useState, useRef, useEffect, useCallback } from "react";
import {
  TactileSpeechRecognizer,
  isSpeechRecognitionSupported,
  getSavedDictationLang,
  setSavedDictationLang,
  getSavedAutoTranscribe,
  setSavedAutoTranscribe,
  type DictationLang,
} from "@/lib/speechRecognition";
import { triggerHaptic } from "@/lib/haptics";

interface UseSpeechDictationOptions {
  onAppendText: (text: string) => void;
  onError?: (message: string) => void;
}

export function useSpeechDictation({
  onAppendText,
  onError,
}: UseSpeechDictationOptions) {
  const [isDictatingOnly, setIsDictatingOnly] = useState(false);
  const [dictationLang, setDictationLang] = useState<DictationLang>(() =>
    getSavedDictationLang(),
  );
  const [autoTranscribeMemo, setAutoTranscribeMemo] = useState<boolean>(() =>
    getSavedAutoTranscribe(),
  );
  const [interimSpeechText, setInterimSpeechText] = useState<string>("");
  const speechRecognizerRef = useRef<TactileSpeechRecognizer | null>(null);

  const stopRecognizer = useCallback(() => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
      speechRecognizerRef.current = null;
    }
    setInterimSpeechText("");
  }, []);

  const stopDictation = useCallback(() => {
    stopRecognizer();
    setIsDictatingOnly(false);
  }, [stopRecognizer]);

  const startRecognizerSession = useCallback(
    (lang: DictationLang) => {
      if (!isSpeechRecognitionSupported()) return false;
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stop();
      }
      const recognizer = new TactileSpeechRecognizer(lang, {
        onInterim: (text) => setInterimSpeechText(text),
        onFinal: (text) => {
          onAppendText(text);
          setInterimSpeechText("");
          triggerHaptic("light");
        },
        onError: (msg) => {
          console.warn("[useSpeechDictation] Error:", msg);
          stopRecognizer();
          setIsDictatingOnly(false);
          onError?.(msg);
        },
        onStateChange: (active) => {
          if (!active) setInterimSpeechText("");
        },
      });
      speechRecognizerRef.current = recognizer;
      return recognizer.start();
    },
    [onAppendText, onError, stopRecognizer],
  );

  const startDictation = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      triggerHaptic("heavy");
      onError?.("Voice dictation is not supported on this device/browser.");
      return false;
    }
    triggerHaptic("medium");
    const started = startRecognizerSession(dictationLang);
    if (started) {
      setIsDictatingOnly(true);
      return true;
    }
    return false;
  }, [dictationLang, onError, startRecognizerSession]);

  const startLiveTranscription = useCallback(() => {
    if (!isSpeechRecognitionSupported()) return false;
    return startRecognizerSession(dictationLang);
  }, [dictationLang, startRecognizerSession]);

  const stopLiveTranscription = useCallback(() => {
    stopRecognizer();
  }, [stopRecognizer]);

  const toggleDictationLang = useCallback(() => {
    triggerHaptic("light");
    const next: DictationLang = dictationLang === "id-ID" ? "en-US" : "id-ID";
    setDictationLang(next);
    setSavedDictationLang(next);
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.setLanguage(next);
    }
    return next;
  }, [dictationLang]);

  const toggleAutoTranscribe = useCallback(() => {
    triggerHaptic("light");
    const next = !autoTranscribeMemo;
    setAutoTranscribeMemo(next);
    setSavedAutoTranscribe(next);
    return next;
  }, [autoTranscribeMemo]);

  useEffect(() => {
    return () => {
      stopDictation();
    };
  }, [stopDictation]);

  return {
    isDictatingOnly,
    dictationLang,
    autoTranscribeMemo,
    interimSpeechText,
    startDictation,
    stopDictation,
    startLiveTranscription,
    stopLiveTranscription,
    toggleDictationLang,
    toggleAutoTranscribe,
  };
}
