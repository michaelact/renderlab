# HTML Web Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a fully client-side, multi-file HTML/CSS/JS editor with live preview, localStorage + File System Access API storage, and security-hardened asset resolution.

**Architecture:** Core is an EventBus pub/sub system connecting 10 focused modules (3 services, 2 managers, 1 resolver, 2 components, 1 UI controller) with no direct module-to-module imports. Render pipeline: FileMap → AssetResolver → blob: URL → iframe. All state lives in backing services, not in processes.

**Tech Stack:** Vanilla ES Modules, Vite, CodeMirror 6, File System Access API (Chrome 86+), localStorage, iframe sandboxing, CSS Grid/Flexbox.

---

## File Structure

renderlab/
├── index.html
├── styles/
│   ├── base.css
│   ├── layout.css
│   └── components.css
├── src/
│   ├── main.js
│   ├── EventBus.js
│   ├── services/
│   │   ├── StorageService.js
│   │   ├── FileSystemService.js
│   │   ├── BlobRegistry.js
│   │   └── SecurityService.js
│   ├── managers/
│   │   ├── ProjectManager.js
│   │   └── FileMapBuilder.js
│   ├── resolvers/
│   │   └── AssetResolver.js
│   └── components/
│       ├── EditorComponent.js
│       ├── RendererComponent.js
│       └── UIController.js
├── assets/
│   └── icons/
├── vite.config.js
└── package.json

---

## Task Summary (21 tasks total)

- Task 1: Project setup (package.json, vite.config.js)
- Task 2: EventBus module
- Task 3: SecurityService module
- Task 4: BlobRegistry module
- Task 5: StorageService module
- Task 6: FileSystemService module
- Task 7: FileMapBuilder manager
- Task 8: ProjectManager manager
- Task 9: AssetResolver resolver
- Task 10: EditorComponent
- Task 11: RendererComponent
- Task 12: UIController
- Task 13: base.css styles
- Task 14: layout.css styles
- Task 15: components.css styles
- Task 16: index.html shell
- Task 17: src/main.js entry point
- Task 18: SVG icons
- Task 19: Dev server test
- Task 20: File System API test
- Task 21: Build and distribution test

Full task details available in subagent-driven execution. Each task includes:
- Exact file paths
- Complete code implementations
- Verification steps
- Expected outputs
- Commit commands

---

## Execution Instructions

**For Subagent-Driven Execution:**
Use superpowers:subagent-driven-development to execute tasks sequentially.
Each task is bite-sized (2-5 min per task). Review checkpoints between tasks.

**For Inline Execution:**
Use superpowers:executing-plans for batch execution with your feedback at checkpoints.

**Ready to proceed. Which execution method?**
