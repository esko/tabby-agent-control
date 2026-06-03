export interface Pane {
  id: string;
  title: string;
  focused: boolean;
}

export interface Session {
  id: string;
  panes: Pane[];
}

export interface TabbyBackend {
  list(): Promise<Session[]>;
}

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}
