# versions

A terminal UI for browsing package versions, powered by [Bubble Tea](https://github.com/charmbracelet/bubbletea) and [Bubbles](https://github.com/charmbracelet/bubbles).

Fetches data from [versions.gregdev.com](https://versions.gregdev.com) and lets you fuzzy-search packages, browse their releases, and copy a version number to your clipboard.

## Prerequisites

### Go (via asdf)

This project uses Go 1.26. The required version is pinned in `.tool-versions`.

```sh
asdf plugin add golang
asdf install
```

This will install the correct Go version automatically.

## Install Dependencies

```sh
go mod download
```

## Run

```sh
go run .
```

## Build

```sh
go build -o versions .
./versions
```

## Usage

| Key | Action |
|---|---|
| Type | Fuzzy-search packages by name |
| `↑` / `↓` | Navigate the lists |
| `Enter` | Select a package |
| `C` | Copy selected version to clipboard and quit |
| `Esc` | Clear search / go back / quit |
| `Ctrl+C` | Quit |

## Install (Homebrew)

```sh
brew install grega/tap/versions
```

## Releasing

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
6. Print the URL and SHA-256 for each asset — use these to update the [Homebrew tap formula](https://github.com/grega/homebrew-tap)

## Notes

- **Clipboard support** relies on [atotto/clipboard](https://github.com/atotto/clipboard). On Linux, you may need `xclip` or `xsel` installed (`sudo apt install xclip`). macOS and Windows work out of the box
- The app runs in alternate screen mode, meaning terminal history is preserved
