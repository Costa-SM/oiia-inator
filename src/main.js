/**
 * oiia-inator — Main entry point
 *
 * Wires together:
 * - UI (dropzone, controls, loading, player)
 * - Web Worker (processor.worker.js — runs the audio pipeline)
 *
 * Flow:
 * 1. User drops audio file → UI passes ArrayBuffer to main.js
 * 2. main.js reads settings from controls, sends to worker
 * 3. Worker processes audio, reports progress back
 * 4. main.js updates loading screen with progress
 * 5. Worker returns result AudioBuffer → main.js passes to player
 */

// TODO: Worker 3 (integration) will implement this file
