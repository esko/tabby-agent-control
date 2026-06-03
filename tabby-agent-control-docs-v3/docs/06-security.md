# Security

Tabby control is powerful. It can read terminal buffers and send input to sessions.

## MVP security posture

- Tabby MCP listens only on Crostini localhost.
- Reverse tunnel binds only to home-server localhost.
- Agents use the MCP endpoint only from the home server.
- No public exposure.
- No LAN-wide bind in MVP.

## Risks

- `read` may expose secrets from terminal scrollback.
- `send` can run commands in other panes.
- A compromised home-server account could control Tabby.
- Extra tools exposed by the MCP backend may exceed the wrapper's intended scope.

## Mitigations

- Keep endpoint on `127.0.0.1`.
- Use OS user permissions on the home server.
- Consider endpoint auth before exposing beyond localhost.
- Log `tabbyctl` actions locally.
- Keep `tabbyctl` wrapper focused even if backend exposes more tools.

## Post-MVP hardening

- Bearer token or mTLS when exposing over nginx/VPN.
- Per-tool allowlist in a forked backend.
- Audit log viewer.
- Safer defaults for destructive backend tools.
