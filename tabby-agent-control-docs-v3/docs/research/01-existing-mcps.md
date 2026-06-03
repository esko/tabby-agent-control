# Existing MCP references

## GentlemanHu/Tabby-MCP

Primary candidate. Research indicated support for split panes, focus pane, terminal input, terminal buffer reads, tab management, profile tooling, and stable session targeting concepts.

Use it first. If a required primitive is absent or awkward, file a patch/fork issue.

## thuanpham582002/tabby-mcp-server

Secondary reference. Useful for simpler buffer reading and command execution patterns. Not preferred as the base because required split/focus/tab-management support was not clearly documented.

## MCPorter

Use for MCP discovery, generated client code, or raw tool calls during spikes. The final user interface should still be `tabbyctl`, not raw MCP tool names.
