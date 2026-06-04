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
tabbyctl read --session <id> --last 200 --json
```

Preserve whitespace by default. Do not filter empty lines unless an explicit option is added.

### `tabbyctl title`

Set current or target Tabby tab title/status if backend supports it.

```bash
tabbyctl title "auth bug — reviewing"
```

If the backend lacks title support, create a patch issue rather than silently dropping the command.

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
