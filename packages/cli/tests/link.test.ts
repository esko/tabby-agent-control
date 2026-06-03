import { describe, expect, it } from 'vitest';
import { runCli } from '../src/cli.js';
import { Config } from '../src/config.js';
import { LinkProcess, LinkStateStore, ProcessRunner } from '../src/link.js';
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
