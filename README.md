# The oiia-inator

Turn any audio into **oiiaioiiiai** cat sounds.

Drop an audio file, tweak the settings, and the oiia-inator will reconstruct it entirely from snippets of the legendary oiia cat song.

## How it works

1. The oiia source audio is chopped into small overlapping snippets
2. Audio features (MFCCs, spectral centroid, chroma, energy) are extracted from each snippet
3. Your input audio is analyzed the same way, frame by frame
4. Each frame of your audio is matched to the closest oiia snippet
5. The matched snippets are stitched together with overlap-add synthesis

All processing happens **client-side in your browser** — no server, no uploads.

## Features

- **Configurable snippet size** (30–300ms) — smaller = more accurate, larger = smoother
- **4 matching strategies:**
  - **Nearest Match** — closest feature distance per frame
  - **Smooth** — prefers consecutive snippets for continuity
  - **Chaos** — random pick from top-5 matches (different every time!)
  - **Musical** — weights pitch/chroma for melodic preservation
- **Pitch shifting** — optionally shift each snippet to match the target's pitch
- **Download** — export your oiia-ified creation as a WAV file

## Setup

```bash
npm install
```

### Add the oiia source audio

Place your oiia cat song audio file as:

```
public/assets/oiia_source.wav
```

### Development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

The built files will be in `dist/` — ready for GitHub Pages or any static host.

## Tech stack

- [Vite](https://vitejs.dev/) — build tool
- [Meyda](https://meyda.js.org/) — audio feature extraction
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — audio decoding & playback
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) — background processing
