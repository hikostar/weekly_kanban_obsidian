export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion?: string;
  author?: string;
  description?: string;
}

export interface WorkspaceLeaf {
  setViewState(viewState: { type: string; active?: boolean; state?: unknown }): Promise<void>;
  open(view: ItemView): Promise<void>;
}

export class Notice {
  constructor(public readonly message: string, public readonly timeout = 5000) {}
}

export class App {
  vault: {
    read: (file: TFile) => Promise<string>;
    modify: (file: TFile, contents: string) => Promise<void>;
    getMarkdownFiles: () => TFile[];
  } = {
    read: async () => '',
    modify: async () => undefined,
    getMarkdownFiles: () => [],
  };

  workspace: {
    getLeaf: (newLeaf?: boolean) => WorkspaceLeaf;
  } = {
    getLeaf: () => ({
      setViewState: async () => undefined,
      open: async () => undefined,
    }),
  };
}

export class TFile {
  constructor(
    public readonly path: string,
    public readonly name: string,
    public readonly stat: { mtime: number } = { mtime: Date.now() },
  ) {}
}

export class Menu {
  addItem(callback: (item: { setTitle(title: string): unknown; onClick(handler: () => void): unknown }) => void): void {
    callback({
      setTitle: () => undefined,
      onClick: () => undefined,
    });
  }
}

export abstract class Modal {
  constructor(protected readonly app: App) {}

  open(): void {
    this.onOpen();
  }

  close(): void {
    this.onClose();
  }

  abstract onOpen(): void;
  abstract onClose(): void;
}

export abstract class ItemView {
  constructor(protected readonly leaf: WorkspaceLeaf) {}

  abstract getViewType(): string;
  abstract getDisplayText(): string;
  abstract onOpen(): Promise<void>;
  abstract onClose(): Promise<void>;

  containerEl = {
    empty: (): void => undefined,
    createDiv: (_className?: string) => ({
      setText: (_text: string) => undefined,
      createDiv: () => undefined,
    }),
  };
}

export abstract class Plugin {
  app!: App;

  addRibbonIcon(_icon: string, _title: string, _callback: () => void): void {
    return undefined;
  }

  addCommand(_command: { id: string; name: string; callback: () => void }): void {
    return undefined;
  }

  registerView(_type: string, _creator: (leaf: WorkspaceLeaf) => ItemView): void {
    return undefined;
  }

  registerEvent(_event: unknown): void {
    return undefined;
  }

  async onload(): Promise<void> {
    return undefined;
  }

  onunload(): void {
    return undefined;
  }
}