# Tabby Agent Control

A CLI-first control layer that lets agents running on a home server control a Tabby instance running on a Crostini laptop.

The project should not start by writing a new Tabby plugin. The MVP uses an existing Tabby MCP plugin, a `tabbyctl` CLI wrapper, MCPorter-assisted MCP access, and a reverse SSH/autossh link from Crostini to the home server.

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

## Read these first

1. `docs/01-scope.md`
2. `docs/02-architecture.md`
3. `docs/03-cli-spec.md`
4. `docs/04-networking.md`
5. `docs/implementation/github-issues.md`
6. `AGENTS.md`

## Key decisions

- Use `GentlemanHu/Tabby-MCP` as the primary Tabby backend/reference.
- Use MCPorter for MCP discovery, typed clients, or generated CLI plumbing.
- Build a small `tabbyctl` UX wrapper; do not expose raw MCP tool names as the main agent interface.
- Make background autorecover reverse-link management part of MVP.
- Defer custom OSC/marker transport, direct WireGuard/Tailscale modes, repo workspace files, and embedded browser panes.

## Development style

Use TDD. Every issue should include acceptance criteria and tests before implementation. Prefer small GitHub issues and short PRs.
