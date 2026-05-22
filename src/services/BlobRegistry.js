export class BlobRegistry {
  constructor() {
    this.urls = [];
  }

  register(url) {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      this.urls.push(url);
    }
  }

  revokePrevious() {
    if (this.urls.length > 0) {
      const url = this.urls.pop();
      URL.revokeObjectURL(url);
    }
  }

  revokeAll() {
    this.urls.forEach(url => URL.revokeObjectURL(url));
    this.urls = [];
  }

  getLastURL() {
    return this.urls.length > 0 ? this.urls[this.urls.length - 1] : null;
  }
}

export const blobRegistry = new BlobRegistry();
