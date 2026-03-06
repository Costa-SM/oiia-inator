/**
 * synthesizer.js — Audio reconstruction from matched snippets
 *
 * Stitches selected corpus snippets together using overlap-add (OLA)
 * and scales each snippet to match the target frame's energy envelope.
 */

import { hannWindow } from './corpus.js';

/**
 * Compute the RMS energy of a sample buffer.
 * @param {Float32Array} samples
 * @returns {number}
 */
function rms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * Reconstruct audio by overlap-adding the matched corpus snippets,
 * scaling each to match the target frame's amplitude envelope.
 *
 * @param {number[]}        matchedIndices — one corpus index per target frame
 * @param {import('./corpus.js').Snippet[]} corpus — the full snippet corpus
 * @param {Float32Array[]}  targetFrames   — the target audio frames
 * @param {number}          sampleRate     — sample rate (Hz)
 * @param {number}          [overlapRatio=0.5] — overlap ratio used during segmentation
 * @returns {Float32Array}  — the reconstructed audio
 */
export function synthesize(matchedIndices, corpus, targetFrames, sampleRate, overlapRatio = 0.5) {
  if (matchedIndices.length === 0 || corpus.length === 0) {
    return new Float32Array(0);
  }

  const snippetLength = corpus[0].raw.length;
  const hopSize = Math.round(snippetLength * (1 - overlapRatio));
  const outputLength = (matchedIndices.length - 1) * hopSize + snippetLength;

  const output = new Float32Array(outputLength);
  const normBuffer = new Float32Array(outputLength); // for normalizing overlapping regions
  const win = hannWindow(snippetLength);

  for (let i = 0; i < matchedIndices.length; i++) {
    const corpusIdx = matchedIndices[i];
    const snippet = corpus[corpusIdx];
    const targetFrame = targetFrames[i];

    // Compute amplitude scaling: match target RMS
    const snippetRms = rms(snippet.raw);
    const targetRms = rms(targetFrame);
    const gain = snippetRms > 0.0001 ? targetRms / snippetRms : 0;

    const writeStart = i * hopSize;

    for (let j = 0; j < snippetLength && writeStart + j < outputLength; j++) {
      const windowed = snippet.raw[j] * win[j] * gain;
      output[writeStart + j] += windowed;
      normBuffer[writeStart + j] += win[j];
    }
  }

  // Normalize by the sum of overlapping windows to prevent amplitude buildup
  for (let i = 0; i < outputLength; i++) {
    if (normBuffer[i] > 0.0001) {
      output[i] /= normBuffer[i];
    }
  }

  // Soft-clip to prevent any wild values
  for (let i = 0; i < outputLength; i++) {
    if (output[i] > 1) output[i] = 1;
    else if (output[i] < -1) output[i] = -1;
  }

  return output;
}
