const PREFIX = 'renderlab:';

export class StorageService {
  get(key) {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch (err) {
      console.error('StorageService.get error:', err);
      return null;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        throw new Error('localStorage quota exceeded');
      }
      console.error('StorageService.set error:', err);
    }
  }

  delete(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (err) {
      console.error('StorageService.delete error:', err);
    }
  }

  listKeys(prefix) {
    const result = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX + prefix)) {
          result.push(key.substring(PREFIX.length));
        }
      }
    } catch (err) {
      console.error('StorageService.listKeys error:', err);
    }
    return result;
  }

  clear() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
    } catch (err) {
      console.error('StorageService.clear error:', err);
    }
  }
}

export const storageService = new StorageService();
