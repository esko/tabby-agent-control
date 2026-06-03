import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import toml from 'toml';

export const LinkConfigSchema = z.object({
  ssh_host: z.string(),
  local_host: z.string().default('127.0.0.1'),
  local_port: z.number().default(3001),
  remote_host: z.string().default('127.0.0.1'),
  remote_port: z.number().default(3301),
  backend: z.enum(['autossh', 'ssh']).default('autossh'),
});

export const ClientConfigSchema = z.object({
  endpoint: z.string().default('http://127.0.0.1:3301/mcp'),
});

export const ConfigSchema = z.object({
  client: ClientConfigSchema.default({}),
  link: z.record(z.string(), LinkConfigSchema).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type LinkConfig = z.infer<typeof LinkConfigSchema>;

export interface LoadConfigOptions {
  env?: NodeJS.ProcessEnv;
  configPath?: string;
  fsOverride?: {
    readFileSync: (path: string, encoding: 'utf8') => string;
    existsSync: (path: string) => boolean;
  };
}

export function loadConfig(options: LoadConfigOptions = {}): Config {
  const env = options.env || process.env;
  const configPath = options.configPath || path.join(env.HOME || os.homedir(), '.config', 'tabbyctl', 'config.toml');
  
  let rawToml = '';
  const exists = options.fsOverride ? options.fsOverride.existsSync(configPath) : fs.existsSync(configPath);
  
  if (exists) {
    rawToml = options.fsOverride ? options.fsOverride.readFileSync(configPath, 'utf8') : fs.readFileSync(configPath, 'utf8');
  }
  
  let parsed: unknown = {};
  if (rawToml.trim()) {
    try {
      parsed = toml.parse(rawToml);
    } catch (e) {
      throw new Error(`Failed to parse TOML config: ${(e as Error).message}`);
    }
  }

  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.message}`);
  }

  const config = result.data;

  // TABBYCTL_ENDPOINT environment override
  if (env.TABBYCTL_ENDPOINT) {
    config.client.endpoint = env.TABBYCTL_ENDPOINT;
  }

  return config;
}

export function renderLinkSetupConfig(host: string, endpoint = 'http://127.0.0.1:3301/mcp'): string {
  return `[client]
endpoint = "${endpoint}"

[link.default]
ssh_host = "${host}"
local_host = "127.0.0.1"
local_port = 3001
remote_host = "127.0.0.1"
remote_port = 3301
backend = "autossh"
`;
}
