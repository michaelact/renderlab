export class RendererComponent {
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.iframe = null;
    this.renderTimer = null;
    this.lastBlobUrl = null;
  }

  init(deps) {
    this.eventBus = deps.eventBus;
    this.blobRegistry = deps.blobRegistry;
  }

  create() {
    const parent = this.container.querySelector('.preview-pane');
    if (!parent) return;

    this.iframe = document.createElement('iframe');
    this.iframe.sandbox.add('allow-scripts');
    parent.appendChild(this.iframe);
  }

  render(resolvedHtml) {
    if (!resolvedHtml) {
      this.clear();
      return;
    }

    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => {
      if (!this.iframe) {
        this.create();
      }

      try {
        if (this.lastBlobUrl) {
          this.blobRegistry?.revokePrevious();
        }

        const blob = new Blob([resolvedHtml], { type: 'text/html' });
        this.lastBlobUrl = URL.createObjectURL(blob);
        this.blobRegistry?.register(this.lastBlobUrl);

        this.iframe.src = this.lastBlobUrl;

        this.eventBus.emit('renderer:rendered', { url: this.lastBlobUrl });
      } catch (err) {
        console.error('RendererComponent render error:', err);
      }
    }, 300);
  }

  clear() {
    if (this.iframe && this.lastBlobUrl) {
      this.iframe.src = 'about:blank';
      this.lastBlobUrl = null;
    }
  }

  destroy() {
    clearTimeout(this.renderTimer);
    if (this.iframe && this.lastBlobUrl) {
      URL.revokeObjectURL(this.lastBlobUrl);
      this.iframe.remove();
      this.iframe = null;
    }
  }
}

export const rendererComponent = new RendererComponent(null, null);
