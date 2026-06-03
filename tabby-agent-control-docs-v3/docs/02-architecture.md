# Architecture

## Components

```text
packages/cli
  tabbyctl command UX
  MCP client wrapper
  link manager

external backend
  GentlemanHu/Tabby-MCP running inside Tabby

optional generated code
  MCPorter-generated typed client or CLI plumbing
```

## Runtime topology

```text
Crostini laptop
  Tabby
  GentlemanHu/Tabby-MCP on 127.0.0.1:3001
  tabbyctl link manager
    autossh -R 127.0.0.1:3301:127.0.0.1:3001 home-server

Home server
  tabbyctl endpoint: http://127.0.0.1:3301/mcp
  agents call tabbyctl commands
```

## CLI layers

`tabbyctl` should hide raw MCP tool names. Internally it may use MCPorter for discovery/generated clients, but the user-facing commands should remain stable even if backend tools differ.

```text
tabbyctl split right --title reviewer -- codex
  -> resolve backend tool(s)
  -> split pane
  -> run command in new pane
  -> apply title if supported or patched
```

## Backend selection

Primary backend: `GentlemanHu/Tabby-MCP`.

Why: it is the only researched candidate with documented support for split panes, focus pane, terminal input, terminal buffer reads, tab management, profiles, and stable targeting concepts.

Secondary reference: `thuanpham582002/tabby-mcp-server` for simpler buffer/command examples only.

## Forking policy

Start with external MCP usage. Fork or patch the backend only for missing required primitives, especially:

- reliable `split` returning/selecting the new pane
- new tab with current/default profile
- focus pane by title/session
- rename tab/title support
- open URL support
