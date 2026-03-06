/**
 * player.js — Result playback and download
 *
 * Exports:
 * - showResult(originalFile: File, resultBuffer: Float32Array, sampleRate: number, stats: object) → void
 * - hideResult() → void
 */

/** @type {string | null} */
let originalObjectUrl = null;
/** @type {string | null} */
let resultObjectUrl = null;
/** @type {Blob | null} */
let resultWavBlob = null;

/**
 * Encode a mono Float32Array as a 16-bit PCM WAV Blob.
 *
 * @param {Float32Array} samples
 * @param {number} sampleRate
 * @returns {Blob}
 */
function float32ToWav(samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;

  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // --- RIFF header ---
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);           // ChunkSize
  writeString(view, 8, 'WAVE');

  // --- fmt sub-chunk ---
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);                      // Subchunk1Size (PCM)
  view.setUint16(20, 1, true);                       // AudioFormat (PCM = 1)
  view.setUint16(22, numChannels, true);              // NumChannels
  view.setUint32(24, sampleRate, true);               // SampleRate
  view.setUint32(28, byteRate, true);                 // ByteRate
  view.setUint16(32, blockAlign, true);               // BlockAlign
  view.setUint16(34, bitsPerSample, true);            // BitsPerSample

  // --- data sub-chunk ---
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);                 // Subchunk2Size

  // --- PCM samples (clamp to [-1, 1], convert to 16-bit) ---
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Write an ASCII string into a DataView at the given offset.
 * @param {DataView} view
 * @param {number} offset
 * @param {string} str
 */
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Revoke any previously created object URLs to free memory.
 */
function revokeUrls() {
  if (originalObjectUrl) {
    URL.revokeObjectURL(originalObjectUrl);
    originalObjectUrl = null;
  }
  if (resultObjectUrl) {
    URL.revokeObjectURL(resultObjectUrl);
    resultObjectUrl = null;
  }
}

/**
 * Show the result screen with original and oiia-ified audio players.
 *
 * @param {File} originalFile — the user's original audio file
 * @param {Float32Array} resultBuffer — the oiia-ified audio samples
 * @param {number} sampleRate — sample rate for the result
 * @param {{ totalSnippets: number, uniqueSnippets: number }} stats
 */
export function showResult(originalFile, resultBuffer, sampleRate, stats) {
  revokeUrls();

  // Switch screens
  document.getElementById('screen-loading').classList.remove('active');
  document.getElementById('screen-main').classList.remove('active');
  document.getElementById('screen-result').classList.add('active');

  // --- Original player ---
  originalObjectUrl = URL.createObjectURL(originalFile);
  document.getElementById('player-original').src = originalObjectUrl;

  // --- Result player ---
  resultWavBlob = float32ToWav(resultBuffer, sampleRate);
  resultObjectUrl = URL.createObjectURL(resultWavBlob);
  document.getElementById('player-result').src = resultObjectUrl;

  // --- Stats ---
  const statsEl = document.getElementById('stats');
  const duration = (resultBuffer.length / sampleRate).toFixed(1);
  statsEl.innerHTML = `
    <div class="stat-item">
      <span class="stat-value">${stats.totalSnippets.toLocaleString()}</span>
      <span class="stat-label">Total snippets</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${stats.uniqueSnippets.toLocaleString()}</span>
      <span class="stat-label">Unique snippets</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${duration}s</span>
      <span class="stat-label">Duration</span>
    </div>
  `;

  // --- Download button ---
  const btnDownload = document.getElementById('btn-download');
  // Remove old listeners by cloning
  const newBtn = btnDownload.cloneNode(true);
  btnDownload.parentNode.replaceChild(newBtn, btnDownload);
  newBtn.addEventListener('click', () => {
    if (!resultWavBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultWavBlob);
    a.download = `oiia-${originalFile.name.replace(/\.[^.]+$/, '')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });

  // --- Retry button (keep file, go back to main) ---
  const btnRetry = document.getElementById('btn-retry');
  const newRetry = btnRetry.cloneNode(true);
  btnRetry.parentNode.replaceChild(newRetry, btnRetry);
  newRetry.addEventListener('click', () => {
    hideResult();
    document.getElementById('screen-main').classList.add('active');
  });

  // --- New Audio button (clear everything, go back to main) ---
  const btnNew = document.getElementById('btn-new');
  const newNew = btnNew.cloneNode(true);
  btnNew.parentNode.replaceChild(newNew, btnNew);
  newNew.addEventListener('click', () => {
    hideResult();
    // Clear file selection
    const fileInput = document.getElementById('file-input');
    fileInput.value = '';
    document.getElementById('file-info').classList.add('hidden');
    document.getElementById('dropzone').classList.remove('has-file');
    document.getElementById('btn-process').disabled = true;
    document.getElementById('screen-main').classList.add('active');
  });
}

/**
 * Hide the result screen and clean up resources.
 */
export function hideResult() {
  document.getElementById('screen-result').classList.remove('active');

  // Pause players
  const playerOriginal = document.getElementById('player-original');
  const playerResult = document.getElementById('player-result');
  playerOriginal.pause();
  playerResult.pause();

  revokeUrls();
  resultWavBlob = null;
}
