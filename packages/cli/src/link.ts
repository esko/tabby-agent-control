import { Config, LinkConfig } from './config.js';
import { ChildProcess, spawn as spawnChildProcess, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface LinkProcess {
  pid: number;
  command: string;
  args: string[];
  fallbackFrom?: string;
}

export interface ProcessRunner {
  spawn(command: string, args: string[], options: { detached: boolean; stdio: 'ignore' }): Promise<LinkProcess>;
  stop(pid: number): Promise<void>;
  isRunning(pid: number): Promise<boolean>;
  commandExists(command: string): Promise<boolean>;
}

export interface LinkStateStore {
  read(): Promise<LinkProcess | undefined>;
  write(process: LinkProcess): Promise<void>;
  clear(): Promise<void>;
}

export interface LinkDoctorCheck {
  name: string;
  ok: boolean;
  summary: string;
  action?: string;
}

export interface LinkDoctorReport {
  ok: boolean;
  checks: LinkDoctorCheck[];
  host: string;
}

export interface LinkDoctorProbe {
  checkAutossh(link: LinkConfig): Promise<LinkDoctorCheck>;
  checkLocalBackend(link: LinkConfig): Promise<LinkDoctorCheck>;
  checkRemoteEndpoint(config: Config, link: LinkConfig): Promise<LinkDoctorCheck>;
}

export interface LinkStartOptions {
  restart?: boolean;
}

export type LinkStatus =
  | { state: 'stopped' }
  | { state: 'running'; process: LinkProcess }
  | { state: 'stale'; process: LinkProcess };

export function getDefaultLink(config: Config): LinkConfig {
  const link = config.link.default;
  if (!link) {
    throw new Error('Missing [link.default] configuration. Run: tabbyctl link setup --host <host>');
  }

  return link;
}

export function buildAutosshArgs(link: LinkConfig): string[] {
  return [
    '-M',
    '0',
    '-N',
    '-o',
    'ExitOnForwardFailure=yes',
    '-o',
    'ServerAliveInterval=30',
    '-o',
    'ServerAliveCountMax=3',
    '-o',
    'ConnectTimeout=10',
    '-R',
    `${link.remote_host}:${link.remote_port}:${link.local_host}:${link.local_port}`,
    link.ssh_host,
  ];
}

export function buildSshArgs(link: LinkConfig): string[] {
  return [
    '-N',
    '-o',
    'ExitOnForwardFailure=yes',
    '-o',
    'ServerAliveInterval=30',
    '-o',
    'ServerAliveCountMax=3',
    '-o',
    'ConnectTimeout=10',
    '-R',
    `${link.remote_host}:${link.remote_port}:${link.local_host}:${link.local_port}`,
    link.ssh_host,
  ];
}

export async function startLink(
  config: Config,
  runner: ProcessRunner,
  store: LinkStateStore,
  options: LinkStartOptions = {},
): Promise<LinkProcess> {
  const link = getDefaultLink(config);
  const existingProcess = await store.read();

  if (existingProcess) {
    const running = await runner.isRunning(existingProcess.pid);

    if (running && !options.restart) {
      throw new Error(`Link already running as pid ${existingProcess.pid}. Use --restart to replace it.`);
    }

    if (running) {
      await runner.stop(existingProcess.pid);
    }

    await store.clear();
  }

  const autosshMissing = link.backend === 'autossh' && !(await runner.commandExists('autossh'));
  const command = autosshMissing ? 'ssh' : link.backend;
  const args = command === 'autossh' ? buildAutosshArgs(link) : buildSshArgs(link);
  const process = await runner.spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  const trackedProcess = autosshMissing ? { ...process, fallbackFrom: 'autossh' } : process;
  await store.write(trackedProcess);
  return trackedProcess;
}

export async function getLinkStatus(store: LinkStateStore, runner?: ProcessRunner): Promise<LinkStatus> {
  const process = await store.read();

  if (!process) {
    return { state: 'stopped' };
  }

  if (runner && !(await runner.isRunning(process.pid))) {
    return { state: 'stale', process };
  }

  return { state: 'running', process };
}

export async function stopLink(store: LinkStateStore, runner: ProcessRunner): Promise<LinkProcess | undefined> {
  const process = await store.read();
  if (!process) {
    return undefined;
  }

  await runner.stop(process.pid);
  await store.clear();
  return process;
}

function getStateDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.XDG_STATE_HOME) {
    return path.join(env.XDG_STATE_HOME, 'tabbyctl');
  }

  return path.join(env.HOME || os.homedir(), '.local', 'state', 'tabbyctl');
}

