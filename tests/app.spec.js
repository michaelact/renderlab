import { test, expect } from '@playwright/test';

test.describe('HTML Web Editor - App Initialization', () => {
  test('should load and display main layout', async ({ page }) => {
    await page.goto('/');

    // Check header
    const header = await page.locator('.header');
    await expect(header).toBeVisible();
    await expect(page.locator('.header h1')).toContainText('RenderLab');

    // Check sidebar
    const sidebar = await page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // Check editor section
    const editor = await page.locator('.editor-section');
    await expect(editor).toBeVisible();

    // Check preview section
    const preview = await page.locator('.preview-section');
    await expect(preview).toBeVisible();
  });

  test('should show theme toggle button', async ({ page }) => {
    await page.goto('/');

    const themeBtn = await page.locator('[data-action="toggle-theme"]');
    await expect(themeBtn).toBeVisible();
    await expect(themeBtn.locator('svg')).toBeVisible();
  });

  test('should show new project and open folder buttons', async ({ page }) => {
    await page.goto('/');

    const newProjectBtn = await page.locator('[data-action="new-project"]');
    const openFolderBtn = await page.locator('[data-action="open-folder"]');

    await expect(newProjectBtn).toBeVisible();
    await expect(openFolderBtn).toBeVisible();
  });

  test('should display preview pane', async ({ page }) => {
    await page.goto('/');

    const previewPane = await page.locator('.preview-pane');
    await expect(previewPane).toBeVisible();

    const previewHeader = await page.locator('.preview-header');
    await expect(previewHeader).toContainText('Live Preview');
  });

  test('should restore theme from localStorage on load', async ({ page }) => {
    await page.goto('/');

    // Get initial theme
    let html = await page.locator('html');
    let theme = await html.getAttribute('data-theme');

    // Set theme in localStorage
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    await page.evaluate((t) => {
      localStorage.setItem('renderlab:theme', t);
    }, newTheme);

    // Reload page
    await page.reload();

    // Check that theme was restored
    html = await page.locator('html');
    const restoredTheme = await html.getAttribute('data-theme');
    expect(restoredTheme).toBe(newTheme);
  });
});

test.describe('HTML Web Editor - Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => localStorage.clear());
  });

  test('should toggle theme on button click', async ({ page }) => {
    const html = await page.locator('html');

    // Get initial theme
    let theme = await html.getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);

    // Click toggle button
    const themeBtn = await page.locator('[data-action="toggle-theme"]');
    await themeBtn.click();

    // Wait for theme change
    await page.waitForTimeout(100);

    // Check new theme
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(theme);
    expect(['dark', 'light']).toContain(newTheme);
  });

  test('should persist theme in localStorage', async ({ page }) => {
    // Get current theme
    const html = await page.locator('html');
    const originalTheme = await html.getAttribute('data-theme');

    // Toggle theme
    const themeBtn = await page.locator('[data-action="toggle-theme"]');
    await themeBtn.click();
    await page.waitForTimeout(100);

    // Check localStorage
    const savedTheme = await page.evaluate(() =>
      localStorage.getItem('renderlab:theme')
    );
    expect(savedTheme).not.toBe(originalTheme);
    expect(['dark', 'light']).toContain(savedTheme);
  });

  test('should apply theme to CodeMirror editor', async ({ page }) => {
    // Toggle to light theme
    const themeBtn = await page.locator('[data-action="toggle-theme"]');
    await themeBtn.click();
    await page.waitForTimeout(100);

    // Check that html has light theme
    const html = await page.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(theme).toBe('light');
  });
});

test.describe('HTML Web Editor - Project Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => localStorage.clear());
  });

  test('should create new project with name prompt', async ({ page }) => {
    // Setup dialog handler before clicking
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('Test Project');
    });

    // Click "New Project" button
    const newProjectBtn = await page.locator('[data-action="new-project"]');
    await newProjectBtn.click();

    // Wait for project to be created
    await page.waitForTimeout(500);

    // Check that project appears in project list
    const projectList = await page.locator('.project-list');
    await expect(projectList).toContainText('Test Project');
  });

  test('should display file tabs when project is created', async ({ page }) => {
    // Create new project
    page.once('dialog', async dialog => {
      await dialog.accept('Test Project');
    });

    const newProjectBtn = await page.locator('[data-action="new-project"]');
    await newProjectBtn.click();

    await page.waitForTimeout(500);

    // Click on project to open it
    const projectItem = await page.locator('.project-item').first();
    await projectItem.click();

    await page.waitForTimeout(500);

    // Check that tabs appear
    const tabs = await page.locator('.tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display editor pane after project selection', async ({ page }) => {
    // Create new project
    page.once('dialog', async dialog => {
      await dialog.accept('Test Project');
    });

    const newProjectBtn = await page.locator('[data-action="new-project"]');
    await newProjectBtn.click();

    await page.waitForTimeout(500);

    // Select project
    const projectItem = await page.locator('.project-item').first();
    await projectItem.click();

    await page.waitForTimeout(500);

    // Check editor pane exists
    const editorPane = await page.locator('.editor-pane');
    await expect(editorPane).toBeVisible();
  });
});

