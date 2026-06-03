# Troubleshooting

`tabbyctl` keeps output short on purpose. On success, commands stay quiet unless they are supposed to print data. On failure, the CLI reports the command-level error and, where possible, one short action line that points at the next fix.

The output should help you see what happened without echoing terminal buffer contents or command input back into the log.

## Manual acceptance commands

Run these against a real Tabby + `GentlemanHu/Tabby-MCP` setup:

```bash
tabbyctl link setup --host home-server
tabbyctl link start --background
tabbyctl link status
tabbyctl link doctor
tabbyctl list --json
tabbyctl split right --title reviewer -- codex
tabbyctl tab new --title reviewer-2 -- codex
tabbyctl focus --pane reviewer
tabbyctl send --pane reviewer "Say ready\n"
tabbyctl read --pane reviewer --last 50
```

## Missing backend

Typical symptom:

```text
Error: Failed to list through http://127.0.0.1:3301/mcp: ...
Actionable advice: verify that the reverse SSH tunnel is running:
  tabbyctl link status
```

What it means:

- The home-server endpoint is not reachable.
- Tabby MCP may be stopped on the Crostini laptop.
- The reverse tunnel may be down or pointing at the wrong local port.

What to do:

1. Run `tabbyctl link doctor`.
2. Confirm Tabby and the MCP backend are running on the laptop.
3. Run `tabbyctl link status`.

## Tunnel down

Typical doctor output:

```text
Link doctor: problems found
configured host: home-server
local MCP: reachable at http://127.0.0.1:3001/mcp
remote endpoint: unreachable at http://127.0.0.1:3301/mcp
Action: verify the reverse tunnel and home server endpoint
```

What it means:

- The local backend is healthy.
- The home-server endpoint is not reachable through the reverse tunnel.

What to do:

1. Restart the link with `tabbyctl link start --background`.
2. Check `tabbyctl link status`.
3. Confirm the SSH host and config in `~/.config/tabbyctl/config.toml`.

## Ambiguous target

Typical symptom:

```text
Error: Target "reviewer" is ambiguous for read.
```

What it means:

- More than one pane, session, or tab matched the selector.

What to do:

1. Run `tabbyctl list`.
2. Use a unique title.
3. Use an ID if the backend exposes one in the list output.

## Unsupported primitive

Typical symptom:

```text
Error: This backend does not support read.
```

What it means:

- The selected backend exposes the target, but not the requested primitive.
- `tabbyctl` does not fake unsupported backend features in MVP.

What to do:

1. Switch to a backend that supports the primitive.
2. Or add the primitive in the backend and re-run the same command.

## Safe logging rules

- Keep the endpoint local-only.
- Do not expose reverse tunnel ports on `0.0.0.0` in MVP.
- Do not print terminal buffer contents in error paths.
- Use `link doctor` for the first-pass health check.
