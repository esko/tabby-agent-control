# AGENTS.md

Guidance for implementation agents working in this repository.

## Product direction

Build `tabbyctl`: a Node/TypeScript CLI that controls Tabby through an existing Tabby MCP server. The target user runs Tabby in Crostini on a Chromebook/laptop; agents run on a macOS or Linux home server.

Do not implement a new Tabby plugin in MVP unless an issue explicitly says to fork/patch the MCP backend.

## Current MVP stack

- Backend: `GentlemanHu/Tabby-MCP` running inside Tabby.
- CLI bridge: MCPorter-generated or MCPorter-backed client code.
- User CLI: hand-written `tabbyctl` commands with simple agent-friendly syntax.
- Link: `autossh` reverse tunnel from Crostini to home server.
- Endpoint on home server: `http://127.0.0.1:3301/mcp`.

## Must-have CLI flows

```bash
tabbyctl split right --title reviewer -- codex
tabbyctl tab new --title reviewer -- codex
tabbyctl focus --pane reviewer
tabbyctl send --pane reviewer "Review this\n"
tabbyctl read --pane reviewer --last 100
tabbyctl link start --background
```

## TDD expectations

Follow test-driven development, using Matt Pocock-style habits where useful: type-first design, small units, red-green-refactor, and tests that describe behavior clearly.

For each feature issue:

1. Add or update tests first.
2. Implement the smallest passing change.
3. Refactor only after tests pass.
4. Keep PRs small and linked to GitHub issues.

## Agent skills

### Issue tracker

Work is tracked in GitHub Issues for `esko/tabby-agent-control`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the repo's GitHub label vocabulary for triage and implementation readiness. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with product docs under `docs/` and ADRs under `docs/decisions/`. See `docs/agents/domain.md`.

### Worktree cleanup

When an agent issue is done and its PR has merged, verify the issue worktree is clean, remove it with `git worktree remove <path>`, delete the local issue branch, then run `git fetch --prune origin` and `git worktree prune`. If cleanup is blocked by uncommitted work, report the blocker instead of leaving the worktree silently.

## Avoid scope creep

Do not add these to MVP unless a tracked issue changes scope:

- custom OSC transport
- Mosh marker fallback
- direct WireGuard/Tailscale mode
- embedded browser/webview pane
- semantic commands like `tabbyctl files` or `tabbyctl tests`
- repo workspace layouts
- per-agent identities or ownership models
- building a fresh full Tabby plugin

## Safety

Tabby MCP can read terminal buffers and send input. Keep default endpoints local-only. Do not expose Tabby control publicly. Any network exposure must be restricted to localhost, SSH reverse tunnel, VPN, or explicit auth.
