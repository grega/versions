package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/atotto/clipboard"
	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
	"github.com/sahilm/fuzzy"
)

const apiURL = "https://versions.gregdev.com/api/packages"
const cacheTTL = 1 * time.Hour

var version = "dev"

// asdfPluginMap maps package display names to their asdf plugin names.
// Only packages with an asdf plugin are included.
var asdfPluginMap = map[string]string{
	"Bats":          "bats",
	"Bun":           "bun",
	"Caddy":         "caddy",
	"Cloudflared":   "cloudflared",
	"Elixir":        "elixir",
	"Go":            "golang",
	"golangci-lint": "golangci-lint",
	"GitHub CLI":    "github-cli",
	"Helm":          "helm",
	"Kafka":         "kafka",
	"kubectl":       "kubectl",
	"Kubernetes":    "kubectl",
	"Memcached":     "memcached",
	"MongoDB":       "mongodb",
	"MySQL":         "mysql",
	"Node.js":       "nodejs",
	"PHP":           "php",
	"pnpm":          "pnpm",
	"PostgreSQL":    "postgres",
	"Python":        "python",
	"Redis":         "redis",
	"Ruby":          "ruby",
	"Rust":          "rust",
	"SQLite":        "sqlite",
	"Terraform":     "terraform",
	"Yarn":          "yarn",
}

type cachedResponse struct {
	FetchedAt time.Time `json:"fetchedAt"`
	Packages  []Package `json:"packages"`
}

func cacheFilePath() string {
	dir, err := os.UserCacheDir()
	if err != nil {
		return ""
	}
	return filepath.Join(dir, "vrs", "packages.json")
}

func loadCache(path string) ([]Package, time.Time) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, time.Time{}
	}
	var cached cachedResponse
	if err := json.Unmarshal(data, &cached); err != nil {
		return nil, time.Time{}
	}
	if time.Since(cached.FetchedAt) > cacheTTL {
		return nil, time.Time{}
	}
	return cached.Packages, cached.FetchedAt
}

func writeCache(path string, packages []Package) {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return
	}
	data, err := json.Marshal(cachedResponse{
		FetchedAt: time.Now(),
		Packages:  packages,
	})
	if err != nil {
		return
	}
	tmp, err := os.CreateTemp(dir, "packages-*.json.tmp")
	if err != nil {
		return
	}
	tmpPath := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return
	}
	os.Rename(tmpPath, path)
}

// ── Styles ──────────────────────────────────────────────────────────────────

