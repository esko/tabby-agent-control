# Phases

## Phase 0: backend and MCPorter spike

Goal: prove selected backend and CLI bridge.

Acceptance:

- GentlemanHu/Tabby-MCP installs in Tabby.
- MCP health endpoint works locally.
- MCPorter can list tools/schemas.
- `get_session_list`, `get_terminal_buffer`, `send_input`, `focus_pane`, and split/tab tools are identified.

## Phase 1: tunnel link MVP

Goal: stable home-server endpoint.

Acceptance:

- `tabbyctl link setup --host home-server` writes config.
- `tabbyctl link start --background` starts autossh.
- `tabbyctl link status` reports process and endpoint.
- `tabbyctl link doctor` verifies local MCP, SSH, tunnel, and remote health.
- Home server can reach `http://127.0.0.1:3301/mcp`.

## Phase 2: core tabbyctl wrapper

Goal: agent-facing commands.

Acceptance:

- `tabbyctl list --json`
- `tabbyctl read --pane reviewer --last 100`
- `tabbyctl send --pane reviewer "...\n"`
- `tabbyctl focus --pane reviewer`
- clear errors for ambiguous or missing targets

## Phase 3: layout commands

Goal: required layout flows.

Acceptance:

- `tabbyctl split right --title reviewer -- codex`
- `tabbyctl split right --ensure --title reviewer -- codex`
- `tabbyctl tab new --title reviewer -- codex`
- commands run in the created target where backend support allows

## Phase 4: polish and docs

Goal: usable daily workflow.

Acceptance:

- fish-compatible setup docs
- GitHub issue workflow documented
- basic action logging
- clear troubleshooting docs
- tests cover command mapping and link manager behavior

## Post-MVP

- Direct WireGuard/Tailscale/ZeroTier endpoint modes.
- Nginx/auth exposure.
- Custom OSC/marker terminal transport.
- Mosh-specific transport work.
- Repo workspace layout files.
- Embedded browser/webview pane.
- Backend allowlist/security fork.
