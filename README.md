# Grok Motion

A browser-based studio for the Grok mascot: pick a body silhouette, recolor it, scrub the original clip catalog, and edit keyframes live. Everything renders in the browser with no backend.

## Run locally

Install [Vite+](https://viteplus.dev/guide/), which manages the runtime and package manager. This repository pins its package manager in `package.json` and its Vite+ toolchain in `pnpm-workspace.yaml`.

```sh
vp install
vp dev
```

Open the URL printed by the development server. No API keys or environment variables are required.

## Check and build

```sh
vp check
vp test
vp run build
```

`vp check` checks formatting, lint rules, and TypeScript types. Use `vp check --fix` to apply supported fixes.

The production build is in `dist`. Run `vp preview` to inspect it locally. Deploy `dist` on a static host at the origin root. The app uses clean paths, so the host must serve `index.html` for unknown paths, including `/editor`.

## Pages

- `/` — the gallery: a live Grok sphere with shape, color, and state controls, plus every recipe state rendered side by side.
- `/editor` — the keyframe editor: timeline, easing, clip and state data, and a live stage.

## Keep your work

Edited recipes, the chosen body shape, and the light/dark stage theme stay in your browser's local storage on the current origin. They do not sync across devices. Clearing browser data removes them.

## Project layout

- `src/app` owns the shell and the route map.
- `src/pages` owns the gallery and editor pages.
- `src/mascot` owns the mascot look, silhouettes, geometry, and outlines.
- `src/motion/model` owns recipes, storage, session state, and export.
- `src/motion/engine` adapts the 3D bot engine.
- `src/motion/ui` holds shared motion views.
- `src/motion/editor` holds editor-only panels and the timeline.

## How it renders

Every shape renders through the 3D bot-engine bundle, so the body turns through 360° and morphs between silhouettes when you pick a new one. Custom outlines fall back to the 2D SVG engine.

## License

Grok Motion's original source code is available under the [MIT license](LICENSE). The Grok name, mascot design, and branding are excluded. See [NOTICE.md](NOTICE.md). Dependencies and bundled fonts retain their own licenses.
