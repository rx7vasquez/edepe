# Modular Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the monolithic `index.html` into a modularized application using ES6 modules.

**Architecture:** Extraction of logic into separate files: Models for data structures, Services for persistence, Views for UI rendering, and App for coordination.

**Tech Stack:** Native HTML5, CSS3, Vanilla JavaScript (ES6 Modules).

---

### Task 1: Create Project Model
**Files:**
- Create: `js/models/Project.js`

**Step 1: Write the minimal implementation**
Extract the `Project` class from `index.html:162-193`.
```javascript
export class Project {
    constructor(d) {
        this.id = d.id || Math.random().toString(36).substr(2, 9);
        this.name = d.name || '';
        this.contractId = d.contractId || '';
        this.client = d.client || '';
        this.awardDate = d.awardDate || '';
        this.term = parseInt(d.term) || 365;
        this.contractType = d.contractType || 'Precios Unitarios';
        this.codigoSafi = d.codigoSafi || '';
        this.codigoBip = d.codigoBip || '';
        this.items = d.items || [];
        this.progressEntries = d.progressEntries || [];
        this.edps = d.edps || [];
        this.annexes = d.annexes || { retentionRate: 0.10, reajusteIndex: 1.05, advanceTotal: 0, advanceReturned: 0 };
    }
    calculateTotalContract() { return (this.items || []).reduce((s, i) => s + (i.quantity * i.price), 0); }
    calculatePhysicalProgress() {
        const total = this.calculateTotalContract(); if (total === 0) return 0;
        const exec = this.items.reduce((s, i) => {
            const q = (this.progressEntries || []).filter(e => e.itemId === i.id).reduce((sq, e) => sq + parseFloat(e.quantity), 0);
            return s + (q * i.price);
        }, 0);
        return (exec / total) * 100;
    }
    getExecutedValue() {
        return (this.items || []).reduce((s, i) => {
            const q = (this.progressEntries || []).filter(e => e.itemId === i.id).reduce((sq, e) => sq + parseFloat(e.quantity), 0);
            return s + (q * i.price);
        }, 0);
    }
}
```

---

### Task 2: Create Storage Service
**Files:**
- Create: `js/services/StorageService.js`
- Modify: `js/models/Project.js` (ensure it's exported)

**Step 1: Write the minimal implementation**
Extract `Storage` object from `index.html:195-209`.
```javascript
import { Project } from '../models/Project.js';

export const StorageService = {
    save(p) { localStorage.setItem('mop_projects_v3', JSON.stringify(p)); },
    load() {
        const d = localStorage.getItem('mop_projects_v3');
        if (!d) return [];
        try {
            return JSON.parse(d).map(pj => new Project(pj));
        } catch (e) { console.error("Error load projects: " + e); return []; }
    },
    saveClients(c) { localStorage.setItem('mop_clients', JSON.stringify(c)); },
    loadClients() {
        const d = localStorage.getItem('mop_clients');
        return d ? JSON.parse(d) : [];
    }
};
```

---

### Task 3: Create Render Engine
**Files:**
- Create: `js/views/RenderEngine.js`

**Step 1: Write the minimal implementation**
Extract `App.views` contents from `index.html:538-763`.
```javascript
export const RenderEngine = {
    formatCurrency(v) { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v); },

    dashboard(pjs) {
        const total = pjs.length;
        const val = pjs.reduce((s, p) => s + p.calculateTotalContract(), 0);
        return `
        <div class="view active">
            <div class="view-header"><h1>Dashboard Global</h1><p>Control de Gestión MOP</p></div>
            <div class="stats-grid">
                <div class="stat-card"><div><h3>Contratos Activos</h3><div class="value">${total}</div></div></div>
                <div class="stat-card"><div><h3>Cartera Total</h3><div class="value">${this.formatCurrency(val)}</div></div></div>
            </div>
            <div class="items-section" style="margin-top:20px;">
                <h3>Resumen de Estados de Pago</h3>
                <p style="color:var(--text-muted); margin-top:10px;">En esta sección se visualizarán los indicadores financieros globales.</p>
            </div>
        </div>`;
    },
    // ... [Add all view functions: projects, details, clients, financial, projections, avances, project-form]
};
```

---

### Task 4: Create App Entry Point
**Files:**
- Create: `js/app.js`

**Step 1: Write the minimal implementation**
Extract `App` object logic from `index.html:211-536`. Connect it to other modules.
```javascript
import { Project } from './models/Project.js';
import { StorageService } from './services/StorageService.js';
import { RenderEngine } from './views/RenderEngine.js';

export const App = {
    projects: [],
    clients: [],
    currentView: 'dashboard',
    currentProjectId: null,
    pendingAction: null,

    init() {
        this.projects = StorageService.load();
        this.clients = StorageService.loadClients();
        this.render();
        this.setupEvents();
        document.getElementById('loading-screen').classList.add('hidden');
        console.log("Sistema Inicializado V3.");
    },

    render() {
        const container = document.getElementById('view-container');
        if (this.currentProjectId) {
            const p = this.projects.find(pj => pj.id === this.currentProjectId);
            if (!p) { this.currentProjectId = null; this.render(); return; }
            container.innerHTML = RenderEngine.details.call(RenderEngine, p);
        } else {
            const viewFn = RenderEngine[this.currentView];
            if (viewFn) {
                if (this.currentView === 'clients') container.innerHTML = viewFn.call(RenderEngine, this.clients);
                else container.innerHTML = viewFn.call(RenderEngine, this.projects);
            } else {
                container.innerHTML = `<h1>Vista no encontrada: ${this.currentView}</h1>`;
            }
        }
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.toggle('active', li.dataset.view === this.currentView));
    },

    setupEvents() {
        // ... [Include event listeners from legacy App.setupEvents]
    }
};

window.onload = () => App.init();
```

---

### Task 5: Cleanup index.html
**Files:**
- Modify: `index.html`

**Step 1: Remove script blocks and add module script**
Replace everything from line 150 to 767 in `index.html` with:
```html
<script type="module" src="js/app.js"></script>
```
