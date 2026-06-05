# Pixify - Photo & PDF Resizer 

A beautiful, private, and secure photo & PDF resizing tool that runs entirely in your browser. No uploads — your files never leave your device.

## ✨ Features

- **100% Private** — All processing happens locally in your browser. No server uploads.
- **Image Resize** — JPEG, PNG, WebP with high-quality multi-step downsampling.
- **PDF Resize** — Resize entire PDFs or specific pages. Scale up or down with full control.
- **Resize by Percentage, Pixels, or CM** — Choose the unit that fits your workflow.
- **Set Custom DPI** — Control print/output resolution.
- **Maintain Aspect Ratio** — Lock/unlock with one click.
- **High-Quality Downscaling** — Multi-step resampling preserves detail when shrinking.
- **Multiple Output Formats** — Export images as JPEG, PNG, or WebP. PDFs as PDF.
- **Adjustable Quality** — Fine-tune compression vs. file size.
- **PDF Page Selection** — Resize all pages or a custom range (e.g., pages 1-5).
- **PDF Page Preview** — Navigate through pages with thumbnails before resizing.
- **Social & Print Presets** — Instagram, Facebook, Twitter, LinkedIn, A4, A3, Letter, Legal, and more.
- **Before/After Preview** — Split, original, or processed view modes (images).
- **PWA** — Install as a standalone app on desktop and mobile.
- **Drag & Drop** — Simple, intuitive upload.

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/saurabhpanchal/Pixify.git
cd Pixify

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## 📦 Deploy to GitHub Pages

This project is ready to deploy via GitHub Pages:

1. Push to `main` (or `master`) branch
2. Go to **Settings → Pages** in your GitHub repo
3. Under **Build and Deployment**, select **GitHub Actions** as the source
4. The included workflow (`.github/workflows/deploy.yml`) will auto-deploy on every push

To deploy manually:

```bash
npm run build
# Then push the `dist` folder to a `gh-pages` branch
```

> **Note:** If deploying to `https://username.github.io/repo-name/`, update the `base` in `vite.config.ts` to `'/repo-name/'`.

## 🛠️ Tech Stack

- **React 19** + **TypeScript**
- **Vite** (lightning-fast builds)
- **Tailwind CSS v4** (utility-first styling)
- **PWA** via `vite-plugin-pwa`
- **pdfjs-dist** for PDF rendering
- **jsPDF** for PDF generation
- **Canvas API** for image processing
- **JFIF/pHYs binary injection** for DPI metadata

## 🔒 Privacy

This app processes everything entirely in your browser. No file data is ever sent to any server. The app works fully offline once loaded.

## ❤️ Credits

Made with ❤️ by **Saurabh Panchal**
