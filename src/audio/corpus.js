/**
 * corpus.js — Oiia source material management
 *
 * Segments the oiia source audio into overlapping windows (snippets)
 * with a Hann window applied to each for smooth overlap-add reconstruction.
 */

/**
 * Create a Hann window of the given length.
 * @param {number} length
 * @returns {Float32Array}
 */
export function hannWindow(length) {
  const win = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)));
  }
  return win;
}

/**
 * @typedef {Object} Snippet
 * @property {Float32Array} samples  — windowed audio samples
 * @property {Float32Array} raw      — un-windowed audio samples (for synthesis)
 * @property {number}       index    — sequential snippet index
 * @property {number}       startSample — offset into the original source audio
 */

/**
 * Segment audio data into overlapping snippets.
 *
 * @param {Float32Array} audioData    — mono audio samples
 * @param {number}       sampleRate   — sample rate in Hz
 * @param {number}       snippetSizeMs — snippet duration in milliseconds
 * @param {number}       [overlapRatio=0.5] — overlap between consecutive windows (0–1)
 * @returns {Snippet[]}
 */
export function buildCorpus(audioData, sampleRate, snippetSizeMs, overlapRatio = 0.5) {
  const snippetLength = Math.round((snippetSizeMs / 1000) * sampleRate);
  const hopSize = Math.round(snippetLength * (1 - overlapRatio));

  if (snippetLength <= 0 || hopSize <= 0) {
    throw new Error(`Invalid snippet size: ${snippetSizeMs}ms produces ${snippetLength} samples`);
  }

  const win = hannWindow(snippetLength);
  const snippets = [];
  let index = 0;

  for (let start = 0; start + snippetLength <= audioData.length; start += hopSize) {
    const raw = audioData.slice(start, start + snippetLength);
    const samples = new Float32Array(snippetLength);
    for (let i = 0; i < snippetLength; i++) {
      samples[i] = raw[i] * win[i];
    }

    snippets.push({
      samples,
      raw,
      index,
      startSample: start,
    });
    index++;
  }

  return snippets;
}
