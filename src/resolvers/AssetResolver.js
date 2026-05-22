export class AssetResolver {
  constructor(fileMap, securityService, blobRegistry) {
    this.fileMap = fileMap;
    this.securityService = securityService;
    this.blobRegistry = blobRegistry;
  }

  init(deps) {
    this.fileMap = deps.fileMapBuilder.getFileMap();
    this.securityService = deps.securityService;
    this.blobRegistry = deps.blobRegistry;
  }

  resolve(fileMap) {
    this.fileMap = fileMap;
    const entryPoint = this.findEntryPoint();
    if (!entryPoint) return null;

    const htmlContent = this.fileMap[entryPoint]?.content;
    if (!htmlContent) return null;

    const resolved = this.resolveHTML(htmlContent, entryPoint);
    return resolved;
  }

  findEntryPoint() {
    const paths = Object.keys(this.fileMap);
    const indexHtml = paths.find(p => p.toLowerCase() === 'index.html');
    if (indexHtml) return indexHtml;
    return paths.find(p => p.endsWith('.html'));
  }

  resolveHTML(html, basePath) {
    let resolved = html;

    // Inline stylesheets
    resolved = resolved.replace(
      /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/gi,
      (match, href) => {
        if (this.securityService.isRemoteURL(href)) {
          console.warn('Blocked remote stylesheet:', href);
          return '';
        }
        const cssPath = this.resolvePath(basePath, href);
        const cssContent = this.fileMap[cssPath]?.content;
        if (!cssContent) {
          console.warn('Stylesheet not found:', cssPath);
          return '';
        }
        const resolved = this.resolveCSS(cssContent, cssPath);
        return `<style>${resolved}</style>`;
      }
    );

    // Inline scripts
    resolved = resolved.replace(
      /<script\s+src="([^"]+)"\s*><\/script>/gi,
      (match, src) => {
        if (this.securityService.isRemoteURL(src)) {
          console.warn('Blocked remote script:', src);
          return '';
        }
        const jsPath = this.resolvePath(basePath, src);
        const jsContent = this.fileMap[jsPath]?.content;
        if (!jsContent) {
          console.warn('Script not found:', jsPath);
          return '';
        }
        return `<script>${jsContent}</script>`;
      }
    );

    // Convert media src to blob URLs
    resolved = this.replaceAssetURLs(resolved, basePath);

    return resolved;
  }

  resolveCSS(css, basePath) {
    let resolved = css;

    // url() in CSS
    resolved = resolved.replace(
      /url\(['"]?([^'")\s]+)['"]?\)/gi,
      (match, url) => {
        if (this.securityService.isRemoteURL(url)) {
          console.warn('Blocked remote asset in CSS:', url);
          return match;
        }
        const assetPath = this.resolvePath(basePath, url);
        const blobUrl = this.getOrCreateBlobURL(assetPath);
        return blobUrl ? `url(${blobUrl})` : match;
      }
    );

    // @import
    resolved = resolved.replace(
      /@import\s+['"]([^'"]+)['"]/gi,
      (match, importPath) => {
        if (this.securityService.isRemoteURL(importPath)) {
          console.warn('Blocked remote import:', importPath);
          return '';
        }
        const cssPath = this.resolvePath(basePath, importPath);
        const importContent = this.fileMap[cssPath]?.content;
        if (!importContent) return '';
        return this.resolveCSS(importContent, cssPath);
      }
    );

    return resolved;
  }

  replaceAssetURLs(html, basePath) {
    let resolved = html;

    // img src
    resolved = resolved.replace(
      /src="([^"]+)"/gi,
      (match, src) => {
        if (src.startsWith('data:') || src.startsWith('blob:')) return match;
        if (this.securityService.isRemoteURL(src)) {
          console.warn('Blocked remote image:', src);
          return 'src=""';
        }
        const assetPath = this.resolvePath(basePath, src);
        const blobUrl = this.getOrCreateBlobURL(assetPath);
        return blobUrl ? `src="${blobUrl}"` : match;
      }
    );

    // audio/video src, poster
    resolved = resolved.replace(
      /(poster|src)="([^"]+)"/gi,
      (match, attr, url) => {
        if (url.startsWith('data:') || url.startsWith('blob:')) return match;
        if (this.securityService.isRemoteURL(url)) {
          console.warn(`Blocked remote ${attr}:`, url);
          return `${attr}=""`;
        }
        const assetPath = this.resolvePath(basePath, url);
        const blobUrl = this.getOrCreateBlobURL(assetPath);
        return blobUrl ? `${attr}="${blobUrl}"` : match;
      }
    );

    return resolved;
  }

  resolvePath(basePath, relativePath) {
    const dir = basePath.substring(0, basePath.lastIndexOf('/')) || '';
    if (relativePath.startsWith('/')) return relativePath.substring(1);
    if (relativePath.startsWith('./')) {
      return (dir ? dir + '/' : '') + relativePath.substring(2);
    }
    if (relativePath.startsWith('../')) {
      let path = relativePath;
      let current = dir;
      while (path.startsWith('../')) {
        current = current.substring(0, current.lastIndexOf('/'));
        path = path.substring(3);
      }
      return (current ? current + '/' : '') + path;
    }
    return (dir ? dir + '/' : '') + relativePath;
  }

  getOrCreateBlobURL(filePath) {
    const entry = this.fileMap[filePath];
    if (!entry) return null;

    if (entry.type === 'binary') {
      if (entry.blobUrl) return entry.blobUrl;
      if (entry.handle) {
        entry.handle.getFile().then(file => {
          const blob = new Blob([file], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          this.blobRegistry.register(url);
          entry.blobUrl = url;
        });
        return null;
      }
    }

    if (entry.type === 'text' && entry.content) {
      const blob = new Blob([entry.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      this.blobRegistry.register(url);
      return url;
    }

    return null;
  }
}

export const assetResolver = new AssetResolver(null, null, null);
