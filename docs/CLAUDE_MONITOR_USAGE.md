# Claude Code: Monitor tool usage

A short field guide for using the Claude Code `Monitor` tool when waiting on
something during a session. Captured from the patterns we used to land PRs
#33 / #34 / #35 in parallel.

> Not project code — guidance for Claude (and you) on **how to wait without
> wasting tokens or losing the thread**. Lives here so future sessions can
> point back to it instead of re-deriving the technique.

---

## What it is

`Monitor` runs a shell script in the background. **Each line that script
writes to stdout becomes a notification in the chat.** You keep working;
Claude doesn't poll. When the script exits, the watch ends.

The script is the filter. What you `echo` is what becomes an event.

---

## When to reach for it

| Situation                                                      | Right tool                                        |
| -------------------------------------------------------------- | ------------------------------------------------- |
| One-shot "tell me when X is done" (build, single CI run)       | `Bash` with `run_in_background` + an `until` loop |
| Indefinite "tell me every time X happens" (errors, file edits) | `Monitor` with `tail -f`/`inotifywait -m`/`while` |
| Per-occurrence with a known end (each CI step, then stop)      | `Monitor` with a poll loop that emits + exits     |

The wrong move is inline `sleep` chains — every iteration is a tool call
clogging the transcript and burning tokens. Push the loop out of the
conversation, get one notification per real change.

---

## The pattern that worked here

CI-watch on a force-pushed PR — the script polls every 15s, only emits when
the status string actually changes, exits on terminal state:

```bash
prev=""
while true; do
  s=$(gh pr view 34 --json statusCheckRollup --jq \
        '[.statusCheckRollup[] | select(.name == "format · lint · typecheck") | .conclusion // .status][0]')
  m=$(gh pr view 34 --json mergeStateStatus --jq '.mergeStateStatus')
  cur="ci=$s merge=$m"
  [ "$cur" != "$prev" ] && { echo "$cur"; prev="$cur"; }
  if { [ "$s" = "SUCCESS" ] || [ "$s" = "FAILURE" ]; } && [ "$m" != "UNKNOWN" ]; then
    echo "DONE"; break
  fi
  sleep 15
done
```

Three notifications landed in chat from this run:

```
ci= merge=BLOCKED          # initial transient (CI kicking off)
ci=SUCCESS merge=UNSTABLE  # CI green, merge state still resolving
DONE                       # script exited
```

That's it. No mid-flight noise, single signal when actionable.

---

## Rules of thumb

**Selectivity is your job.** Echo only state changes, not raw poll output. A
monitor that emits every 15 seconds with the same content gets killed by the
runtime for being noisy.

**Silence is not success.** If the watched job crashes in a way your filter
doesn't match, you wait forever. Always cover terminal failure states, not
just the happy path:

```bash
# wrong — silent on crash, hang, OOM
tail -f run.log | grep --line-buffered "completed=true"

# right — every signal you'd act on
tail -f run.log | grep -E --line-buffered "completed=true|Traceback|FAILED|Killed|OOM"
```

For poll loops watching API state, your loop must exit on every terminal
status (`succeeded|failed|cancelled|timeout`), not just success.

**Use `--line-buffered` in pipes.** Without it, pipe buffering silently
delays events by minutes. The grep in the example above relies on it.

**Long polls > short polls.** 30s is fine for remote APIs (rate limits, real
CI lag). 15s for git/gh CLI is a safe middle ground. Don't go below 5s
unless you're watching a local file.

**One terse `description`.** It appears in every notification — make it
specific. "Wait for #34 CI to finish" beats "Watching".

---

## Recipes

### Wait for a single PR's CI

```bash
# Use the polling pattern above. Set timeout_ms to ~10 minutes for typical
# CI; longer for slow integration suites.
```

### Watch a dev-server log for errors

```bash
# Persistent: true so the monitor lives for the whole session.
tail -f .next/dev.log | grep -E --line-buffered "Error|Failed|Unhandled"
```

### Notify on every new GitHub PR comment

```bash
last=$(date -u +%Y-%m-%dT%H:%M:%SZ)
while true; do
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  gh api "repos/owner/flashletter/issues/123/comments?since=$last" \
    --jq '.[] | "\(.user.login): \(.body)"'
  last=$now; sleep 30
done
```

### Wait for `pnpm dev` to be ready

```bash
# One-shot. Use Bash run_in_background + until-loop, NOT Monitor —
# you only need a single notification, not an event stream.
until grep -q "Ready in" /tmp/dev.log; do sleep 0.5; done
```

---

## Anti-patterns

- ❌ Inline `sleep 30 && check && sleep 30 && check` chains in the
  conversation. Every iteration is a tool call.
- ❌ `Monitor` for "tell me when X is done" with `tail -f` (never exits;
  watch lingers until timeout). Use `Bash run_in_background` instead.
- ❌ Echoing every poll result. Echo only state transitions.
- ❌ Filtering only for success markers. Add the failure signatures too, or
  silence on crash will look identical to "still running."
