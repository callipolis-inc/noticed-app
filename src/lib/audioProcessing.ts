/**
 * Noticed Web Audio Processing Engine
 * High-performance, offline-first client-side audio decoding,
 * waveform peak extraction, dual-handle slicing, and 16-bit PCM WAV encoding.
 */

/**
 * Decodes an audio File or Blob into an AudioBuffer using the browser's native AudioContext.
 */
export async function decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  try {
    return await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    if (audioCtx.state !== "closed") {
      audioCtx.close().catch(() => {});
    }
  }
}

/**
 * Extracts normalized waveform peaks (amplitude values between 0.15 and 1.0)
 * suitable for tactile letterpress sound visualizers.
 */
export function extractWaveformPeaks(
  buffer: AudioBuffer,
  numPeaks: number = 64
): number[] {
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  if (totalSamples === 0) return new Array(numPeaks).fill(0.2);

  const blockSize = Math.max(1, Math.floor(totalSamples / numPeaks));
  const rawPeaks: number[] = [];

  for (let i = 0; i < numPeaks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, totalSamples);
    let max = 0;
    // Step by 4 for fast decimation
    for (let j = start; j < end; j += 4) {
      const val = Math.abs(channelData[j]);
      if (val > max) max = val;
    }
    rawPeaks.push(max);
  }

  const highest = Math.max(...rawPeaks, 0.001);
  return rawPeaks.map((p) => Math.max(0.15, Math.min(1.0, p / highest)));
}

/**
 * Slices an AudioBuffer from startSec to endSec.
 */
export function sliceAudioBuffer(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const startOffset = Math.floor(Math.max(0, startSec) * sampleRate);
  const endOffset = Math.floor(Math.min(buffer.duration, endSec) * sampleRate);
  const frameCount = Math.max(1, endOffset - startOffset);

  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const slicedBuffer = audioCtx.createBuffer(
    buffer.numberOfChannels,
    frameCount,
    sampleRate
  );

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const sourceChannel = buffer.getChannelData(c);
    const targetChannel = slicedBuffer.getChannelData(c);
    targetChannel.set(sourceChannel.subarray(startOffset, endOffset));
  }

  audioCtx.close().catch(() => {});
  return slicedBuffer;
}

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob.
 * 100% client-side, zero external libraries, universal iOS/Safari/Android/Web compatibility.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII string to DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF chunk descriptor */
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, "WAVE");

  /* "fmt " sub-chunk */
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16)

  /* "data" sub-chunk */
  writeString(36, "data");
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Interleave and quantize channel samples to 16-bit signed PCM integers
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer [-32768, 32767]
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Trims an audio file to [startSec, endSec] and returns a playable Blob and object URL.
 */
export async function trimAudioFile(
  file: File | Blob,
  startSec: number,
  endSec: number
): Promise<{ blob: Blob; url: string; duration: number }> {
  const audioBuffer = await decodeAudioFile(file);
  const slicedBuffer = sliceAudioBuffer(audioBuffer, startSec, endSec);
  const wavBlob = audioBufferToWavBlob(slicedBuffer);
  const url = URL.createObjectURL(wavBlob);
  const duration = Math.max(1, Math.round(slicedBuffer.duration));

  return { blob: wavBlob, url, duration };
}
