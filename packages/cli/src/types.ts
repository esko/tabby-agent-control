export interface Pane {
  id: string;
  title: string;
  focused: boolean;
}

export interface Session {
  id: string;
  title?: string;
  panes: Pane[];
}

export interface TargetSelector {
  pane?: string;
  session?: string;
  tab?: string;
}

export interface ReadOptions {
  last?: number;
}

export interface TabbyBackend {
  list(): Promise<Session[]>;
  read?(target: TargetSelector, options?: ReadOptions): Promise<string>;
  send?(target: TargetSelector, text: string): Promise<void>;
  focus?(target: TargetSelector): Promise<void>;
}

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}
