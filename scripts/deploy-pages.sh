#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Publish only committed public assets. No worktree creation or force pushes.
if ! git diff --quiet HEAD -- public; then
  printf '%s\n' 'Commit public/ changes before deployment.' >&2
  exit 1
fi
node --check public/app.js
node --check public/documents.js
node --check public/i18n.js
node --check public/suggestions.js
node tests/test-suggestions.cjs
git fetch origin refs/heads/gh-pages
premii_pages_parent=$(git rev-parse FETCH_HEAD)
premii_pages_tree=$(git rev-parse HEAD:public)
premii_pages_commit=$(printf '%s\n' 'Update PREMII static site' | git commit-tree "$premii_pages_tree" -p "$premii_pages_parent")
git push origin "$premii_pages_commit:refs/heads/gh-pages"
printf '%s\n' 'Published assets. Monitor https://github.com/UyenTLT/PREMII-/actions for deployment completion.'
