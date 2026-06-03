# Deferred OSC/marker transport

A previous plan considered a custom terminal-native protocol using OSC escape sequences and marker fallbacks. That is now post-MVP.

Reasons:

- Existing MCPs already solve most Tabby-side functionality.
- Reverse SSH/autossh link is acceptable for the MCP control stream.
- Mosh/ET remain useful for interactive terminal sessions even if MCP control uses TCP.
- Custom request/response over terminal streams adds risk and complexity.

Do not revive this in MVP unless the MCP network path becomes unusable.
