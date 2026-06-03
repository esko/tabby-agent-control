import { Command } from 'commander';
import { handleList } from './commands/list.js';
import { TabbyClient } from './mcp/client.js';
import { CliIo, LayoutCommandOptions, LayoutDirection, ReadOptions, TabbyBackend, TargetSelector } from './types.js';
import { loadConfig, Config, renderLinkSetupConfig } from './config.js';
import {
  createDefaultLinkDoctorProbe,
  getLinkStatus,
  LinkDoctorProbe,
  LinkStateStore,
  ProcessRunner,
  renderLinkDoctorReport,
  runLinkDoctor,
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
  linkDoctor?: LinkDoctorProbe;
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

function buildTargetSelector(options: { pane?: string; session?: string; tab?: string }): TargetSelector {
  const selector: TargetSelector = {};

  if (options.pane !== undefined) {
    selector.pane = options.pane;
  }

  if (options.session !== undefined) {
    selector.session = options.session;
  }

  if (options.tab !== undefined) {
    selector.tab = options.tab;
  }

  return selector;
}

function buildLayoutOptions(title?: string, command?: string[]): LayoutCommandOptions {
  const layoutOptions: LayoutCommandOptions = {};

  if (title !== undefined) {
    layoutOptions.title = title;
  }

  if (command !== undefined) {
    layoutOptions.command = command;
  }

  return layoutOptions;
}

async function runTargetAction(io: CliIo, action: () => Promise<void>): Promise<number> {
  try {
    await action();
    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`Error: ${message}`);
    return 1;
  }
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
  const linkDoctor = deps.linkDoctor ?? createDefaultLinkDoctorProbe();

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

  linkCommand
    .command('doctor')
    .description('Check link prerequisites and endpoint reachability')
    .action(async () => {
      try {
        const report = await runLinkDoctor(config, linkDoctor);
        for (const line of renderLinkDoctorReport(report)) {
          io.stdout(line);
        }
        exitCode = report.ok ? 0 : 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        io.stderr(`Error running link doctor: ${message}`);
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

  program
    .command('focus')
    .description('Focus a Tabby pane, session, or tab')
    .option('--pane <pane>', 'Focus a pane by title or ID')
    .option('--session <session>', 'Focus a session by title or ID')
    .option('--tab <tab>', 'Focus a tab by title or ID')
    .action(async (options) => {
      exitCode = await runTargetAction(io, async () => {
        if (!backend.focus) {
          throw new Error('Configured backend does not support focus.');
        }

        await backend.focus(buildTargetSelector(options));
      });
    });

  program
    .command('send')
    .description('Send input to a Tabby pane, session, or tab')
    .option('--pane <pane>', 'Send input to a pane by title or ID')
    .option('--session <session>', 'Send input to a session by title or ID')
    .option('--tab <tab>', 'Send input to a tab by title or ID')
    .argument('<text>', 'Text to send')
    .action(async (text, options) => {
      exitCode = await runTargetAction(io, async () => {
        if (!backend.send) {
          throw new Error('Configured backend does not support send.');
        }

        await backend.send(buildTargetSelector(options), text);
      });
    });

  program
    .command('read')
    .description('Read terminal buffer content from a Tabby pane, session, or tab')
    .option('--pane <pane>', 'Read from a pane by title or ID')
    .option('--session <session>', 'Read from a session by title or ID')
    .option('--tab <tab>', 'Read from a tab by title or ID')
    .option('--last <count>', 'Read only the last N lines', (value) => Number.parseInt(value, 10))
    .action(async (options) => {
      exitCode = await runTargetAction(io, async () => {
        if (!backend.read) {
          throw new Error('Configured backend does not support read.');
        }

        const target = buildTargetSelector(options);
        const readOptions: ReadOptions | undefined =
          options.last === undefined || Number.isNaN(options.last) ? undefined : { last: options.last };
        const text = await backend.read(target, readOptions);
        io.stdout(text);
      });
    });

  program
    .command('split')
    .description('Create a split pane and optionally run a command')
    .argument('<direction>', 'Split direction: right or bottom')
    .option('--title <title>', 'Set the new pane title')
    .argument('[command...]', 'Command to run in the new pane')
    .action(async function (this: Command, direction: LayoutDirection, command: string[] | undefined) {
      exitCode = await runTargetAction(io, async () => {
        if (!backend.split) {
          throw new Error('Configured backend does not support split.');
        }

        if (direction !== 'right' && direction !== 'bottom') {
          throw new Error('Split direction must be right or bottom.');
        }

        await backend.split(direction, buildLayoutOptions(this.opts().title, command));
      });
    });

  const tabCommand = program.command('tab').description('Manage Tabby tabs');

  tabCommand
    .command('new')
    .description('Open a new Tabby tab and optionally run a command')
    .option('--title <title>', 'Set the new tab title')
    .argument('[command...]', 'Command to run in the new tab')
    .action(async function (this: Command, command: string[] | undefined) {
      exitCode = await runTargetAction(io, async () => {
        if (!backend.tabNew) {
          throw new Error('Configured backend does not support tab new.');
        }

        await backend.tabNew(buildLayoutOptions(this.opts().title, command));
      });
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
