/**
 * oiia-inator — Main entry point
 *
 * Wires together the UI modules and the processing Web Worker.
 *
 * Flow:
 * 1. User drops an audio file OR pastes a YouTube link
 * 2. User clicks "oiia-ify!" → settings + audio sent to Web Worker
 * 3. Worker reports progress → loading screen updates
 * 4. Worker returns result → result screen shows with playback + download
 */

// Import CSS through Vite's module system (ensures proper bundling)
import '../styles/main.css';

import { initDropzone } from './ui/dropzone.js';
import { initControls, getSettings } from './ui/controls.js';
import { showLoading, updateProgress, hideLoading } from './ui/loading.js';
import { showResult } from './ui/player.js';
import { initYouTube } from './ui/youtube.js';

// --- State ---
/** @type {File|null} */
let selectedFile = null;

/** @type {string} Current input mode: 'file' or 'youtube' */
let inputMode = 'file';

/** @type {Worker|null} */
let worker = null;

/** @type {AudioContext|null} */
let audioCtx = null;

// --- The oiia source audio URL (bundled in public/assets/) ---
const OIIA_SOURCE_URL = './assets/oiia_source.wav';

/**
 * Get or create an AudioContext (lazy init on user gesture).
 * @returns {AudioContext}
 */
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Decode an audio file (File or fetched Response) to channel data.
 * Returns an array of Float32Arrays (one per channel).
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{ channels: Float32Array[], sampleRate: number }>}
 */
async function decodeAudio(arrayBuffer) {
  const ctx = getAudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const channels = [];
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  return { channels, sampleRate: audioBuffer.sampleRate };
}

/**
 * Fetch and decode the bundled oiia source audio.
 * @returns {Promise<{ channels: Float32Array[], sampleRate: number }>}
 */
async function loadOiiaSource() {
  const response = await fetch(OIIA_SOURCE_URL);
  if (!response.ok) {
    throw new Error(
      `Could not load oiia source audio (${response.status}). ` +
      `Make sure "oiia_source.wav" is in the public/assets/ folder.`
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return decodeAudio(arrayBuffer);
}

/**
 * Create and configure the processing Web Worker.
 * @returns {Worker}
 */
function createWorker() {
  const w = new Worker(
    new URL('./worker/processor.worker.js', import.meta.url),
    { type: 'module' }
  );

  w.addEventListener('message', (e) => {
    const { type, payload } = e.data;

    switch (type) {
      case 'progress':
        updateProgress(payload.percent, payload.message);
        break;

      case 'result':
        hideLoading();
        showResult(selectedFile, payload.audio, payload.sampleRate, payload.stats);
        break;

      case 'error':
        hideLoading();
        showError(payload.message);
        document.getElementById('screen-main').classList.add('active');
        break;
    }
  });

  w.addEventListener('error', (err) => {
    hideLoading();
    showError(err.message || 'An unexpected error occurred in the audio worker.');
    document.getElementById('screen-main').classList.add('active');
  });

  return w;
}

/**
 * Show an error to the user.
 * @param {string} message
 */
function showError(message) {
  alert(`oiia-inator error: ${message}`);
}

/**
 * Update the process button state based on whether we have valid input.
 */
function updateProcessButton() {
  const btnProcess = document.getElementById('btn-process');
  btnProcess.disabled = !selectedFile;
}

/**
 * Kick off the processing pipeline.
 */
async function startProcessing() {
  if (!selectedFile) return;

  const settings = getSettings();

  showLoading();
  updateProgress(0, 'Decoding your audio...');

  try {
    // Decode both audio sources in parallel
    const [targetResult, oiiaResult] = await Promise.all([
      selectedFile.arrayBuffer().then(decodeAudio),
      loadOiiaSource(),
    ]);

    // Both sources are decoded through the same AudioContext, so they share
    // its native sample rate. Assert this to guard against future refactors.
    if (targetResult.sampleRate !== oiiaResult.sampleRate) {
      throw new Error(
        `Sample rate mismatch: target is ${targetResult.sampleRate}Hz ` +
        `but oiia source is ${oiiaResult.sampleRate}Hz. Both must match.`
      );
    }

    updateProgress(5, 'Audio decoded! Starting the pipeline...');

    if (worker) worker.terminate();
    worker = createWorker();

    // Copy channel data so the ArrayBuffers can be transferred
    const targetChannels = targetResult.channels.map((ch) => {
      const copy = new Float32Array(ch.length);
      copy.set(ch);
      return copy;
    });
    const oiiaChannels = oiiaResult.channels.map((ch) => {
      const copy = new Float32Array(ch.length);
      copy.set(ch);
      return copy;
    });

    const transferables = [
      ...targetChannels.map((ch) => ch.buffer),
      ...oiiaChannels.map((ch) => ch.buffer),
    ];

    worker.postMessage(
      {
        type: 'process',
        payload: {
          targetChannels,
          oiiaChannels,
          sampleRate: targetResult.sampleRate,
          settings,
        },
      },
      transferables
    );
  } catch (err) {
    hideLoading();
    showError(err.message || 'Failed to decode audio files.');
    document.getElementById('screen-main').classList.add('active');
  }
}

// --- Initialize everything on DOM ready ---
document.addEventListener('DOMContentLoaded', () => {
  // Init UI modules
  initDropzone((file) => {
    selectedFile = file;
    updateProcessButton();
  });

  initControls();

  // Init YouTube module
  initYouTube((file) => {
    selectedFile = file;
    // Show file info for YouTube-sourced audio too
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    if (file) {
      fileName.textContent = file.name;
      fileInfo.classList.remove('hidden');
    } else {
      fileInfo.classList.add('hidden');
    }
    updateProcessButton();
  });

  // Tab switching: file vs youtube
  const tabs = document.querySelectorAll('.input-tab');
  const panels = document.querySelectorAll('.input-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      inputMode = target;

      // Update tab active state
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Update panel visibility
      panels.forEach((p) => p.classList.remove('active'));
      document.getElementById(`panel-${target}`).classList.add('active');
    });
  });

  // Wire up the file remove button to also clear YouTube state
  const fileRemove = document.getElementById('file-remove');
  fileRemove.addEventListener('click', () => {
    selectedFile = null;
    updateProcessButton();
  });

  // Wire up the process button
  const btnProcess = document.getElementById('btn-process');
  btnProcess.addEventListener('click', startProcessing);
});
