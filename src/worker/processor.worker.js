/**
 * processor.worker.js — Web Worker that runs the oiia-inator pipeline
 *
 * Receives messages from main thread:
 * - { type: 'process', payload: { targetAudio: Float32Array, oiiaAudio: Float32Array, sampleRate: number, settings: { snippetSizeMs: number, strategy: string, pitchShift: boolean } } }
 *
 * Sends messages back:
 * - { type: 'progress', payload: { percent: number, step: string, message: string } }
 * - { type: 'result', payload: { audio: Float32Array, sampleRate: number, stats: { totalSnippets: number, uniqueSnippets: number } } }
 * - { type: 'error', payload: { message: string } }
 */

// TODO: Worker 3 (integration) will implement this
