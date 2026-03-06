/**
 * corpus.js — Oiia source material management
 *
 * Responsibilities:
 * - Load the oiia source audio (from public/assets/oiia_source.wav or user-provided)
 * - Segment it into overlapping windows of configurable size
 * - Return an array of snippet objects: { samples: Float32Array, index: number }
 *
 * Exports:
 * - buildCorpus(audioData: Float32Array, sampleRate: number, snippetSizeMs: number, overlapRatio?: number) → Snippet[]
 *
 * Where Snippet = { samples: Float32Array, index: number, startSample: number }
 */

// TODO: Worker 1 (audio engine) will implement this
