import { EventBus, eventBus } from './EventBus.js';
import { StorageService, storageService } from './services/StorageService.js';
import { FileSystemService, fileSystemService } from './services/FileSystemService.js';
import { BlobRegistry, blobRegistry } from './services/BlobRegistry.js';
import { SecurityService, securityService } from './services/SecurityService.js';
import { ProjectManager, projectManager } from './managers/ProjectManager.js';
import { FileMapBuilder, fileMapBuilder } from './managers/FileMapBuilder.js';
import { AssetResolver, assetResolver } from './resolvers/AssetResolver.js';
import { EditorComponent, editorComponent } from './components/EditorComponent.js';
import { RendererComponent, rendererComponent } from './components/RendererComponent.js';
import { UIController, uiController } from './components/UIController.js';

const container = document.getElementById('app');

const deps = {
  eventBus,
  storageService,
  fileSystemService,
  blobRegistry,
  securityService,
  projectManager,
  fileMapBuilder,
  assetResolver,
  editorComponent,
  rendererComponent,
  uiController
};

// Wire container references
editorComponent.container = container;
rendererComponent.container = container;
uiController.container = container;

// Initialize all modules in dependency order
projectManager.init(deps);
fileMapBuilder.init(deps);
assetResolver.init(deps);
editorComponent.init(deps);
rendererComponent.init(deps);
uiController.init(deps);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  blobRegistry.revokeAll();
  eventBus.clear();
});

// Restore theme from localStorage
const savedTheme = localStorage.getItem('renderlab:theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

console.log('RenderLab initialized');
