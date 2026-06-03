import { Command } from 'commander';
import { handleList } from './commands/list.js';
import { TabbyClient } from './mcp/client.js';
import { CliIo, TabbyBackend } from './types.js';
import { loadConfig, Config, renderLinkSetupConfig } from './config.js';
import {
  getLinkStatus,
  LinkStateStore,
  ProcessRunner,
  startLink,
  stopLink,
} from './link.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CliDeps {
  backend: TabbyBackend;
  config?: Config;
  env?: NodeJS.ProcessEnv;
  processRunner?: ProcessRunner;
  linkStateStore?: LinkStateStore;
  fsOverride?: {
    existsSync: (path: string) => boolean;
    readFileSync: (path: string, encoding: 'utf8') => string;
    writeFileSync: (path: string, data: string) => void;
    mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
  };
}

function missingLinkDeps(): never {
  throw new Error('Link process runner and state store are required for link commands');
}

export function createDefaultDeps(
  env: NodeJS.ProcessEnv = process.env,
  fsOverride?: CliDeps['fsOverride']
): CliDeps {
  const config = loadConfig({ env, fsOverride });
  return {
    backend: new TabbyClient(config.client.endpoint),
    config,
    env,
    fsOverride,
  };
}

export function createProgram(deps: CliDeps, io: CliIo): Command {
  const program = new Command();
  let exitCode = 0;

  const env = deps.env || process.env;
  const config = deps.config || loadConfig({ env, fsOverride: deps.fsOverride });
  const backend = deps.backend;
  const processRunner = deps.processRunner;
  const linkStateStore = deps.linkStateStore;

  program
    .name('tabbyctl')
    .description('CLI to control Tabby terminal via MCP')
    .version('0.1.0')
    .exitOverride()
    .configureOutput({
      writeOut: (text) => io.stdout(text.trimEnd()),
      writeErr: (text) => io.stderr(text.trimEnd()),
    });

  const linkCommand = program.command('link').description('Manage the reverse SSH tunnel link');

  linkCommand
    .command('start')
    .description('Start the reverse tunnel')
    .option('--background', 'Run in background')
    .action(async (options) => {
      if (!options.background) {
        io.stderr('Error: link start currently requires --background');
        exitCode = 1;
        return;
      }

      try {
        const process = await startLink(
          config,
          processRunner ?? missingLinkDeps(),
          linkStateStore ?? missingLinkDeps(),
        );
        io.stdout(`Started ${process.command} reverse link as pid ${process.pid}`);
        exitCode = 0;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        io.stderr(`Error starting link: ${message}`);
        exitCode = 1;
      }
    });

  linkCommand
    .command('status')
    .description('Show reverse tunnel status')
    .action(async () => {
      try {
        const process = await getLinkStatus(linkStateStore ?? missingLinkDeps());
        if (!process) {
          io.stdout('Link stopped');
        } else {
          io.stdout(`Link running: ${process.command} pid ${process.pid}`);
        }
        exitCode = 0;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        io.stderr(`Error reading link status: ${message}`);
        exitCode = 1;
      }
    });

  linkCommand
    .command('stop')
    .description('Stop the reverse tunnel')
    .action(async () => {
      try {
        const process = await stopLink(linkStateStore ?? missingLinkDeps(), processRunner ?? missingLinkDeps());
        if (!process) {
          io.stdout('Link already stopped');
        } else {
          io.stdout(`Stopped ${process.command} pid ${process.pid}`);
        }
        exitCode = 0;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        io.stderr(`Error stopping link: ${message}`);
        exitCode = 1;
      }
    });

  program
    .command('list')
    .description('List known Tabby sessions and panes')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      exitCode = await handleList(backend, io, options);
    });

  linkCommand
    .command('setup')
    .description('Setup default link configuration')
    .requiredOption('--host <host>', 'SSH host to connect to (e.g. home-server)')
    .action(async (options) => {
      try {
        const host = options.host;
        const homeDir = env.HOME || os.homedir();
        const configDir = path.join(homeDir, '.config', 'tabbyctl');
        const configPath = path.join(configDir, 'config.toml');

        const endpoint = config.client.endpoint || 'http://127.0.0.1:3301/mcp';

        const tomlContent = renderLinkSetupConfig(host, endpoint);

        if (deps.fsOverride) {
          deps.fsOverride.mkdirSync(configDir, { recursive: true });
          deps.fsOverride.writeFileSync(configPath, tomlContent);
        } else {
          fs.mkdirSync(configDir, { recursive: true });
          fs.writeFileSync(configPath, tomlContent);
        }

        io.stdout(`Config written to ${configPath}:`);
        io.stdout(tomlContent.trim());
        exitCode = 0;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        io.stderr(`Error writing configuration: ${message}`);
        exitCode = 1;
      }
    });

  program.hook('postAction', () => {
    program.setOptionValue('__exitCode', exitCode);
  });

  return program;
}

export async function runCli(argv: string[], deps: CliDeps, io: CliIo): Promise<number> {
  const program = createProgram(deps, io);

  try {
    await program.parseAsync(argv, { from: 'user' });
    return Number(program.getOptionValue('__exitCode') ?? 0);
  } catch (error: unknown) {
    const commanderError = error as { exitCode?: number; message?: string };
    if (commanderError.message) {
      io.stderr(commanderError.message);
    }
    return commanderError.exitCode ?? 1;
  }
}
