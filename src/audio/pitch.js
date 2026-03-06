/**
 * pitch.js — Pitch detection and pitch-shifting utilities
 *
 * Uses autocorrelation for pitch detection and a simple resampling-based
 * approach for pitch shifting (fast and good enough for meme audio).
 */

/**
 * Detect the fundamental frequency (F0) of an audio frame using
 * the autocorrelation method (ACF).
 *
 * Searches for the strongest peak in the autocorrelation between
 * minFreq (80 Hz) and maxFreq (1000 Hz).
 *
 * @param {Float32Array} samples    — audio samples
 * @param {number}       sampleRate — sample rate in Hz
 * @returns {number|null} — detected F0 in Hz, or null if no clear pitch
 */
export function detectPitch(samples, sampleRate) {
  const minFreq = 80;
  const maxFreq = 1000;
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.ceil(sampleRate / minFreq);
  const n = samples.length;

  if (n < maxPeriod * 2) return null;

  // Compute RMS to check if there's enough signal
  let energy = 0;
  for (let i = 0; i < n; i++) energy += samples[i] * samples[i];
  const signalRms = Math.sqrt(energy / n);
  if (signalRms < 0.01) return null; // too quiet

  // Normalized autocorrelation
  let bestCorrelation = 0;
  let bestPeriod = 0;

  for (let lag = minPeriod; lag <= Math.min(maxPeriod, n / 2); lag++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;
    const windowSize = n - lag;

    for (let i = 0; i < windowSize; i++) {
      correlation += samples[i] * samples[i + lag];
      norm1 += samples[i] * samples[i];
      norm2 += samples[i + lag] * samples[i + lag];
    }

    const normFactor = Math.sqrt(norm1 * norm2);
    if (normFactor > 0) {
      correlation /= normFactor;
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = lag;
    }
  }

  // Only accept if correlation is strong enough
  if (bestCorrelation < 0.5 || bestPeriod === 0) return null;

  return sampleRate / bestPeriod;
}

/**
 * Pitch-shift audio by a given number of semitones using linear
 * interpolation resampling. This changes pitch without changing duration
 * by resampling then truncating/padding to the original length.
 *
 * This is a simple approach — not studio quality, but fine for our purpose.
 *
 * @param {Float32Array} samples    — audio samples
 * @param {number}       sampleRate — sample rate in Hz (unused but kept for API consistency)
 * @param {number}       semitones  — semitones to shift (positive = up, negative = down)
 * @returns {Float32Array} — pitch-shifted audio (same length as input)
 */
export function pitchShift(samples, sampleRate, semitones) {
  if (Math.abs(semitones) < 0.01) return new Float32Array(samples);

  // Ratio: > 1 means higher pitch (read faster through source)
  const ratio = Math.pow(2, semitones / 12);
  const inputLen = samples.length;
  const outputLen = inputLen;
  const result = new Float32Array(outputLen);

  for (let i = 0; i < outputLen; i++) {
    const srcPos = i * ratio;
    const srcIdx = Math.floor(srcPos);
    const frac = srcPos - srcIdx;

    if (srcIdx + 1 < inputLen) {
      // Linear interpolation
      result[i] = samples[srcIdx] * (1 - frac) + samples[srcIdx + 1] * frac;
    } else if (srcIdx < inputLen) {
      result[i] = samples[srcIdx];
    } else {
      // Past the end of source — wrap around for smoother looping
      const wrappedIdx = srcIdx % inputLen;
      const wrappedNext = (wrappedIdx + 1) % inputLen;
      result[i] = samples[wrappedIdx] * (1 - frac) + samples[wrappedNext] * frac;
    }
  }

  return result;
}

/**
 * Shift a snippet's pitch to match a target pitch.
 *
 * @param {Float32Array} snippet       — audio samples of the snippet
 * @param {number|null}  snippetPitch  — detected F0 of the snippet (Hz)
 * @param {number|null}  targetPitch   — desired F0 (Hz)
 * @param {number}       sampleRate    — sample rate in Hz
 * @returns {Float32Array} — pitch-shifted snippet, or original if either pitch is null
 */
export function matchPitch(snippet, snippetPitch, targetPitch, sampleRate) {
  if (snippetPitch == null || targetPitch == null) {
    return snippet;
  }
  if (snippetPitch <= 0 || targetPitch <= 0) {
    return snippet;
  }

  // Calculate semitone difference
  const semitones = 12 * Math.log2(targetPitch / snippetPitch);

  // Don't shift if the difference is negligible
  if (Math.abs(semitones) < 0.1) {
    return snippet;
  }

  // Clamp to a reasonable range (±24 semitones = 2 octaves)
  const clampedSemitones = Math.max(-24, Math.min(24, semitones));

  return pitchShift(snippet, sampleRate, clampedSemitones);
}
