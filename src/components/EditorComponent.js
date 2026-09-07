export class EditorComponent {
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.cm = null;
    this.cmUnavailable = false;
    this.currentFile = null;
    this.openTabs = new Map();
    this.unsavedChanges = new Set();
    this.debounceTimer = null;
  }

  init(deps) {
    this.eventBus = deps.eventBus;
  }

  async loadCodeMirror() {
    if (this.cm) return true;

    try {
      const { EditorState } = await import('@codemirror/state');
      const { EditorView, basicSetup } = await import('codemirror');
      const { javascript } = await import('@codemirror/lang-javascript');
      const { html } = await import('@codemirror/lang-html');
      const { css } = await import('@codemirror/lang-css');
      const { json } = await import('@codemirror/lang-json');
      const { xml } = await import('@codemirror/lang-xml');

      this.EditorState = EditorState;
      this.EditorView = EditorView;
      this.basicSetup = basicSetup;
      this.languages = { javascript, html, css, json, xml };
      return true;
    } catch (err) {
      console.error('CodeMirror load failed:', err);
      return false;
    }
  }

  async openFile(path, content) {
    if (!this.cm && !this.cmUnavailable) {
      const loaded = await this.loadCodeMirror();
      if (loaded) {
        this.createEditor();
      } else {
        this.cmUnavailable = true;
        this.useFallbackTextarea();
      }
    }

    this.currentFile = path;

    if (this.openTabs.has(path)) {
      this.switchTab(path);
      return;
    }

    this.openTabs.set(path, { content, dirty: false });
    this.renderTabs();
    this.switchTab(path);
  }

  createEditor() {
    const parent = this.container.querySelector('.editor-pane');
    const editorContainer = document.createElement('div');
    editorContainer.id = 'editor';
    editorContainer.style.height = '100%';
    parent.appendChild(editorContainer);

    const state = this.EditorState.create({
      doc: '',
      extensions: [this.basicSetup, this.changeListener()]
    });

    this.cm = new this.EditorView({
      state,
      parent: editorContainer
    });
  }

  changeListener() {
    return this.EditorView.updateListener.of((update) => {
      if (update.docChanged) this.onFileChange();
    });
  }

  useFallbackTextarea() {
    if (this.fallbackTextarea) return;

    const parent = this.container.querySelector('.editor-pane');
    const textarea = document.createElement('textarea');
    textarea.className = 'fallback-editor';
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '14px';
    textarea.style.padding = '1rem';
    parent.appendChild(textarea);

    textarea.addEventListener('input', (e) => {
      const tab = this.openTabs.get(this.currentFile);
      if (tab) {
        tab.content = e.target.value;
        tab.dirty = true;
      }
      this.onFileChange();
    });

    this.fallbackTextarea = textarea;
  }

  switchTab(path) {
    if (!this.openTabs.has(path)) return;

    this.currentFile = path;
    const tab = this.openTabs.get(path);

    if (this.cm) {
      const lang = this.getLanguage(path);
      const state = this.EditorState.create({
        doc: tab.content,
        extensions: [this.basicSetup, lang || [], this.changeListener()]
      });
      this.cm.setState(state);
    } else if (this.fallbackTextarea) {
      this.fallbackTextarea.value = tab.content;
    }

    this.renderTabs();
  }

  closeTab(path) {
    this.openTabs.delete(path);
    this.unsavedChanges.delete(path);

    if (this.currentFile === path) {
      const remaining = [...this.openTabs.keys()];
      if (remaining.length > 0) {
        this.switchTab(remaining[0]);
      } else {
        this.currentFile = null;
      }
    }

    this.renderTabs();
  }

  onFileChange() {
    if (!this.currentFile) return;

    let currentContent;
    if (this.cm) {
      currentContent = this.cm.state.doc.toString();
    } else if (this.fallbackTextarea) {
      currentContent = this.fallbackTextarea.value;
    }

    const tab = this.openTabs.get(this.currentFile);
    if (!tab) return;

    if (currentContent !== tab.content) {
      this.unsavedChanges.add(this.currentFile);
      tab.dirty = true;
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.eventBus.emit('file:changed', {
        path: this.currentFile,
        content: currentContent
      });
      this.unsavedChanges.delete(this.currentFile);
      tab.dirty = false;
      this.renderTabs();
    }, 300);
  }

  getLanguage(path) {
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    switch (ext) {
      case '.js':
      case '.mjs':
        return this.languages?.javascript();
      case '.html':
      case '.htm':
        return this.languages?.html();
      case '.css':
        return this.languages?.css();
      case '.json':
        return this.languages?.json();
      case '.xml':
      case '.svg':
        return this.languages?.xml();
      default:
        return null;
    }
  }

  renderTabs() {
    const tabsContainer = this.container.querySelector('.tabs');
    if (!tabsContainer) return;

    // Clear existing tabs safely
    while (tabsContainer.firstChild) {
      tabsContainer.removeChild(tabsContainer.firstChild);
    }

    this.openTabs.forEach((tab, path) => {
      const tabEl = document.createElement('div');
      tabEl.className = 'tab' + (this.currentFile === path ? ' active' : '');

      const name = path.substring(path.lastIndexOf('/') + 1);
      const isDirty = this.unsavedChanges.has(path);
      const indicator = isDirty ? '● ' : '';

      tabEl.textContent = indicator + name;
      tabEl.addEventListener('click', () => this.switchTab(path));

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.className = 'tab-close';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(path);
      });

      tabEl.appendChild(closeBtn);
      tabsContainer.appendChild(tabEl);
    });
  }

  getCurrentFileContent() {
    if (!this.currentFile) return '';
    if (this.cm) return this.cm.state.doc.toString();
    if (this.fallbackTextarea) return this.fallbackTextarea.value;
    return this.openTabs.get(this.currentFile)?.content || '';
  }

  clear() {
    this.openTabs.clear();
    this.unsavedChanges.clear();
    this.currentFile = null;
    const tabsContainer = this.container.querySelector('.tabs');
    if (tabsContainer) {
      while (tabsContainer.firstChild) {
        tabsContainer.removeChild(tabsContainer.firstChild);
      }
    }
    if (this.cm) {
      this.cm.destroy();
      this.cm = null;
    }
  }
}

export const editorComponent = new EditorComponent(null, null);