var (
	primaryColor   = lipgloss.AdaptiveColor{Light: "#6D28D9", Dark: "#7C3AED"}
	secondaryColor = lipgloss.AdaptiveColor{Light: "#7C3AED", Dark: "#A78BFA"}
	accentColor    = lipgloss.AdaptiveColor{Light: "#059669", Dark: "#34D399"}
	warningColor   = lipgloss.AdaptiveColor{Light: "#D97706", Dark: "#FBBF24"}
	errorColor     = lipgloss.AdaptiveColor{Light: "#DC2626", Dark: "#F87171"}
	mutedColor     = lipgloss.AdaptiveColor{Light: "#6B7280", Dark: "#6B7280"}
	textColor      = lipgloss.AdaptiveColor{Light: "#1F2937", Dark: "#F9FAFB"}
	dimColor       = lipgloss.AdaptiveColor{Light: "#6B7280", Dark: "#9CA3AF"}

	subtitleStyle = lipgloss.NewStyle().
			Foreground(secondaryColor)

	inputStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(primaryColor).
			Padding(0, 1).
			Width(42).
			MarginLeft(0)

	latestBadge = lipgloss.NewStyle().
			Background(accentColor).
			Foreground(lipgloss.Color("#000000")).
			Bold(true).
			Padding(0, 1)

	prereleaseBadge = lipgloss.NewStyle().
			Background(warningColor).
			Foreground(lipgloss.Color("#000000")).
			Bold(true).
			Padding(0, 1)

	dateStyle = lipgloss.NewStyle().
			Foreground(dimColor)

	helpStyle = lipgloss.NewStyle().
			Foreground(mutedColor)

	headerStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(primaryColor).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(primaryColor).
			Padding(0, 2).
			MarginLeft(0)

	categoryStyle = lipgloss.NewStyle().
			Foreground(secondaryColor).
			Italic(true)

	// Pre-defined text styles for rendering
	matchHighlightSel  = lipgloss.NewStyle().Foreground(accentColor).Bold(true)
	matchHighlight     = lipgloss.NewStyle().Foreground(secondaryColor)
	nameSelectedStyle  = lipgloss.NewStyle().Foreground(textColor).Bold(true)
	nameDimStyle       = lipgloss.NewStyle().Foreground(dimColor)
	cursorStyle        = lipgloss.NewStyle().Foreground(accentColor).Bold(true)
	verAccentStyle     = lipgloss.NewStyle().Foreground(accentColor)
	verMutedStyle      = lipgloss.NewStyle().Foreground(mutedColor)
	catDimStyle        = lipgloss.NewStyle().Foreground(dimColor)
	relVerSelectedStyl = lipgloss.NewStyle().Foreground(textColor).Bold(true)
	relVerDimStyle     = lipgloss.NewStyle().Foreground(dimColor)
	relDateSelStyle    = lipgloss.NewStyle().Foreground(secondaryColor)
	prerelDimStyle     = lipgloss.NewStyle().Foreground(warningColor)
	latestDimBadge     = lipgloss.NewStyle().Foreground(accentColor).Bold(true)
	dividerStyle       = lipgloss.NewStyle().Foreground(mutedColor)
	scrollInfoStyle    = lipgloss.NewStyle().Foreground(mutedColor)
	helpKeyStyle       = lipgloss.NewStyle().Foreground(secondaryColor).Bold(true)
	copiedStyle        = lipgloss.NewStyle().Foreground(accentColor).Bold(true)

	errorBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(errorColor).
			Padding(0, 2).
			MarginLeft(0).
			Width(72)
	errorTitleStyle = lipgloss.NewStyle().
			Foreground(errorColor).
			Bold(true)
	errorDetailStyle = lipgloss.NewStyle().
				Foreground(dimColor)
)

// ── API Types ───────────────────────────────────────────────────────────────

// FlexBool handles JSON values that may be bool or string.
type FlexBool bool

func (f *FlexBool) UnmarshalJSON(b []byte) error {
	var boolVal bool
	if err := json.Unmarshal(b, &boolVal); err == nil {
		*f = FlexBool(boolVal)
		return nil
	}
	var strVal string
	if err := json.Unmarshal(b, &strVal); err == nil {
		*f = FlexBool(strVal == "true" || strVal == "yes" || strVal == "1")
		return nil
	}
	*f = false
	return nil
}

type Release struct {
	Version    string   `json:"version"`
	Date       string   `json:"date"`
	Prerelease FlexBool `json:"prerelease"`
	LTS        FlexBool `json:"lts"`
	URL        string   `json:"url"`
}

type Package struct {
	Name         string    `json:"name"`
	Categories   []string  `json:"categories"`
	SourceURL    string    `json:"sourceUrl"`
	Latest       Release   `json:"latest"`
	LatestStable Release   `json:"latestStable"`
	Releases     []Release `json:"releases"`
}

// ── Fuzzy search support ────────────────────────────────────────────────────

type packageSource []Package

func (p packageSource) String(i int) string { return p[i].Name }
func (p packageSource) Len() int            { return len(p) }

// ── Messages ────────────────────────────────────────────────────────────────

type packagesFetchedMsg struct {
	packages       []Package
	fromCache      bool
	cachePath      string
	cacheFetchedAt time.Time
}

type fetchErrMsg struct{ err error }

func (e fetchErrMsg) Error() string { return e.err.Error() }

type clearFlashMsg struct{ id int }

type toolVersionWrittenMsg struct {
	pluginName string
	version    string
	err        error
}

// ── State ───────────────────────────────────────────────────────────────────

type viewState int

const (
	stateLoading viewState = iota
	stateSearch
	stateDetail
)

// ── Model ───────────────────────────────────────────────────────────────────

