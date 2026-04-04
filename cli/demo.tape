# VHS Demo for vrs
# Uses the `./vrs` build through $PWD below (ie. not `vrs` installed via Homebrew) so that the demo always shows the latest / dev version of vrs

Output demo.gif

Set Shell "bash"
Set FontSize 36
Set Width 1600
Set Height 1000
Set Padding 40
Set TypingSpeed 60ms
Set Theme "Catppuccin Mocha"

# Setup (hidden)
Hide
Type "export PATH=$PWD:$PATH" Enter
Type "clear" Enter
Sleep 300ms
Show

# Launch vrs
Sleep 300ms
Type "vrs"
Sleep 1.5s
Enter
Sleep 1s

# Search for "node"
Type "no"
Sleep 1s

# Navigate down through results
Down
Sleep 500ms
Down
Sleep 500ms

# Select Node.js
Up
Sleep 500ms
Up
Sleep 500ms
Enter
Sleep 1.5s

# Scroll through releases
Down
Sleep 400ms
Down
Sleep 400ms
Down
Sleep 400ms
Down
Sleep 400ms
Down
Sleep 400ms

Sleep 1s

# Go back
Escape
Sleep 1.5s

# Clear search and try another
Escape
Sleep 500ms
Type "ruby"
Sleep 500ms

# Select first result
Enter
Sleep 1.5s

# Copy a version
Type "c"
Sleep 2s
