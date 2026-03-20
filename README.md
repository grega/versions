# Versions

A dashboard that shows the latest versions of languages, tools, and libraries in one place. Built with SvelteKit and generates a fully static site at build time — no runtime API calls from the browser.

## Prerequisites

Node.js 22+ is required. If you use [asdf](https://asdf-vm.com/), the `.tool-versions` file has you covered:

```
asdf install
```

## Quick start

```
cp .env.example .env     # add your GITHUB_TOKEN
npm install
npm run dev
```

Open http://localhost:5173. The dev server fetches version data live on each page load.

A `GITHUB_TOKEN` is needed to avoid GitHub API rate limits (60 req/hr without one, 5,000 with). Create a token at https://github.com/settings/tokens — no scopes needed for public repos.

## Building

```
npm run build
npm run preview   # serve the built site locally
```

This fetches all version data from public APIs and bakes it into static HTML. The output goes to `build/`.

## Adding a package

Edit `packages.yml` and add an entry. Available sources:

| Source | Config fields | Example |
|--------|--------------|---------|
| `github` | `repo` | `repo: hashicorp/terraform` |
| `rubygems` | `gem` | `gem: rails` |
| `npm` | `package` | `package: npm` |
| `pypi` | `package` | `package: django` |
| `nodejs` | (none) | Built-in Node.js dist API |
| `endoflife` | `product` | `product: python` ([products list](https://endoflife.date/api/all.json)) |

Example:

```yaml
  - name: Django
    source: pypi
    package: django
    category: Frameworks
    url: https://pypi.org/project/Django/
```

Rebuild to pick up changes.

## How it works

At build time, `+page.server.ts` reads `packages.yml`, calls the appropriate API for each package via fetchers in `src/lib/fetchers/`, normalises the results, and passes them to the Svelte page. SvelteKit's static adapter renders everything to plain HTML with the data embedded. Client-side JS handles search, filtering, and expand/collapse — no further network requests.

## Deployment

See [dokku.md](dokku.md) for full setup instructions — creating the app, configuring the domain, setting the GitHub token, and scheduling rebuilds via cron.

The short version:

```bash
git remote add dokku dokku@your-server:versions
git push dokku main
```

The Dockerfile runs a multi-stage build (Node.js fetches data, then nginx serves static files). A cron job on the server runs `dokku ps:rebuild versions` every 6 hours to keep data fresh.
