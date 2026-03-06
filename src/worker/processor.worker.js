/**
 * processor.worker.js — Web Worker that runs the oiia-inator pipeline
 *
 * Receives:
 *   { type: 'process', payload: { targetChannels, oiiaChannels, sampleRate, settings } }
 *
 * Sends:
 *   { type: 'progress', payload: { percent, step, message } }
 *   { type: 'result',   payload: { audio, sampleRate, stats } }
 *   { type: 'error',    payload: { message } }
 */

import { buildCorpus } from '../audio/corpus.js';
import { extractFeaturesForAll, extractTargetFrames } from '../audio/analyzer.js';
import { matchFrames } from '../audio/matcher.js';
import { synthesize } from '../audio/synthesizer.js';
import { detectPitch, matchPitch } from '../audio/pitch.js';

/**
 * Post a progress update to the main thread.
 */
function reportProgress(percent, step, message) {
  self.postMessage({
    type: 'progress',
    payload: { percent, step, message: message || step },
  });
}

/**
 * Mix multi-channel audio to mono by averaging channels.
 */
function mixToMono(channels) {
  if (channels.length === 1) return channels[0];

  const length = channels[0].length;
  const mono = new Float32Array(length);
  const numChannels = channels.length;

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      sum += channels[ch][i];
    }
    mono[i] = sum / numChannels;
  }
  return mono;
}

/**
 * Main processing pipeline.
 */
async function process(payload) {
  const { targetChannels, oiiaChannels, sampleRate, settings } = payload;
  const { snippetSizeMs, strategy, pitchShift } = settings;

  try {
    // --- Step 1: Mix to mono ---
    reportProgress(2, 'Preparing audio...', 'Loading oiia samples...');
    const oiiaMono = mixToMono(oiiaChannels);
    const targetMono = mixToMono(targetChannels);

    // --- Step 2: Build corpus ---
    reportProgress(8, 'Segmenting oiia source...', 'Chopping up the cat sounds...');
    const corpus = buildCorpus(oiiaMono, sampleRate, snippetSizeMs);

    if (corpus.length === 0) {
      throw new Error('Oiia source too short for the selected snippet size');
    }

    // --- Step 3: Extract corpus features ---
    reportProgress(15, 'Analyzing oiia snippets...', 'Cataloging cat frequencies...');
    const corpusFeatures = extractFeaturesForAll(corpus, sampleRate);
    reportProgress(30, 'Corpus analyzed', 'Cat council database built!');

    // --- Step 4: Analyze target audio ---
    reportProgress(35, 'Analyzing target audio...', 'Extracting sonic vibes...');
    const { frames: targetFrames, features: targetFeatures } = extractTargetFrames(
      targetMono,
      sampleRate,
      snippetSizeMs
    );
    reportProgress(50, 'Target analyzed', 'Your audio has been studied!');

    // --- Step 5: Pitch detection (if enabled) ---
    let corpusPitches = null;
    let targetPitches = null;

    if (pitchShift) {
      reportProgress(52, 'Detecting pitches...', 'Tuning the cat frequencies...');
      corpusPitches = corpus.map((s) => detectPitch(s.raw, sampleRate));
      targetPitches = targetFrames.map((f) => detectPitch(f, sampleRate));
      reportProgress(58, 'Pitches detected', 'Pitch detection complete!');
    }

    // --- Step 6: Match frames to snippets ---
    reportProgress(60, 'Matching frames...', 'Finding the purrfect matches...');
    const matchedIndices = matchFrames(targetFeatures, corpusFeatures, strategy);
    reportProgress(75, 'Frames matched', 'Matches found!');

    // --- Step 7: Apply pitch shifting if enabled ---
    // Store per-frame shifted audio so each frame gets the correct pitch,
    // even when multiple frames match the same corpus snippet with different targets.
    let perFrameRaws = null;

    if (pitchShift && corpusPitches && targetPitches) {
      reportProgress(77, 'Pitch-shifting snippets...', 'Convincing the cat to change key...');

      perFrameRaws = new Array(matchedIndices.length);

      for (let i = 0; i < matchedIndices.length; i++) {
        const corpusIdx = matchedIndices[i];
        const snippetPitch = corpusPitches[corpusIdx];
        const framePitch = targetPitches[i];

        // Pitch-shift this snippet for this specific frame's target pitch
        perFrameRaws[i] = matchPitch(
          corpus[corpusIdx].raw,
          snippetPitch,
          framePitch,
          sampleRate
        );

        if (i % 100 === 0) {
          const pct = 77 + (i / matchedIndices.length) * 8;
          reportProgress(pct, 'Pitch-shifting...', 'Almost there, meow...');
        }
      }

      reportProgress(85, 'Pitch-shifting done', 'All snippets tuned!');
    }

    // --- Step 8: Synthesize output ---
    const synthStart = pitchShift ? 86 : 78;
    reportProgress(synthStart, 'Synthesizing audio...', 'Stitching oiias together...');
    const outputAudio = synthesize(
      matchedIndices,
      corpus,
      targetFrames,
      sampleRate,
      0.5,
      perFrameRaws
    );
    reportProgress(95, 'Synthesis complete', 'Final touches...');

    // --- Step 9: Compute stats ---
    const uniqueSnippets = new Set(matchedIndices).size;

    reportProgress(100, 'Done!', 'Your oiia is ready!');

    // --- Send result back (transfer the buffer for performance) ---
    self.postMessage(
      {
        type: 'result',
        payload: {
          audio: outputAudio,
          sampleRate,
          stats: {
            totalSnippets: matchedIndices.length,
            uniqueSnippets,
          },
        },
      },
      [outputAudio.buffer]
    );
  } catch (err) {
    self.postMessage({
      type: 'error',
      payload: { message: err.message || 'Unknown error during processing' },
    });
  }
}

// --- Listen for messages from main thread ---
self.addEventListener('message', (e) => {
  const { type, payload } = e.data;
  if (type === 'process') {
    process(payload);
  }
});
