export class FileSystemService {
  constructor() {
    this.dirHandle = null;
  }

  async pickDirectory() {
    try {
      this.dirHandle = await window.showDirectoryPicker();
      return this.dirHandle;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('showDirectoryPicker error:', err);
      }
      return null;
    }
  }

  async scanDirectory(handle = null) {
    const target = handle || this.dirHandle;
    if (!target) return { files: {}, folders: {} };

    const files = {};
    const folders = {};

    const walk = async (dirHandle, basePath = '') => {
      try {
        for await (const entry of dirHandle.values()) {
          const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;

          if (entry.kind === 'file') {
            files[fullPath] = entry;
          } else if (entry.kind === 'directory') {
            folders[fullPath] = entry;
            await walk(entry, fullPath);
          }
        }
      } catch (err) {
        console.error(`Error walking directory ${basePath}:`, err);
      }
    };

    await walk(target);
    return { files, folders };
  }

  async readFile(fileHandle) {
    try {
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (err) {
      console.error('FileSystemService.readFile error:', err);
      return null;
    }
  }

  async writeFile(fileHandle, content) {
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err) {
      console.error('FileSystemService.writeFile error:', err);
      throw err;
    }
  }

  isSupported() {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }
}

export const fileSystemService = new FileSystemService();
