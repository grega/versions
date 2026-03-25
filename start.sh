#!/bin/sh

# Start the static file server in the background
npx serve build -l 5000 &

# Rebuild every 12 hours to refresh version data
while true; do
  sleep 43200
  echo "Rebuilding site at $(date -u)"
  npm run build || echo "Build failed at $(date -u)"
done
