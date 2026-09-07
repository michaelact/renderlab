const TEXT_EXTS = ['.html', '.htm', '.svg', '.css', '.js', '.mjs', '.json', '.xml', '.csv', '.txt'];
const BINARY_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.mp4', '.webm', '.ogv', '.mov'];

export class FileMapBuilder {
  constructor() {
    this.fileMap = {};
  }

  init() {}

  async buildFromFilesystem(fileHandles) {
    const map = {};

    for (const [path, handle] of Object.entries(fileHandles)) {
      const ext = this.getExtension(path);

      if (TEXT_EXTS.includes(ext)) {
        const file = await handle.getFile();
        map[path] = {
          type: 'text',
          content: await file.text(),
          handle
        };
      } else if (BINARY_EXTS.includes(ext)) {
        map[path] = {
          type: 'binary',
          handle
        };
      }
    }

    this.fileMap = map;
    return this.fileMap;
  }

  buildFromObject(obj) {
    const map = {};

    for (const [path, content] of Object.entries(obj)) {
      const ext = this.getExtension(path);

      if (TEXT_EXTS.includes(ext)) {
        map[path] = {
          type: 'text',
          content,
          handle: null
        };
      }
    }

    this.fileMap = map;
    return this.fileMap;
  }

  getExtension(path) {
    const match = path.match(/\.[^.]*$/);
    return match ? match[0] : '';
  }

  updateEntry(path, content) {
    if (this.fileMap[path]) {
      this.fileMap[path].content = content;
    }
  }

  addEntry(path, content) {
    const ext = this.getExtension(path);
    if (TEXT_EXTS.includes(ext)) {
      this.fileMap[path] = {
        type: 'text',
        content,
        handle: null
      };
    }
  }

  deleteEntry(path) {
    delete this.fileMap[path];
  }

  getFileMap() {
    return this.fileMap;
  }

  clear() {
    this.fileMap = {};
  }

  getTextFiles() {
    return Object.entries(this.fileMap)
      .filter(([_, entry]) => entry.type === 'text')
      .map(([path, entry]) => ({ path, content: entry.content }));
  }

  findEntryPoint() {
    const paths = Object.keys(this.fileMap);
    const indexHtml = paths.find(p => p.toLowerCase() === 'index.html');
    if (indexHtml) return indexHtml;
    return paths.find(p => p.endsWith('.html'));
  }
}

export const fileMapBuilder = new FileMapBuilder();
