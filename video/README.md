# Ascend demo video

The Remotion project in `src/` edits the three-minute, 1080p, music-led Ascend demo. The film uses real UI captures from a fictional fixture-backed app session and a sample `study-notes.pdf` generated for the demo. It has no narration. The five role views are AI coworker perspectives; the collaboration section shows two students and a support-to-engineering handoff.

Final files: `out/ascend-demo.mp4` (music and sound effects) and `out/ascend-demo-no-music.mp4` (sound effects only). The latter is useful if the soundtrack needs replacing.

- `capture.mjs` records the local app session and its UI elements into `public/captures/`.
- `prepare-assets.mjs` selects readable crops, copies bundled audio, and creates the 180-second music bed in `public/`.
- `src/AscendFilm.tsx` contains the 180-second edit.
- `DESIGN.md` records visual and editorial decisions. `ASSET_SOURCES.md` records provenance.

With dependencies installed, render on this Windows setup using the local Edge browser:

```powershell
.\node_modules\.bin\remotion.cmd render src/index.ts AscendFilm out/ascend-demo.mp4 --browser-executable 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --concurrency=4 --codec=h264 --crf=20
```

The final exports use `finish-video.mjs` to assemble the revised coach, teammate, and engineering shots and mix the instrumental track. Run it after rendering the three named corrected segments if you revise those shots.
