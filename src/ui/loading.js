/**
 * loading.js — Loading screen with progress bar and fun messages
 *
 * Exports:
 * - showLoading() → void
 * - updateProgress(percent: number, step: string) → void
 * - hideLoading() → void
 */

const FUN_MESSAGES = [
  'Consulting the cat council...',
  'oiia oiia oiia...',
  'Herding audio cats...',
  'Spinning the cat...',
  'Meow-nching numbers...',
  'Tuning the cat frequencies...',
  'Convincing the cat to cooperate...',
  'Almost there... cat nap in progress...',
  'Assembling the oiia orchestra...',
  'Generating maximum oiia energy...',
];

let lastMessageIndex = -1;

/**
 * Pick a random fun message, avoiding repeating the last one shown.
 * @returns {string}
 */
function pickFunMessage() {
  let idx;
  do {
    idx = Math.floor(Math.random() * FUN_MESSAGES.length);
  } while (idx === lastMessageIndex && FUN_MESSAGES.length > 1);
  lastMessageIndex = idx;
  return FUN_MESSAGES[idx];
}

/**
 * Show the loading screen and hide the main screen.
 */
export function showLoading() {
  document.getElementById('screen-main').classList.remove('active');
  document.getElementById('screen-result').classList.remove('active');
  document.getElementById('screen-loading').classList.add('active');

  // Reset progress
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-percent').textContent = '0%';
  document.getElementById('loading-message').textContent = pickFunMessage();
}

/**
 * Update the progress bar and loading message.
 *
 * @param {number} percent — 0..100
 * @param {string} step — descriptive step name
 */
export function updateProgress(percent, step) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  document.getElementById('progress-fill').style.width = `${clamped}%`;
  document.getElementById('progress-percent').textContent = `${clamped}%`;
  document.getElementById('loading-message').textContent = step || pickFunMessage();
}

/**
 * Hide the loading screen.
 */
export function hideLoading() {
  document.getElementById('screen-loading').classList.remove('active');
}
