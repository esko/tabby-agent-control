# ADR-0001: Use existing Tabby MCP backend for MVP

## Status

Accepted

## Context

Existing Tabby MCP plugins already implement much of the Tabby-side functionality: session discovery, input sending, buffer reading, split-pane handling, tab management, and profile integration.

## Decision

Use GentlemanHu/Tabby-MCP as the primary backend/reference. Build `tabbyctl` as a CLI wrapper over MCP instead of implementing a new Tabby plugin for MVP.

## Consequences

- Faster MVP.
- Larger backend feature surface is acceptable.
- May require small backend fork/patches for missing title/new-tab/split behavior.
