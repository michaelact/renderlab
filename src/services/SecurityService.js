export class SecurityService {
  constructor() {
    this.violations = [];
  }

  sanitizeDOMText(str) {
    if (typeof str !== 'string') return '';
    return str;
  }

  isRemoteURL(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase().trim();
    return lower.startsWith('http://') ||
           lower.startsWith('https://') ||
           lower.startsWith('//');
  }

  validateProjectMeta(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.name !== 'string' || !data.name.trim()) return false;
    if (typeof data.created !== 'number' || data.created <= 0) return false;
    if (typeof data.updated !== 'number' || data.updated <= 0) return false;
    return true;
  }

  validateFileHandle(handle) {
    return handle && handle.kind === 'file';
  }

  reportViolation(type, detail) {
    this.violations.push({
      type,
      detail,
      timestamp: Date.now()
    });
  }
}

export const securityService = new SecurityService();
