#!/usr/bin/env bash
# Windows-only dev helper: mirror app/ into WSL (~/lp-app) where Wasp runs. Repo stays on Windows.
# Usage (from Git Bash/PowerShell): wsl -e bash -lc "bash /mnt/c/.../scripts/wsl-sync-app.sh"
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)/app/"
mkdir -p ~/lp-app
rsync -a --delete --exclude node_modules --exclude .wasp --exclude migrations "$SRC" ~/lp-app/
echo "synced $SRC -> ~/lp-app"
