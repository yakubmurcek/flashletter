#!/usr/bin/env bash
# Two people join the waitlist at the same moment: both must end up on it.
# Session A joins inside a transaction it holds open; session B joins meanwhile, so B's insert
# runs before A's row is committed. That is exactly when MAX("order") + 1 handed both the same
# position and silently dropped B. Runs against the local database (`supabase db start` first).
#   scripts/db-test-waitlist-race.sh
set -euo pipefail

CONTAINER="supabase_db_$(grep -m1 -oP '"project_id":\s*"\K[^"]+' supabase/config.jsonc)"
RUN="$(date +%s%N)"
A="race-a-$RUN@example.com"
B="race-b-$RUN@example.com"

psql_db() { docker exec -i "$CONTAINER" psql -U postgres -d postgres -qAtX -v ON_ERROR_STOP=1 "$@"; }

cleanup() { psql_db -c "delete from public.waitlist where email in ('$A', '$B')" >/dev/null || true; }
trap cleanup EXIT

psql_db -c "begin;
  select public.waitlist_join('$A', 'A', true, false, null, 'EU');
  select pg_sleep(3);
  commit;" >/dev/null &
HOLDER=$!

# Wait until A's insert is in and its transaction is sleeping, still uncommitted.
# Without that the test would race nothing and pass on the old code too, so give up loudly.
HELD=
for _ in $(seq 50); do
  if [ "$(psql_db -c "select count(*) from pg_stat_activity where query like '%pg_sleep(3)%' and wait_event = 'PgSleep'")" = 1 ]; then
    HELD=1
    break
  fi
  sleep 0.1
done
if [ -z "$HELD" ]; then
  echo "::error::The first signup's transaction was never seen open; the race was not set up."
  exit 1
fi

B_RESULT="$(psql_db -c "select public.waitlist_join('$B', 'B', true, false, null, 'EU')")"
wait "$HOLDER"

ROWS="$(psql_db -c "select count(*) from public.waitlist where email in ('$A', '$B')")"
echo "second signup answered: $B_RESULT"
if [ "$ROWS" != 2 ] || ! grep -q '"already_joined" : false' <<<"$B_RESULT"; then
  echo "::error::Two signups at the same moment kept $ROWS of 2 rows; the second was told: $B_RESULT"
  exit 1
fi
echo "both signups kept"
