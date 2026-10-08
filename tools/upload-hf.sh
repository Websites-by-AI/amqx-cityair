#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Mirrors CityAir to Hugging Face:
#
#   dataset  sosa123454321/amqx-cityair-kb     — the open knowledge base (the "database")
#   space    sosa123454321/amqx-cityair        — static mirror of the site
#   space    sosa123454321/amqx-cityair-rag    — Gradio RAG app (HF-native model + dataset)
#
# Usage:
#   HF_TOKEN=hf_... bash tools/upload-hf.sh [WORKER_URL] [SPACE_API_BASE]
#   WORKER_URL is used only for the Space README/info text.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_URL="${1:-}"
API_BASE="${2:-$WORKER_URL}"
USER="sosa123454321"
: "${HF_TOKEN:?HF_TOKEN is required}"

remote() { echo "https://user:${HF_TOKEN}@huggingface.co/$1"; }

push_dir() {
  local repo_type="$1" repo_name="$2" src="$3" message="$4"
  local tmp repo url seg
  tmp="$(mktemp -d)"
  repo="$tmp/repo"
  case "$repo_type" in
    dataset) seg="datasets" ;;
    space)   seg="spaces" ;;
    *)       seg="${repo_type}s" ;;
  esac
  url="https://oauth2:${HF_TOKEN}@huggingface.co/${seg}/${USER}/${repo_name}"
  if ! git clone -q "$url" "$repo" 2>/dev/null; then
    mkdir -p "$repo" && git -C "$repo" init -q && git -C "$repo" remote add origin "$url"
  fi
  git -C "$repo" config user.email "elasa2next@gmail.com"
  git -C "$repo" config user.name "CityAir"
  git -C "$repo" remote set-url origin "$url"
  find "$repo" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  ( cd "$src" && tar -cf - . ) | ( cd "$repo" && tar -xf - )
  git -C "$repo" add -A
  git -C "$repo" commit -q -m "$message" || echo "   (no changes to commit)"
  git -C "$repo" push -q origin HEAD:main || git -C "$repo" push -q origin HEAD:master
  echo "   ✓ https://huggingface.co/${seg}/${USER}/${repo_name}"
  rm -rf "$tmp"
}

echo "▶ 1/3 knowledge-base dataset"
node "$ROOT/tools/build-kb.mjs" >/dev/null
push_dir "dataset" "amqx-cityair-kb" "$ROOT/hf/dataset" "CityAir knowledge base ${VERSION:-1.0.0}"

echo "▶ 2/3 static Space mirror"
node "$ROOT/tools/build-hf-space.mjs" "$API_BASE" >/dev/null
push_dir "space" "amqx-cityair" "$ROOT/hf/space-static" "CityAir static mirror ${VERSION:-1.0.0}"

if [ "${SKIP_RAG_SPACE:-0}" = "1" ]; then echo "▶ 3/3 Gradio RAG Space — skipped"; else
echo "▶ 3/3 Gradio RAG Space"
push_dir "space" "amqx-cityair-rag" "$ROOT/hf/space-rag" "CityAir RAG Space ${VERSION:-1.0.0}" || echo "   ⚠ non-static Spaces need CPU quota or PRO"; fi

cat <<EOF
✅ Hugging Face done.

   dataset : https://huggingface.co/datasets/${USER}/amqx-cityair-kb
   mirror  : https://huggingface.co/spaces/${USER}/amqx-cityair
   RAG app : https://huggingface.co/spaces/${USER}/amqx-cityair-rag

   Note: a Space needs compute to run. If the account is over its free CPU quota
   the Space stays "paused" — the Cloudflare Worker assistant is unaffected.
EOF