type model struct {
	state    viewState
	packages []Package
	filtered []fuzzy.Match
	input    textinput.Model
	spinner  spinner.Model
	cursor   int
	err      error

	selectedPkg    *Package
	detailReleases []Release
	releaseCursor  int
	releaseOffset  int
	copiedVersion  string
	copiedPkgName  string
	copiedFlash    string
	flashID        int

	fromCache      bool
	cachePath      string
	cacheFetchedAt time.Time

	width, height int
}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "Type to search packages..."
	ti.Focus()
	ti.CharLimit = 64
	ti.Width = 40
	ti.PromptStyle = lipgloss.NewStyle().Foreground(primaryColor)
	ti.TextStyle = lipgloss.NewStyle().Foreground(textColor)
	ti.Cursor.Style = lipgloss.NewStyle().Foreground(accentColor)

	s := spinner.New()
	s.Spinner = spinner.MiniDot
	s.Style = lipgloss.NewStyle().Foreground(primaryColor)

	return model{
		state:   stateLoading,
		input:   ti,
		spinner: s,
	}
}

func (m model) Init() tea.Cmd {
	return tea.Batch(m.spinner.Tick, fetchPackages)
}

// ── Commands ────────────────────────────────────────────────────────────────

func fetchPackages() tea.Msg {
	if path := cacheFilePath(); path != "" {
		if packages, fetchedAt := loadCache(path); packages != nil {
			return packagesFetchedMsg{packages: packages, fromCache: true, cachePath: path, cacheFetchedAt: fetchedAt}
		}
	}

	resp, err := http.Get(apiURL)
	if err != nil {
		return fetchErrMsg{err}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fetchErrMsg{err}
	}

	var packages []Package
	if err := json.Unmarshal(body, &packages); err != nil {
		return fetchErrMsg{err}
	}

	if path := cacheFilePath(); path != "" {
		writeCache(path, packages)
	}

	return packagesFetchedMsg{packages: packages}
}

// ── Filtering ───────────────────────────────────────────────────────────────

func (m *model) filterPackages() {
	query := m.input.Value()
	if query == "" {
		m.filtered = make([]fuzzy.Match, len(m.packages))
		for i := range m.packages {
			m.filtered[i] = fuzzy.Match{Index: i, Str: m.packages[i].Name}
		}
		return
	}
	m.filtered = fuzzy.FindFrom(query, packageSource(m.packages))
	if m.cursor >= len(m.filtered) {
		m.cursor = max(0, len(m.filtered)-1)
	}
}

// ── Update ──────────────────────────────────────────────────────────────────

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		if msg.String() == "ctrl+c" {
			return m, tea.Quit
		}

	case packagesFetchedMsg:
		m.packages = msg.packages
		m.fromCache = msg.fromCache
		m.cachePath = msg.cachePath
		m.cacheFetchedAt = msg.cacheFetchedAt
		m.state = stateSearch
		m.filterPackages()
		return m, m.input.Focus()

	case fetchErrMsg:
		m.err = msg.err
		return m, tea.Quit

	case clearFlashMsg:
		if msg.id == m.flashID {
			m.copiedFlash = ""
		}
		return m, nil

	case toolVersionWrittenMsg:
		if msg.err != nil {
			m.copiedFlash = fmt.Sprintf("Error: %s", msg.err)
		} else {
			m.copiedFlash = fmt.Sprintf("%s %s → .tool-versions", msg.pluginName, strings.TrimPrefix(msg.version, "v"))
		}
		return m, nil

	case spinner.TickMsg:
		if m.state == stateLoading {
			var cmd tea.Cmd
			m.spinner, cmd = m.spinner.Update(msg)
			return m, cmd
		}
	}

	switch m.state {
	case stateSearch:
		return m.updateSearch(msg)
	case stateDetail:
		return m.updateDetail(msg)
	}

	return m, nil
}

func (m model) updateSearch(msg tea.Msg) (tea.Model, tea.Cmd) {
	if msg, ok := msg.(tea.KeyMsg); ok {
		switch msg.String() {
		case "up":
			if m.cursor > 0 {
				m.cursor--
			}
			return m, nil
		case "down":
			if m.cursor < len(m.filtered)-1 {
				m.cursor++
			}
			return m, nil
		case "enter":
			if len(m.filtered) > 0 && m.cursor < len(m.filtered) {
				idx := m.filtered[m.cursor].Index
				pkg := &m.packages[idx]
				m.selectedPkg = pkg
				m.state = stateDetail
				m.releaseCursor = 0
				m.releaseOffset = 0
				// Pin latest stable at top, then remaining releases in original order
				m.detailReleases = make([]Release, 0, len(pkg.Releases))
				m.detailReleases = append(m.detailReleases, pkg.LatestStable)
				for _, r := range pkg.Releases {
					if r.Version != pkg.LatestStable.Version {
						m.detailReleases = append(m.detailReleases, r)
					}
				}
			}
			return m, nil
		case "esc":
			if m.input.Value() != "" {
				m.input.SetValue("")
				m.filterPackages()
				m.cursor = 0
				return m, nil
			}
			return m, nil
		}
	}

	var cmd tea.Cmd
	prevValue := m.input.Value()
	m.input, cmd = m.input.Update(msg)
	if m.input.Value() != prevValue {
		m.filterPackages()
		m.cursor = 0
	}
	return m, cmd
}

