export class UIController {
  constructor(container) {
    this.container = container;
    this.deps = null;
    this.currentFolderHandle = null;
    this.saveDebounceTimer = null;
    this.fileTreeState = {};
  }

  init(deps) {
    this.deps = deps;
    this.setupEventListeners();
    this.restoreLastProject();
  }

  setupEventListeners() {
    this.on('file:changed', (data) => {
      this.deps.fileMapBuilder.updateEntry(data.path, data.content);

      const fileMap = this.deps.fileMapBuilder.getFileMap();
      const resolved = this.deps.assetResolver.resolve(fileMap);

      if (resolved) {
        this.deps.rendererComponent.render(resolved);
      }

      this.scheduleFileSave(data.path, data.content);
    });

    this.on('project:loaded', (data) => {
      this.renderProjectList();
    });

    this.on('project:deleted', (data) => {
      this.renderProjectList();
    });

    this.on('renderer:rendered', (data) => {
      console.log('Rendered:', data.url);
    });

    // DOM buttons
    const newProjectBtn = this.container.querySelector('[data-action="new-project"]');
    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', () => this.createNewProject());
    }

    const openFolderBtn = this.container.querySelector('[data-action="open-folder"]');
    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', () => this.openFolder());
    }

    const themeToggleBtn = this.container.querySelector('[data-action="toggle-theme"]');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Check browser support
    if (!this.deps.fileSystemService.isSupported()) {
      this.showBrowserWarning();
    }
  }

  on(eventName, handler) {
    return this.deps.eventBus.on(eventName, handler);
  }

  createNewProject() {
    const name = prompt('Project name:');
    if (!name) return;

    const id = this.deps.projectManager.createProject(name);
    if (id) {
      this.deps.projectManager.setCurrentProject(id);
      this.loadProject(id);
      this.renderProjectList();
    }
  }

  async openFolder() {
    const handle = await this.deps.fileSystemService.pickDirectory();
    if (!handle) return;

    this.currentFolderHandle = handle;

    const result = await this.deps.fileSystemService.scanDirectory(handle);
    const fileMap = await this.deps.fileMapBuilder.buildFromFilesystem(result.files);

    this.deps.rendererComponent.create();
    this.renderFileTree(result.files, result.folders);

    const textFiles = this.deps.fileMapBuilder.getTextFiles();
    if (textFiles.length > 0) {
      await this.deps.editorComponent.openFile(textFiles[0].path, textFiles[0].content);
    }

    this.deps.eventBus.emit('project:loaded', { files: fileMap });
  }

  async loadProject(projectId) {
    const project = this.deps.projectManager.getProject(projectId);
    if (!project) return;

    this.deps.blobRegistry.revokeAll();
    this.deps.fileMapBuilder.buildFromObject(project.files);
    this.deps.rendererComponent.create();

    this.renderFileTree(project.files);

    const textFiles = Object.entries(project.files).filter(([path]) => {
      const ext = path.substring(path.lastIndexOf('.'));
      return ['.html', '.htm', '.svg', '.css', '.js', '.mjs', '.json', '.xml', '.csv', '.txt'].includes(ext);
    });

    if (textFiles.length > 0) {
      await this.deps.editorComponent.openFile(textFiles[0][0], textFiles[0][1]);
    }

    this.deps.eventBus.emit('project:loaded', { id: projectId });
  }

  scheduleFileSave(path, content) {
    clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      if (this.currentFolderHandle) {
        this.saveFileToFilesystem(path, content);
      } else {
        const projectId = this.deps.projectManager.currentProjectId;
        if (projectId) {
          this.deps.projectManager.updateProjectFile(projectId, path, content);
        }
      }
    }, 500);
  }

  async saveFileToFilesystem(path, content) {
    if (!this.currentFolderHandle) return;

    try {
      const parts = path.split('/');
      let currentHandle = this.currentFolderHandle;

      for (let i = 0; i < parts.length - 1; i++) {
        currentHandle = await currentHandle.getDirectoryHandle(parts[i], { create: true });
      }

      const fileName = parts[parts.length - 1];
      const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
      await this.deps.fileSystemService.writeFile(fileHandle, content);
    } catch (err) {
      console.error('Save to filesystem error:', err);
    }
  }

  renderFileTree(files, folders) {
    const sidebar = this.container.querySelector('.sidebar-content');
    if (!sidebar) return;

    const treeEl = document.createElement('div');
    treeEl.className = 'file-tree';

    const renderTree = (items, parentPath = '') => {
      if (!items || Object.keys(items).length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.padding = '1rem';
        emptyDiv.style.color = '#666';
        emptyDiv.textContent = 'No files';
        treeEl.appendChild(emptyDiv);
        return;
      }

      const list = document.createElement('ul');
      list.style.listStyle = 'none';
      list.style.padding = '0';
      list.style.margin = '0';

      Object.keys(items).forEach(path => {
        const li = document.createElement('li');
        li.style.padding = '0.25rem 0.5rem';

        const name = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;
        const span = document.createElement('span');
        span.textContent = name;
        span.style.cursor = 'pointer';
        span.style.userSelect = 'none';

        span.addEventListener('click', () => {
          this.deps.editorComponent.openFile(path, items[path] || '');
        });

        li.appendChild(span);
        list.appendChild(li);
      });

      treeEl.appendChild(list);
    };

    renderTree(files);
    sidebar.textContent = '';
    sidebar.appendChild(treeEl);
  }

  renderProjectList() {
    const projectList = this.container.querySelector('.project-list');
    if (!projectList) return;

    const projects = this.deps.projectManager.listProjects();
    projectList.textContent = '';

    projects.forEach(proj => {
      const li = document.createElement('div');
      li.className = 'project-item';
      li.style.padding = '0.5rem';
      li.style.borderRadius = '4px';
      li.style.cursor = 'pointer';
      li.style.marginBottom = '0.5rem';
      li.style.display = 'flex';
      li.style.alignItems = 'center';

      if (proj.id === this.deps.projectManager.currentProjectId) {
        li.style.backgroundColor = '#007acc';
        li.style.color = '#fff';
      }

      const nameSpan = document.createElement('span');
      nameSpan.textContent = proj.name;
      li.appendChild(nameSpan);

      li.addEventListener('click', () => {
        this.deps.projectManager.setCurrentProject(proj.id);
        this.loadProject(proj.id);
        this.renderProjectList();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.style.marginLeft = 'auto';
      deleteBtn.style.background = 'none';
      deleteBtn.style.border = 'none';
      deleteBtn.style.color = 'inherit';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${proj.name}"?`)) {
          this.deps.projectManager.deleteProject(proj.id);
        }
      });

      li.appendChild(deleteBtn);
      projectList.appendChild(li);
    });
  }

  restoreLastProject() {
    const lastId = localStorage.getItem('renderlab:lastProject');
    if (lastId) {
      this.loadProject(lastId);
    }
  }

  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('renderlab:theme', newTheme);
  }

  showBrowserWarning() {
    const warning = document.createElement('div');
    warning.className = 'browser-warning';
    warning.textContent = 'File System Access API not supported. Using localStorage only.';
    warning.style.backgroundColor = '#fff3cd';
    warning.style.color = '#856404';
    warning.style.padding = '1rem';
    warning.style.borderBottom = '1px solid #ffc107';
    this.container.insertBefore(warning, this.container.firstChild);
  }
}

export const uiController = new UIController(null);
