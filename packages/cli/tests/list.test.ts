import { describe, it, expect } from 'vitest';
import { runCli } from '../src/cli.js';
import { CliIo, Session, TabbyBackend } from '../src/types.js';

function createHarness(backend: TabbyBackend) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = {
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
  };

  return {
    run: (argv: string[]) => runCli(argv, { backend }, io),
    stdout,
    stderr,
  };
}

const sessions: Session[] = [
  {
    id: 'session-1',
    panes: [
      { id: 'pane-1', title: 'reviewer', focused: true },
      { id: 'pane-2', title: 'codex', focused: false },
    ],
  },
];

describe('tabbyctl list behavior', () => {
  it('should return a human-readable session/pane list from a fake backend', async () => {
    const cli = createHarness({ list: async () => sessions });
    const code = await cli.run(['list']);

    expect(code).toBe(0);
    expect(cli.stderr).toEqual([]);
    expect(cli.stdout.join('\n')).toContain('Session: session-1');
    expect(cli.stdout.join('\n')).toContain('Pane: pane-1 | Title: reviewer (focused)');
    expect(cli.stdout.join('\n')).toContain('Pane: pane-2 | Title: codex');
  });

  it('should return JSON when --json is provided', async () => {
    const cli = createHarness({ list: async () => sessions });
    const code = await cli.run(['list', '--json']);

    expect(code).toBe(0);
    expect(cli.stderr).toEqual([]);
    const parsed = JSON.parse(cli.stdout.join('\n'));
    expect(parsed).toBeInstanceOf(Array);
    expect(parsed[0].id).toBe('session-1');
    expect(parsed[0].panes).toHaveLength(2);
    expect(parsed[0].panes[0].title).toBe('reviewer');
    expect(parsed[0].panes[0].focused).toBe(true);
  });

  it('should exit non-zero with an actionable message when the backend list call fails', async () => {
    const cli = createHarness({
      list: async () => {
        throw new Error('Failed to connect to the Tabby MCP server at http://127.0.0.1:3301/mcp');
      },
    });
    const code = await cli.run(['list']);

    expect(code).toBe(1);
    expect(cli.stdout).toEqual([]);
    expect(cli.stderr).toEqual([
      'Error: Failed to connect to the Tabby MCP server at http://127.0.0.1:3301/mcp',
      'Actionable advice: verify that the reverse SSH tunnel is running:',
      '  tabbyctl link status',
    ]);
  });
});
