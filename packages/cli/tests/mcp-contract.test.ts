import { describe, expect, it } from 'vitest';
import { createTabbyBackendContract } from '../src/mcp/contract.js';

describe('Tabby backend contract', () => {
  it('lists sessions through a stable backend contract', async () => {
    const contract = createTabbyBackendContract({
      listSessions: async () => [
        {
          id: 'session-1',
          panes: [{ id: 'pane-1', title: 'reviewer', focused: true }],
        },
      ],
    });

    await expect(contract.list()).resolves.toEqual([
      {
        id: 'session-1',
        panes: [{ id: 'pane-1', title: 'reviewer', focused: true }],
      },
    ]);
  });

  it('returns a clear unsupported error when read is not implemented', async () => {
    const contract = createTabbyBackendContract({
      listSessions: async () => [
        {
          id: 'session-1',
          panes: [{ id: 'pane-1', title: 'reviewer', focused: true }],
        },
      ],
    });

    await expect(contract.read({ pane: 'reviewer' })).rejects.toMatchObject({
      name: 'UnsupportedBackendPrimitiveError',
      message: 'This backend does not support read.',
      primitive: 'read',
    });
  });

  it('returns a missing target error when no selector is provided', async () => {
    const contract = createTabbyBackendContract({
      listSessions: async () => [],
    });

    await expect(contract.focus({})).rejects.toMatchObject({
      name: 'MissingTargetError',
      message: 'Missing target for focus. Specify exactly one of --pane, --session, or --tab.',
    });
  });

  it('returns an ambiguous target error when a pane title matches more than one pane', async () => {
    const contract = createTabbyBackendContract({
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
    });

    await expect(contract.send({ pane: 'reviewer' }, 'hello')).rejects.toMatchObject({
      name: 'AmbiguousTargetError',
      message: 'Target "reviewer" is ambiguous for send. Matches: reviewer, reviewer.',
    });
  });

  it('normalizes transport failures into actionable backend errors', async () => {
    const contract = createTabbyBackendContract(
      {
        listSessions: async () => {
          throw new Error('socket closed');
        },
      },
      { backendLabel: 'http://127.0.0.1:3301/mcp' },
    );

    await expect(contract.list()).rejects.toMatchObject({
      name: 'BackendTransportError',
      message:
        'Failed to list through http://127.0.0.1:3301/mcp: socket closed. Check the reverse SSH tunnel and Tabby MCP backend.',
    });
  });

  it('routes read, send, and focus through the stable backend contract', async () => {
    const calls: Array<{ operation: string; target: unknown; payload?: unknown }> = [];

    const contract = createTabbyBackendContract({
      listSessions: async () => [
        {
          id: 'session-1',
          title: 'reviewer-tab',
          panes: [{ id: 'pane-1', title: 'reviewer', focused: true }],
        },
      ],
      read: async (target, options) => {
        calls.push({ operation: 'read', target, payload: options });
        return 'buffer text';
      },
      send: async (target, text) => {
        calls.push({ operation: 'send', target, payload: text });
      },
      focus: async (target) => {
        calls.push({ operation: 'focus', target });
      },
    });

    await expect(contract.read({ pane: 'reviewer' }, { last: 50 })).resolves.toBe('buffer text');
    await expect(contract.send({ session: 'session-1' }, 'Review this\n')).resolves.toBeUndefined();
    await expect(contract.focus({ tab: 'reviewer-tab' })).resolves.toBeUndefined();

    expect(calls).toEqual([
      {
        operation: 'read',
        target: {
          kind: 'pane',
          id: 'pane-1',
          label: 'reviewer',
          sessionId: 'session-1',
          paneId: 'pane-1',
        },
        payload: { last: 50 },
      },
      {
        operation: 'send',
        target: {
          kind: 'session',
          id: 'session-1',
          label: 'reviewer-tab',
          sessionId: 'session-1',
        },
        payload: 'Review this\n',
      },
      {
        operation: 'focus',
        target: {
          kind: 'tab',
          id: 'session-1',
          label: 'reviewer-tab',
          sessionId: 'session-1',
        },
      },
    ]);
  });

  it('creates a split pane, applies its title, and executes the requested command', async () => {
    const calls: Array<{ operation: string; target?: unknown; payload?: unknown }> = [];

    const contract = createTabbyBackendContract({
      listSessions: async () => [],
      split: async (direction) => {
        calls.push({ operation: 'split', payload: direction });
        return {
          kind: 'pane',
          id: 'pane-2',
          label: 'pending',
          sessionId: 'session-1',
          paneId: 'pane-2',
        };
      },
      setTitle: async (target, title) => {
        calls.push({ operation: 'setTitle', target, payload: title });
      },
      execute: async (target, command) => {
        calls.push({ operation: 'execute', target, payload: command });
      },
    });

    await expect(
      contract.split('right', { title: 'reviewer', command: ['codex'] }),
    ).resolves.toEqual({
      kind: 'pane',
      id: 'pane-2',
      label: 'reviewer',
      sessionId: 'session-1',
      paneId: 'pane-2',
    });

    expect(calls).toEqual([
      { operation: 'split', payload: 'right' },
      {
        operation: 'setTitle',
        target: {
          kind: 'pane',
          id: 'pane-2',
          label: 'pending',
          sessionId: 'session-1',
          paneId: 'pane-2',
        },
        payload: 'reviewer',
      },
      {
        operation: 'execute',
        target: {
          kind: 'pane',
          id: 'pane-2',
          label: 'reviewer',
          sessionId: 'session-1',
          paneId: 'pane-2',
        },
        payload: ['codex'],
      },
    ]);
  });

  it('fails explicitly when title support is missing for a split pane', async () => {
    const contract = createTabbyBackendContract({
      listSessions: async () => [],
      split: async () => ({
        kind: 'pane',
        id: 'pane-2',
        label: 'pending',
        sessionId: 'session-1',
        paneId: 'pane-2',
      }),
      execute: async () => undefined,
    });

    await expect(contract.split('bottom', { title: 'tests' })).rejects.toMatchObject({
      name: 'UnsupportedBackendPrimitiveError',
      message: 'This backend does not support title.',
      primitive: 'title',
    });
  });

  it('fails explicitly when command execution support is missing for a new tab', async () => {
    const contract = createTabbyBackendContract({
      listSessions: async () => [],
      tabNew: async () => ({
        kind: 'tab',
        id: 'session-2',
        label: 'pending',
        sessionId: 'session-2',
      }),
      setTitle: async () => undefined,
    });

    await expect(contract.tabNew({ command: ['pnpm', 'test', '--watch'] })).rejects.toMatchObject({
      name: 'UnsupportedBackendPrimitiveError',
      message: 'This backend does not support execute.',
      primitive: 'execute',
    });
  });
});
