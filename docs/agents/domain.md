# Domain docs

This is a single-context repository.

Read these documents before changing product behavior:

- `docs/01-scope.md`
- `docs/02-architecture.md`
- `docs/03-cli-spec.md`
- `docs/04-networking.md`
- `docs/05-mcp-backend.md`
- `docs/06-security.md`
- `docs/07-phases.md`

Architectural decisions live under `docs/decisions/`. Respect existing ADRs unless an issue explicitly asks for a new decision or a change in direction.

The MVP product is `tabbyctl`: a Node/TypeScript CLI that controls Tabby through the existing `GentlemanHu/Tabby-MCP` backend over a local-only MCP endpoint or SSH reverse tunnel.
