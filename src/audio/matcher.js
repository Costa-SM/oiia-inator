/**
 * matcher.js — Matching strategies
 *
 * Responsibilities:
 * - Given target frame features and corpus snippet features, select the best snippet per frame
 * - Implements 4 strategies:
 *   1. "nearest"  — Pure nearest-neighbor by feature distance
 *   2. "smooth"   — Continuity-optimized: prefers consecutive snippets from the original
 *   3. "chaos"    — Random selection from top-K closest matches
 *   4. "musical"  — Weighted features emphasizing pitch/chroma for melodic matching
 *
 * Exports:
 * - matchFrames(targetFeatures: FeatureVector[], corpusFeatures: FeatureVector[], strategy: string) → number[]
 *   Returns an array of corpus snippet indices, one per target frame.
 *
 * Feature distance: cosine distance on normalized, concatenated feature vectors
 */

// TODO: Worker 1 (audio engine) will implement this
