# 003 — Implement core agent commands

Labels: `type:feature`, `area:cli`, `priority:p0`

## Goal

Provide the main agent-facing commands.

## Commands

```bash
tabbyctl list --json
tabbyctl read --pane reviewer --last 100
tabbyctl send --pane reviewer "Review this\n"
tabbyctl focus --pane reviewer
tabbyctl split right --title reviewer -- codex
tabbyctl tab new --title reviewer -- codex
```

## Acceptance

- Commands map to backend MCP calls.
- Tests cover command parsing and MCP request mapping.
- Manual test against real Tabby MCP passes or missing backend primitives are documented.