func (m model) updateDetail(msg tea.Msg) (tea.Model, tea.Cmd) {
	if m.selectedPkg == nil {
		return m, nil
	}

	if msg, ok := msg.(tea.KeyMsg); ok {
		visibleReleases := m.height - 16
		if visibleReleases < 3 {
			visibleReleases = 3
		}

		switch msg.String() {
		case "esc":
			m.state = stateSearch
			m.releaseCursor = 0
			m.releaseOffset = 0
			return m, nil
		case "up", "k":
			if m.releaseCursor > 0 {
				m.releaseCursor--
				if m.releaseCursor < m.releaseOffset {
					m.releaseOffset = m.releaseCursor
				}
			}
			return m, nil
		case "down", "j":
			if m.releaseCursor < len(m.detailReleases)-1 {
				m.releaseCursor++
				if m.releaseCursor >= m.releaseOffset+visibleReleases {
					m.releaseOffset = m.releaseCursor - visibleReleases + 1
				}
			}
			return m, nil
		case "c", "C":
			ver := m.detailReleases[m.releaseCursor].Version
			if err := clipboard.WriteAll(ver); err != nil {
				termenv.Copy(ver)
			}
			m.flashID++
			m.copiedFlash = fmt.Sprintf("Copied %s", ver)
			id := m.flashID
			return m, tea.Tick(3*time.Second, func(time.Time) tea.Msg {
				return clearFlashMsg{id: id}
			})
		case "t", "T":
			pluginName, ok := asdfPluginMap[m.selectedPkg.Name]
			if !ok {
				return m, nil
			}
			ver := m.detailReleases[m.releaseCursor].Version
			m.flashID++
			id := m.flashID
			return m, tea.Batch(
				writeToolVersionCmd(pluginName, ver),
				tea.Tick(3*time.Second, func(time.Time) tea.Msg {
					return clearFlashMsg{id: id}
				}),
			)
		case "o", "O":
			openURL(m.selectedPkg.SourceURL)
			return m, nil
		case "enter":
			ver := m.detailReleases[m.releaseCursor].Version
			if err := clipboard.WriteAll(ver); err != nil {
				termenv.Copy(ver)
			}
			m.copiedVersion = ver
			m.copiedPkgName = m.selectedPkg.Name
			return m, tea.Quit
		}
	}

	return m, nil
}

// ── View ────────────────────────────────────────────────────────────────────

func (m model) View() string {
	switch m.state {
	case stateLoading:
		return m.viewLoading()
	case stateSearch:
		return m.viewSearch()
	case stateDetail:
		return m.viewDetail()
	}
	return ""
}

func (m model) viewLoading() string {
	return fmt.Sprintf("\n  %s Fetching packages...\n", m.spinner.View())
}

