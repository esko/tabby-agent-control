import { describe, expect, it } from 'vitest';
import { runCli } from '../src/cli.js';
import { createTabbyBackendContract } from '../src/mcp/contract.js';
import { CliIo, Session } from '../src/types.js';

function createHarness(backend: Parameters<typeof runCli>[1]['backend']) {
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
    panes: [{ id: 'pane-1', title: 'reviewer', focused: true }],
  },
];

describe('tabbyctl focus/send/read target commands', () => {
  it('focuses a pane by title', async () => {
    let focusedTarget: unknown;
    const cli = createHarness(
      createTabbyBackendContract({
        listSessions: async () => sessions,
        focus: async (target) => {
          focusedTarget = target;
        },
      }),
    );

    const code = await cli.run(['focus', '--pane', 'reviewer']);

    expect(code).toBe(0);
    expect(focusedTarget).toEqual({
      kind: 'pane',
      id: 'pane-1',
      label: 'reviewer',
      sessionId: 'session-1',
      paneId: 'pane-1',
    });
    expect(cli.stdout).toEqual([]);
    expect(cli.stderr).toEqual([]);
  });

  it('sends literal input to a session target', async () => {
    let sentTarget: unknown;
    let sentText = '';
    const cli = createHarness(
      createTabbyBackendContract({
        listSessions: async () => [
          {
            id: 'session-1',
            title: 'reviewer',
            panes: [{ id: 'pane-1', title: 'reviewer', focused: true }],
          },
        ],
        send: async (target, text) => {
          sentTarget = target;
          sentText = text;
        },
      }),
    );

    const code = await cli.run(['send', '--session', 'reviewer', 'Review this\n']);

    expect(code).toBe(0);
    expect(sentTarget).toEqual({
      kind: 'session',
      id: 'session-1',
      label: 'reviewer',
      sessionId: 'session-1',
    });
    expect(sentText).toBe('Review this\n');
    expect(cli.stdout).toEqual([]);
    expect(cli.stderr).toEqual([]);
  });

  it('reads the last N lines without trimming terminal whitespace', async () => {
    let readTarget: unknown;
    let readOptions: unknown;
    const cli = createHarness(
      createTabbyBackendContract({
        listSessions: async () => sessions,
        read: async (target, options) => {
          readTarget = target;
          readOptions = options;
          return 'line one  \nline two\t\n';
        },
      }),
    );

    const code = await cli.run(['read', '--pane', 'reviewer', '--last', '100']);

    expect(code).toBe(0);
    expect(readTarget).toEqual({
      kind: 'pane',
      id: 'pane-1',
      label: 'reviewer',
      sessionId: 'session-1',
      paneId: 'pane-1',
    });
    expect(readOptions).toEqual({ last: 100 });
    expect(cli.stdout).toEqual(['line one  \nline two\t\n']);
    expect(cli.stderr).toEqual([]);
  });

  it('fails clearly when a target is missing', async () => {
    const cli = createHarness(
      createTabbyBackendContract({
        listSessions: async () => sessions,
      }),
    );

    const code = await cli.run(['focus']);

    expect(code).toBe(1);
    expect(cli.stdout).toEqual([]);
    expect(cli.stderr.join('\n')).toContain(
      'Missing target for focus. Specify exactly one of --pane, --session, or --tab.',
    );
  });

  it('fails clearly when a target is ambiguous', async () => {
    const cli = createHarness(
      createTabbyBackendContract({
        listSessions: async () => [
          {
            id: 'session-1',
            panes: [{ id: 'pane-1', title: 'reviewer', focused: true }],
          },
          {
            id: 'session-2',
            panes: [{ id: 'pane-2', title: 'reviewer', focused: false }],
          },
        ],
      }),
    );

    const code = await cli.run(['read', '--pane', 'reviewer', '--last', '100']);

    expect(code).toBe(1);
    expect(cli.stdout).toEqual([]);
    expect(cli.stderr.join('\n')).toContain('Target "reviewer" is ambiguous for read.');
  });
});

describe('tabbyctl split/tab layout commands', () => {
  it('splits a pane to the right and preserves argv after --', async () => {
    let splitDirection: string | undefined;
    let splitOptions: unknown;
    const cli = createHarness(
      createTabbyBackendContract({
        listSessions: async () => sessions,
        split: async (direction) => {
          splitDirection = direction;
          return {
            kind: 'pane',
            id: 'pane-2',
            label: 'pending',
            sessionId: 'session-1',
            paneId: 'pane-2',
          };
        },
        setTitle: async () => undefined,
        execute: async (_target, command) => {
          splitOptions = command;
        },
      }),
    );

    const code = await cli.run(['split', 'right', '--title', 'reviewer', '--', 'codex']);

    expect(code).toBe(0);
    expect(splitDirection).toBe('right');
    expect(splitOptions).toEqual(['codex']);
    expect(cli.stdout).toEqual([]);
    expect(cli.stderr).toEqual([]);
  });

  it('opens a new tab and preserves argv after --', async () => {
    let tabOptions: unknown;
    const cli = createHarness(
      createTabbyBackendContract({
        listSessions: async () => sessions,
        tabNew: async () => {
          return {
            kind: 'tab',
            id: 'session-2',
            label: 'pending',
            sessionId: 'session-2',
          };
        },
        setTitle: async () => undefined,
        execute: async (_target, command) => {
          tabOptions = command;
        },
      }),
    );

    const code = await cli.run(['tab', 'new', '--title', 'reviewer', '--', 'codex']);

    expect(code).toBe(0);
    expect(tabOptions).toEqual(['codex']);
    expect(cli.stdout).toEqual([]);
    expect(cli.stderr).toEqual([]);
  });

  it('splits a pane to the bottom and preserves a multi-argument argv after --', async () => {
    let splitDirection: string | undefined;
    let executedCommand: unknown;
    const cli = createHarness(
      createTabbyBackendContract({
        listSessions: async () => sessions,
        split: async (direction) => {
          splitDirection = direction;
          return {
            kind: 'pane',
            id: 'pane-3',
            label: 'pending',
            sessionId: 'session-1',
            paneId: 'pane-3',
          };
        },
        setTitle: async () => undefined,
        execute: async (_target, command) => {
          executedCommand = command;
        },
      }),
    );

    const code = await cli.run(['split', 'bottom', '--title', 'tests', '--', 'pnpm', 'test', '--watch']);

    expect(code).toBe(0);
    expect(splitDirection).toBe('bottom');
    expect(executedCommand).toEqual(['pnpm', 'test', '--watch']);
    expect(cli.stdout).toEqual([]);
    expect(cli.stderr).toEqual([]);
  });
});
