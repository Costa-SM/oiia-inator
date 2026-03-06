/**
 * loading.js — Loading screen with progress bar and fun messages
 *
 * Shows a spinning cat emoji, progress bar, and context-sensitive messages
 * that change based on the current progress percentage.
 *
 * Exports:
 * - showLoading() → void
 * - updateProgress(percent: number, step: string) → void
 * - hideLoading() → void
 */

/**
 * Progress-based fun messages. Each range maps to a set of themed messages
 * that give the user a sense of what's happening at that stage.
 *
 *   0–15%  → early   (warm up / load samples)
 *  15–30%  → analyze (inspecting the user's audio)
 *  30–60%  → match   (finding the best oiia snippets)
 *  60–85%  → stitch  (assembling the result)
 *  85–100% → finish  (final polish)
 */
const PROGRESS_MESSAGES = {
  early:   ['Warming up the cat...', 'Loading oiia samples...'],
  analyze: ['Analyzing your audio...', 'Extracting sonic vibes...'],
  match:   ['Consulting the cat council...', 'Finding the purrfect matches...'],
  stitch:  ['Stitching oiias together...', 'Almost there, meow...'],
  finish:  ['Final touches...', 'Polishing the oiia...'],
};

/** Track last bucket + index to avoid repeating the same message */
let lastBucket = '';
let lastIndex = -1;

/**
 * Pick a fun message appropriate for the current progress percentage.
 * Avoids repeating the same message consecutively within a bucket.
 *
 * @param {number} percent — 0..100
 * @returns {string}
 */
function pickProgressMessage(percent) {
  let bucket;
  if (percent < 15)      bucket = 'early';
  else if (percent < 30) bucket = 'analyze';
  else if (percent < 60) bucket = 'match';
  else if (percent < 85) bucket = 'stitch';
  else                   bucket = 'finish';

  const messages = PROGRESS_MESSAGES[bucket];

  // If we changed bucket, reset the index tracking
  if (bucket !== lastBucket) {
    lastBucket = bucket;
    lastIndex = -1;
  }

  // Pick a random message, avoiding the last one shown in this bucket
  let idx;
  do {
    idx = Math.floor(Math.random() * messages.length);
  } while (idx === lastIndex && messages.length > 1);

  lastIndex = idx;
  return messages[idx];
}

/**
 * Show the loading screen and hide the main/result screens.
 * Resets the progress bar and shows an initial fun message.
 */
export function showLoading() {
  document.getElementById('screen-main').classList.remove('active');
  document.getElementById('screen-result').classList.remove('active');
  document.getElementById('screen-loading').classList.add('active');

  // Reset progress bar
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-percent').textContent = '0%';

  // Reset tracking and show first message
  lastBucket = '';
  lastIndex = -1;
  document.getElementById('loading-message').textContent = pickProgressMessage(0);
}

/**
 * Update the progress bar and loading message.
 * If a descriptive `step` is provided it's shown as-is; otherwise a fun
 * progress-appropriate message is picked automatically.
 *
 * @param {number} percent — 0..100
 * @param {string} [step] — optional descriptive step name
 */
export function updateProgress(percent, step) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  document.getElementById('progress-fill').style.width = `${clamped}%`;
  document.getElementById('progress-percent').textContent = `${clamped}%`;
  document.getElementById('loading-message').textContent =
    step || pickProgressMessage(clamped);
}

/**
 * Hide the loading screen.
 */
export function hideLoading() {
  document.getElementById('screen-loading').classList.remove('active');
}