func (m model) viewSearch() string {
	var b strings.Builder

	b.WriteString(inputStyle.Render(m.input.View()) + "\n\n")

	count := fmt.Sprintf("%d packages", len(m.filtered))
	b.WriteString("  " + subtitleStyle.Render(count) + "\n\n")

	if len(m.filtered) == 0 {
		b.WriteString("  " + nameDimStyle.Render("No matches found") + "\n")
	} else {
		visibleItems := m.height - 10
		if m.fromCache {
			visibleItems -= 2
		}
		if visibleItems < 3 {
			visibleItems = 3
		}

		offset := 0
		if m.cursor >= visibleItems {
			offset = m.cursor - visibleItems + 1
		}
		end := offset + visibleItems
		if end > len(m.filtered) {
			end = len(m.filtered)
		}

		for i := offset; i < end; i++ {
			match := m.filtered[i]
			pkg := m.packages[match.Index]
			selected := i == m.cursor

			name := renderName(pkg.Name, match.MatchedIndexes, selected)
			nameWidth := lipgloss.Width(name)
			pad := 24 - nameWidth
			if pad < 1 {
				pad = 1
			}

			version := pkg.LatestStable.Version
			categories := strings.Join(pkg.Categories, ", ")

			if selected {
				arrow := cursorStyle.Render("▸ ")
				ver := verAccentStyle.Render(version)
				cat := catDimStyle.Render(categories)
				b.WriteString(fmt.Sprintf("  %s%s%s%s  %s\n", arrow, name, strings.Repeat(" ", pad), ver, cat))
			} else {
				ver := verMutedStyle.Render(version)
				b.WriteString(fmt.Sprintf("    %s%s%s\n", name, strings.Repeat(" ", pad), ver))
			}
		}

		if len(m.filtered) > visibleItems {
			info := scrollInfoStyle.Render(
				fmt.Sprintf("  ── showing %d–%d of %d ──", offset+1, end, len(m.filtered)),
			)
			b.WriteString("\n" + info)
		}
	}

	help := helpStyle.Render(helpLine(helpItem("↑↓", "navigate"), helpItem("enter", "select"), helpItem("esc", "clear"), helpItem("ctrl+c", "quit")))
	b.WriteString("\n\n" + help)

	if m.fromCache {
		expiresAt := m.cacheFetchedAt.Add(cacheTTL)
		remaining := time.Until(expiresAt).Truncate(time.Minute)
		cacheStyle := lipgloss.NewStyle().Foreground(mutedColor)
		cacheNote := cacheStyle.Render(fmt.Sprintf("  Packages loaded from cache: %s (refreshes in %s)", m.cachePath, remaining))
		b.WriteString("\n\n" + cacheNote)
	}

	return b.String()
}

func (m model) viewDetail() string {
	if m.selectedPkg == nil {
		return ""
	}
	pkg := m.selectedPkg
	var b strings.Builder

	header := headerStyle.Render(pkg.Name)
	if len(pkg.Categories) > 0 {
		cats := categoryStyle.Render("  " + strings.Join(pkg.Categories, " · "))
		b.WriteString(lipgloss.JoinHorizontal(lipgloss.Center, header, cats) + "\n")
	} else {
		b.WriteString(header + "\n")
	}

	relHeader := subtitleStyle.Bold(true).MarginTop(1).Render("  Releases")
	b.WriteString(relHeader + "\n")
	b.WriteString("  " + dividerStyle.Render(strings.Repeat("─", 52)) + "\n")

	releases := m.detailReleases

	visibleReleases := m.height - 16
	if visibleReleases < 3 {
		visibleReleases = 3
	}

	end := m.releaseOffset + visibleReleases
	if end > len(releases) {
		end = len(releases)
	}

	for i := m.releaseOffset; i < end; i++ {
		rel := releases[i]
		selected := i == m.releaseCursor
		isLatest := i == 0

		if selected {
			arrow := cursorStyle.Render("▸ ")
			v := relVerSelectedStyl.Render(fmt.Sprintf("%-28s", rel.Version))
			d := relDateSelStyle.Render(rel.Date)
			line := fmt.Sprintf("  %s%s  %s", arrow, v, d)
			if rel.Prerelease {
				line += " " + prereleaseBadge.Render("pre")
			}
			if isLatest {
				line += " " + latestBadge.Render("latest")
			}
			b.WriteString(line + "\n")
		} else {
			v := relVerDimStyle.Render(fmt.Sprintf("%-28s", rel.Version))
			d := dateStyle.Render(rel.Date)
			line := fmt.Sprintf("    %s  %s", v, d)
			if rel.Prerelease {
				line += "  " + prerelDimStyle.Render("pre")
			}
			if isLatest {
				line += "  " + latestDimBadge.Render("latest")
			}
			b.WriteString(line + "\n")
		}

		// Divider after the pinned latest stable
		if isLatest {
			b.WriteString("  " + dividerStyle.Render(strings.Repeat("─", 52)) + "\n")
		}
	}

	if len(releases) > visibleReleases {
		pct := float64(m.releaseCursor) / float64(max(1, len(releases)-1)) * 100
		info := scrollInfoStyle.Render(
			fmt.Sprintf("  ── %d/%d (%.0f%%) ──", m.releaseCursor+1, len(releases), pct),
		)
		b.WriteString("\n" + info)
	}

	if m.copiedFlash != "" {
		flash := copiedStyle.Render(fmt.Sprintf("  ✓ %s", m.copiedFlash))
		b.WriteString("\n" + flash)
	}

	help1Items := []string{helpItem("↑↓", "navigate"), helpItem("c", "copy"), helpItem("enter", "copy & quit")}
	if _, ok := asdfPluginMap[pkg.Name]; ok {
		help1Items = append(help1Items, helpItem("t", "add to .tool-versions"))
	}
	help1 := helpStyle.Render(helpLine(help1Items...))
	help2 := helpStyle.Render(helpLine(helpItem("o", "open source in browser"), helpItem("esc", "back"), helpItem("ctrl+c", "quit")))
	b.WriteString("\n\n" + help1 + "\n" + help2)

	return b.String()
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func helpItem(key, desc string) string {
	return helpKeyStyle.Render(key) + " (" + desc + ")"
}

func helpLine(items ...string) string {
	return "  " + strings.Join(items, " • ")
}

func openURL(url string) {
	var cmd string
	switch runtime.GOOS {
	case "darwin":
		cmd = "open"
	default:
		cmd = "xdg-open"
	}
	exec.Command(cmd, url).Start()
}

func writeToolVersion(pluginName, version string) error {
	version = strings.TrimPrefix(version, "v")
	path := ".tool-versions"
	newLine := pluginName + " " + version

	content, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return os.WriteFile(path, []byte(newLine+"\n"), 0o644)
		}
		return fmt.Errorf("reading %s: %w", path, err)
	}

	lines := strings.Split(string(content), "\n")
	found := false
	for i, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 1 && fields[0] == pluginName {
			lines[i] = newLine
			found = true
			break
		}
	}

	if !found {
		if len(lines) > 0 && lines[len(lines)-1] == "" {
			lines = lines[:len(lines)-1]
		}
		lines = append(lines, newLine)
	}

	output := strings.Join(lines, "\n")
	if !strings.HasSuffix(output, "\n") {
		output += "\n"
	}

	return os.WriteFile(path, []byte(output), 0o644)
}

