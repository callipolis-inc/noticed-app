/**
 * Noticed Speech-to-Text Dictation Engine
 * Wraps Web Speech API (SpeechRecognition / webkitSpeechRecognition) with
 * continuous session recovery, hot-swappable ID/EN language toggle,
 * and smart manuscript sentence capitalization.
 */

export type DictationLang = "id-ID" | "en-US";

const LANG_STORAGE_KEY = "noticed_dictation_lang";
const AUTO_TRANSCRIBE_KEY = "noticed_auto_transcribe_memo";

export function getSavedDictationLang(): DictationLang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en-US" || saved === "id-ID") return saved;
  } catch {}
  return "id-ID";
}

export function setSavedDictationLang(lang: DictationLang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

export function getSavedAutoTranscribe(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_TRANSCRIBE_KEY);
    if (saved !== null) return saved === "true";
  } catch {}
  return true;
}

export function setSavedAutoTranscribe(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_TRANSCRIBE_KEY, String(enabled));
  } catch {}
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );
}

/**
 * Appends a newly transcribed phrase to existing note content with
 * automatic sentence capitalization and clean spacing without overwriting prior text.
 */
export function appendTranscribedSegment(
  existingText: string,
  rawSegment: string
): string {
  const segment = rawSegment.trim();
  if (!segment) return existingText;

  const trimmedRight = existingText.replace(/[ \t]+$/, "");
  const shouldCapitalize =
    trimmedRight.length === 0 ||
    /[.!?]\s*$/.test(trimmedRight) ||
    /\n$/.test(trimmedRight);

  const formattedSegment = shouldCapitalize
    ? segment.charAt(0).toUpperCase() + segment.slice(1)
    : segment;

  if (existingText.length === 0) {
    return formattedSegment;
  }

  const needsSpace = !/[\s\n]$/.test(existingText);
  return existingText + (needsSpace ? " " : "") + formattedSegment;
}

export interface SpeechRecognizerCallbacks {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onStateChange?: (isActive: boolean) => void;
}

export class TactileSpeechRecognizer {
  private recognition: any = null;
  private isActive: boolean = false;
  private shouldContinue: boolean = false;
  private lang: DictationLang;
  private callbacks: SpeechRecognizerCallbacks;
  private restartTimer: number | null = null;

  constructor(
    lang: DictationLang = getSavedDictationLang(),
    callbacks: SpeechRecognizerCallbacks = {}
  ) {
    this.lang = lang;
    this.callbacks = callbacks;
  }

  public start(): boolean {
    if (!isSpeechRecognitionSupported()) {
      this.callbacks.onError?.(
        "Voice dictation is not supported on this browser."
      );
      return false;
    }

    this.shouldContinue = true;
    return this.initAndStartInstance();
  }

  private initAndStartInstance(): boolean {
    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) return false;

      if (this.recognition) {
        try {
          this.recognition.onend = null;
          this.recognition.onerror = null;
          this.recognition.onresult = null;
          this.recognition.abort();
        } catch {}
      }

      const instance = new SpeechRecognitionClass();
      instance.continuous = true;
      instance.interimResults = true;
      instance.maxAlternatives = 1;
      instance.lang = this.lang;

      instance.onstart = () => {
        this.isActive = true;
        this.callbacks.onStateChange?.(true);
      };

      instance.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || "";
          if (result.isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim()) {
          this.callbacks.onFinal?.(finalTranscript.trim());
          this.callbacks.onInterim?.("");
        } else {
          this.callbacks.onInterim?.(interimTranscript.trim());
        }
      };

      instance.onerror = (event: any) => {
        const errCode = event?.error;
        if (errCode === "no-speech" || errCode === "aborted") {
          // Benign pause or manual switch; let onend handle auto-restart if needed
          return;
        }
        if (errCode === "not-allowed" || errCode === "service-not-allowed") {
          this.shouldContinue = false;
          this.isActive = false;
          this.callbacks.onStateChange?.(false);
          this.callbacks.onError?.(
            "Microphone or speech recognition permission was denied."
          );
          return;
        }
        console.warn("[SpeechRecognizer] Recognition warning:", errCode);
      };

      instance.onend = () => {
        this.callbacks.onInterim?.("");
        if (this.shouldContinue) {
          // Automatically resume continuous listening after natural sentence pauses (especially on iOS WebKit)
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = window.setTimeout(() => {
            if (this.shouldContinue) {
              this.initAndStartInstance();
            }
          }, 180);
        } else {
          this.isActive = false;
          this.callbacks.onStateChange?.(false);
        }
      };

      this.recognition = instance;
      instance.start();
      this.isActive = true;
      this.callbacks.onStateChange?.(true);
      return true;
    } catch (err) {
      console.error("[SpeechRecognizer] Failed to start:", err);
      this.shouldContinue = false;
      this.isActive = false;
      this.callbacks.onStateChange?.(false);
      return false;
    }
  }

  public setLanguage(newLang: DictationLang): void {
    if (this.lang === newLang) return;
    this.lang = newLang;
    setSavedDictationLang(newLang);

    // Hot-swap language if currently dictating
    if (this.shouldContinue) {
      this.initAndStartInstance();
    }
  }

  public stop(): void {
    this.shouldContinue = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.isActive = false;
    this.callbacks.onInterim?.("");
    this.callbacks.onStateChange?.(false);
  }

  public getIsActive(): boolean {
    return this.isActive;
  }
}
