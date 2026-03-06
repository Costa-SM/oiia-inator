/**
 * pitch.js — Pitch detection and pitch-shifting utilities
 *
 * Responsibilities:
 * - Detect fundamental frequency (F0) of an audio frame
 * - Pitch-shift a snippet to match a target frequency
 * - Uses autocorrelation for pitch detection
 * - Uses SoundTouchJS or phase vocoder for pitch shifting
 *
 * Exports:
 * - detectPitch(samples: Float32Array, sampleRate: number) → number|null
 *   Returns the detected F0 in Hz, or null if no clear pitch.
 *
 * - pitchShift(samples: Float32Array, sampleRate: number, semitones: number) → Float32Array
 *   Returns pitch-shifted audio.
 *
 * - matchPitch(snippet: Float32Array, snippetPitch: number|null,
 *              targetPitch: number|null, sampleRate: number) → Float32Array
 *   Shifts snippet to match target pitch. Returns original if either pitch is null.
 */

// TODO: Worker 1 (audio engine) will implement this
