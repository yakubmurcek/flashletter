#!/usr/bin/env bash
# Fails when a server secret is in the JavaScript sent to browsers (.next/static), where
# anyone can read it in DevTools. Run after `next build`; CI runs it in the e2e job.
# Patterns: Stripe secret/restricted keys, Anthropic keys, a Supabase service-role JWT
# (its payload holds "role":"service_role", base64 "c2VydmljZV9yb2xl"), private keys.
set -euo pipefail
DIR="${1:-.next/static}"
[ -d "$DIR" ] || { echo "no $DIR: run next build first"; exit 2; }

pattern='sk_(live|test)_[0-9A-Za-z]{10,}|rk_(live|test)_[0-9A-Za-z]{10,}|sk-ant-[0-9A-Za-z_-]{10,}|c2VydmljZV9yb2xl|-----BEGIN [A-Z ]*PRIVATE KEY-----'
if hits="$(grep -rEnoa "$pattern" "$DIR" | cut -c1-160)"; then
  echo "::error::A server secret is in the browser bundle. Move it to server-only code:"
  echo "$hits"
  exit 1
fi
echo "browser bundle: no server secrets ($(find "$DIR" -name '*.js' | wc -l) files checked)"
