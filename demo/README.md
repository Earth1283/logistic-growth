# Product demo video

Builds `media/product-demo.mp4`, a 66-second 1080p60 walkthrough of the app. It has a round cursor, zooms that follow the action, click ripples, captions in the corners, and intro and outro title cards.

## Requirements

- Node with the project's dev dependencies (`npm install`). Playwright's Chromium: `npx playwright install chromium`
- Python 3 with `numpy` and `Pillow`
- `ffmpeg` and `ffprobe`
- Network access on the first run, to download the Hanken Grotesk and STIX Two fonts into `demo/fonts/`

## Make the video

```sh
./demo/make.sh
```

This builds the app, serves it on port 9092, captures, renders and encodes. A full run takes about 12 minutes: 10 for the capture, 1 to 2 for the render. It writes:

| Path | What it is |
| --- | --- |
| `media/product-demo.mp4` | The finished video (x264 at quality level 18, where lower is better) |
| `demo/out/frames/` | Raw screenshots from the capture: about 3,700 JPEGs at 2880×1800 (about 2 GB) |
| `demo/out/timeline.json` | Cursor, click, camera and caption events for every frame |
| `demo/out/{intro,main,outro}.mp4` | Rendered clips before they're joined together |

To re-render after changing only the look (camera, cursor, captions or cards), skip the capture:

```sh
SKIP_CAPTURE=1 ./demo/make.sh
```

Environment variables: `WORK` (working folder, default `demo/out`) and `OUT` (output file, default `media/product-demo.mp4`).

## How it works

1. **`capture.mjs`** opens the built app in headless Chrome at 1440×900, 2× pixel density. It fakes the page clock (`Date`, timers and `requestAnimationFrame`) and pauses CSS animations. Each frame advances time by exactly 1/60 s before the screenshot, so playback is smooth however slow the capture is. The cursor really moves and clicks on the page, so hover states and sliders behave as they would for a person. Each frame's cursor position, click and camera target goes into `timeline.json`.
2. **`render.py`** composites each frame with Pillow on all CPU cores, then pipes it to ffmpeg. For each frame it:
   - places the screenshot in a browser window on a gradient background
   - moves a spring-smoothed camera toward the target in the timeline
   - draws the cursor and click ripples
   - animates the corner captions word by word, in whichever corner the cursor avoids

   It also renders the intro and outro cards.
3. **`make.sh`** joins intro → main → outro with ffmpeg `xfade` crossfades and encodes the final file.

## Change the storyline

Edit `script()` at the bottom of `capture.mjs`. It's a list of director calls:

```js
d.camera(chart, { pad: 36 })              // zoom to fit an element ('full' zooms out)
d.caption('01 · The model', 'Growth slows as the habitat fills up.')
await d.moveTo(chart, 1200, { fx: 0.86 }) // glide the cursor (ms, point within the element)
await d.click(button('Start exploring'))  // move, press, ripple
await d.drag(page.locator('#k'), [0.92, 0.3, 0.72], 3000) // drag a range input through fractions
await d.scrollTo(400, 1200)
await d.wait(3000)
d.hideCaption()
```

The visual constants are at the top of `render.py`:

| Constant | Controls |
| --- | --- |
| `WIN_W` | window size |
| `RADIUS` | window corner rounding |
| `URL_TEXT` | address-bar text |
| `Captions` | caption sizes and margins |
| `spring(..., 5.2)` | camera stiffness |

After editing `capture.mjs`, run the full `make.sh`. After editing only `render.py`, `SKIP_CAPTURE=1` is enough.
