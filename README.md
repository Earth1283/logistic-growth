# Logistic Growth Lab

An interactive model of logistic population growth, dN/dt = rN(1 − N/K), built with React and Vite.

- Adjust carrying capacity (K), intrinsic growth rate (r), and starting population (N₀) and watch the S curve update live.
- Harvest the population, add migrants, or shrink and restore the habitat to see the population return to K.
- The analysis panels plot growth rate and per-individual growth against population size to show why K is a stable equilibrium.

## Run locally

```sh
npm install
npm run dev      # http://localhost:9091
```

## Demo video and slides

- `./demo/make.sh` renders a product demo video to `media/product-demo.mp4`. See [demo/README.md](demo/README.md).
- `./deck/make.sh` builds a presentation deck to `media/logistic-growth-unhinged.pptx`. It reuses the demo footage, so make the video first. See [deck/README.md](deck/README.md).

## Caching

`npm run build` writes content-hashed files to `dist/assets/`, so any change produces new filenames and browsers never see stale code. `npm run preview` serves hashed assets with `Cache-Control: public, max-age=31536000, immutable` and everything else, including `index.html`, with `no-cache` so visitors always revalidate the page. GitHub Pages does not allow custom headers; there the hashed filenames do the cache busting and Pages' default 10-minute cache applies to `index.html`.
