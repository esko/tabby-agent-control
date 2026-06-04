# CLI spec

## Configuration

Home server config:

```toml
[client]
endpoint = "http://127.0.0.1:3301/mcp"
```

Crostini link config:

```toml
[link.default]
ssh_host = "home-server"
local_host = "127.0.0.1"
local_port = 3001
remote_host = "127.0.0.1"
remote_port = 3301
backend = "autossh"
```

## Agent commands

### `tabbyctl list`

List known Tabby sessions/panes/tabs.

```bash
tabbyctl list
tabbyctl list --json
```

### `tabbyctl split`

Create a split pane and optionally run a command.

```bash
tabbyctl split right --title reviewer -- codex
tabbyctl split bottom --title tests -- pnpm test --watch
```

### `tabbyctl tab new`

Open a new Tabby tab and optionally run a command.

```bash
tabbyctl tab new --title reviewer -- codex
```

### `tabbyctl focus`

Focus a pane or tab.

```bash
tabbyctl focus --pane reviewer
tabbyctl focus --session <id>
tabbyctl focus --tab reviewer
```

### `tabbyctl send`

Send text/input to a target pane/session.

```bash
tabbyctl send --pane reviewer "Review this\n"
tabbyctl send --session <id> "\x03"
```

### `tabbyctl read`

Read terminal buffer content.

```bash
tabbyctl read --pane reviewer --last 100
tabbyctl read --session <id> --last 200
```

Preserve whitespace by default. Do not filter empty lines unless an explicit option is added.

Standalone title/status commands are deferred until the live backend schema spike verifies the required Tabby MCP primitives. The implemented MVP title behavior is limited to `--title` on `split` and `tab new`, where the backend contract fails explicitly if title support is unavailable.

## Link commands

Run on the Crostini laptop.

```bash
tabbyctl link setup --host home-server
tabbyctl link start --background
tabbyctl link start --background --restart
tabbyctl link stop
tabbyctl link status
tabbyctl link doctor
```

`start --background` is MVP-required and should use `autossh` when available.
