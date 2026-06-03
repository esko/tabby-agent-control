# MCP backend evaluation

## Primary backend: GentlemanHu/Tabby-MCP

Use this as the first backend to test and integrate.

Expected support:

- list sessions
- stable session IDs / targeting
- split panes
- focus pane
- send input
- read terminal buffer
- execute command
- tab management
- profile support

MVP depends on this backend for the hard Tabby-side work.

## Secondary reference: thuanpham582002/tabby-mcp-server

Use as a reference for simpler command execution and buffer reading. It is not the preferred base because researched documentation does not show required split-pane, focus-pane, or tab-management support.

## Required feature matrix

| Feature | GentlemanHu/Tabby-MCP | thuanpham/tabby-mcp-server |
|---|---:|---:|
| MCP server in Tabby | yes | yes |
| list sessions | yes | yes |
| stable session targeting | yes | partial/unknown |
| read terminal buffer | yes | yes |
| execute command | yes | yes |
| send arbitrary input | yes | not clearly documented |
| split pane | yes | not documented |
| focus pane | yes | not documented |
| new tab / tab management | yes/verify | not documented |
| profile support | yes | limited/unknown |
| good MVP base | yes | no |

## Unknowns to verify early

- Exact MCP tool schemas and names.
- Whether split returns or focuses the new pane.
- How to create a new tab using current/default profile.
- Whether title/rename is supported.
- Whether open-url is supported.

If a required primitive is missing, prefer a small fork/patch of GentlemanHu/Tabby-MCP over building a new plugin.
