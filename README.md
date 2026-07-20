# MobileCom RAS website

Marketing site for MobileCom and the M-LINX route accounting platform, built with React,
Vite, and React Three Fiber.

## Local development

```bash
npm install
npm run dev
```

The site includes routeable pages at `/platform`, `/industries`, `/company`, and `/contact`.
Production hosting should direct unknown paths to `index.html` so those routes can load
directly.

## Deploy to GitHub Pages

The site is configured for
[https://pudofkinmini.github.io/mcc-landing-2026/](https://pudofkinmini.github.io/mcc-landing-2026/).
Every push to `main` builds and deploys the site with the
`Deploy to GitHub Pages` workflow.

Before the first deployment, open the repository's **Settings → Pages** and set
**Build and deployment → Source** to **GitHub Actions**. Then merge or push these
files to `main`, or run the workflow manually from the repository's **Actions** tab.

The Vite base path and internal links include the repository name so assets and
navigation work from the Pages project URL. The deployment also creates a `404.html`
copy of the app entry point so direct links and refreshes on nested pages continue
to work.