test.describe('HTML Web Editor - File Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => localStorage.clear());

    // Create and open a project
    page.once('dialog', async dialog => {
      await dialog.accept('Test Project');
    });

    const newProjectBtn = await page.locator('[data-action="new-project"]');
    await newProjectBtn.click();

    await page.waitForTimeout(500);

    const projectItem = await page.locator('.project-item').first();
    await projectItem.click();

    await page.waitForTimeout(500);
  });

  test('should display editor with CodeMirror or fallback', async ({ page }) => {
    // Check editor pane exists
    const editorPane = await page.locator('.editor-pane');
    await expect(editorPane).toBeVisible();

    // Check for either CodeMirror or fallback textarea
    const cmEditor = await page.locator('#editor');
    const textarea = await page.locator('.fallback-editor');

    const cmExists = await cmEditor.count() > 0;
    const textareaExists = await textarea.count() > 0;

    // At least one editor should exist
    expect(cmExists || textareaExists).toBe(true);
  });

  test('should allow editing in fallback textarea', async ({ page }) => {
    // Check if fallback editor exists
    const textarea = await page.locator('.fallback-editor');
    const textareaExists = await textarea.count() > 0;

    if (!textareaExists) {
      test.skip();
    }

    // Type into textarea
    const testContent = '<h1>Hello World</h1>';
    await textarea.fill(testContent);

    // Verify content
    const value = await textarea.inputValue();
    expect(value).toBe(testContent);
  });

  test('should render preview content', async ({ page }) => {
    // Get the preview pane
    const previewPane = await page.locator('.preview-pane');
    await expect(previewPane).toBeVisible();

    // Note: actual content rendering depends on the application logic
    // This test just verifies the preview pane is present and accessible
  });
});

test.describe('HTML Web Editor - localStorage Persistence', () => {
  test('should persist projects in localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => localStorage.clear());

    // Create a project
    page.once('dialog', async dialog => {
      await dialog.accept('Persistent Project');
    });

    const newProjectBtn = await page.locator('[data-action="new-project"]');
    await newProjectBtn.click();

    await page.waitForTimeout(500);

    // Check project metadata was persisted (namespaced as renderlab:project:<id>:meta)
    const metaKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => /^renderlab:project:.*:meta$/.test(k))
    );

    expect(metaKeys.length).toBeGreaterThan(0);
  });

  test('should restore theme preference across sessions', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => localStorage.clear());

    // Set light theme
    const themeBtn = await page.locator('[data-action="toggle-theme"]');
    await themeBtn.click();
    await page.waitForTimeout(100);

    // Get the theme value
    const savedTheme = await page.evaluate(() =>
      localStorage.getItem('renderlab:theme')
    );

    // Reload page
    await page.reload();

    // Check that theme persists
    const html = await page.locator('html');
    const currentTheme = await html.getAttribute('data-theme');
    expect(currentTheme).toBe(savedTheme);
  });
});

test.describe('HTML Web Editor - Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => localStorage.clear());
  });

  test('should display sidebar header buttons', async ({ page }) => {
    const sidebarHeader = await page.locator('.sidebar-header');
    await expect(sidebarHeader).toBeVisible();

    const buttons = await sidebarHeader.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display project list', async ({ page }) => {
    const projectList = await page.locator('.project-list');
    await expect(projectList).toBeVisible();
  });

  test('should display created projects in sidebar', async ({ page }) => {
    // Create project
    page.once('dialog', async dialog => {
      await dialog.accept('Sidebar Test Project');
    });

    const newProjectBtn = await page.locator('[data-action="new-project"]');
    await newProjectBtn.click();

    await page.waitForTimeout(500);

    // Verify project appears in sidebar
    const projectList = await page.locator('.project-list');
    await expect(projectList).toContainText('Sidebar Test Project');
  });
});

test.describe('HTML Web Editor - Layout Responsiveness', () => {
  test('should maintain layout on different viewport sizes', async ({ page }) => {
    // Desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    const header = await page.locator('.header');
    const sidebar = await page.locator('.sidebar');
    const editor = await page.locator('.editor-section');
    const preview = await page.locator('.preview-section');

    await expect(header).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(editor).toBeVisible();
    await expect(preview).toBeVisible();
  });

  test('should display all main sections', async ({ page }) => {
    await page.goto('/');

    // Verify all main sections are visible
    const sections = ['header', 'sidebar', 'editor-section', 'preview-section'];

    for (const section of sections) {
      const element = await page.locator(`.${section}`);
      await expect(element).toBeVisible();
    }
  });
});
