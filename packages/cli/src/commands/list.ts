import { CliIo, TabbyBackend } from '../types.js';

interface ListOptions {
  json?: boolean;
}

export async function handleList(backend: TabbyBackend, io: CliIo, options: ListOptions): Promise<number> {
  try {
    const sessions = await backend.list();
    if (options.json) {
      io.stdout(JSON.stringify(sessions, null, 2));
    } else {
      if (sessions.length === 0) {
        io.stdout('No active sessions found.');
        return 0;
      }
      for (const session of sessions) {
        io.stdout(`Session: ${session.id}`);
        for (const pane of session.panes) {
          const focusStr = pane.focused ? ' (focused)' : '';
          io.stdout(`  Pane: ${pane.id} | Title: ${pane.title}${focusStr}`);
        }
      }
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`Error: ${message}`);
    io.stderr('Actionable advice: verify that the reverse SSH tunnel is running:');
    io.stderr('  tabbyctl link status');
    return 1;
  }
}
