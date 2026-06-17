# Avant Garde RU font

Place a Cyrillic-capable Avant Garde font file here and name it one of:

- `AvantGardeRU.woff2`
- `AvantGardeRU.woff`
- `AvantGardeRU.otf`

The overlay loads these files through `@font-face` in `src/styles.css`.
If the file is absent, the UI falls back to `Russo One`, which supports Cyrillic.
