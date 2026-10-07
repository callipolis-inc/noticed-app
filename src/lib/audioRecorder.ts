export interface RecordedAudio {
  blob: Blob;
  url: string;
  durationSeconds: number;
}

export class TactileAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private chosenMimeType: string = "";

  public async start(onAudioLevels?: (levels: number[]) => void): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      // Set up AudioContext & AnalyserNode for live visualization
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume().catch(() => {});
      }
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      // MediaRecorder initialization: prioritize universal MP4 (AAC) for iOS & Chrome compatibility
      let mimeType = "";
      if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/aac")) {
          mimeType = "audio/aac";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }
      this.chosenMimeType = mimeType;

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.startTime = Date.now();
      // Omit timeslice parameter: iOS WebKit corrupts MP4 container clusters when timesliced
      this.mediaRecorder.start();

      // Real-time audio waveform loop
      if (onAudioLevels && this.analyser) {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevels = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);

          // Sample down to 12 aesthetic bars
          const barsCount = 12;
          const step = Math.floor(bufferLength / barsCount);
          const normalizedLevels: number[] = [];

          for (let i = 0; i < barsCount; i++) {
            const val = dataArray[i * step] || 0;
            // Normalize between 10% and 100%
            const pct = Math.max(12, Math.min(100, Math.round((val / 255) * 100)));
            normalizedLevels.push(pct);
          }

          onAudioLevels(normalizedLevels);
          this.animationFrameId = requestAnimationFrame(updateLevels);
        };

        updateLevels();
      }

      return true;
    } catch (err) {
      console.warn("Microphone access unavailable or denied:", err);
      return false;
    }
  }

  public stop(): Promise<RecordedAudio | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        this.cleanup();
        resolve(null);
        return;
      }

      const duration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

      this.mediaRecorder.onstop = () => {
        const mimeType =
          this.mediaRecorder?.mimeType || this.chosenMimeType || "audio/mp4";
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();

        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = (e.target?.result as string) || URL.createObjectURL(audioBlob);
          resolve({
            blob: audioBlob,
            url: dataUrl,
            durationSeconds: duration,
          });
        };
        reader.onerror = () => {
          resolve({
            blob: audioBlob,
            url: URL.createObjectURL(audioBlob),
            durationSeconds: duration,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  public cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
