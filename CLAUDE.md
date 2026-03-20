# Computational Theory Monorepo

Interactive web-based tools for computational entrepreneurship theory. Deployed on Vercel.

## Project Structure

- `packages/*/` — Vite + React source code (5 tools)
- `static/*/` — Static HTML tools (2 tools: venture-underground, venturing-function)
- `{tool-name}/` (root level) — **Built output** served by Vercel (do NOT edit directly)
- `shared.css` — Shared CSS variables and navigation styles
- `index.html` — Home page / navigation hub
- `build.js` — Build orchestration script

## Build & Deploy Workflow

**Critical**: Vercel serves built output from root-level directories, not from `packages/`.

After changing any Vite tool source in `packages/*/`:
1. Commit the source changes
2. Run `npm run build`
3. Commit the rebuilt output (root-level `{tool-name}/` directory)
4. Push both commits

Preview locally: `npm run dev:{tool-name}` (e.g., `npm run dev:theory-canvas`)

## Vite Tools

| Tool | Package | Dev Command |
|------|---------|-------------|
| Theory Canvas | `@computational-theory/theory-canvas` | `npm run dev:theory-canvas` |
| Well-being Simulator | `@computational-theory/well-being` | `npm run dev:well-being` |
| Ergodicity Explorer | `@computational-theory/ergodicity-explorer` | `npm run dev:ergodicity-explorer` |
| Belief Validation | `@computational-theory/belief-validation` | `npm run dev:belief-validation` |
| Generative Renewal | `@computational-theory/generative-renewal` | `npm run dev:generative-renewal` |

## Static Tools

| Tool | Location |
|------|----------|
| Venture Emergence | `static/venture-underground/` |
| Venturing Function | `static/venturing-function/` |

## Styling Conventions

- **Fonts**: Newsreader (headers/branding), system sans-serif (body/UI)
- **Theme**: Light — `#f8fafc` background, `#ffffff` cards, `#e2e8f0` borders
- **Text**: `#1e293b` primary, `#64748b` secondary
- **Accents**: Green `#2D5A4A`, Brown `#8B4513`, Purple `#4A4A8A`
- CSS variables defined in `shared.css`

## Navigation

Every tool page has a `<nav class="site-nav">` linking to all tools. When adding or removing a tool, update navigation in:
- `index.html` (home page — add a tool card)
- 5 Vite tools: `packages/*/index.html`
- Static tools have their own styling and do not include the shared nav

## Gotchas

- `shared.css` warnings during build ("doesn't exist at build time") are harmless — resolved at runtime
- Static tools (venture-underground, venturing-function) are self-contained single-file apps with their own styling
