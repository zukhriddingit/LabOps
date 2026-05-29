#!/usr/bin/env bash
# Create the three feature branches off main. Run once after cloning.
#   bash scripts/setup-branches.sh
set -euo pipefail

branches=(
  "feature/rasa-labops-coworker"
  "feature/labops-api-memory"
  "feature/3d-lab-demo"
)

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repo. Run: git init"; exit 1; }

for b in "${branches[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$b"; then
    echo "✓ $b already exists"
  else
    git branch "$b" && echo "＋ created $b"
  fi
done

echo
echo "Done. Check one out, e.g.:  git checkout feature/labops-api-memory"
