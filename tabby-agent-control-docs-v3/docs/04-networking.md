# Networking

## MVP model

The client side is the Crostini laptop running Tabby. The server side is a macOS or Linux home server running agents.

MVP uses an SSH reverse tunnel from Crostini to the home server. This carries only the MCP control stream, not the interactive Mosh/ET terminal session.

```text
Crostini: 127.0.0.1:3001  ->  home server: 127.0.0.1:3301
```

## Tunnel command

The link manager should run the equivalent of:

```bash
autossh -M 0 -N \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ConnectTimeout=10 \
  -R 127.0.0.1:3301:127.0.0.1:3001 \
  home-server
```

Fallback to `ssh` is acceptable with a warning that autorecovery is weaker.

## Why reverse tunnel first

- Crostini can make outbound SSH connections reliably.
- No inbound laptop firewall or ChromeOS/Crostini port routing is needed.
- Tabby MCP can remain bound to localhost.
- The home server gets a stable local endpoint.
- Mosh/ET can still be used for the actual interactive terminal sessions.

## Background mode requirement

`tabbyctl link start --background` is part of MVP. It must write pid/log state and recover via `autossh` when the laptop reconnects.

Suggested files:

```text
~/.config/tabbyctl/config.toml
~/.local/state/tabbyctl/link.pid
~/.local/state/tabbyctl/link.log
```

## Security defaults

Bind both sides to localhost:

```bash
-R 127.0.0.1:3301:127.0.0.1:3001
```

Do not expose the reverse port on `0.0.0.0` in MVP. Nginx, direct WireGuard, Tailscale, ZeroTier, and public tunnels are post-MVP alternatives.
