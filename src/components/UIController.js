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
      this.pulseStatusLed();
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

  pulseStatusLed() {
    const led = this.container.querySelector('[data-el="status-led"]');
    if (!led) return;
    led.classList.remove('is-active');
    void led.offsetWidth;
    led.classList.add('is-active');
  }

  setBreadcrumb(label) {
    const breadcrumb = this.container.querySelector('[data-el="breadcrumb"]');
    if (breadcrumb) breadcrumb.textContent = label || '';
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
    this.setBreadcrumb(handle.name);

    const result = await this.deps.fileSystemService.scanDirectory(handle);
    const fileMap = await this.deps.fileMapBuilder.buildFromFilesystem(result.files);

    this.deps.rendererComponent.create();
    this.renderFileTree(result.files, result.folders);

    const entryPath = this.deps.fileMapBuilder.findEntryPoint();
    const textFiles = this.deps.fileMapBuilder.getTextFiles();
    const initialFile = textFiles.find(f => f.path === entryPath) || textFiles[0];
    if (initialFile) {
      await this.deps.editorComponent.openFile(initialFile.path, initialFile.content);
    }

    this.deps.eventBus.emit('project:loaded', { files: fileMap });
  }

  async loadProject(projectId) {
    const project = this.deps.projectManager.getProject(projectId);
    if (!project) return;

    this.setBreadcrumb(project.name);
    this.deps.blobRegistry.revokeAll();
    this.deps.fileMapBuilder.buildFromObject(project.files);
    this.deps.rendererComponent.create();

    this.renderFileTree(project.files);

    const entryPath = this.deps.fileMapBuilder.findEntryPoint();
    const textFiles = Object.entries(project.files).filter(([path]) => {
      const ext = path.substring(path.lastIndexOf('.'));
      return ['.html', '.htm', '.svg', '.css', '.js', '.mjs', '.json', '.xml', '.csv', '.txt'].includes(ext);
    });
    const initialFile = textFiles.find(([path]) => path === entryPath) || textFiles[0];

    if (initialFile) {
      await this.deps.editorComponent.openFile(initialFile[0], initialFile[1]);
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

    let treeEl = sidebar.querySelector('.file-tree');
    if (!treeEl) {
      treeEl = document.createElement('div');
      treeEl.className = 'file-tree';
      sidebar.appendChild(treeEl);
    }
    treeEl.textContent = '';

    const renderTree = (items, parentPath = '') => {
      if (!items || Object.keys(items).length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'file-tree-empty';
        emptyDiv.textContent = 'No files';
        treeEl.appendChild(emptyDiv);
        return;
      }

      const list = document.createElement('ul');

      Object.keys(items).forEach(path => {
        const li = document.createElement('li');

        const name = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;
        const span = document.createElement('span');
        span.textContent = name;

        span.addEventListener('click', () => {
          this.deps.editorComponent.openFile(path, items[path] || '');
        });

        li.appendChild(span);
        list.appendChild(li);
      });

      treeEl.appendChild(list);
    };

    renderTree(files);
  }

  renderProjectList() {
    const projectList = this.container.querySelector('.project-list');
    if (!projectList) return;

    const projects = this.deps.projectManager.listProjects();
    projectList.textContent = '';

    projects.forEach(proj => {
      const li = document.createElement('div');
      li.className = 'project-item';

      if (proj.id === this.deps.projectManager.currentProjectId) {
        li.classList.add('active');
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
      deleteBtn.className = 'project-item-delete';
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
    this.container.insertBefore(warning, this.container.firstChild);
  }
}

export const uiController = new UIController(null);
