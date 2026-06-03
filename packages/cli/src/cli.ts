import { Command } from 'commander';
import { handleList } from './commands/list.js';
import { TabbyClient } from './mcp/client.js';
import { CliIo, TabbyBackend } from './types.js';

export interface CliDeps {
  backend: TabbyBackend;
}

export function createDefaultDeps(env: NodeJS.ProcessEnv = process.env): CliDeps {
  const endpoint = env.TABBYCTL_ENDPOINT || 'http://127.0.0.1:3301/mcp';
  return {
    backend: new TabbyClient(endpoint),
  };
}

export function createProgram(deps: CliDeps, io: CliIo): Command {
  const program = new Command();
  let exitCode = 0;

  program
    .name('tabbyctl')
    .description('CLI to control Tabby terminal via MCP')
    .version('0.1.0')
    .exitOverride()
    .configureOutput({
      writeOut: (text) => io.stdout(text.trimEnd()),
      writeErr: (text) => io.stderr(text.trimEnd()),
    });

  program
    .command('list')
    .description('List known Tabby sessions and panes')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      exitCode = await handleList(deps.backend, io, options);
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
