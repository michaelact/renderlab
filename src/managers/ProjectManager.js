export class ProjectManager {
  constructor(storageService, eventBus) {
    this.storageService = storageService;
    this.eventBus = eventBus;
    this.currentProjectId = null;
  }

  init(deps) {
    this.storageService = deps.storageService;
    this.eventBus = deps.eventBus;
  }

  createProject(name) {
    const id = 'proj_' + Date.now();
    const meta = {
      id,
      name: name.trim(),
      created: Date.now(),
      updated: Date.now()
    };

    try {
      this.storageService.set(`project:${id}:meta`, JSON.stringify(meta));

      const boilerplate = {
        'index.html': '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>New Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World</h1>\n  <script src="script.js"><\/script>\n</body>\n</html>',
        'style.css': 'body {\n  font-family: system-ui, -apple-system, sans-serif;\n  max-width: 800px;\n  margin: 2rem auto;\n  padding: 1rem;\n}\n\nh1 {\n  color: #333;\n}',
        'script.js': 'console.log("Ready to code!");'
      };

      Object.entries(boilerplate).forEach(([path, content]) => {
        this.storageService.set(`project:${id}:file:${path}`, content);
      });

      this.currentProjectId = id;
      this.eventBus.emit('project:created', { id, name });
      return id;
    } catch (err) {
      console.error('createProject error:', err);
      return null;
    }
  }

  getProject(id) {
    try {
      const metaStr = this.storageService.get(`project:${id}:meta`);
      if (!metaStr) return null;

      const meta = JSON.parse(metaStr);
      const fileKeys = this.storageService.listKeys(`project:${id}:file:`);
      const files = {};

      fileKeys.forEach(key => {
        const path = key.replace(`project:${id}:file:`, '');
        files[path] = this.storageService.get(key);
      });

      return { ...meta, files };
    } catch (err) {
      console.error('getProject error:', err);
      return null;
    }
  }

  listProjects() {
    const metaKeys = this.storageService.listKeys('project:').filter(k => k.endsWith(':meta'));
    return metaKeys.map(key => {
      const id = key.match(/project:([^:]+):meta/)[1];
      const metaStr = this.storageService.get(key);
      try {
        return JSON.parse(metaStr);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  deleteProject(id) {
    try {
      const keys = this.storageService.listKeys(`project:${id}:`);
      keys.forEach(key => this.storageService.delete(key));
      this.eventBus.emit('project:deleted', { id });
    } catch (err) {
      console.error('deleteProject error:', err);
    }
  }

  updateProjectFile(id, path, content) {
    try {
      this.storageService.set(`project:${id}:file:${path}`, content);
      const metaStr = this.storageService.get(`project:${id}:meta`);
      const meta = JSON.parse(metaStr);
      meta.updated = Date.now();
      this.storageService.set(`project:${id}:meta`, JSON.stringify(meta));
    } catch (err) {
      console.error('updateProjectFile error:', err);
    }
  }

  renameProject(id, newName) {
    try {
      const metaStr = this.storageService.get(`project:${id}:meta`);
      const meta = JSON.parse(metaStr);
      meta.name = newName.trim();
      meta.updated = Date.now();
      this.storageService.set(`project:${id}:meta`, JSON.stringify(meta));
      this.eventBus.emit('project:renamed', { id, name: newName });
    } catch (err) {
      console.error('renameProject error:', err);
    }
  }

  setCurrentProject(id) {
    this.currentProjectId = id;
  }

  getCurrentProject() {
    return this.currentProjectId ? this.getProject(this.currentProjectId) : null;
  }
}

export const projectManager = new ProjectManager(null, null);
