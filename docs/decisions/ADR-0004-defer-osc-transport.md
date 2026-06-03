# ADR-0004: Defer custom OSC/marker transport

## Status

Accepted

## Context

A custom terminal-native OSC/marker protocol could avoid network setup, but request/response and Mosh behavior add risk. The user now has acceptable reverse tunnel/VPN options.

## Decision

Do not implement OSC or marker transport in MVP. Use MCP over reverse tunnel first.

## Consequences

- Simpler MVP.
- Faster reuse of existing MCP backends.
- OSC/marker remains a post-MVP fallback for no-network environments.
