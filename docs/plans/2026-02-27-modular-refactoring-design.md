# Design: Modular Refactoring of ProyConstMOP

**Date**: 2026-02-27
**Topic**: Phase 1 Refactoring - Separation of Concerns

## Overview
Transform the monolithic `index.html` into a modularized application using ES6 modules. This will improve maintainability and enable parallel development of features.

## Architecture

### File Structure
- `js/models/Project.js`: `Project` class definition.
- `js/services/StorageService.js`: LocalStorage operations.
- `js/views/RenderEngine.js`: Template generation and DOM updates.
- `js/app.js`: Application state and event coordination.
- `index.html`: Shell and asset loading.

### Data Flow
1. **Bootstrap**: `index.html` loads `js/app.js` as `<script type="module">`.
2. **State Management**: `App` holds current project list and active view state.
3. **Storage**: `StorageService` handles sync between memory and `localStorage`.
4. **Rendering**: `RenderEngine` generates HTML strings based on state.

## Implementation Details

### Module: Project.js
```javascript
export class Project {
    constructor(data) { ... }
    calculateTotalContract() { ... }
    calculatePhysicalProgress() { ... }
}
```

### Module: StorageService.js
```javascript
import { Project } from '../models/Project.js';
export const StorageService = {
    loadProjects: () => { ... },
    saveProjects: (projects) => { ... }
};
```

### Module: app.js
```javascript
import { Project } from './models/Project.js';
import { StorageService } from './services/StorageService.js';
import { RenderEngine } from './views/RenderEngine.js';

const App = {
    init() { ... },
    handleEvent(e) { ... }
};
```

## Success Criteria
- No functionality is lost during refactoring.
- `index.html` contains < 200 lines of code.
- Successfully loading and saving projects as before.
- No console errors.
