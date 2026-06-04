# Scope

## Problem

Agents run on a home server, while the interactive Tabby UI runs on a Crostini laptop. Agents need to create and control Tabby panes/tabs, talk to other agents, and read their output.

## MVP goals

- Use an existing Tabby MCP backend instead of building a new plugin.
- Provide a clean `tabbyctl` CLI for agents and humans.
- Support split pane, new tab, focus, send input, read buffer, list sessions, command execution, and title assignment for newly created panes/tabs where backend support allows.
- Provide a reliable background reverse link from Crostini to the home server.
- Use GitHub issues and TDD for implementation.

## MVP non-goals

- No custom OSC/marker transport.
- No Mosh-specific transport work.
- No direct WireGuard/Tailscale/ZeroTier endpoint mode.
- No embedded browser pane.
- No semantic helper commands such as `files`, `tests`, or `diff`.
- No repo workspace layout files.
- No per-agent permission/identity system.
- No new Tabby plugin unless the selected MCP backend cannot support a required feature.

## Required user stories

1. From the home server, start a reviewer agent in a new Tabby split:

   ```bash
   tabbyctl split right --title reviewer -- codex
   ```

2. Start another agent in a new Tabby tab:

   ```bash
   tabbyctl tab new --title reviewer -- codex
   ```

3. Focus a pane by title:

   ```bash
   tabbyctl focus --pane reviewer
   ```

4. Send text to an agent pane and read its output:

   ```bash
   tabbyctl send --pane reviewer "Review the current diff\n"
   tabbyctl read --pane reviewer --last 100
   ```

5. Keep the Crostini-to-home-server MCP link alive in the background:

   ```bash
   tabbyctl link start --background
   ```
