import { MarkdownView, Notice, Plugin, type PluginManifest, TFile } from 'obsidian';
import { deepCopyBoard, moveCard, normalizeBoard, type Board, type Card, type ColumnName } from './domain/kanban.js';
import { parseMarkdown } from './parser/markdownParser.js';
import { writeMarkdown } from './parser/kanbanWriter.js';
import { CardModal } from './presentation/cardModal.js';
import { ConfirmModal } from './presentation/confirmModal.js';
import { KanbanView } from './presentation/kanbanView.js';
import { FileSelectModal } from './presentation/fileSelectModal.js';
import { createSyncContext, finishSync, queueKanbanChange, setError, startSync, type SyncContext } from './sync/syncEngine.js';

export default class WeeklyKanbanPlugin extends Plugin {
  private currentFile?: TFile;

  private currentView?: KanbanView;

  private currentBoard?: Board;

  private pendingReloadTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly markdownToKanbanDebounceMs = 500;

  private skipNextModifyPath: string | undefined;

  private statusBarEl: HTMLElement | undefined;

  private syncContext: SyncContext = createSyncContext();

  async onload(): Promise<void> {
    this.registerView(KanbanView.viewType, (leaf) => {
      const view = new KanbanView(leaf, {
        onCardJump: async (lineStart) => {
          await this.openCardSourceLine(lineStart);
        },
        onAddCard: async (columnName) => {
          await this.handleAddCard(columnName);
        },
        onEditCard: async (cardId) => {
          await this.handleEditCard(cardId);
        },
        onDeleteCard: async (cardId) => {
          await this.handleDeleteCard(cardId);
        },
        onToggleCard: async (cardId) => {
          await this.handleToggleCard(cardId);
        },
        onMoveCard: async (cardId, targetColumn, targetIndex) => {
          await this.handleMoveCard(cardId, targetColumn, targetIndex);
        },
      });
      this.currentView = view;
      return view;
    });

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        void this.onVaultFileModified(file);
      }),
    );

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (!(file instanceof TFile) || !this.isMarkdownFile(file)) {
          return;
        }

        menu.addItem((item) => {
          item.setTitle('Open Weekly Kanban');
          item.onClick(() => {
            void this.openKanbanView(file);
          });
        });
      }),
    );

    this.statusBarEl = this.addStatusBarItem();
    this.updateSyncContext(createSyncContext(), { forceRender: true });

    this.addRibbonIcon('kanban', 'Open Weekly Kanban', () => {
      void this.openKanbanView();
    });

    this.addCommand({
      id: 'open-kanban-view',
      name: 'Open Kanban View',
      callback: () => {
        void this.openKanbanView();
      },
    });

    this.addCommand({
      id: 'open-weekly-file',
      name: 'Open Weekly File',
      callback: () => {
        void this.openWeeklyFile();
      },
    });

    this.addCommand({
      id: 'save-weekly-file',
      name: 'Save Weekly File',
      callback: () => {
        void this.saveCurrentFile();
      },
    });
  }

  private async openKanbanView(targetFile?: TFile): Promise<void> {
    const file = targetFile ?? this.currentFile ?? (await this.resolveTargetFile({ forceSelect: true }));
    if (!file) {
      return;
    }

    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: KanbanView.viewType, active: true });

    const view = leaf.view;
    if (view instanceof KanbanView) {
      this.currentView = view;
    }

    await this.loadFileIntoView(file);
  }

  private async openWeeklyFile(): Promise<void> {
    const file = await this.resolveTargetFile({ forceSelect: true });
    if (!file) {
      return;
    }

    this.currentFile = file;
    await this.loadFileIntoView(file);
    new Notice(`Selected ${file.name} for Weekly Kanban`);
  }

  private async saveCurrentFile(): Promise<void> {
    if (!this.currentFile) {
      new Notice('No weekly file selected');
      return;
    }

    const contents = await this.app.vault.read(this.currentFile);
    const parsed = parseMarkdown(contents);
    if (!parsed.ok) {
      new Notice(parsed.error.message);
      return;
    }

    const sourceBoard = this.currentBoard ?? parsed.value;
    await this.persistBoard(sourceBoard, 'Weekly file saved');
  }

  private async handleAddCard(columnName: ColumnName): Promise<void> {
    if (!this.currentBoard) {
      new Notice('No board loaded');
      return;
    }

    const modal = new CardModal(this.app);
    const result = await modal.openAndWait();
    if (result.action !== 'save') {
      return;
    }

    const dueDate = this.parseDueDate(result.dueDate);
    if (result.dueDate !== undefined && dueDate === undefined) {
      new Notice('Invalid due date');
      return;
    }

    const board = deepCopyBoard(this.currentBoard);
    const targetColumnName = result.completed ? 'Done' : columnName;
    const targetColumn = board.columns.find((column) => column.name === targetColumnName);
    if (!targetColumn) {
      new Notice(`Column not found: ${targetColumnName}`);
      return;
    }

    const cardId = this.generateCardId(board, result.title);
    const newCard: Card = {
      id: cardId,
      title: result.title,
      completed: result.completed || targetColumnName === 'Done',
      labels: result.labels,
      lineStart: 1,
      lineEnd: 1,
      rawMetadata: {
        ID: cardId,
      },
      ...(dueDate ? { dueDate } : {}),
      ...(result.notes ? { notes: result.notes } : {}),
    };

    if (newCard.labels.length > 0) {
      newCard.rawMetadata.Label = newCard.labels.join(',');
    }
    if (newCard.dueDate) {
      newCard.rawMetadata.Due = newCard.dueDate.toISOString().slice(0, 10);
    }

    targetColumn.cards.push(newCard);

    const normalized = normalizeBoard(board);
    if (!normalized.ok) {
      new Notice(normalized.error.message);
      return;
    }

    await this.persistBoard(normalized.value, 'Card added');
  }

  private async handleEditCard(cardId: string): Promise<void> {
    if (!this.currentBoard) {
      new Notice('No board loaded');
      return;
    }

    const board = deepCopyBoard(this.currentBoard);
    const location = this.findCardLocation(board, cardId);
    if (!location) {
      new Notice(`Card not found: ${cardId}`);
      return;
    }

    const originalColumnName = board.columns[location.columnIndex]!.name;
    const card = board.columns[location.columnIndex]!.cards[location.cardIndex]!;
    const modal = new CardModal(this.app, card);
    const result = await modal.openAndWait();

    if (result.action === 'cancel') {
      return;
    }

    if (result.action === 'delete') {
      await this.handleDeleteCard(cardId);
      return;
    }

    const dueDate = this.parseDueDate(result.dueDate);
    if (result.dueDate !== undefined && dueDate === undefined) {
      new Notice('Invalid due date');
      return;
    }

    const updatedCard: Card = {
      ...card,
      title: result.title,
      labels: result.labels,
      completed: result.completed,
      rawMetadata: {
        ...card.rawMetadata,
        ID: card.id,
      },
      ...(dueDate ? { dueDate } : {}),
      ...(result.notes ? { notes: result.notes } : {}),
    };

    if (updatedCard.labels.length > 0) {
      updatedCard.rawMetadata.Label = updatedCard.labels.join(',');
    } else {
      delete updatedCard.rawMetadata.Label;
    }

    if (updatedCard.dueDate) {
      updatedCard.rawMetadata.Due = updatedCard.dueDate.toISOString().slice(0, 10);
    } else {
      delete updatedCard.rawMetadata.Due;
    }

    if (!result.notes) {
      delete updatedCard.notes;
    }

    board.columns[location.columnIndex]!.cards[location.cardIndex] = updatedCard;

    const relocated = this.relocateByCompletedState(board.columns, updatedCard.id, originalColumnName, updatedCard.completed);
    if (!relocated.ok) {
      new Notice(relocated.error.message);
      return;
    }

    board.columns = relocated.value;

    const normalized = normalizeBoard(board);
    if (!normalized.ok) {
      new Notice(normalized.error.message);
      return;
    }

    await this.persistBoard(normalized.value, 'Card updated');
  }

  private async handleDeleteCard(cardId: string): Promise<void> {
    if (!this.currentBoard) {
      new Notice('No board loaded');
      return;
    }

    const confirmed = await new ConfirmModal(this.app, 'Delete card', 'Delete this card?', 'Delete').openAndWait();
    if (!confirmed) {
      return;
    }

    const board = deepCopyBoard(this.currentBoard);
    const location = this.findCardLocation(board, cardId);
    if (!location) {
      new Notice(`Card not found: ${cardId}`);
      return;
    }

    board.columns[location.columnIndex]!.cards.splice(location.cardIndex, 1);

    const normalized = normalizeBoard(board);
    if (!normalized.ok) {
      new Notice(normalized.error.message);
      return;
    }

    await this.persistBoard(normalized.value, 'Card deleted');
  }

  private async handleMoveCard(cardId: string, targetColumn: ColumnName, targetIndex?: number): Promise<void> {
    if (!this.currentBoard) {
      new Notice('No board loaded');
      return;
    }

    const board = deepCopyBoard(this.currentBoard);
    const destination = board.columns.find((column) => column.name === targetColumn);
    const fallbackIndex = destination?.cards.length ?? 0;
    const nextIndex = targetIndex ?? fallbackIndex;

    const moved = moveCard(board.columns, cardId, targetColumn, nextIndex);
    if (!moved.ok) {
      new Notice(moved.error.message);
      return;
    }

    board.columns = moved.value;
    const normalized = normalizeBoard(board);
    if (!normalized.ok) {
      new Notice(normalized.error.message);
      return;
    }

    await this.persistBoard(normalized.value, 'Card moved');
  }

  private async handleToggleCard(cardId: string): Promise<void> {
    if (!this.currentBoard) {
      new Notice('No board loaded');
      return;
    }

    const board = deepCopyBoard(this.currentBoard);
    const location = this.findCardLocation(board, cardId);
    if (!location) {
      new Notice(`Card not found: ${cardId}`);
      return;
    }

    const originalColumnName = board.columns[location.columnIndex]!.name;
    const card = board.columns[location.columnIndex]!.cards[location.cardIndex]!;
    card.completed = !card.completed;

    const relocated = this.relocateByCompletedState(board.columns, card.id, originalColumnName, card.completed);
    if (!relocated.ok) {
      new Notice(relocated.error.message);
      return;
    }

    board.columns = relocated.value;

    const normalized = normalizeBoard(board);
    if (!normalized.ok) {
      new Notice(normalized.error.message);
      return;
    }

    await this.persistBoard(normalized.value, 'Card completion updated');
  }

  private async openCardSourceLine(lineStart: number): Promise<void> {
    const file = this.currentFile ?? this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('No weekly file selected');
      return;
    }

    const leaf = this.app.workspace.getLeaf(true);
    await leaf.openFile(file, { active: true });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });

    if (leaf.view instanceof MarkdownView) {
      const targetLine = Math.max(0, lineStart - 1);
      const targetPos = { line: targetLine, ch: 0 };
      leaf.view.editor.setCursor(targetPos);
      leaf.view.editor.scrollIntoView({ from: targetPos, to: targetPos }, true);
    }
  }

  private async loadFileIntoView(file: TFile): Promise<void> {
    this.updateSyncContext(startSync(createSyncContext(this.currentBoard, file.path)));

    const contents = await this.app.vault.read(file);
    const parsed = parseMarkdown(contents);

    if (!parsed.ok) {
      new Notice(parsed.error.message);
      const errorContext = setError(createSyncContext(undefined, file.path), parsed.error.message);
      this.updateSyncContext(errorContext, { path: file.path });
      return;
    }

    const syncContext = createSyncContext(parsed.value, file.path);
    const boardContext = queueKanbanChange(syncContext, { type: 'board-loaded', board: parsed.value, path: file.path });
    const doneContext = finishSync(startSync(boardContext), parsed.value);
    this.currentBoard = parsed.value;
    this.updateSyncContext(doneContext, { path: file.path, board: parsed.value });
    this.currentFile = file;
  }

  private async resolveTargetFile(options?: { forceSelect?: boolean }): Promise<TFile | undefined> {
    const forceSelect = options?.forceSelect ?? false;

    if (!forceSelect && this.currentFile) {
      return this.currentFile;
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!forceSelect && activeFile) {
      return activeFile;
    }

    const files = this.app.vault.getMarkdownFiles();
    if (files.length === 0) {
      new Notice('No markdown files found');
      return undefined;
    }

    if (files.length === 1) {
      return files[0];
    }

    if (!forceSelect) {
      for (const file of files) {
        const parsed = parseMarkdown(await this.app.vault.read(file));
        if (parsed.ok) {
          return file;
        }
      }
    }

    const modal = new FileSelectModal(this.app, files);
    const selectedFile = await modal.openAndWait();
    if (!selectedFile) {
      new Notice('File selection cancelled');
      return undefined;
    }

    return selectedFile;
  }

  private findCardLocation(board: Board, cardId: string): { columnIndex: number; cardIndex: number } | undefined {
    for (let columnIndex = 0; columnIndex < board.columns.length; columnIndex += 1) {
      const cardIndex = board.columns[columnIndex]!.cards.findIndex((card) => card.id === cardId);
      if (cardIndex >= 0) {
        return { columnIndex, cardIndex };
      }
    }

    return undefined;
  }

  private parseDueDate(raw: string | undefined): Date | undefined {
    if (!raw) {
      return undefined;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private generateCardId(board: Board, title: string): string {
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'task';

    const existingIds = new Set(board.columns.flatMap((column) => column.cards.map((card) => card.id)));
    let candidate = slug;
    let suffix = 1;
    while (existingIds.has(candidate)) {
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private relocateByCompletedState(
    columns: Board['columns'],
    cardId: string,
    originalColumnName: ColumnName,
    completed: boolean,
  ) {
    if (completed && originalColumnName !== 'Done') {
      const doneColumn = columns.find((column) => column.name === 'Done');
      return moveCard(columns, cardId, 'Done', doneColumn?.cards.length ?? 0);
    }

    if (!completed && originalColumnName === 'Done') {
      const todoColumn = columns.find((column) => column.name === 'ToDo');
      return moveCard(columns, cardId, 'ToDo', todoColumn?.cards.length ?? 0);
    }

    return { ok: true as const, value: columns };
  }

  private async persistBoard(board: Board, successMessage: string): Promise<void> {
    const file = this.currentFile ?? (await this.resolveTargetFile());
    if (!file) {
      return;
    }

    const syncingContext = startSync(createSyncContext(board, file.path));
    this.updateSyncContext(syncingContext, { path: file.path, board });

    const original = await this.app.vault.read(file);
    const written = writeMarkdown(original, board);
    if (!written.ok) {
      const errorContext = setError(syncingContext, written.error.message);
      this.updateSyncContext(errorContext, { path: file.path, board });
      new Notice(written.error.message);
      return;
    }

    this.skipNextModifyPath = file.path;
    await this.app.vault.modify(file, written.value);
    const reparsed = parseMarkdown(written.value);
    this.currentBoard = reparsed.ok ? reparsed.value : board;
    this.currentFile = file;

    const doneContext = finishSync(syncingContext, this.currentBoard);
    this.updateSyncContext(doneContext, { path: file.path, board: this.currentBoard });

    new Notice(successMessage);
  }

  private async onVaultFileModified(file: unknown): Promise<void> {
    if (!(file instanceof TFile)) {
      return;
    }

    if (this.skipNextModifyPath && file.path === this.skipNextModifyPath) {
      this.skipNextModifyPath = undefined;
      return;
    }

    if (!this.currentFile || file.path !== this.currentFile.path) {
      return;
    }

    if (this.pendingReloadTimer) {
      clearTimeout(this.pendingReloadTimer);
    }

    this.pendingReloadTimer = setTimeout(() => {
      void this.loadFileIntoView(file);
    }, this.markdownToKanbanDebounceMs);
  }

  private isMarkdownFile(file: TFile): boolean {
    return file.path.toLowerCase().endsWith('.md');
  }

  private updateSyncContext(
    context: SyncContext,
    payload?: {
      path?: string;
      board?: Board;
      forceRender?: boolean;
    },
  ): void {
    this.syncContext = context;

    const path = payload?.path ?? this.currentFile?.path;
    const board = payload?.board ?? this.currentBoard;

    if (payload?.forceRender || this.currentView) {
      this.currentView?.updateState({
        path,
        board,
        syncContext: this.syncContext,
      });
    }

    this.updateStatusBar(path, this.syncContext);
  }

  private updateStatusBar(path: string | undefined, context: SyncContext): void {
    if (!this.statusBarEl) {
      return;
    }

    const fileLabel = path ? path.split('/').pop() ?? path : 'no target';
    const lastSyncLabel = context.lastSyncTime ? context.lastSyncTime.toLocaleTimeString() : 'never';

    if (context.state === 'syncing') {
      this.statusBarEl.setText(`Weekly Kanban: Syncing (${fileLabel})`);
    } else if (context.state === 'error') {
      this.statusBarEl.setText(`Weekly Kanban: Error (${fileLabel})`);
    } else if (context.state === 'conflict') {
      this.statusBarEl.setText(`Weekly Kanban: Conflict (${fileLabel})`);
    } else {
      this.statusBarEl.setText(`Weekly Kanban: Idle (${fileLabel})`);
    }

    const detailLines = [`Target: ${path ?? 'not selected'}`, `Last sync: ${lastSyncLabel}`];
    if (context.errorMessage) {
      detailLines.push(`Error: ${context.errorMessage}`);
    }
    if (context.conflictMessage) {
      detailLines.push(`Conflict: ${context.conflictMessage}`);
    }
    this.statusBarEl.setAttribute('aria-label', detailLines.join(' | '));
    this.statusBarEl.title = detailLines.join('\n');
  }
}

export function createPluginManifest(): PluginManifest {
  return {
    id: 'weekly-kanban',
    name: 'Weekly Kanban',
    version: '0.1.0',
    minAppVersion: '1.4.0',
    author: 'weekly-kanban-obsidian-team',
    description: 'Weekly Kanban for Obsidian',
  };
}