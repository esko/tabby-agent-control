# Tabby Agent Control

A CLI-first control layer that lets agents running on a home server control a Tabby instance running on a Crostini laptop.

The project should not start by writing a new Tabby plugin. The MVP uses an existing Tabby MCP plugin, a `tabbyctl` CLI wrapper, MCPorter-assisted MCP access, and a reverse SSH/autossh link from Crostini to the home server.

## Install

```bash
npm install
npm run build --workspace tabbyctl
```

The CLI binary is published from `packages/cli` as `tabbyctl`.

## Configure

The home server reads `~/.config/tabbyctl/config.toml` by default:

```toml
[client]
endpoint = "http://127.0.0.1:3301/mcp"
```

On the Crostini laptop, the link manager uses a localhost-only reverse tunnel:

```toml
[link.default]
ssh_host = "home-server"
local_host = "127.0.0.1"
local_port = 3001
remote_host = "127.0.0.1"
remote_port = 3301
backend = "autossh"
```

## MVP thesis

Agents should be able to run commands like:

```bash
tabbyctl split right --title reviewer -- codex
tabbyctl tab new --title reviewer -- codex
tabbyctl focus --pane reviewer
tabbyctl send --pane reviewer "Review the current diff\n"
tabbyctl read --pane reviewer --last 100
```

The Tabby/MCP service runs on the laptop, but agents run on the home server. `tabbyctl link` creates a reliable reverse tunnel so the home server gets a stable local MCP endpoint.

## Safety

Keep the MCP endpoint bound to `127.0.0.1` on both sides of the link. The MVP does not expose Tabby control on the LAN or the public internet.

## Primary architecture

```text
Crostini laptop
  Tabby + GentlemanHu/Tabby-MCP on 127.0.0.1:3001
  tabbyctl link start --background
    autossh reverse tunnel
      -R 127.0.0.1:3301:127.0.0.1:3001

Home server, macOS or Linux
  agents + tabbyctl
  endpoint: http://127.0.0.1:3301/mcp
```

## Core commands

```bash
tabbyctl list
tabbyctl split right --title reviewer -- codex
tabbyctl tab new --title reviewer -- codex
tabbyctl focus --pane reviewer
tabbyctl send --pane reviewer "Review this\n"
tabbyctl read --pane reviewer --last 100
tabbyctl link setup --host home-server
tabbyctl link start --background
tabbyctl link status
tabbyctl link doctor
```

## Read these first

1. `docs/01-scope.md`
2. `docs/02-architecture.md`
3. `docs/03-cli-spec.md`
4. `docs/04-networking.md`
5. `docs/implementation/github-issues.md`
6. `AGENTS.md`

## Troubleshooting

Start with `tabbyctl link doctor` when the backend or tunnel is not behaving. For common failure modes and the expected concise error output, see [docs/08-troubleshooting.md](docs/08-troubleshooting.md).

## Key decisions

- Use `GentlemanHu/Tabby-MCP` as the primary Tabby backend/reference.
- Use MCPorter for MCP discovery, typed clients, or generated CLI plumbing.
- Build a small `tabbyctl` UX wrapper; do not expose raw MCP tool names as the main agent interface.
- Make background autorecover reverse-link management part of MVP.
- Defer custom OSC/marker transport, direct WireGuard/Tailscale modes, repo workspace files, and embedded browser panes.

## Development style

Use TDD. Every issue should include acceptance criteria and tests before implementation. Prefer small GitHub issues and short PRs.
