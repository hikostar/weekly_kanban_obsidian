import { Modal, Notice, type App } from 'obsidian';
import type { Card } from '../domain/kanban.js';

export interface CardEditorResult {
  action: 'save' | 'delete' | 'cancel';
  title: string;
  labels: string[];
  dueDate?: string | undefined;
  notes?: string | undefined;
  completed: boolean;
}

export class CardModal extends Modal {
  private resolveResult?: (result: CardEditorResult) => void;

  private settled = false;

  constructor(app: App, private readonly card?: Card) {
    super(app);
  }

  async openAndWait(): Promise<CardEditorResult> {
    return await new Promise<CardEditorResult>((resolve) => {
      this.resolveResult = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.contentEl.empty();
    this.setTitle(this.card ? `Edit: ${this.card.title}` : 'Add card');
    this.modalEl.setCssStyles({ width: 'min(640px, 92vw)' });
    this.contentEl.setCssStyles({ display: 'grid', gap: '10px' });

    const titleLabelEl = this.contentEl.createEl('label', { text: 'Title' });
    const titleInputEl = titleLabelEl.createEl('input', { type: 'text' });
    titleLabelEl.setCssStyles({ display: 'grid', gap: '4px', fontWeight: '600' });
    titleInputEl.setCssStyles({ width: '100%' });
    titleInputEl.value = this.card?.title ?? '';

    const labelsLabelEl = this.contentEl.createEl('label', { text: 'Labels (comma separated)' });
    const labelsInputEl = labelsLabelEl.createEl('input', { type: 'text' });
    labelsLabelEl.setCssStyles({ display: 'grid', gap: '4px', fontWeight: '600' });
    labelsInputEl.setCssStyles({ width: '100%' });
    labelsInputEl.value = this.card ? this.card.labels.join(',') : '';

    const dueLabelEl = this.contentEl.createEl('label', { text: 'Due date' });
    const dueInputEl = dueLabelEl.createEl('input', { type: 'date' });
    dueLabelEl.setCssStyles({ display: 'grid', gap: '4px', fontWeight: '600' });
    dueInputEl.setCssStyles({ width: '220px' });
    dueInputEl.value = this.card?.dueDate ? this.card.dueDate.toISOString().slice(0, 10) : '';

    const notesLabelEl = this.contentEl.createEl('label', { text: 'Notes' });
    const notesInputEl = notesLabelEl.createEl('textarea');
    notesLabelEl.setCssStyles({ display: 'grid', gap: '4px', fontWeight: '600' });
    notesInputEl.setCssStyles({ width: '100%', minHeight: '90px' });
    notesInputEl.value = this.card?.notes ?? '';

    const completedRowEl = this.contentEl.createDiv();
    completedRowEl.setCssStyles({ display: 'flex', alignItems: 'center', gap: '6px' });
    const completedInputEl = completedRowEl.createEl('input', { type: 'checkbox' });
    completedInputEl.checked = this.card?.completed ?? false;
    completedRowEl.createSpan({ text: ' Completed' });

    const buttonRowEl = this.contentEl.createDiv();
    buttonRowEl.setCssStyles({ display: 'flex', justifyContent: 'flex-end', gap: '8px' });
    const saveButtonEl = buttonRowEl.createEl('button', { text: 'Save' });
    saveButtonEl.addClass('mod-cta');
    saveButtonEl.addEventListener('click', () => {
      const title = titleInputEl.value.trim();
      if (title.length === 0) {
        new Notice('Title is required');
        return;
      }

      const labels = labelsInputEl.value
        .split(',')
        .map((label) => label.trim())
        .filter((label) => label.length > 0);
      const dueDate = dueInputEl.value.trim();
      const notes = notesInputEl.value.trim();

      this.finish({
        action: 'save',
        title,
        labels,
        ...(dueDate.length > 0 ? { dueDate } : {}),
        ...(notes.length > 0 ? { notes } : {}),
        completed: completedInputEl.checked,
      });
      this.close();
    });

    if (this.card) {
      const deleteButtonEl = buttonRowEl.createEl('button', { text: 'Delete' });
      deleteButtonEl.addClass('mod-warning');
      deleteButtonEl.addEventListener('click', () => {
        this.finish({
          action: 'delete',
          title: this.card?.title ?? '',
          labels: this.card?.labels ?? [],
          dueDate: this.card?.dueDate ? this.card.dueDate.toISOString().slice(0, 10) : undefined,
          notes: this.card?.notes,
          completed: this.card?.completed ?? false,
        });
        this.close();
      });
    }

    const cancelButtonEl = buttonRowEl.createEl('button', { text: 'Cancel' });
    cancelButtonEl.addEventListener('click', () => {
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.settled) {
      this.finish({
        action: 'cancel',
        title: this.card?.title ?? '',
        labels: this.card?.labels ?? [],
        dueDate: this.card?.dueDate ? this.card.dueDate.toISOString().slice(0, 10) : undefined,
        notes: this.card?.notes,
        completed: this.card?.completed ?? false,
      });
    }
  }

  private finish(result: CardEditorResult): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolveResult?.(result);
  }
}