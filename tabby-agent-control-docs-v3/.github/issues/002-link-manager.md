# 002 — Implement reverse link manager

Labels: `type:feature`, `area:link`, `priority:p0`

## Goal

`tabbyctl link start --background` creates a reliable Crostini-to-home-server reverse tunnel.

## Acceptance

- Uses autossh if available.
- Binds remote endpoint to `127.0.0.1:3301`.
- Writes pid/log files.
- `status`, `stop`, and `doctor` work.
- Unit tests cover command construction and process state.
