/**
 * analyzer.js — Audio feature extraction
 *
 * Responsibilities:
 * - Extract features from audio snippets and target frames
 * - Features: MFCCs (13 coefficients), RMS energy, spectral centroid, chroma
 * - Uses Meyda for feature extraction
 *
 * Exports:
 * - extractFeatures(samples: Float32Array, sampleRate: number) → FeatureVector
 * - extractFeaturesForAll(snippets: Snippet[], sampleRate: number) → FeatureVector[]
 * - extractTargetFrames(audioData: Float32Array, sampleRate: number, frameSizeMs: number) → { frames: Float32Array[], features: FeatureVector[] }
 *
 * Where FeatureVector = { mfcc: number[], rms: number, spectralCentroid: number, chroma: number[] }
 */

// TODO: Worker 1 (audio engine) will implement this
