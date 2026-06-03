# ADR-0002: Use MCPorter for MCP CLI/client plumbing

## Status

Accepted

## Context

The final UX should be a simple CLI, but implementing MCP transport and schema handling from scratch is unnecessary.

## Decision

Use MCPorter for tool/schema discovery, generated clients, or generated CLI plumbing. Keep a hand-written `tabbyctl` wrapper for stable agent-friendly commands.

## Consequences

- Agents use `tabbyctl`, not raw MCP tool names.
- MCPorter can accelerate initial integration and typed clients.
- The wrapper remains free to normalize backend differences.
