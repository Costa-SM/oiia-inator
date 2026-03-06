/**
 * dropzone.js — File drag-and-drop / picker
 *
 * Exports:
 * - initDropzone(onFileSelected: (file: File | null) => void) → void
 */

/**
 * Wire up the #dropzone element and #file-input for click-to-browse and
 * drag-and-drop file selection. Validates audio files and manages the
 * file-info display + process button state.
 *
 * @param {(file: File | null) => void} onFileSelected
 */
export function initDropzone(onFileSelected) {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const fileInfo = document.getElementById('file-info');
  const fileName = document.getElementById('file-name');
  const fileRemove = document.getElementById('file-remove');
  const btnProcess = document.getElementById('btn-process');

  /** @type {File | null} */
  let currentFile = null;

  /** @type {number | null} */
  let errorTimeout = null;

  // Counter to track nested dragenter/dragleave events from child elements,
  // preventing the highlight from flickering when dragging over children.
  let dragCounter = 0;

  // --- Click to browse ---
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  // --- Drag and drop ---
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  dropzone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (dragCounter === 1) {
      dropzone.classList.add('dragover');
    }
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
      dropzone.classList.remove('dragover');
    }
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    dropzone.classList.remove('dragover');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // --- Remove button ---
  fileRemove.addEventListener('click', (e) => {
    e.stopPropagation(); // Don't trigger dropzone click
    clearSelection();
  });

  // --- Helpers ---

  /**
   * Validate and accept an audio file.
   * @param {File} file
   */
  function handleFile(file) {
    // Clear any previous error state
    clearError();

    if (!file.type.startsWith('audio/')) {
      // Not an audio file — shake the dropzone and show an error message
      showError(`"${file.name}" is not an audio file. Please drop an audio file (MP3, WAV, OGG, etc.)`);
      return;
    }

    currentFile = file;

    // Show file info
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    dropzone.classList.add('has-file');

    // Enable process button
    btnProcess.disabled = false;

    onFileSelected(file);
  }

  /**
   * Show an error message below the dropzone with a shake animation.
   * Auto-clears after 4 seconds.
   * @param {string} message
   */
  function showError(message) {
    dropzone.classList.add('shake');
    setTimeout(() => dropzone.classList.remove('shake'), 500);

    // Create or reuse an error element
    let errorEl = dropzone.parentElement.querySelector('.dropzone-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'dropzone-error';
      // Insert right after the dropzone
      dropzone.insertAdjacentElement('afterend', errorEl);
    }
    errorEl.textContent = message;
    errorEl.classList.add('visible');

    // Auto-dismiss after 4 seconds
    errorTimeout = setTimeout(() => clearError(), 4000);
  }

  /**
   * Clear any visible error message.
   */
  function clearError() {
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      errorTimeout = null;
    }
    const errorEl = dropzone.parentElement.querySelector('.dropzone-error');
    if (errorEl) {
      errorEl.classList.remove('visible');
    }
  }

  /**
   * Clear the current file selection.
   */
  function clearSelection() {
    currentFile = null;
    fileInput.value = '';

    // Hide file info
    fileInfo.classList.add('hidden');
    dropzone.classList.remove('has-file');

    // Disable process button
    btnProcess.disabled = true;

    onFileSelected(null);
  }
}
