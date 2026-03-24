# Versions

A dashboard that shows the version information for a selection of languages, tools, and libraries in one place.

https://versions.gregdev.com

## Prerequisites

Use [asdf](https://asdf-vm.com/) to install Node.js:

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

A `GITHUB_TOKEN` is needed to avoid GitHub API rate limits (60 req/hr without one, 5,000 with). Create a token at https://github.com/settings/tokens - no scopes needed for public repos.

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
    categories: Frameworks
    url: https://pypi.org/project/Django/
```

### GitHub tag filtering

Some GitHub repos don't use clean version tags. Monorepos publish multiple packages under different tag prefixes (e.g. `astro@6.0.8` alongside `@astrojs/node@10.0.3`), and some repos use non-standard naming (e.g. `REL_16_2`, `docker-v29.3.0`).

Use `tagPattern` and `tagReplace` to handle these:

- **`tagPattern`** — a regex to filter tags. Only tags matching the pattern are included.
- **`tagReplace`** — a map of string replacements applied to the tag to produce a clean version number. Applied before the automatic `v` prefix stripping.

Examples:

```yaml
# Monorepo — only match the main package, strip the prefix
- name: Astro
  source: github
  repo: withastro/astro
  tagPattern: "^astro@\\d"
  tagReplace:
    "astro@": ""

# Non-standard prefix
- name: Docker
  source: github
  repo: moby/moby
  tagPattern: "^docker-v"
  tagReplace:
    "docker-v": ""

# Underscore-separated versions (REL_16_2 → 16.2)
- name: PostgreSQL
  source: github
  repo: postgres/postgres
  tagPattern: "^REL_\\d+_\\d+$"
  tagReplace:
    "REL_": ""
    "_": "."
```

When `tagPattern` is set, the releases API is tried first (it includes dates and prerelease info). If no releases match, the tags API is used as a fallback.

Rebuild to pick up changes.

## Testing

```
npm test            # run all tests once
npm run test:watch  # re-run on file changes
```

Unit tests cover each fetcher (GitHub, RubyGems, npm, PyPI, Node.js, endoflife.date) with mocked API responses, plus config validation and a build smoke test. CI runs automatically on push and PRs via GitHub Actions.

## How it works

At build time, `+page.server.ts` reads `packages.yml`, calls the appropriate API for each package via fetchers in `src/lib/fetchers/`, normalises the results, and passes them to the Svelte page. SvelteKit's static adapter renders everything to plain HTML with the data embedded. Client-side JS handles search, filtering, and expand/collapse - no further network requests.

## Deployment

See [dokku.md](dokku.md) for full setup instructions - creating the app, configuring the domain, setting the GitHub token, and scheduling rebuilds via cron.

The short version:

```bash
git remote add dokku dokku@your-server:versions
git push dokku main
```

The Dockerfile builds and serves the static site with Node.js. An `app.json` cron task rebuilds the site every 6 hours in order to update the version data. To trigger a rebuild manually:

```bash
dokku cron:list versions
# Note the task ID from the list, then run:
dokku cron:run versions <id>
```
