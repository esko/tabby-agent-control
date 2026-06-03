import { describe, expect, it } from 'vitest';
import { runCli } from '../src/cli.js';
import { Config } from '../src/config.js';
import { LinkDoctorProbe, LinkProcess, LinkStateStore, ProcessRunner } from '../src/link.js';
import { CliIo } from '../src/types.js';

const config: Config = {
  client: { endpoint: 'http://127.0.0.1:3301/mcp' },
  link: {
    default: {
      ssh_host: 'home-server',
      local_host: '127.0.0.1',
      local_port: 3001,
      remote_host: '127.0.0.1',
      remote_port: 3301,
      backend: 'autossh',
    },
  },
};

function createHarness(initialProcess?: LinkProcess) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const spawned: Array<{ command: string; args: string[]; options: { detached: boolean; stdio: 'ignore' } }> = [];
  const stopped: number[] = [];
  let stored = initialProcess;

  const io: CliIo = {
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
  };

  const processRunner: ProcessRunner = {
    spawn: async (command, args, options) => {
      spawned.push({ command, args, options });
      return { pid: 4242, command, args };
    },
    stop: async (pid) => {
      stopped.push(pid);
    },
  };

  const linkStateStore: LinkStateStore = {
    read: async () => stored,
    write: async (process) => {
      stored = process;
    },
    clear: async () => {
      stored = undefined;
    },
  };

  return {
    run: (argv: string[]) =>
      runCli(
        argv,
        {
          backend: { list: async () => [] },
          config,
          processRunner,
          linkStateStore,
        },
        io,
      ),
    stdout,
    stderr,
    spawned,
    stopped,
    readStored: () => stored,
  };
}

function createDoctorHarness(probe: LinkDoctorProbe) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = {
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
  };

  return {
    run: () =>
      runCli(
        ['link', 'doctor'],
        {
          backend: { list: async () => [] },
          config,
          linkDoctor: probe,
        },
        io,
      ),
    stdout,
    stderr,
  };
}

describe('tabbyctl link start/status/stop', () => {
  it('starts autossh in the background with a localhost-only reverse bind', async () => {
    const cli = createHarness();

    const code = await cli.run(['link', 'start', '--background']);

    expect(code).toBe(0);
    expect(cli.spawned).toEqual([
      {
        command: 'autossh',
        args: ['-M', '0', '-N', '-R', '127.0.0.1:3301:127.0.0.1:3001', 'home-server'],
        options: { detached: true, stdio: 'ignore' },
      },
    ]);
    expect(cli.readStored()).toMatchObject({ pid: 4242, command: 'autossh' });
    expect(cli.stdout.join('\n')).toContain('Started autossh reverse link as pid 4242');
    expect(cli.stderr).toEqual([]);
  });

  it('requires --background for link start', async () => {
    const cli = createHarness();

    const code = await cli.run(['link', 'start']);

    expect(code).toBe(1);
    expect(cli.spawned).toEqual([]);
    expect(cli.stderr.join('\n')).toContain('requires --background');
  });

  it('reports stopped and running status from tracked link state', async () => {
    const stoppedCli = createHarness();
    expect(await stoppedCli.run(['link', 'status'])).toBe(0);
    expect(stoppedCli.stdout).toEqual(['Link stopped']);

    const runningCli = createHarness({
      pid: 5150,
      command: 'autossh',
      args: ['-M', '0', '-N', '-R', '127.0.0.1:3301:127.0.0.1:3001', 'home-server'],
    });
    expect(await runningCli.run(['link', 'status'])).toBe(0);
    expect(runningCli.stdout).toEqual(['Link running: autossh pid 5150']);
  });

  it('stops only the tracked link process', async () => {
    const cli = createHarness({
      pid: 5150,
      command: 'autossh',
      args: ['-M', '0', '-N', '-R', '127.0.0.1:3301:127.0.0.1:3001', 'home-server'],
    });

    const code = await cli.run(['link', 'stop']);

    expect(code).toBe(0);
    expect(cli.stopped).toEqual([5150]);
    expect(cli.readStored()).toBeUndefined();
    expect(cli.stdout).toEqual(['Stopped autossh pid 5150']);
  });
});

describe('tabbyctl link doctor', () => {
  it('reports missing autossh with actionable guidance', async () => {
    const cli = createDoctorHarness({
      checkAutossh: async () => ({ ok: false, summary: 'missing', action: 'install autossh', name: 'autossh' }),
      checkLocalBackend: async () => ({ ok: true, summary: 'reachable', name: 'local MCP' }),
      checkRemoteEndpoint: async () => ({ ok: true, summary: 'reachable', name: 'remote endpoint' }),
    });

    const code = await cli.run();

    expect(code).toBe(1);
    expect(cli.stderr).toEqual([]);
    expect(cli.stdout.join('\n')).toContain('Link doctor: problems found');
    expect(cli.stdout.join('\n')).toContain('autossh: missing');
    expect(cli.stdout.join('\n')).toContain('install autossh');
  });

  it('reports an unreachable local backend with a clear fix', async () => {
    const cli = createDoctorHarness({
      checkAutossh: async () => ({ ok: true, summary: 'available', name: 'autossh' }),
      checkLocalBackend: async () => ({
        ok: false,
        summary: 'unreachable',
        action: 'start the local MCP backend on 127.0.0.1:3001',
        name: 'local MCP',
      }),
      checkRemoteEndpoint: async () => ({ ok: true, summary: 'reachable', name: 'remote endpoint' }),
    });

    const code = await cli.run();

    expect(code).toBe(1);
    expect(cli.stdout.join('\n')).toContain('local MCP: unreachable');
    expect(cli.stdout.join('\n')).toContain('start the local MCP backend');
  });

  it('reports an unreachable remote endpoint with a clear fix', async () => {
    const cli = createDoctorHarness({
      checkAutossh: async () => ({ ok: true, summary: 'available', name: 'autossh' }),
      checkLocalBackend: async () => ({ ok: true, summary: 'reachable', name: 'local MCP' }),
      checkRemoteEndpoint: async () => ({
        ok: false,
        summary: 'unreachable',
        action: 'verify the reverse tunnel and home server endpoint',
        name: 'remote endpoint',
      }),
    });

    const code = await cli.run();

    expect(code).toBe(1);
    expect(cli.stdout.join('\n')).toContain('remote endpoint: unreachable');
    expect(cli.stdout.join('\n')).toContain('verify the reverse tunnel');
  });

  it('reports a passing doctor result concisely', async () => {
    const cli = createDoctorHarness({
      checkAutossh: async () => ({ ok: true, summary: 'available', name: 'autossh' }),
      checkLocalBackend: async () => ({ ok: true, summary: 'reachable', name: 'local MCP' }),
      checkRemoteEndpoint: async () => ({ ok: true, summary: 'reachable', name: 'remote endpoint' }),
    });

    const code = await cli.run();

    expect(code).toBe(0);
    expect(cli.stderr).toEqual([]);
    expect(cli.stdout.join('\n')).toContain('Link doctor: all checks passed');
    expect(cli.stdout.join('\n')).toContain('configured host: home-server');
    expect(cli.stdout.join('\n')).toContain('local MCP: reachable');
    expect(cli.stdout.join('\n')).toContain('remote endpoint: reachable');
  });
});
