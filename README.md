# DJMixr

DJMixr is a local-first React/Vite DJ workstation for loading, auditioning, and blending local audio files in the browser.

## Included

- Dual Deck A/B console with jog wheels, transport, cue pads, pitch, filter, and deck volume controls.
- Web Audio API engine with independent deck graphs, EQ nodes, master compression, analyser meters, equal-power crossfader, and full-track loop mode.
- Local audio import through file pickers and drag-and-drop. Audio files stay in the browser session and are not uploaded.
- Canvas-based dual waveform visualization with realtime playhead and deck coloring.
- Music library search, favorites, metadata columns, queue actions, playlist scaffolding, IndexedDB metadata caching, and localStorage preferences.
- Responsive dark hardware-inspired UI for desktop and smaller screens.
- Keyboard shortcuts: Space, A, D, Q, P, S, arrows, M, L, C, and R.

## Run locally

```bash
pnpm install
pnpm dev
```

Then open the Vite URL shown in the terminal. Create a production bundle with:

```bash
pnpm build
```

## Notes

Reverse playback is intentionally reserved for a future dedicated time-stretch DSP engine. The rest of the initial console and local playback path is wired for real browser interaction.
