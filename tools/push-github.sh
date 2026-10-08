#!/usr/bin/env bash
# Pushes the CityAir workspace to GitHub.
#
#   GITHUB_TOKEN=ghp_... bash tools/push-github.sh
#
# Creates/updates:
#   Websites-by-AI/amqx-cityair          (new clean repository — primary)
#   Websites-by-AI/Amqx-suggest-d-new-... (legacy repo, refreshed with the same code)
#
# Set ONLY_NEW=1 to skip the legacy repository.
set -euo pipefail

OWNER="Websites-by-AI"
NEW_REPO="amqx-cityair"
LEGACY_REPO="Amqx-suggest-d-new-..."
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"

api() {
  curl -sS -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" -H "Content-Type: application/json" "$@"
}

create_repo() {
  local name="$1"
  api -X POST "https://api.github.com/orgs/${OWNER}/repos" \
    --data "{\"name\":\"${name}\",\"private\":false,\"description\":\"CityAir — independent air-quality readiness, city explorer, innovation matching and RAG assistant (Cloudflare Worker + Hugging Face knowledge base).\",\"has_issues\":true,\"has_wiki\":false}" \
    | python3 -c 'import sys,json;d=json.load(sys.stdin);print("   ",d.get("full_name") or d.get("message"))' || true
}

echo "▶ creating repositories"
create_repo "$NEW_REPO"
[ "${ONLY_NEW:-0}" = "1" ] || create_repo "$LEGACY_REPO"

push_to() {
  local repo="$1" branch="$2"
  local tmp
  tmp="$(mktemp -d)"
  echo "▶ pushing to ${OWNER}/${repo} (${branch})"
  git -C "$tmp" init -q
  git -C "$tmp" config user.email "elasa2next@gmail.com"
  git -C "$tmp" config user.name "CityAir deploy"
  git -C "$tmp" remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${OWNER}/${repo}.git"
  if [ "${ORPHAN:-0}" = "1" ]; then
    echo "   (ORPHAN=1 — publishing a fresh single-commit history)"
    git -C "$tmp" checkout -q --orphan "$branch"
  else
    git -C "$tmp" fetch -q origin "$branch" 2>/dev/null && git -C "$tmp" checkout -q "$branch" || git -C "$tmp" checkout -q -b "$branch"
  fi

  # replace tracked content with the current workspace (keeping .git)
  find "$tmp" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  ( cd "$ROOT" && tar --exclude='./.git' --exclude='./node_modules' \
      --exclude='*/node_modules' --exclude='./app/site' --exclude='./app/dist' --exclude='./worker/dist' \
      --exclude='./worker/.wrangler' --exclude='./hf/space-static' --exclude='./private-archive' \
      --exclude='./app/tsconfig.tsbuildinfo' -cf - . ) | ( cd "$tmp" && tar -xf - )

  git -C "$tmp" add -A
  git -C "$tmp" commit -q -m "CityAir ${VERSION:-1.0.0}: readiness platform, city explorer, innovation matching, RAG assistant on Cloudflare + Hugging Face knowledge base"
  if [ "${ORPHAN:-0}" = "1" ]; then
    git -C "$tmp" push -q -f origin "$branch"
  else
    git -C "$tmp" push -q origin "$branch"
  fi
  echo "   ✓ https://github.com/${OWNER}/${repo}"
  rm -rf "$tmp"
}

push_to "$NEW_REPO" "main"
[ "${ONLY_NEW:-0}" = "1" ] || push_to "$LEGACY_REPO" "master"

echo "✅ GitHub done."
