import { Session, TabbyBackend } from '../types.js';

export class TabbyClient implements TabbyBackend {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async list(): Promise<Session[]> {
    if (process.env.TABBYCTL_MOCK_FAIL === 'true') {
      throw new Error(`Failed to connect to the Tabby MCP server at ${this.endpoint}`);
    }

    if (process.env.TABBYCTL_MOCK === 'true' || this.endpoint.startsWith('mock:')) {
      return [
        {
          id: 'session-1',
          panes: [
            { id: 'pane-1', title: 'reviewer', focused: true },
            { id: 'pane-2', title: 'codex', focused: false }
          ]
        }
      ];
    }

    // Real client logic will go here. For now, since we only have the fake backend seam,
    // we throw an error if mock flags aren't set.
    throw new Error(`Failed to connect to the Tabby MCP server at ${this.endpoint}`);
  }
}
