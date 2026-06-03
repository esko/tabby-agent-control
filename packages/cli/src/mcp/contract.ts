import { ReadOptions, Session, TargetSelector } from '../types.js';

export interface ResolvedTarget {
  kind: 'pane' | 'session' | 'tab';
  id: string;
  label: string;
  sessionId?: string;
  paneId?: string;
}

export interface BackendTransport {
  listSessions(): Promise<Session[]>;
  read?(target: ResolvedTarget, options?: ReadOptions): Promise<string>;
  send?(target: ResolvedTarget, text: string): Promise<void>;
  focus?(target: ResolvedTarget): Promise<void>;
}

export interface BackendContract {
  list(): Promise<Session[]>;
  read(target: TargetSelector, options?: ReadOptions): Promise<string>;
  send(target: TargetSelector, text: string): Promise<void>;
  focus(target: TargetSelector): Promise<void>;
}

export class UnsupportedBackendPrimitiveError extends Error {
  readonly primitive: 'read' | 'send' | 'focus';

  constructor(primitive: 'read' | 'send' | 'focus') {
    super(`This backend does not support ${primitive}.`);
    this.name = 'UnsupportedBackendPrimitiveError';
    this.primitive = primitive;
  }
}

export class MissingTargetError extends Error {
  constructor(command: 'read' | 'send' | 'focus') {
    super(`Missing target for ${command}. Specify exactly one of --pane, --session, or --tab.`);
    this.name = 'MissingTargetError';
  }
}

export class AmbiguousTargetError extends Error {
  constructor(command: 'read' | 'send' | 'focus', target: string, matches: string[]) {
    super(`Target "${target}" is ambiguous for ${command}. Matches: ${matches.join(', ')}.`);
    this.name = 'AmbiguousTargetError';
  }
}

export class BackendTransportError extends Error {
  constructor(operation: 'list' | 'read' | 'send' | 'focus', backendLabel: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(
      `Failed to ${operation} through ${backendLabel}: ${causeMessage}. ` +
        'Check the reverse SSH tunnel and Tabby MCP backend.',
    );
    this.name = 'BackendTransportError';
    this.cause = cause;
  }

  readonly cause: unknown;
}

export interface BackendContractOptions {
  backendLabel?: string;
}

export function createTabbyBackendContract(
  transport: BackendTransport,
  options: BackendContractOptions = {},
): BackendContract {
  const backendLabel = options.backendLabel ?? 'the Tabby backend';

  return {
    async list() {
      return wrapTransport('list', backendLabel, () => transport.listSessions());
    },

    async read(target, readOptions) {
      const resolvedTarget = await resolveTarget('read', target, transport.listSessions);
      return invokePrimitive('read', backendLabel, transport.read, resolvedTarget, readOptions);
    },

    async send(target, text) {
      const resolvedTarget = await resolveTarget('send', target, transport.listSessions);
      await invokePrimitive('send', backendLabel, transport.send, resolvedTarget, text);
    },

    async focus(target) {
      const resolvedTarget = await resolveTarget('focus', target, transport.listSessions);
      await invokePrimitive('focus', backendLabel, transport.focus, resolvedTarget);
    },
  };
}

async function invokePrimitive<TArgs extends unknown[], TResult>(
  operation: 'read' | 'send' | 'focus',
  backendLabel: string,
  primitive: ((target: ResolvedTarget, ...args: TArgs) => Promise<TResult>) | undefined,
  target: ResolvedTarget,
  ...args: TArgs
): Promise<TResult> {
  if (!primitive) {
    throw new UnsupportedBackendPrimitiveError(operation);
  }

  return wrapTransport(operation, backendLabel, () => primitive(target, ...args));
}

async function wrapTransport<T>(
  operation: 'list' | 'read' | 'send' | 'focus',
  backendLabel: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    throw new BackendTransportError(operation, backendLabel, error);
  }
}

async function resolveTarget(
  command: 'read' | 'send' | 'focus',
  selector: TargetSelector,
  listSessions: () => Promise<Session[]>,
): Promise<ResolvedTarget> {
  const chosen = Object.entries(selector).filter(([, value]) => value !== undefined);

  if (chosen.length === 0) {
    throw new MissingTargetError(command);
  }

  if (chosen.length > 1) {
    throw new AmbiguousTargetError(command, 'multiple target selectors', chosen.map(([key]) => `--${key}`));
  }

  const [kind, value] = chosen[0] as [keyof TargetSelector, string];
  const sessions = await listSessions();
  const matches = findMatches(kind, value, sessions);

  if (matches.length === 0) {
    throw new MissingTargetError(command);
  }

  if (matches.length > 1) {
    throw new AmbiguousTargetError(command, value, matches.map((match) => match.label));
  }

  return matches[0];
}

function findMatches(kind: keyof TargetSelector, value: string, sessions: Session[]): ResolvedTarget[] {
  if (kind === 'pane') {
    const matches: ResolvedTarget[] = [];
    for (const session of sessions) {
      for (const pane of session.panes) {
        if (pane.id === value || pane.title === value) {
          matches.push({
            kind: 'pane',
            id: pane.id,
            label: pane.title,
            sessionId: session.id,
            paneId: pane.id,
          });
        }
      }
    }
    return matches;
  }

  const matches: ResolvedTarget[] = [];
  for (const session of sessions) {
    const sessionLabel = session.title ?? session.id;
    if (session.id === value || sessionLabel === value) {
      matches.push({
        kind: kind === 'tab' ? 'tab' : 'session',
        id: session.id,
        label: sessionLabel,
        sessionId: session.id,
      });
    }
  }
  return matches;
}
