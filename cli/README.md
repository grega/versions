# vrs

A terminal UI for browsing package versions, powered by [Bubble Tea](https://github.com/charmbracelet/bubbletea).

Fetches data from the Versions "API" (https://versions.gregdev.com/api/packages), and allows for fuzzy-searching of packages, browsing their releases, and copying a version number to the clipboard.

## Install

```sh
brew install grega/tap/vrs
```

## Demo

<picture>
  <img alt="Animated demo showing vrs in action" src="./demo.gif">
</picture>

## Usage

| Key | Action |
|---|---|
| Type | Fuzzy-search packages by name |
| `↑` / `↓` | Navigate the lists |
| `Enter` | Select a package / copy version & quit |
| `C` | Copy selected version to clipboard |
| `O` | Open package source URL in browser |
| `Esc` | Clear search / go back / quit |
| `Ctrl+C` | Quit |

## Caching

API responses are cached locally for 1 hour (the backend only refreshes every ~6 hours). The cache file lives at:

- **macOS:** `~/Library/Caches/vrs/packages.json`
- **Linux:** `~/.cache/vrs/packages.json`

To force a fresh fetch, just delete the cache file.

## Development

### Go (via asdf)

The required version is pinned in `.tool-versions`.

```sh
asdf plugin add golang
asdf install
```

### Install Dependencies

```sh
go mod download
```

### Run

```sh
go run .
```

### Build

```sh
go build -o vrs .
./vrs
```

### Generating a new demo GIF

Requires [VHS](https://github.com/charmbracelet/vhs):

```sh
brew install vhs
```

Build the `vrs` binary, then run the tape:

```sh
go build -o vrs .
vhs demo.tape
```

This outputs `demo.gif`.

### Releasing

The `release` script handles tagging, cross-compilation, and GitHub release creation:

```sh
./release patch     # 0.1.0 → 0.1.1
./release minor     # 0.1.0 → 0.2.0
./release major     # 0.1.0 → 1.0.0
./release 1.2.3     # explicit version
```

This will:

1. Determine the current version from the latest `v*` git tag
2. Build binaries for darwin/arm64, darwin/amd64, linux/arm64, linux/amd64
3. Package each as a `.tar.gz`
4. Tag and push
5. Create a GitHub release with all tarballs attached (`gh` CLI required)
6. Print the URL and SHA-256 for each asset which are used to update the [Homebrew tap formula](https://github.com/grega/homebrew-tap)
