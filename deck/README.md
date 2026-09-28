# Presentation deck

Builds `media/logistic-growth-unhinged.pptx`, a 31-slide deck with speaker notes. It covers the math, biology, history, simulation and methods behind the app. It also builds `media/logistic-growth-unhinged.zip`: the deck plus its font files, for Keynote and Google Slides, which ignore embedded fonts.

## Requirements

- Everything in [`demo/README.md`](../demo/README.md). The deck reuses the demo footage, so **run `./demo/make.sh` first**; it needs `demo/out/frames/` and `media/product-demo.mp4`.
- Python `fonttools`, used to embed the fonts: `pip install fonttools`
- `pptxgenjs` comes with the project's dev dependencies (`npm install`)

## Make the deck

```sh
./deck/make.sh
```

This takes about a minute. It serves the built app on port 9093 and runs these steps:

| Step | Script | Output in `deck/out/` |
| --- | --- | --- |
| Screenshot the app in specific states (each scenario, the meteor, every tab, dark mode) | `assets.mjs` | `img/chart_*.png`, `img/tab_*.png`, `img/ui_*.jpg` |
| Cut GIFs from the demo frames | `gifs.sh` | `img/{scurve,slider,meteor,reindeer}.gif` |
| Draw backgrounds, colony textures and the corner S-curve progress motif | `art.py` | `img/bg_*.jpg`, `img/motif_*.png` |
| Re-encode the trailer and grab its cover frame | `make.sh` | `trailer.mp4`, `img/trailer_cover.png` |
| Lay out the slides | `build.mjs` | `deck.pptx` |
| Embed the fonts and drop duplicate images | `finalize.py` | `media/logistic-growth-unhinged.pptx` |

Environment variables: `OUT` (deck path) and `BUNDLE` (zip path).

## Fonts

`deck/fonts/` holds the five families the deck uses, each with its OFL license:

| Family | Role |
| --- | --- |
| Anton | headlines |
| Instrument Serif | italic asides |
| JetBrains Mono | small labels and data |
| Hanken Grotesk | body text |
| STIX Two Text | math |

`finalize.py` wraps each TTF in an EOT header and embeds it as `ppt/fonts/*.fntdata`, so PowerPoint for Windows and Mac shows the deck correctly without installing anything. To preview the deck in LibreOffice, install the fonts first (for example, copy them to `~/.local/share/fonts/`). Otherwise it substitutes other fonts and the layout looks wrong.

## Editing slides

Every slide is a block in `build.mjs`. The helpers keep the type system consistent:

| Helper | Draws |
| --- | --- |
| `frame(kicker)` | background, specimen label, `N = x · K = 31` counter, progress curve |
| `headline()` | Anton headline |
| `voice()` | italic serif aside |
| `body()` | body text |
| `mono()` | small monospaced label |
| `stat()` | big number with a label |
| `card()` | dark panel |
| `section()` | full-bleed section divider |

The charts are real PowerPoint charts. Their data comes from importing `src/sim.js` and `src/presets.js`, so they stay in sync with the app.

If you add or remove slides, update `TOTAL` in `build.mjs` and the slide count passed to `art.py` in `make.sh`. The build fails if they don't match.
