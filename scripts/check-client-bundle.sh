#!/usr/bin/env bash
# Fails when a server secret is in the JavaScript sent to browsers (.next/static), where
# anyone can read it in DevTools. Run after `next build`; CI runs it in the e2e job.
# Patterns: Stripe secret, restricted and webhook keys; Anthropic keys; Supabase secret
# keys and a service-role JWT (its payload holds "service_role", which base64 spells one
# of three ways depending on where it falls); private keys; and the e2e build's fake
# server secrets (marker e2e0canary0, playwright.config.ts), so any leaked one shows.
set -uo pipefail
DIR="${1:-.next/static}"
[ -d "$DIR" ] || { echo "no $DIR: run next build first"; exit 2; }

pattern='sk_(live|test)_[0-9A-Za-z]{10,}|rk_(live|test)_[0-9A-Za-z]{10,}|whsec_[0-9A-Za-z]{10,}'
pattern+='|sk-ant-[0-9A-Za-z_-]{10,}|sb_secret_[0-9A-Za-z_-]{10,}'
pattern+='|c2VydmljZV9yb2xl|NlcnZpY2Vfcm9sZ|zZXJ2aWNlX3JvbG'
pattern+='|-----BEGIN [A-Z ]*PRIVATE KEY-----|e2e0canary0'

hits="$(grep -rEnoa "$pattern" "$DIR")"
status=$?
# grep: 0 = found, 1 = nothing found, 2+ = it could not read the files (never a pass).
if [ "$status" -eq 0 ]; then
  echo "::error::A server secret is in the browser bundle. Move it to server-only code:"
  echo "$hits" | cut -c1-160
  exit 1
elif [ "$status" -ne 1 ]; then
  echo "::error::Could not scan $DIR (grep exit $status)"
  exit 2
fi
echo "browser bundle: no server secrets ($(find "$DIR" -name '*.js' | wc -l) files checked)"
