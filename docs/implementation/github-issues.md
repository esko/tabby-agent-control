# GitHub issue plan

Use GitHub issues as the source of truth. Keep issues small and PRs linked.

## Labels

- `type:feature`
- `type:spike`
- `type:bug`
- `area:cli`
- `area:link`
- `area:mcp`
- `area:docs`
- `priority:p0`
- `priority:p1`
- `post-mvp`

## Seed issues

### 001 — Spike: install Tabby MCP and inspect tool schemas

Labels: `type:spike`, `area:mcp`, `priority:p0`

Acceptance:

- GentlemanHu/Tabby-MCP runs locally in Tabby.
- MCPorter can list tools and schemas.
- Required tools are identified or gaps are documented.
- Decision recorded: use as-is, fork, or fallback.

### 002 — Implement config loader

Labels: `type:feature`, `area:cli`, `priority:p0`

Acceptance:

- Reads `~/.config/tabbyctl/config.toml`.
- Supports endpoint and link config.
- Env var overrides endpoint.
- Unit tests cover missing/invalid config.

### 003 — Implement link command construction

Labels: `type:feature`, `area:link`, `priority:p0`

Acceptance:

- Builds safe autossh command with localhost reverse bind.
- Falls back to ssh with warning.
- Unit tests verify arguments.

### 004 — Implement `tabbyctl link start --background`

Labels: `type:feature`, `area:link`, `priority:p0`

Acceptance:

- Starts autossh detached.
- Writes pid/log files.
- Refuses duplicate managed link unless `--restart` is passed.
- Tests use mocked process spawning.

### 005 — Implement `link status/stop/doctor`

Labels: `type:feature`, `area:link`, `priority:p0`

Acceptance:

- Status reports pid/backend/endpoint.
- Stop kills the managed process.
- Doctor checks local MCP, ssh, autossh, and remote endpoint.

### 006 — Implement MCP client wrapper

Labels: `type:feature`, `area:mcp`, `priority:p0`

Acceptance:

- Can call fake MCP tools in tests.
- Supports generated MCPorter client or direct MCP client adapter.
- Errors are normalized for CLI use.

### 007 — Implement `list/read/send/focus`

Labels: `type:feature`, `area:cli`, `priority:p0`

Acceptance:

- Commands map to backend tools.
- Pane title/session targeting works.
- Ambiguous targets produce helpful errors.
- Tests cover request mapping.

### 008 — Implement `split` and `tab new`

Labels: `type:feature`, `area:cli`, `priority:p0`

Acceptance:

- Required commands work against real backend or documented fork patch.
- `--ensure` reuses title match when safe.
- Commands can run in created pane/tab.

### 009 — Patch backend if required primitives are missing

Labels: `type:feature`, `area:mcp`, `priority:p1`

Acceptance:

- Missing required primitive is implemented in a fork or plugin patch.
- Tests/manual reproduction included.
- Wrapper docs updated.

### 010 — Post-MVP: direct VPN endpoint mode

Labels: `type:feature`, `area:link`, `post-mvp`

Acceptance:

- WireGuard/Tailscale/ZeroTier modes documented and optionally implemented.
