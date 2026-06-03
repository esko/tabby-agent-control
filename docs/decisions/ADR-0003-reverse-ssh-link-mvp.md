# ADR-0003: Use reverse SSH/autossh link for MVP networking

## Status

Accepted

## Context

Tabby runs in Crostini on a roaming laptop. Agents run on a home server. Inbound access to Crostini is awkward, and direct VPN endpoint modes add setup complexity.

## Decision

MVP uses a Crostini-initiated reverse SSH tunnel, managed by `tabbyctl link`, with `autossh` for background autorecovery.

## Consequences

- Home server gets a stable local endpoint.
- Tabby MCP remains localhost-only on the laptop.
- The control stream uses TCP, but Mosh/ET can still be used for interactive terminals.
- Direct WireGuard/Tailscale/ZeroTier are post-MVP.
