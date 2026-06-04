# GitHub issue checkpoint

GitHub Issues are the source of truth for implementation work. This file is a checkpoint for agents that need quick orientation; refresh it with `gh issue list` before planning new work.

## Current status as of 2026-06-05

- `#1` PRD: open parent for the `tabbyctl` MVP.
- `#2` Spike: open, human-gated live `GentlemanHu/Tabby-MCP` schema verification.
- `#3`-`#10`: closed and merged MVP implementation slices.
- `#11`: open conditional backend patch spike, blocked until `#2` records a concrete backend gap.
- `#21`: pre-Mac-mini link hardening and docs drift cleanup.

## Merged MVP slices

- `#3` / PR `#13`: runnable `tabbyctl list` tracer bullet.
- `#4` / PR `#14`: config loading and `link setup`.
- `#5` / PR `#15`: `link start --background`, `status`, and `stop`.
- `#6` / PR `#16`: `link doctor`.
- `#7` / PR `#17`: backend contract and normalized errors.
- `#8` / PR `#18`: `read`, `send`, and `focus`.
- `#9` / PR `#19`: `split` and `tab new`.
- `#10` / PR `#20`: troubleshooting docs and manual acceptance commands.

## Next live-backend work

Do not start `#11` until `#2` documents exact tool names, schemas, and observed missing primitives against a real Tabby MCP backend.
