#!/usr/bin/env bash
# Fails unless a NEW docs/handoff/*.md file is staged in this commit (see AGENTS.md).
added=$(git diff --cached --name-only --diff-filter=A -- 'docs/handoff/*.md')
if [ -z "$added" ]; then
  echo "Commit rejected: add a new handoff note docs/handoff/YYYYMMDD-HHMM-<role>-<slug>.md (role: fe|vision|voice) and update docs/STATUS.md." >&2
  exit 1
fi
exit 0
