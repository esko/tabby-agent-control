import { Config, LinkConfig } from './config.js';
import { spawnSync } from 'child_process';

export interface LinkProcess {
  pid: number;
  command: string;
  args: string[];
}

export interface ProcessRunner {
  spawn(command: string, args: string[], options: { detached: boolean; stdio: 'ignore' }): Promise<LinkProcess>;
  stop(pid: number): Promise<void>;
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
    '-R',
    `${link.remote_host}:${link.remote_port}:${link.local_host}:${link.local_port}`,
    link.ssh_host,
  ];
}

export async function startLink(
  config: Config,
  runner: ProcessRunner,
  store: LinkStateStore,
): Promise<LinkProcess> {
  const link = getDefaultLink(config);
  const process = await runner.spawn(link.backend, buildAutosshArgs(link), {
    detached: true,
    stdio: 'ignore',
  });
  await store.write(process);
  return process;
}

export async function getLinkStatus(store: LinkStateStore): Promise<LinkProcess | undefined> {
  return store.read();
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
