#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CityAir — one-command Cloudflare deployment
#
# Serves the static site AND the API (RAG assistant, live air quality, Telegram
# webhook) from a single Worker, then attaches the custom domain.
#
# Required env:
#   CLOUDFLARE_API_TOKEN   API token with: Workers Scripts:Edit, Workers KV:Edit,
#                          D1:Edit, Workers AI:Read (if used), Zone:Edit (custom domain)
#   CF_ACCOUNT_ID          Cloudflare account id (from the dashboard URL)
#   TELEGRAM_BOT_TOKEN     from @BotFather
#
# Optional env:
#   ADMIN_KEY              shared secret for /api/telegram/setup (generated if unset)
#   HF_TOKEN               Hugging Face token, enables the HF Inference fallback
#   DOMAIN                 custom domain, default aqmx.atikova.com
#   WITH_AI=0              skip the Workers AI binding
#   WITH_D1=1              create/attach the D1 alert subscriber database
#   WITH_KV=1              create/attach the KV namespace (rate limits + embedding cache)
#
# Usage:  CLOUDFLARE_API_TOKEN=... CF_ACCOUNT_ID=... TELEGRAM_BOT_TOKEN=... \
#         bash tools/deploy-cloudflare.sh
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${DOMAIN:-aqmx.atikova.com}"
WITH_AI="${WITH_AI:-1}"
WITH_D1="${WITH_D1:-0}"
WITH_KV="${WITH_KV:-0}"
ADMIN_KEY="${ADMIN_KEY:-$(openssl rand -hex 16 2>/dev/null || python3 -c 'import secrets;print(secrets.token_hex(16))')}"
WORKER_NAME="amqx-cityair"

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID is required}"
: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is required}"

api() { curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" "$@"; }

echo "▶ 1/8 verifying the Cloudflare token"
VERIFY="$(api "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/tokens/verify")"
echo "$VERIFY" | grep -q '"success":true' || { echo "✖ token invalid or expired: $VERIFY"; exit 1; }
echo "   $VERIFY" | head -c 200; echo

echo "▶ 2/8 building the site and the knowledge base"
cd "$ROOT"
node tools/build-kb.mjs
(cd app && npm install --no-audit --no-fund && npm run build)

echo "▶ 3/8 installing worker dependencies"
cd "$ROOT/worker"
npm install --no-audit --no-fund

echo "▶ 4/8 configuring bindings"
python3 - "$WITH_AI" "$WITH_KV" "$WITH_D1" <<'PY'
import json, re, subprocess, sys, os, pathlib
with_ai, with_kv, with_d1 = sys.argv[1] == "1", sys.argv[2] == "1", sys.argv[3] == "1"
path = pathlib.Path("wrangler.jsonc")
src = path.read_text()
src = re.sub(r'\n\s*//\s*"ai":\s*\{[^}]*\},', '', src)

def uncomment(block_name, lines):
    global src
    pattern = re.compile(r"//\s*" + block_name + r".*?(?=\n\s*(?://)?\s*\"|\n\s*\})", re.S)
    src = pattern.sub(lines, src, count=1)

if with_kv:
    out = subprocess.run(["npx","wrangler","kv","namespace","create","AMQX_KV"],
                         capture_output=True, text=True).stdout
    m = re.search(r'"?id"?\s*[:=]\s*"([0-9a-f]{32})"', out)
    if m:
        uncomment("kv_namespaces", f'"kv_namespaces": [{{ "binding": "AMQX_KV", "id": "{m.group(1)}" }}],')
        print("   KV:", m.group(1))
    else:
        print("   KV creation output:", out.strip()[:200])
if with_d1:
    out = subprocess.run(["npx","wrangler","d1","create","amqx-cityair"],
                         capture_output=True, text=True).stdout
    m = re.search(r'database_id"?\s*[:=]\s*"([0-9a-f-]{36})"', out)
    if m:
        uncomment("d1_databases",
                  f'"d1_databases": [{{ "binding": "DB", "database_name": "amqx-cityair", "database_id": "{m.group(1)}" }}],')
        print("   D1:", m.group(1))
    else:
        print("   D1 creation output:", out.strip()[:200])
if with_ai:
    src = src.replace('  "observability"', '  "ai": { "binding": "AI" },\n  "observability"')
path.write_text(src)
print("   wrangler.jsonc updated")
PY

echo "▶ 5/8 uploading secrets"
printf '%s' "$TELEGRAM_BOT_TOKEN" | npx wrangler secret put TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET="$(python3 -c 'import secrets;print(secrets.token_hex(24))')"
printf '%s' "$TELEGRAM_WEBHOOK_SECRET" | npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
printf '%s' "$ADMIN_KEY" | npx wrangler secret put ADMIN_KEY
if [ -n "${HF_TOKEN:-}" ]; then
  printf '%s' "$HF_TOKEN" | npx wrangler secret put HF_TOKEN
  echo "   HF_TOKEN set (Hugging Face Inference fallback enabled)"
fi

echo "▶ 6/8 deploying the Worker + static assets"
npx wrangler deploy 2>&1 | tee /tmp/cityair-deploy.log
WORKER_URL="$(grep -oE 'https://[a-z0-9.-]+\.workers\.dev' /tmp/cityair-deploy.log | head -1 || true)"
echo "   worker url: ${WORKER_URL:-unknown}"

echo "▶ 7/8 registering the Telegram webhook"
SETUP_URL="${WORKER_URL}/api/telegram/setup?key=${ADMIN_KEY}"
curl -sS -X POST "$SETUP_URL" | head -c 400; echo

echo "▶ 8/8 attaching the custom domain ${DOMAIN}"
if [ -n "$WORKER_URL" ]; then
  api -X PUT "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/domains" \
    --data "{\"environment\":\"production\",\"hostname\":\"${DOMAIN}\",\"service\":\"${WORKER_NAME}\",\"zone_id\":\"$(api "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN##*.}" | python3 -c 'import sys,json;d=json.load(sys.stdin);print((d.get("result") or [{}])[0].get("id",""))')\"}" | head -c 400
  echo
fi

cat <<EOF

✅ Deployment finished.

   Site:      ${WORKER_URL:-https://${DOMAIN}}
   Custom:    https://${DOMAIN}   (needs the zone in this same Cloudflare account)
   Health:    ${WORKER_URL%/}/api/health
   Bot:       https://t.me/$(grep -oE '"BOT_USERNAME": "[^"]+"' worker/wrangler.jsonc | cut -d'"' -f4)

   Admin key (store it safely, needed to re-register the webhook): ${ADMIN_KEY}

Next: mirror the site to Hugging Face with
   node tools/build-hf-space.mjs "${WORKER_URL}" && bash tools/upload-hf.sh
EOF