func writeToolVersionCmd(pluginName, version string) tea.Cmd {
	return func() tea.Msg {
		err := writeToolVersion(pluginName, version)
		return toolVersionWrittenMsg{pluginName: pluginName, version: version, err: err}
	}
}

func renderName(name string, matchedIndexes []int, selected bool) string {
	if len(matchedIndexes) == 0 {
		if selected {
			return nameSelectedStyle.Render(name)
		}
		return nameDimStyle.Render(name)
	}

	matchSet := make(map[int]bool, len(matchedIndexes))
	for _, idx := range matchedIndexes {
		matchSet[idx] = true
	}

	var result strings.Builder
	for i, ch := range name {
		s := string(ch)
		if matchSet[i] {
			if selected {
				result.WriteString(matchHighlightSel.Render(s))
			} else {
				result.WriteString(matchHighlight.Render(s))
			}
		} else {
			if selected {
				result.WriteString(nameSelectedStyle.Render(s))
			} else {
				result.WriteString(nameDimStyle.Render(s))
			}
		}
	}
	return result.String()
}

// ── Main ────────────────────────────────────────────────────────────────────

func main() {
	showVersion := flag.Bool("version", false, "print version")
	flag.BoolVar(showVersion, "v", false, "print version")
	flag.Parse()
	if *showVersion {
		fmt.Println(version)
		return
	}

	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	finalModel, err := p.Run()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	if fm, ok := finalModel.(model); ok {
		if fm.err != nil {
			title := errorTitleStyle.Render("Failed to fetch package data")
			detail := errorDetailStyle.Render(fm.err.Error())
			box := errorBoxStyle.Render(title + "\n" + detail)
			fmt.Fprintln(os.Stderr, "\n"+box+"\n")
			os.Exit(1)
		}
		if fm.copiedVersion != "" {
			fmt.Println(copiedStyle.Render(
				fmt.Sprintf("\n  ✓ Copied \"%s\" to clipboard (for %s)\n", fm.copiedVersion, fm.copiedPkgName),
			))
		}
	}
}
