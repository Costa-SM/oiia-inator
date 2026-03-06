/**
 * youtube.js — YouTube link audio extraction
 *
 * Fetches audio from a YouTube video URL using the Cobalt API,
 * converts the response to a File object, and passes it to the callback.
 *
 * Exports:
 * - initYouTube(onFileReady: (file: File | null) => void) → void
 */

// Cobalt API endpoint (public, CORS-friendly)
const COBALT_API_URL = 'https://api.cobalt.tools';

/**
 * Extract a YouTube video ID from various URL formats.
 *
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 *
 * @param {string} url
 * @returns {string|null} — video ID or null if invalid
 */
function extractVideoId(url) {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace('www.', '').replace('m.', '');

    if (hostname === 'youtube.com') {
      // /watch?v=ID, /embed/ID, /shorts/ID
      if (parsed.searchParams.has('v')) {
        return parsed.searchParams.get('v');
      }
      const pathMatch = parsed.pathname.match(/^\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) return pathMatch[2];
    }

    if (hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      if (id && id.length === 11) return id;
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

/**
 * Validate a YouTube URL and return whether the fetch button should be enabled.
 * @param {string} value
 * @returns {boolean}
 */
function isValidYouTubeUrl(value) {
  return extractVideoId(value) !== null;
}

/**
 * Show a status message in the YouTube panel.
 * @param {string} message
 * @param {'info'|'error'|'success'} type
 */
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('youtube-status');
  statusEl.textContent = message;
  statusEl.className = `youtube-status ${type}`;
  statusEl.classList.remove('hidden');
}

/**
 * Hide the status message.
 */
function hideStatus() {
  const statusEl = document.getElementById('youtube-status');
  statusEl.classList.add('hidden');
}

/**
 * Fetch audio from YouTube using the Cobalt API.
 *
 * @param {string} youtubeUrl — full YouTube URL
 * @returns {Promise<Blob>} — audio blob
 */
async function fetchYouTubeAudio(youtubeUrl) {
  // Step 1: Request audio URL from Cobalt API
  const response = await fetch(`${COBALT_API_URL}/`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: youtubeUrl,
      downloadMode: 'audio',
      audioFormat: 'wav',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const detail = errorData?.error?.code || response.statusText;
    throw new Error(`Cobalt API error (${response.status}): ${detail}`);
  }

  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.error?.code || 'Unknown error from Cobalt API');
  }

  // Cobalt returns a URL to the audio file
  const audioUrl = data.url;
  if (!audioUrl) {
    throw new Error('Cobalt API did not return a download URL');
  }

  // Step 2: Fetch the actual audio file
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio (${audioResponse.status})`);
  }

  return audioResponse.blob();
}

/**
 * Initialize the YouTube URL input panel.
 *
 * @param {(file: File | null) => void} onFileReady — called when audio is fetched
 */
export function initYouTube(onFileReady) {
  const urlInput = document.getElementById('youtube-url');
  const btnFetch = document.getElementById('btn-fetch-yt');

  // Enable/disable fetch button based on URL validity
  urlInput.addEventListener('input', () => {
    const valid = isValidYouTubeUrl(urlInput.value);
    btnFetch.disabled = !valid;
    if (!urlInput.value.trim()) {
      hideStatus();
    }
  });

  // Also accept Enter key
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !btnFetch.disabled) {
      btnFetch.click();
    }
  });

  // Fetch audio on button click
  btnFetch.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const videoId = extractVideoId(url);
    if (!videoId) {
      showStatus('Invalid YouTube URL. Please check and try again.', 'error');
      return;
    }

    // Disable input while fetching
    btnFetch.disabled = true;
    urlInput.disabled = true;
    showStatus('Fetching audio from YouTube...', 'info');

    try {
      const audioBlob = await fetchYouTubeAudio(url);

      // Convert blob to a File object
      const fileName = `youtube-${videoId}.wav`;
      const file = new File([audioBlob], fileName, { type: audioBlob.type || 'audio/wav' });

      showStatus(`Audio fetched successfully! (${(audioBlob.size / 1024 / 1024).toFixed(1)} MB)`, 'success');
      onFileReady(file);
    } catch (err) {
      showStatus(`Failed to fetch: ${err.message}`, 'error');
      onFileReady(null);
    } finally {
      btnFetch.disabled = !isValidYouTubeUrl(urlInput.value);
      urlInput.disabled = false;
    }
  });
}
