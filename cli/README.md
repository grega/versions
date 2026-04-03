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
| `↑` / `↓` | Navigate the list |
| `Enter` | Select a package |
| `j` / `k` | Scroll releases (detail view) |
| `C` | Copy selected version to clipboard and quit |
| `Esc` | Clear search / go back / quit |
| `Ctrl+C` | Quit |

## Notes

- **Clipboard support** relies on [atotto/clipboard](https://github.com/atotto/clipboard). On Linux, you may need `xclip` or `xsel` installed (`sudo apt install xclip`). macOS and Windows work out of the box.
- The app runs in alternate screen mode — your terminal history is preserved.
