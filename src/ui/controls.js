/**
 * controls.js — Settings panel management
 *
 * Exports:
 * - initControls() → void
 * - getSettings() → { snippetSizeMs: number, strategy: string, pitchShift: boolean }
 */

/**
 * Wire up the snippet-size range slider to update its label in real-time.
 */
export function initControls() {
  const snippetSize = document.getElementById('snippet-size');
  const snippetSizeValue = document.getElementById('snippet-size-value');

  snippetSize.addEventListener('input', () => {
    snippetSizeValue.textContent = snippetSize.value;
  });
}

/**
 * Read current settings values from the DOM.
 *
 * @returns {{ snippetSizeMs: number, strategy: string, pitchShift: boolean }}
 */
export function getSettings() {
  const snippetSizeMs = parseInt(document.getElementById('snippet-size').value, 10);
  const strategy = document.querySelector('input[name="strategy"]:checked').value;
  const pitchShift = document.getElementById('pitch-shift').checked;

  return { snippetSizeMs, strategy, pitchShift };
}
