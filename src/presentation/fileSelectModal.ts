import { Modal, type App, type TFile } from 'obsidian';

export class FileSelectModal extends Modal {
  private files: TFile[] = [];

  private resolveSelection?: (file: TFile | undefined) => void;

  private settled = false;

  constructor(app: App, files: TFile[]) {
    super(app);
    this.files = [...files];
  }

  async openAndWait(): Promise<TFile | undefined> {
    return await new Promise<TFile | undefined>((resolve) => {
      this.resolveSelection = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.contentEl.empty();
    this.setTitle('Select weekly markdown file');
    this.modalEl.setCssStyles({ width: 'min(720px, 94vw)' });
    this.contentEl.setCssStyles({ display: 'grid', gap: '10px' });

    const descriptionEl = this.contentEl.createDiv();
    descriptionEl.setText('Choose a markdown file to load into Weekly Kanban.');

    const listEl = this.contentEl.createDiv('weekly-kanban-file-list');
    listEl.setCssStyles({
      display: 'grid',
      gap: '6px',
      maxHeight: '320px',
      overflowY: 'auto',
      padding: '4px',
      border: '1px solid var(--background-modifier-border)',
      borderRadius: '8px',
      backgroundColor: 'var(--background-secondary)',
    });
    for (const file of this.files) {
      const buttonEl = listEl.createEl('button', {
        cls: 'weekly-kanban-file-item',
        text: file.path,
      });
      buttonEl.setCssStyles({
        textAlign: 'left',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        padding: '8px 10px',
      });
      buttonEl.addEventListener('click', () => {
        this.finish(file);
        this.close();
      });
    }

    const cancelRowEl = this.contentEl.createDiv();
    const cancelButtonEl = cancelRowEl.createEl('button', { text: 'Cancel' });
    cancelButtonEl.addEventListener('click', () => {
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.settled) {
      this.finish(undefined);
    }
  }

  private finish(file: TFile | undefined): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolveSelection?.(file);
  }
}