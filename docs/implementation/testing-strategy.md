# Testing strategy

Use TDD. Keep tests close to behavior and map each feature to a GitHub issue.

## Unit tests

- CLI argument parsing.
- Config loading/overrides.
- MCP tool mapping.
- Target resolution request building.
- Link command construction.
- `autossh`/`ssh` process supervisor behavior with mocked processes.

## Integration tests

- MCP client can call a fake MCP server.
- `tabbyctl list/read/send/focus` map to expected MCP requests.
- Link manager can start/stop/status using mocked `autossh`.
- Doctor reports actionable failures.

## Manual acceptance tests

Run against real Tabby + GentlemanHu/Tabby-MCP:

```bash
tabbyctl list --json
tabbyctl split right --title reviewer -- codex
tabbyctl send --pane reviewer "Say ready\n"
tabbyctl read --pane reviewer --last 50
tabbyctl focus --pane reviewer
tabbyctl tab new --title reviewer-2 -- codex
```

## TDD issue rule

Every implementation issue should define:

- failing test name(s)
- expected user command
- acceptance criteria
- manual verification command, if relevant
