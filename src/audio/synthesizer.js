/**
 * synthesizer.js — Audio reconstruction from matched snippets
 *
 * Responsibilities:
 * - Given matched snippet indices and the corpus snippets, reconstruct the output audio
 * - Uses overlap-add (OLA) for smooth transitions
 * - Applies amplitude envelope from target for dynamics preservation
 *
 * Exports:
 * - synthesize(matchedIndices: number[], corpus: Snippet[], targetFrames: Float32Array[],
 *              sampleRate: number, overlapRatio?: number) → Float32Array
 *   Returns the reconstructed audio as a single Float32Array.
 */

// TODO: Worker 1 (audio engine) will implement this
