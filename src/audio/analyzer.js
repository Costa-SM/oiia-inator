/**
 * analyzer.js — Audio feature extraction
 *
 * Extracts MFCCs, RMS energy, spectral centroid, and chroma features
 * from audio snippets and target frames using Meyda.
 */

import Meyda from 'meyda';

/**
 * @typedef {Object} FeatureVector
 * @property {number[]} mfcc             — 13 MFCC coefficients
 * @property {number}   rms              — root-mean-square energy
 * @property {number}   spectralCentroid — spectral centroid
 * @property {number[]} chroma           — 12-element chroma vector
 */

/**
 * Round up to the nearest power of 2.
 * Meyda requires buffer sizes that are powers of 2.
 * @param {number} n
 * @returns {number}
 */
function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Pad or truncate a Float32Array to a given length.
 * @param {Float32Array} samples
 * @param {number} targetLength
 * @returns {Float32Array}
 */
function padToLength(samples, targetLength) {
  if (samples.length === targetLength) return samples;
  const padded = new Float32Array(targetLength);
  padded.set(samples.subarray(0, Math.min(samples.length, targetLength)));
  return padded;
}

/**
 * Extract features from a single audio buffer.
 *
 * @param {Float32Array} samples    — audio samples
 * @param {number}       sampleRate — sample rate in Hz
 * @returns {FeatureVector}
 */
export function extractFeatures(samples, sampleRate) {
  const bufferSize = nextPowerOf2(Math.max(samples.length, 512));
  const padded = padToLength(samples, bufferSize);

  Meyda.sampleRate = sampleRate;
  Meyda.bufferSize = bufferSize;
  Meyda.numberOfMFCCCoefficients = 13;

  const result = Meyda.extract(
    ['mfcc', 'rms', 'spectralCentroid', 'chroma'],
    padded
  );

  return {
    mfcc: result.mfcc ?? new Array(13).fill(0),
    rms: result.rms ?? 0,
    spectralCentroid: result.spectralCentroid ?? 0,
    chroma: result.chroma ?? new Array(12).fill(0),
  };
}

/**
 * Extract features for all snippets in a corpus.
 *
 * @param {{ samples: Float32Array }[]} snippets
 * @param {number} sampleRate
 * @returns {FeatureVector[]}
 */
export function extractFeaturesForAll(snippets, sampleRate) {
  return snippets.map((snippet) => extractFeatures(snippet.samples, sampleRate));
}

/**
 * Segment target audio into frames and extract features for each.
 *
 * @param {Float32Array} audioData    — mono audio samples
 * @param {number}       sampleRate   — sample rate in Hz
 * @param {number}       frameSizeMs  — frame size in milliseconds
 * @param {number}       [overlapRatio=0.5]
 * @returns {{ frames: Float32Array[], features: FeatureVector[] }}
 */
export function extractTargetFrames(audioData, sampleRate, frameSizeMs, overlapRatio = 0.5) {
  const frameLength = Math.round((frameSizeMs / 1000) * sampleRate);
  const hopSize = Math.round(frameLength * (1 - overlapRatio));
  const frames = [];
  const features = [];

  for (let start = 0; start + frameLength <= audioData.length; start += hopSize) {
    const frame = audioData.slice(start, start + frameLength);
    frames.push(frame);
    features.push(extractFeatures(frame, sampleRate));
  }

  return { frames, features };
}
