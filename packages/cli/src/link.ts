import { Config, LinkConfig } from './config.js';

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
