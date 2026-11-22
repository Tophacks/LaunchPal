#!/usr/bin/env bash
if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted changes. Commit with a handoff note in docs/handoff/ and push before stopping." >&2
  exit 2
fi
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  echo "Branch has no upstream. Run: git push -u origin HEAD" >&2
  exit 2
fi
git fetch -q 2>/dev/null
if [ "$(git rev-list --count @{u}..HEAD)" -gt 0 ]; then
  echo "Unpushed commits. Run: git pull --rebase && git push" >&2
  exit 2
fi
exit 0