export function createFileLinkStateStore(env: NodeJS.ProcessEnv = process.env): LinkStateStore {
  const stateDir = getStateDir(env);
  const statePath = path.join(stateDir, 'link.json');

  return {
    async read() {
      if (!fs.existsSync(statePath)) {
        return undefined;
      }

      return JSON.parse(fs.readFileSync(statePath, 'utf8')) as LinkProcess;
    },
    async write(process) {
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(statePath, `${JSON.stringify(process, null, 2)}\n`);
    },
    async clear() {
      if (fs.existsSync(statePath)) {
        fs.unlinkSync(statePath);
      }
    },
  };
}

function commandExists(command: string): boolean {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
  return result.status === 0;
}

function spawnDetached(command: string, args: string[]): ChildProcess {
  const child = spawnChildProcess(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return child;
}

export function createNodeProcessRunner(): ProcessRunner {
  return {
    async commandExists(command) {
      return commandExists(command);
    },
    async spawn(command, args) {
      const child = spawnDetached(command, args);

      if (!child.pid) {
        throw new Error(`Failed to start ${command}`);
      }

      return { pid: child.pid, command, args };
    },
    async stop(pid) {
      process.kill(pid, 'SIGTERM');
    },
    async isRunning(pid) {
      try {
        process.kill(pid, 0);
        return true;
      } catch (error: unknown) {
        return (error as NodeJS.ErrnoException).code === 'EPERM';
      }
    },
  };
}

function probeAutosshCommand(command: string): boolean {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
  return result.status === 0;
}

async function probeEndpoint(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    return response !== undefined;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function buildEndpointUrl(host: string, port: number): string {
  return `http://${host}:${port}/mcp`;
}

export function createDefaultLinkDoctorProbe(): LinkDoctorProbe {
  return {
    checkAutossh: async (link) => {
      const ok = probeAutosshCommand(link.backend);
      return {
        name: 'autossh',
        ok,
        summary: ok ? 'available' : 'missing',
        action: ok ? undefined : `install ${link.backend}`,
      };
    },
    checkLocalBackend: async (link) => {
      const url = buildEndpointUrl(link.local_host, link.local_port);
      const ok = await probeEndpoint(url);
      return {
        name: 'local MCP',
        ok,
        summary: ok ? `reachable at ${url}` : `unreachable at ${url}`,
        action: ok ? undefined : `start the local MCP backend on ${link.local_host}:${link.local_port}`,
      };
    },
    checkRemoteEndpoint: async (config, link) => {
      const url = config.client.endpoint || buildEndpointUrl(link.remote_host, link.remote_port);
      const ok = await probeEndpoint(url);
      return {
        name: 'remote endpoint',
        ok,
        summary: ok ? `reachable at ${url}` : `unreachable at ${url}`,
        action: ok ? undefined : 'verify the reverse tunnel and home server endpoint',
      };
    },
  };
}

export async function runLinkDoctor(
  config: Config,
  probe: LinkDoctorProbe,
): Promise<LinkDoctorReport> {
  const link = getDefaultLink(config);

  const checks = [
    await probe.checkAutossh(link),
    await probe.checkLocalBackend(link),
    await probe.checkRemoteEndpoint(config, link),
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
    host: link.ssh_host,
  };
}

export function renderLinkDoctorReport(report: LinkDoctorReport): string[] {
  const lines: string[] = [];
  lines.push(report.ok ? 'Link doctor: all checks passed' : 'Link doctor: problems found');
  lines.push(`configured host: ${report.host}`);

  for (const check of report.checks) {
    lines.push(`${check.name}: ${check.summary}`);
    if (!check.ok && check.action) {
      lines.push(`Action: ${check.action}`);
    }
  }

  return lines;
}
