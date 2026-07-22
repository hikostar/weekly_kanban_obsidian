import { Modal, type App } from 'obsidian';

export class ConfirmModal extends Modal {
  private resolveChoice?: (confirmed: boolean) => void;

  private settled = false;

  constructor(
    app: App,
    private readonly title: string,
    private readonly message: string,
    private readonly confirmLabel = 'Confirm',
    private readonly cancelLabel = 'Cancel',
  ) {
    super(app);
  }

  async openAndWait(): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      this.resolveChoice = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.contentEl.empty();
    this.setTitle(this.title);
    this.contentEl.setCssStyles({ display: 'grid', gap: '10px' });
    this.contentEl.createDiv({ text: this.message });

    const rowEl = this.contentEl.createDiv();
    rowEl.setCssStyles({ display: 'flex', justifyContent: 'flex-end', gap: '8px' });

    const cancelButtonEl = rowEl.createEl('button', { text: this.cancelLabel });
    cancelButtonEl.addEventListener('click', () => {
      this.finish(false);
      this.close();
    });

    const confirmButtonEl = rowEl.createEl('button', { text: this.confirmLabel });
    confirmButtonEl.addClass('mod-warning');
    confirmButtonEl.addEventListener('click', () => {
      this.finish(true);
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.settled) {
      this.finish(false);
    }
  }

  private finish(confirmed: boolean): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolveChoice?.(confirmed);
  }
}
