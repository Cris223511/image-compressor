<p align="center">
  <img src="assets/logo/logo.png" alt="Squeezo logo" width="120">
</p>

<h1 align="center">Squeezo</h1>

<p align="center">
  <b>An image compressor that cuts file size without losing quality or dimensions.</b> Drop in
  single photos, folders or a whole .zip, check what is inside and download everything lighter.
  <i>It all happens in your browser: your images are never uploaded to any server.</i>
</p>

<p align="center">
  <a href="README.md">Español</a> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20development-1861ff" alt="in development">
  <img src="https://img.shields.io/badge/React-18-1861ff" alt="react 18">
  <img src="https://img.shields.io/badge/TypeScript-5-1861ff" alt="typescript 5">
  <img src="https://img.shields.io/badge/Vite-5-1861ff" alt="vite 5">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license"></a>
</p>

---

## How it works

Drag your images in, Squeezo compresses them and you download the result. There is nothing to set up by default: the file gets smaller and looks the same, with the same width, the same height and the same sharpness. If you would rather decide yourself, there are optional settings.

It is meant for anyone with a heavy folder of photos, screenshots or designs who needs to send it, upload it to a website or free up space without anything showing.

## Features

- **No quality loss.** Compression looks for the smallest size that still looks identical to the original. If an image cannot be reduced any further, it is left as it is and you are told.
- **Any image format.** JPG, PNG, WebP, AVIF, GIF (animated too), SVG, BMP, TIFF and HEIC, among others.
- **.zip files and folders.** Up to 1000 images per zip, with folders and subfolders. Before compressing, the contents are shown as a tree with thumbnails and the size of each file, so you pick what goes in.
- **Flags what is not an image.** Videos and other files inside the zip are skipped, and you are told how many and what kind.
- **Optional settings.** Compression level, conversion to WebP or AVIF, metadata removal and resizing. All off by default.
- **Before and after comparison** to check the result image by image.
- **Flexible download.** One by one, or everything together in a .zip with the same folder structure.
- **Spanish and English,** with light and dark themes.

## Security and privacy

> **Your images are processed entirely on your computer.** Nothing is uploaded to any server. There are no accounts, no tracking and no analytics.

Since the site accepts any file, these measures are in place:

- The real content of each file (its binary signature) is checked, not just the extension. Only images get in.
- Nothing you upload is ever executed. Files that are not images are discarded.
- Zips are checked against malicious paths, suspicious compression ratios and nested or encrypted archives.
- SVG files are stripped of scripts before they are processed.
- The pixel size of each image is capped so none can exhaust memory.
- Security headers and a strict content policy, with no third-party scripts.

## Technologies

| Component | Tool | What it is used for |
| --------- | ---- | ------------------- |
| Interface | [React 18](https://react.dev/) and [TypeScript 5](https://www.typescriptlang.org/) | The app, with strict typing |
| Bundling | [Vite 5](https://vite.dev/) | Dev server and production build |
| Styles | [Tailwind CSS](https://tailwindcss.com/) | The design and the light or dark theme |
| Compression | [jSquash](https://github.com/jamsinclair/jSquash) (MozJPEG, OxiPNG, WebP, AVIF) | The codecs, compiled to WebAssembly |
| Parallelism | Web Workers | Compress several images at once without freezing the page |
| Zip files | [fflate](https://github.com/101arrowz/fflate) | Read and create zips without loading them fully into memory |
| Deployment | [Vercel](https://vercel.com/) | Static site, no server of its own |

## Run locally

You need **Node.js 18** or later.

```
npm install
npm run dev
```

## Commands

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Dev server with hot reload. |
| `npm run build` | Type-checks and builds the production version into `dist`. |
| `npm run preview` | Serves the build output locally. |

## Contributing

Bug reports and ideas are welcome in the [issues](https://github.com/Cris223511/image-compressor/issues). To contribute code, open a pull request.

## License

**MIT** © [Cris223511](https://github.com/Cris223511). You are free to use, modify and share it. The full text is in the [LICENSE](LICENSE) file.
