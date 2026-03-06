/**
 * matcher.js — Matching strategies
 *
 * Given target frame features and corpus snippet features, selects the
 * best corpus snippet for each target frame using one of 4 strategies.
 */

/**
 * Convert a FeatureVector to a flat numeric array with optional weights.
 *
 * @param {{ mfcc: number[], rms: number, spectralCentroid: number, chroma: number[] }} f
 * @param {{ mfcc?: number, rms?: number, spectralCentroid?: number, chroma?: number }} [weights]
 * @returns {number[]}
 */
function featureToVector(f, weights = {}) {
  const wMfcc = weights.mfcc ?? 1;
  const wRms = weights.rms ?? 1;
  const wCentroid = weights.spectralCentroid ?? 1;
  const wChroma = weights.chroma ?? 1;

  const vec = [];
  for (const c of f.mfcc) vec.push(c * wMfcc);
  vec.push(f.rms * wRms);
  vec.push(f.spectralCentroid * wCentroid);
  for (const c of f.chroma) vec.push(c * wChroma);
  return vec;
}

/**
 * Compute cosine distance between two vectors.
 * Returns a value in [0, 2]: 0 = identical direction, 2 = opposite.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function cosineDistance(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 1; // undefined → treat as "maximally different"
  return 1 - dot / (magA * magB);
}

/**
 * Find the K nearest corpus indices by feature distance.
 *
 * @param {number[]} targetVec
 * @param {number[][]} corpusVecs
 * @param {number} k
 * @returns {{ index: number, distance: number }[]}
 */
function kNearest(targetVec, corpusVecs, k) {
  if (k <= 0) return [];

  const corpusLength = corpusVecs.length;
  if (corpusLength === 0) return [];

  // Fast path: k === 1 → single linear scan for the minimum (avoids O(N log N) sort).
  if (k === 1) {
    let bestIndex = 0;
    let bestDistance = cosineDistance(targetVec, corpusVecs[0]);
    for (let i = 1; i < corpusLength; i++) {
      const d = cosineDistance(targetVec, corpusVecs[i]);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
    return [{ index: bestIndex, distance: bestDistance }];
  }

  // General case: small k > 1 — maintain a sorted array of the best k elements.
  /** @type {{ index: number, distance: number }[]} */
  const nearest = [];

  for (let i = 0; i < corpusLength; i++) {
    const d = cosineDistance(targetVec, corpusVecs[i]);

    if (nearest.length < k || d < nearest[nearest.length - 1].distance) {
      // Find insertion point to keep ascending order by distance.
      let insertAt = nearest.length;
      for (let j = 0; j < nearest.length; j++) {
        if (d < nearest[j].distance) {
          insertAt = j;
          break;
        }
      }
      nearest.splice(insertAt, 0, { index: i, distance: d });

      // Trim to k best candidates.
      if (nearest.length > k) {
        nearest.pop();
      }
    }
  }

  return nearest;
}

/**
 * Pre-compute all corpus feature vectors.
 *
 * @param {import('./analyzer.js').FeatureVector[]} corpusFeatures
 * @param {object} [weights]
 * @returns {number[][]}
 */
function precomputeVectors(features, weights) {
  return features.map((f) => featureToVector(f, weights));
}

// --- Strategies ---

/**
 * Nearest-neighbor: pick the single closest corpus snippet for each frame.
 */
function matchNearest(targetFeatures, corpusFeatures) {
  const corpusVecs = precomputeVectors(corpusFeatures);
  return targetFeatures.map((tf) => {
    const tv = featureToVector(tf);
    return kNearest(tv, corpusVecs, 1)[0].index;
  });
}

/**
 * Smooth (continuity-optimized): nearest-neighbor with a penalty
 * for jumping far from the previous selected snippet index.
 * Uses a simple greedy forward pass with continuity cost.
 */
function matchSmooth(targetFeatures, corpusFeatures) {
  const lambda = 0.3;
  const corpusVecs = precomputeVectors(corpusFeatures);
  const result = [];

  for (let i = 0; i < targetFeatures.length; i++) {
    const tv = featureToVector(targetFeatures[i]);
    let bestIdx = 0;
    let bestCost = Infinity;

    for (let j = 0; j < corpusVecs.length; j++) {
      const featureDist = cosineDistance(tv, corpusVecs[j]);
      let continuityPenalty = 0;
      if (i > 0) {
        continuityPenalty = lambda * Math.abs(j - result[i - 1] - 1) / corpusVecs.length;
      }
      const cost = featureDist + continuityPenalty;
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = j;
      }
    }
    result.push(bestIdx);
  }

  return result;
}

/**
 * Chaos: pick randomly from the top 5 closest matches.
 */
function matchChaos(targetFeatures, corpusFeatures) {
  const k = Math.min(5, corpusFeatures.length);
  const corpusVecs = precomputeVectors(corpusFeatures);

  return targetFeatures.map((tf) => {
    const tv = featureToVector(tf);
    const nearest = kNearest(tv, corpusVecs, k);
    const pick = Math.floor(Math.random() * nearest.length);
    return nearest[pick].index;
  });
}

/**
 * Musical: weight chroma (3x) and spectral centroid (2x) more heavily
 * so the melody and brightness come through.
 */
function matchMusical(targetFeatures, corpusFeatures) {
  const weights = { mfcc: 1, rms: 1, spectralCentroid: 2, chroma: 3 };
  const corpusVecs = precomputeVectors(corpusFeatures, weights);

  return targetFeatures.map((tf) => {
    const tv = featureToVector(tf, weights);
    return kNearest(tv, corpusVecs, 1)[0].index;
  });
}

// --- Public API ---

const STRATEGIES = {
  nearest: matchNearest,
  smooth: matchSmooth,
  chaos: matchChaos,
  musical: matchMusical,
};

/**
 * Match target frames to corpus snippets using the chosen strategy.
 *
 * @param {import('./analyzer.js').FeatureVector[]} targetFeatures
 * @param {import('./analyzer.js').FeatureVector[]} corpusFeatures
 * @param {string} strategy — one of: 'nearest', 'smooth', 'chaos', 'musical'
 * @returns {number[]} — corpus snippet indices, one per target frame
 */
export function matchFrames(targetFeatures, corpusFeatures, strategy = 'nearest') {
  const fn = STRATEGIES[strategy];
  if (!fn) {
    throw new Error(`Unknown strategy: "${strategy}". Use: ${Object.keys(STRATEGIES).join(', ')}`);
  }
  return fn(targetFeatures, corpusFeatures);
}
