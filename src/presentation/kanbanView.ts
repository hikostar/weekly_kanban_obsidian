import { ItemView, Notice, type WorkspaceLeaf } from 'obsidian';
import type { Board, ColumnName } from '../domain/kanban.js';
import { createSyncContext, type SyncContext } from '../sync/syncEngine.js';

export type CardJumpHandler = (lineStart: number) => void | Promise<void>;

export interface KanbanViewHandlers {
  onCardJump?: CardJumpHandler;
  onAddCard?: (columnName: ColumnName) => void | Promise<void>;
  onEditCard?: (cardId: string) => void | Promise<void>;
  onDeleteCard?: (cardId: string) => void | Promise<void>;
  onToggleCard?: (cardId: string) => void | Promise<void>;
  onMoveCard?: (cardId: string, targetColumn: ColumnName, targetIndex?: number) => void | Promise<void>;
}

export interface KanbanViewState {
  path?: string | undefined;
  board?: Board | undefined;
  syncContext: SyncContext;
}

export class KanbanView extends ItemView {
  static readonly viewType = 'weekly-kanban-view';

  private state: KanbanViewState = {
    syncContext: createSyncContext(),
  };

  private readonly handlers: KanbanViewHandlers;

  constructor(leaf: WorkspaceLeaf, handlers: KanbanViewHandlers = {}) {
    super(leaf);
    this.handlers = handlers;
  }

  getViewType(): string {
    return KanbanView.viewType;
  }

  getDisplayText(): string {
    return 'Weekly Kanban';
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.containerEl.empty();
  }

  async setState(state: unknown): Promise<void> {
    if (typeof state === 'object' && state !== null) {
      this.updateState(state as Partial<KanbanViewState>);
      return;
    }

    this.render();
  }

  updateState(state: Partial<KanbanViewState>): void {
    this.state = {
      ...this.state,
      ...state,
      syncContext: state.syncContext ?? this.state.syncContext,
    };
    this.render();
  }

  private render(): void {
    this.containerEl.empty();
    this.containerEl.setCssStyles({
      padding: '12px',
      display: 'grid',
      gap: '8px',
    });

    const header = this.containerEl.createDiv('weekly-kanban-header');
    header.setText(this.state.board ? `Week ${this.state.board.week} / ${this.state.board.year}` : 'Weekly Kanban');
    header.setCssStyles({
      fontWeight: '700',
      fontSize: '1.1rem',
    });

    const targetFile = this.containerEl.createDiv('weekly-kanban-target-file');
    targetFile.setText(this.state.path ? `Target: ${this.state.path}` : 'Target: not selected');

    const status = this.containerEl.createDiv('weekly-kanban-status');
    status.setText(`Status: ${this.state.syncContext.state}`);

    if (this.state.syncContext.state === 'error' && this.state.syncContext.errorMessage) {
      new Notice(this.state.syncContext.errorMessage);
    }

    if (!this.state.board) {
      this.containerEl.createDiv('weekly-kanban-empty').setText('No board loaded');
      return;
    }

    const columnsEl = this.containerEl.createDiv('weekly-kanban-columns');
    columnsEl.setCssStyles({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '10px',
      alignItems: 'start',
    });

    for (const column of this.state.board.columns) {
      const columnEl = columnsEl.createDiv('weekly-kanban-column');
      columnEl.setCssStyles({
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: '10px',
        padding: '10px',
        display: 'grid',
        gap: '8px',
      });
      const columnHeaderEl = columnEl.createDiv('weekly-kanban-column-header');
      columnHeaderEl.setCssStyles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      });
      columnHeaderEl.createDiv('weekly-kanban-column-title').setText(`${column.name} (${column.cards.length})`);
      const addButtonEl = columnHeaderEl.createEl('button', {
        cls: 'weekly-kanban-card-action',
        text: 'Add',
      });
      addButtonEl.setCssStyles({
        fontSize: '0.82rem',
        padding: '4px 8px',
      });
      addButtonEl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        void this.handlers.onAddCard?.(column.name);
      });
      columnEl.addEventListener('dragover', (event) => {
        event.preventDefault();
      });
      columnEl.addEventListener('drop', (event) => {
        event.preventDefault();
        const cardId = event.dataTransfer?.getData('text/weekly-kanban-card-id') ?? '';
        if (cardId.length === 0) {
          return;
        }

        void this.handlers.onMoveCard?.(cardId, column.name, column.cards.length);
      });

      if (column.cards.length === 0) {
        columnEl.createDiv('weekly-kanban-column-empty').setText('No cards');
        continue;
      }

      for (const card of column.cards) {
        const cardEl = columnEl.createDiv('weekly-kanban-card');
        cardEl.setCssStyles({
          backgroundColor: 'var(--background-primary)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '8px',
          padding: '8px',
          display: 'grid',
          gap: '4px',
        });
        cardEl.tabIndex = 0;
        cardEl.setAttribute('role', 'button');
        cardEl.setAttribute('aria-label', `Open ${card.title} in markdown`);
        cardEl.draggable = true;
        cardEl.addEventListener('dragstart', (event) => {
          event.dataTransfer?.setData('text/weekly-kanban-card-id', card.id);
          event.dataTransfer?.setData('text/weekly-kanban-source-column', column.name);
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
          }
        });
        cardEl.addEventListener('click', () => {
          void this.handlers.onCardJump?.(card.lineStart);
        });
        cardEl.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void this.handlers.onCardJump?.(card.lineStart);
          }
        });

        cardEl.createDiv('weekly-kanban-card-title').setText(card.title);
        cardEl.createDiv('weekly-kanban-card-id').setText(`ID: ${card.id}`);

        const actionRowEl = cardEl.createDiv('weekly-kanban-card-actions');
        actionRowEl.setCssStyles({
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          marginTop: '4px',
        });
        const editButtonEl = actionRowEl.createEl('button', {
          cls: 'weekly-kanban-card-action',
          text: 'Edit',
        });
        editButtonEl.setCssStyles({ fontSize: '0.78rem', padding: '2px 8px' });
        editButtonEl.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          void this.handlers.onEditCard?.(card.id);
        });

        const toggleButtonEl = actionRowEl.createEl('button', {
          cls: 'weekly-kanban-card-action',
          text: card.completed ? 'Undo' : 'Done',
        });
        toggleButtonEl.setCssStyles({ fontSize: '0.78rem', padding: '2px 8px' });
        toggleButtonEl.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          void this.handlers.onToggleCard?.(card.id);
        });

        const deleteButtonEl = actionRowEl.createEl('button', {
          cls: 'weekly-kanban-card-action',
          text: 'Delete',
        });
        deleteButtonEl.setCssStyles({ fontSize: '0.78rem', padding: '2px 8px' });
        deleteButtonEl.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          void this.handlers.onDeleteCard?.(card.id);
        });

        if (card.labels.length > 0) {
          cardEl.createDiv('weekly-kanban-card-labels').setText(`Label: ${card.labels.join(',')}`);
        }

        if (card.dueDate) {
          cardEl.createDiv('weekly-kanban-card-due').setText(`Due: ${card.dueDate.toISOString().slice(0, 10)}`);
        }

        if (card.notes && card.notes.trim().length > 0) {
          cardEl.createDiv('weekly-kanban-card-notes').setText(card.notes);
        }
      }
    }
  }
}