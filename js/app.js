const App = {
    projects: [],
    clients: [],
    users: [],
    currentView: 'dashboard',
    currentProjectId: null,
    currentUser: null,
    pendingAction: null,
    userSearchTerm: '',
    userRoleFilter: 'Todos',
    currentRecoveryEmail: null,
    recoveryView: null, // 'request' or 'reset'
    financialFilterType: 'ALL',
    financialFilterYear: 'ALL',
    financialFilterMonth: 'ALL',
    financialFilterRetention: false,

    // MOP Polinomio Subtypes Configuration
    MOP_SUBTYPES: {
        'Infraestructura vial y portuaria': ['General', 'Intensivo en mano de obra', 'Intensivo en asfalto', 'Intensivo en cemento', 'Intensivo en acero'],
        'Infraestructura Hidráulica': ['General'],
        'Infraestructura aeroportuaria': ['General', 'Conservación Mayor en asfalto', 'Conservación Mayor en hormigón', 'Conservaciones Rutinarias / Globales', 'Contratos en zonas aisladas'],
        'Edificación Pública': ['General']
    },

    async init() {
        this.currentUser = AuthService.getCurrentUser();

        if (this.currentUser) {
            try {
                this.projects = await ProjectApiService.getProjects() || [];
                this.clients = await ProjectApiService.getClients() || [];
                this.users = await ProjectApiService.getUsers() || [];

                if (AuthService.isSysAdmin()) {
                    this.companies = await ProjectApiService.getCompanies() || [];
                } else {
                    this.companies = [];
                }
            } catch (e) {
                console.error("Error inicializando datos desde API:", e);
                this.projects = [];
                this.clients = [];
                this.users = [];
                this.companies = [];
            }
        } else {
            this.projects = [];
            this.clients = [];
            this.users = [];
            this.companies = [];
        }

        this.setupEvents();
        this.render();

        // Initialize professional date display
        const dateEl = document.getElementById('current-date-display');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }

        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
        console.log("Sistema Inicializado con Seguridad SaaS.");
    },

    async saveProjectState(p) {
        if (!p) return;
        try {
            const tempId = String(p.id);
            if (p.id && !tempId.startsWith('0.') && !tempId.includes(Math.random().toString(36).substring(2, 5))) {
                await ProjectApiService.updateProject(p.id, p);
            } else {
                const res = await ProjectApiService.createProject(p);
                p.id = res.id;
            }
        } catch (e) { console.error("Error API Project", e); alert("Error guardando proyecto."); }
    },

    async saveCompanyState(companyData) {
        if (!companyData) return;
        try {
            if (companyData.id) {
                await ProjectApiService.updateCompanyStatus(companyData.id, companyData.status);
            } else {
                await ProjectApiService.createCompany(companyData);
                // Fetch fresh companies to get the new ID and user
                this.companies = await ProjectApiService.getCompanies() || [];
            }
        } catch (e) {
            console.error("Error API Company", e);
            const errBody = await e.response?.json().catch(() => ({}));
            alert("Error guardando empresa: " + (errBody?.error || e.message));
        }
    },

    async deleteUserState(id) { try { await ProjectApiService.deleteUser(id); this.users = this.users.filter(u => u.id !== id); } catch (e) { } },
    async deleteClientState(id) { try { await ProjectApiService.deleteClient(id); this.clients = this.clients.filter(c => c.id !== id); } catch (e) { } },
    async deleteProjectState(id) {
        try {
            await ProjectApiService.deleteProject(id);
            this.projects = this.projects.filter(pj => pj.id !== id);
        } catch (e) { console.error("Error API delete", e); }
    },

    async saveUserState(u) {
        if (!u) return;
        try {
            if (u.id && typeof u.id === 'number') {
                await ProjectApiService.updateUser(u.id, u);
            } else {
                const res = await ProjectApiService.createUser({ ...u, tempPassword: u.password || 'temporal123' });
                u.id = res.id;
            }
        } catch (e) {
            console.error(e);
            alert("Error guardando usuario. Quizás el correo ya esté en uso o la contraseña no es válida.");
        }
    },

    async saveClientState(c) {
        if (!c) return;
        try {
            if (c.id) {
                await ProjectApiService.updateClient(c.id, c);
            } else {
                const res = await ProjectApiService.createClient(c);
                c.id = res.id;
            }
        } catch (e) { console.error(e); }
    },

    render() {
        const main = document.getElementById('view-container');
        const sidebar = document.querySelector('.sidebar');
        if (!main || !sidebar) return;

        if (!this.currentUser) {
            sidebar.style.display = 'none';
            const topBar = document.querySelector('.top-bar');
            if (topBar) topBar.style.display = 'none';
            document.body.classList.add('login-mode');

            if (this.recoveryView === 'request') {
                main.innerHTML = RenderEngine.recovery();
            } else if (this.recoveryView === 'reset') {
                main.innerHTML = RenderEngine.reset(this.currentRecoveryEmail);
            } else if (this.loginView === 'register') {
                main.innerHTML = RenderEngine.register();
            } else {
                main.innerHTML = RenderEngine.login();
            }
            return;
        }

        sidebar.style.display = 'block';
        const topBar = document.querySelector('.top-bar');
        if (topBar) topBar.style.display = 'flex';
        document.body.classList.remove('login-mode');

        const nameEl = document.getElementById('current-user-name');
        if (nameEl) nameEl.textContent = `${this.currentUser.name} ${this.currentUser.lastName}`;
        const roleEl = document.getElementById('current-user-role');
        if (roleEl) roleEl.textContent = this.currentUser.role;

        // Update Top Bar Avatar
        const topBarAvatar = document.querySelector('#top-bar-user-profile .avatar');
        if (topBarAvatar) {
            if (this.currentUser.avatar) {
                topBarAvatar.innerHTML = `<img src="${this.currentUser.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                topBarAvatar.textContent = `${this.currentUser.name.charAt(0)}${this.currentUser.lastName ? this.currentUser.lastName.charAt(0) : ''}`;
            }
        }

        const adminLinks = document.querySelectorAll('.admin-only');
        adminLinks.forEach(l => l.style.display = AuthService.isAdmin() ? 'block' : 'none');

        const sysadminLinks = document.querySelectorAll('.sysadmin-only');
        sysadminLinks.forEach(l => l.style.display = AuthService.isSysAdmin() ? 'block' : 'none');

        document.querySelectorAll('.nav-links li').forEach(li => {
            li.classList.toggle('active', li.dataset.view === this.currentView);
        });

        const filteredProjects = AuthService.isAdmin() ?
            this.projects :
            this.projects.filter(p => (this.currentUser.assignedProjectIds || []).includes(p.id));

        const views = {
            'dashboard': () => RenderEngine.dashboard(filteredProjects),
            'proyectos': () => RenderEngine.proyectos(filteredProjects),
            'avances': () => RenderEngine.avances(filteredProjects, this.currentProjectId),
            'projections': () => RenderEngine.projections(filteredProjects),
            'clients': () => RenderEngine.clients(this.clients),
            'usuarios': () => RenderEngine.usuarios(this.users, this.projects, this.userSearchTerm, this.userRoleFilter),
            'companies': () => RenderEngine.companies(this.companies || []),
            'mantenedor-reajuste': () => RenderEngine['mantenedor-reajuste']({
                polinomioIndices: this.polinomioIndices || [],
                ipcIndices: this.ipcIndices || [],
                activeTab: this.reajusteActiveTab || 'polinomio',
                isSyncingMop: this.isSyncingIndices,
                isSyncingIpc: this.isSyncingIpc
            }),
            'financial': () => RenderEngine.financial(filteredProjects, this.currentProjectId, {
                type: this.financialFilterType,
                year: this.financialFilterYear,
                month: this.financialFilterMonth,
                hasRetention: this.financialFilterRetention
            }),
            'detalles': () => {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                return RenderEngine.details(p);
            },
            'project-form': () => {
                if (!this.clients || this.clients.length === 0) {
                    alert("Debes crear un Mandante primero en el 'Mantenedor de Mandantes' antes de configurar un nuevo proyecto.");
                    this.currentView = 'proyectos';
                    return RenderEngine.proyectos(filteredProjects);
                }
                return RenderEngine['project-form'](this.clients);
            },
            'edp-generation': () => {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                return p ? RenderEngine.edpGenerationView(p) : `<div class="view active"><h1>Error: Proyecto no encontrado para facturar</h1></div>`;
            }
        };

        if (views[this.currentView]) {
            main.innerHTML = views[this.currentView]();
        } else {
            main.innerHTML = `<div class="view active"><h1>Error: Vista "${this.currentView}" no definida</h1></div>`;
        }
    },

    setupEvents() {
        if (this.eventsAttached) return;
        this.eventsAttached = true;

        window.App = this;

        document.addEventListener('click', async (e) => {
            const target = e.target.closest('button, .nav-links li, .project-card, .btn-icon, .btn-add-progress, .btn-view-history, .btn-view-edp, .user-profile, .avance-group-header');
            if (!target) return;

            if (target.id === 'top-bar-user-profile') {
                this.showModal('user-profile', this.currentUser);
                return;
            }

            const viewAttr = target.dataset.view;
            if (viewAttr) {

                if (viewAttr === 'mantenedor-reajuste') {
                    this.currentView = viewAttr;
                    this.reajusteActiveTab = this.reajusteActiveTab || 'polinomio';
                    this.render();
                    try {
                        const [polinomio, ipc] = await Promise.all([
                            PolinomioApiService.getAll(),
                            IpcApiService.getAll()
                        ]);
                        this.polinomioIndices = polinomio;
                        this.ipcIndices = ipc;
                        this.render();
                    } catch (err) {
                        console.error("Error cargando índices:", err);
                        alert("No se pudieron cargar los índices desde el backend.");
                    }
                    return;
                }

                this.currentView = viewAttr;
                this.currentProjectId = target.dataset.projectId || null;
                this.render();
                return;
            }

            if (target.classList.contains('btn-delete-client')) {
                const index = parseInt(target.dataset.index);
                const client = this.clients[index];
                if (!client) return;

                this.showModal('confirm', {
                    title: 'Eliminar Mandante',
                    message: `¿Está seguro de que desea eliminar el mandante "${client.name}"?`,
                    onConfirm: async () => {
                        this.clients.splice(index, 1);
                        if (client.id) {
                            try {
                                await ProjectApiService.deleteClient(client.id);
                            } catch (e) {
                                console.error("Error al eliminar el cliente del backend", e);
                            }
                        }
                        this.render();
                    }
                });
                return;
            }

            if (target.classList.contains('project-card')) {
                if (e.target.closest('button')) return;
                this.currentProjectId = target.dataset.projectId;
                this.currentView = 'detalles';
                this.render();
                return;
            }

            if (target.id === 'btn-logout') {
                AuthService.logout();
                this.currentUser = null;
                this.currentView = 'dashboard';
                this.render();
                return;
            }

            if (target.id === 'btn-nuevo-usuario') { this.showModal('user'); return; }
            if (target.classList.contains('btn-edit-user')) {
                const u = this.users.find(user => user.id === target.dataset.userId);
                this.showModal('user', u);
                return;
            }
            if (target.classList.contains('btn-assign-projects')) {
                const u = this.users.find(user => user.id === target.dataset.userId);
                this.showModal('assign-projects', u);
                return;
            }
            if (target.classList.contains('btn-delete-user')) {
                const u = this.users.find(user => user.id === target.dataset.userId);
                this.showModal('confirm', {
                    title: 'Eliminar Usuario',
                    message: `¿Está seguro de que desea eliminar a ${u.name} ${u.lastName}?`,
                    onConfirm: async () => {
                        await this.deleteUserState(u.id);
                        this.render();
                    }
                });
                return;
            }

            if (target.id === 'btn-forgot-password') {
                this.recoveryView = 'request';
                this.loginView = null;
                this.render();
                return;
            }
            if (target.id === 'btn-show-register') {
                this.loginView = 'register';
                this.recoveryView = null;
                this.render();
                return;
            }
            if (target.id === 'btn-back-login') {
                this.recoveryView = null;
                this.currentRecoveryEmail = null;
                this.loginView = 'login';
                this.render();
                return;
            }

            const id = target.id;
            if (id === 'btn-back-projects') { this.currentView = 'proyectos'; this.currentProjectId = null; this.render(); return; }

            if (id === 'btn-sync-mop') {
                try {
                    this.isSyncingIndices = true;
                    this.render();

                    const res = await PolinomioApiService.seedExcel();
                    alert(`Sincronización MOP exitosa: Se actualizaron ${res.result.count} índices.`);

                    this.polinomioIndices = await PolinomioApiService.getAll();
                } catch (e) {
                    console.error("Error al sincronizar MOP:", e);
                    alert("Error al sincronizar con MOP: " + e.message);
                } finally {
                    this.isSyncingIndices = false;
                    this.render();
                }
                return;
            }

            if (id === 'btn-sync-ipc') {
                try {
                    this.isSyncingIpc = true;
                    this.render();

                    const res = await IpcApiService.syncFromSource();
                    alert(`Sincronización IPC exitosa: ${res.message}`);

                    this.ipcIndices = await IpcApiService.getAll();
                } catch (e) {
                    console.error("Error al sincronizar IPC:", e);
                    alert("Error al sincronizar con INE: " + e.message);
                } finally {
                    this.isSyncingIpc = false;
                    this.render();
                }
                return;
            }

            if (id === 'btn-close-modal' || target.classList.contains('btn-close-modal')) {
                document.getElementById('global-modal').style.display = 'none';
                return;
            }

            if (id === 'btn-add-indice') {
                this.showModal('indice-mop-form');
                return;
            }

            if (target.classList.contains('btn-edit-indice')) {
                const indiceId = parseInt(target.dataset.id);
                const indice = this.polinomioIndices.find(i => i.id === indiceId);
                if (indice) this.showModal('indice-mop-form', indice);
                return;
            }

            if (id === 'btn-add-ipc') {
                this.showModal('indice-ipc-form');
                return;
            }

            if (target.classList.contains('btn-edit-ipc')) {
                const indiceId = parseInt(target.dataset.id);
                const indice = this.ipcIndices.find(i => i.id === indiceId);
                if (indice) this.showModal('indice-ipc-form', indice);
                return;
            }

            const toggleHeader = target.closest('.avance-group-header');
            if (toggleHeader) {
                const groupKey = toggleHeader.dataset.groupToggle;
                const items = document.querySelectorAll(`tr.avance-group-item[data-group-id="${groupKey}"]`);
                const isHidden = toggleHeader.classList.contains('collapsed');

                if (isHidden) {
                    toggleHeader.classList.remove('collapsed');
                    const chevron = toggleHeader.querySelector('.avance-chevron');
                    if (chevron) chevron.style.transform = 'rotate(0deg)';
                    items.forEach(row => row.style.display = '');
                } else {
                    toggleHeader.classList.add('collapsed');
                    const chevron = toggleHeader.querySelector('.avance-chevron');
                    if (chevron) chevron.style.transform = 'rotate(-90deg)';
                    items.forEach(row => row.style.display = 'none');
                }
                return;
            }

            if (id === 'btn-nueva-empresa') { this.showModal('company-form'); return; }
            if (id === 'btn-add-client') { this.showModal('client'); return; }
            if (target.classList.contains('btn-suspend-company')) {
                const cid = parseInt(target.dataset.id);
                this.showModal('confirm', {
                    title: 'Suspender Empresa',
                    message: '¿Está seguro de suspender esta empresa? Sus usuarios ya no podrán ingresar al sistema.',
                    onConfirm: async () => {
                        await this.saveCompanyState({ id: cid, status: 'suspended' });
                        // Re-fetch companies to update UI
                        this.companies = await ProjectApiService.getCompanies() || [];
                        this.render();
                    }
                });
                return;
            }
            if (target.classList.contains('btn-activate-company')) {
                const cid = parseInt(target.dataset.id);
                this.showModal('confirm', {
                    title: 'Activar Empresa',
                    message: '¿Está seguro de (re)activar esta empresa?',
                    onConfirm: async () => {
                        await this.saveCompanyState({ id: cid, status: 'active' });
                        this.companies = await ProjectApiService.getCompanies() || [];
                        this.render();
                    }
                });
                return;
            }
            if (target.classList.contains('btn-edit-client')) {
                const index = parseInt(target.dataset.index);
                const client = { ...this.clients[index], index };
                this.showModal('edit-client', client);
                return;
            }
            if (id === 'btn-add-item') { this.showModal('item'); return; }
            if (id === 'btn-edit-project') { this.showModal('edit-project'); return; }

            // --- Venta Contractual: Lock Baseline ---
            if (id === 'btn-lock-baseline') {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                if (!p || p.items.length === 0) return;
                this.showModal('confirm', {
                    title: 'Definir Venta Contractual',
                    message: `¿Confirma que las ${p.items.length} partida(s) actuales (${RenderEngine.formatCurrency(p.calculateTotalContract(), p.currency)}) son el contrato original? Esta acción no se puede deshacer.`,
                    onConfirm: () => {
                        p.baselineItems = JSON.parse(JSON.stringify(p.items));
                        p.baselineLockedAt = new Date().toISOString();
                        p.baselineLockedBy = this.currentUser ? `${this.currentUser.name} ${this.currentUser.lastName}` : 'Sistema';
                        this.saveProjectState(p);
                        this.render();
                        document.getElementById('global-modal').style.display = 'none';
                    }
                });
                return;
            }

            // --- Register Modification ---
            if (id === 'btn-register-modification') {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                if (!p) return;
                this.showModal('contract-modification', p);
                return;
            }
            if (target.classList.contains('btn-add-progress')) {
                const pid = target.dataset.projectId || this.currentProjectId;
                const p = this.projects.find(pj => pj.id === pid);
                const item = p.items.find(i => i.id === target.dataset.itemId);
                const executedQty = (p.progressEntries || [])
                    .filter(e => e.itemId === item.id)
                    .reduce((sum, e) => sum + parseFloat(e.quantity), 0);
                this.showModal('progress', { itemId: item.id, item, executedQty, project: p });
                return;
            }
            if (target.classList.contains('btn-view-history')) {
                const pid = target.dataset.projectId || this.currentProjectId;
                const p = this.projects.find(pj => pj.id === pid);
                const item = p.items.find(i => i.id === target.dataset.itemId);
                this.showModal('progress-history', { project: p, item: item });
                return;
            }
            if (target.classList.contains('btn-view-edp')) {
                const pid = target.dataset.projectId;
                const p = this.projects.find(pj => pj.id === pid);
                const edpNum = parseInt(target.dataset.edpNumber);
                const edp = p.edps.find(e => e.number === edpNum);
                this.showModal('edp-detail', { project: p, edp: edp });
                return;
            }
            if (target.classList.contains('btn-edit-item')) {
                const pid = target.dataset.projectId || this.currentProjectId;
                const p = this.projects.find(pj => pj.id === pid);
                const item = p.items.find(i => i.id === target.dataset.itemId);
                const advancedQty = (p.progressEntries || [])
                    .filter(e => e.itemId === item.id)
                    .reduce((sum, e) => sum + parseFloat(e.quantity), 0);
                this.showModal('edit-item', { item: item, advancedQty: advancedQty, project: p });
                return;
            }
            if (target.classList.contains('btn-delete-item')) {
                const pid = target.dataset.projectId || this.currentProjectId;
                const p = this.projects.find(pj => pj.id === pid);
                const item = p.items.find(i => i.id === target.dataset.itemId);
                const hasProgress = (p.progressEntries || []).some(e => e.itemId === item.id);
                if (hasProgress) {
                    alert(`No se puede eliminar la partida "${item.id}" porque ya tiene avances registrados.`);
                } else {
                    this.showModal('confirm', {
                        title: 'Eliminar Partida',
                        message: `¿Está seguro de que desea eliminar la partida "${item.id}: ${item.name}"?`,
                        onConfirm: () => {
                            p.items = p.items.filter(i => i.id !== item.id);
                            this.saveProjectState(p);
                            this.render();
                        }
                    });
                }
                return;
            }

            if (id === 'btn-generate-edp') { this.handleGenerateEDP(); return; }
            if (id === 'btn-modal-confirm-action') {
                if (this.pendingAction) { this.pendingAction(); this.pendingAction = null; document.getElementById('global-modal').style.display = 'none'; }
                return;
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.id === 'user-search') {
                this.userSearchTerm = e.target.value;
                this.render();
                const input = document.getElementById('user-search');
                if (input) {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                }
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.id === 'user-role-filter') {
                this.userRoleFilter = e.target.value;
                this.render();
            }
            if (e.target.id === 'avances-project-select' || e.target.id === 'financial-project-select') {
                this.currentProjectId = e.target.value;
                this.render();
            }
            if (e.target.id === 'financial-filter-type') { this.financialFilterType = e.target.value; this.render(); }
            if (e.target.id === 'financial-filter-year') { this.financialFilterYear = e.target.value; this.render(); }
            if (e.target.id === 'financial-filter-month') { this.financialFilterMonth = e.target.value; this.render(); }
            if (e.target.id === 'financial-filter-retention') { this.financialFilterRetention = e.target.checked; this.render(); }

            // Handle Tipo de Obra changes to populate Subtipo
            if (e.target.id === 'indice-form-tipo' || e.target.id === 'project-tipo-reajuste') {
                const tipo = e.target.value;
                const subtipos = this.MOP_SUBTYPES[tipo] || ['General'];
                const subtipoSelect = document.getElementById(e.target.id === 'indice-form-tipo' ? 'indice-form-subtipo' : 'project-subtipo-reajuste');
                if (subtipoSelect) {
                    subtipoSelect.innerHTML = subtipos.map(st => `<option value="${st}">${st}</option>`).join('');
                }
            }
        });

        document.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            console.log(`[Form Submit] ID: ${e.target.id}`, data);

            if (e.target.id === 'login-form') {
                try {
                    const user = await AuthService.login(data.email, data.password);
                    if (user) {
                        this.currentUser = user;
                        await this.init();
                    }
                } catch (error) {
                    document.getElementById('login-error').style.display = 'block';
                }
            }

            if (e.target.id === 'register-form') {
                const btn = e.target.querySelector('button[type="submit"]');
                const errorPara = document.getElementById('register-error');

                try {
                    btn.textContent = 'Enviando...';
                    btn.disabled = true;
                    errorPara.style.display = 'none';

                    await AuthService.register(data.companyName, data.rut, data.userName, data.lastName, data.email, data.password);

                    alert('Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.');
                    this.loginView = 'login';
                    this.render();
                } catch (err) {
                    errorPara.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error: ${err.message || 'No se pudo registrar la empresa.'}`;
                    errorPara.style.display = 'block';
                    btn.textContent = 'Enviar Solicitud de Registro';
                    btn.disabled = false;
                }
            }

            if (e.target.id === 'recovery-form') {
                if (this.users.some(u => u.email === data.email)) {
                    this.currentRecoveryEmail = data.email;
                    this.recoveryView = 'reset';
                    this.render();
                } else { document.getElementById('recovery-error').style.display = 'block'; }
            }

            if (e.target.id === 'reset-form') {
                if (data.password !== data.confirmPassword) {
                    document.getElementById('reset-error').style.display = 'block';
                    return;
                }
                const u = this.users.find(u => u.email === data.email);
                if (u) {
                    u.password = data.password;
                    this.saveUserState(u);
                    alert("Contraseña actualizada con éxito.");
                    this.recoveryView = null;
                    this.render();
                }
            }

            if (e.target.id === 'company-form') {
                // Show basic loading indication
                const btn = e.target.querySelector('button[type="submit"]');
                const origText = btn.textContent;
                btn.textContent = 'Creando...';
                btn.disabled = true;

                await this.saveCompanyState({
                    name: data.name,
                    rut: data.rut,
                    adminName: data.adminName,
                    adminLastName: data.adminLastName,
                    adminEmail: data.adminEmail,
                    adminPassword: data.adminPassword,
                    status: data.status
                });

                document.getElementById('global-modal').style.display = 'none';
                this.render();
                return;
            }

            if (e.target.id === 'client-form') {
                const clientData = { rut: data.rut, name: data.name, dept: data.dept, addr: data.addr };
                if (data.clientIndex !== '') this.clients[parseInt(data.clientIndex)] = clientData;
                else this.clients.push(clientData);
                this.saveClientState(clientData);
                document.getElementById('global-modal').style.display = 'none';
                this.render();
            }

            if (e.target.id === 'contract-modification-form') {
                const p = this.projects.find(pj => pj.id === data.projectId);
                if (p) {
                    p.contractModifications.push({
                        number: parseInt(data.modNumber),
                        date: data.modDate,
                        description: data.description,
                        registeredBy: this.currentUser ? `${this.currentUser.name} ${this.currentUser.lastName}` : 'Sistema',
                        itemsSnapshot: JSON.parse(JSON.stringify(p.items))
                    });
                    this.saveProjectState(p);
                    document.getElementById('global-modal').style.display = 'none';
                    this.render();
                }
            }

            if (e.target.id === 'user-profile-form') {
                const u = this.users.find(user => user.id === this.currentUser.id);
                if (u) {
                    u.name = data.name;
                    u.lastName = data.lastName;
                    u.email = data.email;

                    const fileInput = e.target.querySelector('input[name="avatarFile"]');
                    if (fileInput && fileInput.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            u.avatar = ev.target.result;
                            this.currentUser = u;
                            this.saveUserState(u);
                            document.getElementById('global-modal').style.display = 'none';
                            this.render();
                        };
                        reader.readAsDataURL(fileInput.files[0]);
                        return; // Async save
                    } else {
                        this.currentUser = u;
                        this.saveUserState(u);
                    }
                }
                document.getElementById('global-modal').style.display = 'none';
                this.render();
            }

            if (e.target.id === 'user-form') {
                if (data.userId) {
                    const u = this.users.find(user => user.id === data.userId);
                    Object.assign(u, data);
                    if (data.password) u.password = data.password;
                } else this.users.push(new User(data));
                this.saveUserState(u);
                document.getElementById('global-modal').style.display = 'none';
                this.render();
            }

            if (e.target.id === 'assign-projects-form') {
                const u = this.users.find(user => user.id === data.userId);
                const assigned = [];
                e.target.querySelectorAll('input[name="projects"]:checked').forEach(cb => assigned.push(cb.value));
                u.assignedProjects = assigned;
                this.saveUserState(u);
                document.getElementById('global-modal').style.display = 'none';
                this.render();
            }

            if (e.target.id === 'indice-mop-form') {
                try {
                    const btn = e.target.querySelector('button[type="submit"]');
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

                    const payload = {
                        anio: parseInt(data.anio),
                        mes: parseInt(data.mes),
                        tipo_obra: data.tipo_obra,
                        subtipo_obra: data.subtipo_obra,
                        indice: parseFloat(data.indice)
                    };

                    if (data.id) {
                        await PolinomioApiService.update(data.id, payload);
                    } else {
                        await PolinomioApiService.create(payload);
                    }

                    document.getElementById('global-modal').style.display = 'none';
                    this.isSyncingIndices = true;
                    this.render();

                    this.polinomioIndices = await PolinomioApiService.getAll();
                } catch (err) {
                    console.error("Error guardando índice MOP:", err);
                    alert("Error: " + err.message);
                } finally {
                    this.isSyncingIndices = false;
                    this.render();
                }
                return;
            }

            if (e.target.id === 'indice-ipc-form') {
                try {
                    const btn = e.target.querySelector('button[type="submit"]');
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

                    const payload = {
                        anio: parseInt(data.anio),
                        mes: parseInt(data.mes),
                        valor: parseFloat(data.valor),
                        variacion_mensual: data.variacion_mensual ? parseFloat(data.variacion_mensual) : null
                    };

                    if (data.id) {
                        await IpcApiService.update(data.id, payload);
                    } else {
                        await IpcApiService.create(payload);
                    }

                    document.getElementById('global-modal').style.display = 'none';
                    this.isSyncingIpc = true;
                    this.render();

                    this.ipcIndices = await IpcApiService.getAll();
                } catch (err) {
                    console.error("Error guardando índice IPC:", err);
                    alert("Error: " + err.message);
                } finally {
                    this.isSyncingIpc = false;
                    this.render();
                }
                return;
            }

            if (e.target.id === 'project-form') {
                const newProject = new Project({ ...data, currency: data.currency });
                newProject.annexes.retentionRate = parseFloat(data.retentionRate) || 0.1;
                newProject.annexes.retentionCapRate = parseFloat(data.retentionCapRate) || 0.05;
                newProject.annexes.advanceTotal = parseFloat(data.advanceTotal) || 0;
                newProject.annexes.reajusteIndex = parseFloat(data.reajusteIndex) || 100.0000;
                newProject.annexes.tipoReajuste = data.currency === 'UF' ? 'Ninguno' : (data.tipoReajuste || 'Polinomio');
                newProject.annexes.tipo_obra = data.tipo_obra || 'Edificación Pública';
                newProject.annexes.subtipo_obra = data.subtipo_obra || 'General';
                this.projects.push(newProject);
                this.saveProjectState(p);
                this.currentView = 'proyectos';
                this.render();
            }

            if (e.target.id === 'edit-project-form') {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                Object.assign(p, data);
                // Ensure annexes are updated with retention rates and polinomios
                p.annexes.retentionRate = parseFloat(data.retentionRate);
                p.annexes.retentionCapRate = parseFloat(data.retentionCapRate);
                p.annexes.reajusteIndex = parseFloat(data.reajusteIndex) || 100.0000;
                p.annexes.tipoReajuste = data.currency === 'UF' ? 'Ninguno' : (data.tipoReajuste || p.annexes.tipoReajuste || 'Polinomio');
                p.annexes.tipo_obra = data.tipo_obra || p.annexes.tipo_obra;
                p.annexes.subtipo_obra = data.subtipo_obra || p.annexes.subtipo_obra;
                this.saveProjectState(p);
                document.getElementById('global-modal').style.display = 'none';
                this.render();
            }

            if (e.target.id === 'item-form') {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                const newItem = {
                    id: data.itemId,
                    name: data.name,
                    unit: data.unit,
                    classification: data.classification,
                    quantity: parseFloat(data.quantity),
                    price: parseFloat(data.price),
                    itemType: data.itemType || null  // null = pre-baseline (will be 'Original' when baseline locked)
                };
                p.items.push(newItem);
                this.saveProjectState(p);
                document.getElementById('global-modal').style.display = 'none';
                this.render();
            }

            if (e.target.id === 'edit-item-form') {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                const index = p.items.findIndex(i => i.id === data.oldItemId);
                if (index !== -1) {
                    const newQty = parseFloat(data.quantity);
                    const adv = parseFloat(data.advancedQty) || 0;
                    if (newQty < adv) { alert(`Error: Cantidad menor al avance acumulado de ${adv} ${p.items[index].unit}.`); return; }

                    // RCOP hard 30% per-item block
                    const baseQty = p.getItemBaselineQty(data.oldItemId);
                    if (baseQty !== null && newQty > baseQty) {
                        const pctIncrease = ((newQty - baseQty) / baseQty * 100);
                        const maxAllowed = Math.floor(baseQty * 1.30 * 100) / 100;
                        if (pctIncrease > 30) {
                            this.showModal('confirm', {
                                title: '⛔ Límite RCOP — Máximo 30% por Partida',
                                message: `La cantidad ingresada (${newQty} ${p.items[index].unit}) supera el límite del 30% establecido por el RCOP.\n\n• Cantidad original: ${baseQty} ${p.items[index].unit}\n• Máximo permitido: ${maxAllowed} ${p.items[index].unit} (+30%)\n• Cantidad ingresada: ${newQty} ${p.items[index].unit} (+${pctIncrease.toFixed(1)}%)\n\nPara cantidades adicionales por encima del 30%, debe crear una "Partida Convenida" desde el botón "+ Partida".`,
                                onConfirm: null  // No action — only close button matters
                            });
                            // Override confirm button to just close modal (no save)
                            setTimeout(() => {
                                const btn = document.getElementById('btn-modal-confirm-action');
                                if (btn) {
                                    btn.textContent = 'Entendido';
                                    btn.style.background = 'var(--primary)';
                                    btn.onclick = () => {
                                        document.getElementById('global-modal').style.display = 'none';
                                    };
                                }
                            }, 50);
                            return; // Block save
                        }
                    }

                    // Within limit → save
                    p.items[index] = { ...p.items[index], id: data.itemId, name: data.name, unit: data.unit, classification: data.classification, quantity: newQty, price: parseFloat(data.price) };
                    this.saveProjectState(p);
                    document.getElementById('global-modal').style.display = 'none';
                    this.render();
                } else {
                    this.render();
                }
            }

            if (e.target.id === 'progress-form') {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                p.progressEntries.push({
                    itemId: data.itemId,
                    quantity: parseFloat(data.quantity),
                    date: new Date().toISOString(),
                    registeredBy: this.currentUser ? `${this.currentUser.name} ${this.currentUser.lastName}` : 'Sistema'
                });
                this.saveProjectState(p);
                document.getElementById('global-modal').style.display = 'none';
                this.render();
            }

            if (e.target.id === 'edp-generation-form') {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                const type = data.type;
                let val = 0;
                let ret = 0;
                let items = [];
                let r = 0; // Se calculará abajo si aplica

                if (type === 'Avance de Obra') {
                    for (const [k, v] of Object.entries(data)) {
                        if (k.startsWith('qty_')) {
                            const qty = parseFloat(v);
                            if (qty > 0) {
                                const it = p.items.find(i => i.id === k.replace('qty_', ''));
                                items.push({ itemId: it.id, quantity: qty, value: qty * it.price, name: it.name, unit: it.unit, price: it.price });
                                val += qty * it.price;
                            }
                        }
                    }
                    if (val === 0) {
                        alert("No hay montos físicos para generar el EDP de Avance.");
                        return;
                    }

                    // ====== CÁLCULO DE REAJUSTE ======
                    const tipoReajuste = p.currency === 'UF' ? 'Ninguno' : (p.annexes.tipoReajuste || 'Polinomio');
                    const edpDate = new Date(data.date || new Date());
                    const edpMes = edpDate.getMonth() + 1;
                    const edpAnio = edpDate.getFullYear();

                    if (tipoReajuste === 'Ninguno') {
                        r = 0; // No hay reajuste
                    } else if (tipoReajuste === 'IPC') {
                        let btnSubmit = null;
                        try {
                            btnSubmit = e.target.querySelector('button[type="submit"]');
                            if (btnSubmit) {
                                btnSubmit.disabled = true;
                                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando Índice IPC...';
                            }

                            const indiceData = await IpcApiService.getExactIndex(edpMes, edpAnio);

                            if (!indiceData) {
                                throw new Error(`El índice IPC para [Mes ${edpMes} - Año ${edpAnio}] no está en la BBDD. Sincronice con INE en "Mantenedor IPC".`);
                            }

                            const baseIndice = parseFloat(p.annexes.reajusteIndex || 100);
                            const factorVariacion = Math.max(0, (indiceData.valor - baseIndice) / baseIndice);
                            r = val * factorVariacion;
                        } catch (err) {
                            alert(err.message);
                            if (btnSubmit) {
                                btnSubmit.disabled = false;
                                btnSubmit.textContent = 'Generar Estado de Pago';
                            }
                            return; // ABORT CREATION
                        } finally {
                            if (btnSubmit) {
                                btnSubmit.disabled = false;
                                btnSubmit.innerHTML = 'Generar Estado de Pago';
                            }
                        }
                    } else if (tipoReajuste === 'Polinomio') {
                        let btnSubmit = null;
                        try {
                            btnSubmit = e.target.querySelector('button[type="submit"]');
                            if (btnSubmit) {
                                btnSubmit.disabled = true;
                                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando Índice MOP...';
                            }

                            const tipoObra = p.annexes.tipo_obra || 'Edificación Pública';
                            const subtipoObra = p.annexes.subtipo_obra || 'General';

                            const indiceData = await PolinomioApiService.getExactIndex(edpMes, edpAnio, tipoObra, subtipoObra);

                            if (!indiceData) {
                                throw new Error(`El índice MOP de reajuste para [Mes ${edpMes} - Año ${edpAnio}] Tipo [${tipoObra} - ${subtipoObra}] no está tabulado en la BBDD Histórica. Solicite a un administrador que lo agregue desde "Mantenedor Reajustes" o sincronice con el Excel.`);
                            }

                            // Factor MOP simplificado = Indice Mes Cobro / Indice Mes Presupuesto
                            const baseIndice = parseFloat(p.annexes.reajusteIndex || 100);
                            const factorVariacion = Math.max(0, (indiceData.indice - baseIndice) / baseIndice);
                            r = val * factorVariacion; // Reajuste

                        } catch (err) {
                            alert(err.message);
                            if (btnSubmit) {
                                btnSubmit.disabled = false;
                                btnSubmit.textContent = 'Generar Estado de Pago';
                            }
                            return; // ABORT CREATION
                        } finally {
                            if (btnSubmit) {
                                btnSubmit.disabled = false;
                                btnSubmit.innerHTML = 'Generar Estado de Pago';
                            }
                        }
                    }
                    // ===================================

                    // Retention logic with cap
                    const accRet = p.getAccumulatedRetention();
                    const cap = p.calculateRetentionCap();
                    const remainingToCap = Math.max(0, cap - accRet);
                    ret = Math.min(val * (p.annexes.retentionRate || 0.1), remainingToCap);
                } else if (type === 'Anticipo') {
                    val = parseFloat(data.advanceAmount) || 0;
                    if (val <= 0) return alert("Ingrese un monto de anticipo válido.");
                    ret = 0;
                } else if (type === 'Devolución de Retenciones') {
                    val = parseFloat(data.returnAmount) || 0;
                    if (val <= 0) return alert("Ingrese un monto a devolver válido.");
                    const accRet = p.getAccumulatedRetention();
                    if (val > accRet) return alert("El monto excede la retención acumulada disponible.");
                    ret = 0; // We don't "retain" from a return, rather the liquid is the return itself.
                }

                p.edps.push({
                    id: Date.now(),
                    number: p.edps.length + 1,
                    type: type,
                    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
                    items,
                    workValue: val,
                    reajuste: r,
                    retention: ret,
                    net: val - ret + r
                });

                this.saveProjectState(p);
                this.currentView = 'financial';
                this.render();
            }
        });
    },

    handleGenerateEDP() {
        const p = this.projects.find(pj => pj.id === this.currentProjectId);
        if (!p) return alert("Seleccione un proyecto para generar un Estado de Pago.");
        this.currentView = 'edp-generation';
        this.render();
        setTimeout(() => this.setupEdpListeners(p), 0);
    },

    setupEdpListeners(p) {
        const retentionRate = p.annexes.retentionRate;
        const accumulatedRetention = p.getAccumulatedRetention();
        const retentionCap = p.calculateRetentionCap();
        const formatCurrency = RenderEngine.formatCurrency.bind(RenderEngine);

        const typeSelector = document.getElementById('edp-type-selector');
        const secAvance = document.getElementById('section-avance');
        const secAnticipo = document.getElementById('section-anticipo');
        const secDevolucion = document.getElementById('section-devolucion');
        const retRow = document.getElementById('retention-row');
        const retInfo = document.getElementById('retention-info');

        if (!typeSelector) return;

        const updateTotals = () => {
            const type = typeSelector.value;
            let totalBruto = 0;
            let retention = 0;
            const reajuste = p.currency === 'UF' ? 0 : (parseFloat(document.querySelector('input[name="reajuste"]').value) || 0);

            if (type === 'Avance de Obra') {
                document.querySelectorAll('.edp-item-input').forEach(inp => {
                    totalBruto += (parseFloat(inp.value) || 0) * parseFloat(inp.dataset.price);
                });
                const remainingToCap = Math.max(0, retentionCap - accumulatedRetention);
                retention = Math.min(totalBruto * retentionRate, remainingToCap);
                if (retRow) retRow.style.display = 'flex';
                if (retInfo) retInfo.style.display = 'block';
            } else if (type === 'Anticipo') {
                totalBruto = parseFloat(document.querySelector('input[name="advanceAmount"]').value) || 0;
                retention = 0;
                if (retRow) retRow.style.display = 'none';
                if (retInfo) retInfo.style.display = 'none';
            } else if (type === 'Devolución de Retenciones') {
                totalBruto = parseFloat(document.querySelector('input[name="returnAmount"]').value) || 0;
                retention = 0;
                if (retRow) retRow.style.display = 'none';
                if (retInfo) retInfo.style.display = 'none';
            }

            const liquido = totalBruto - retention + reajuste;
            const btn = document.getElementById('btn-submit-edp');

            const reajusteEl = document.getElementById('edp-total-reajuste');

            document.getElementById('edp-total-bruto').textContent = formatCurrency(totalBruto, p.currency);
            document.getElementById('edp-total-retention').textContent = '-' + formatCurrency(retention, p.currency);
            if (reajusteEl) reajusteEl.textContent = formatCurrency(reajuste, p.currency);
            document.getElementById('edp-total-liquido').textContent = formatCurrency(liquido, p.currency);

            if (btn) btn.disabled = (totalBruto <= 0 && reajuste === 0 && type !== 'Avance de Obra');
        };

        typeSelector.addEventListener('change', () => {
            const val = typeSelector.value;
            if (secAvance) secAvance.style.display = val === 'Avance de Obra' ? 'block' : 'none';
            if (secAnticipo) secAnticipo.style.display = val === 'Anticipo' ? 'block' : 'none';
            if (secDevolucion) secDevolucion.style.display = val === 'Devolución de Retenciones' ? 'block' : 'none';
            updateTotals();
        });

        document.querySelectorAll('.edp-item-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = e.target.name.replace('qty_', '');
                const price = parseFloat(e.target.dataset.price);
                const qty = parseFloat(e.target.value) || 0;
                const subEl = document.getElementById('subtotal_' + id);
                if (subEl) subEl.textContent = formatCurrency(qty * price);
                updateTotals();
            });
        });

        const reajusteInp = document.querySelector('input[name="reajuste"]');
        const advanceInp = document.querySelector('input[name="advanceAmount"]');
        const returnInp = document.querySelector('input[name="returnAmount"]');

        if (reajusteInp) reajusteInp.addEventListener('input', updateTotals);
        if (advanceInp) advanceInp.addEventListener('input', updateTotals);
        if (returnInp) returnInp.addEventListener('input', updateTotals);

        updateTotals();
    },

    showModal(type, data) {
        const m = document.getElementById('global-modal');
        const b = document.getElementById('modal-body');
        if (!m || !b) return;
        m.style.display = 'flex';

        const templates = {
            'confirm': () => `
                <div style="text-align:center; padding:10px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:3rem; color:var(--accent); margin-bottom:20px;"></i>
                    <h2>${data.title}</h2><p>${data.message}</p>
                    <div style="display:flex; gap:15px; justify-content:center; margin-top:20px;">
                        <button class="btn-secondary btn-close-modal">Cancelar</button>
                        <button class="btn-primary" id="btn-modal-confirm-action" style="background:var(--danger);">Confirmar</button>
                    </div>
                </div>`,
            'user': () => RenderEngine['user-form'](data),
            'user-profile': () => RenderEngine['user-profile'](data),
            'assign-projects': () => RenderEngine['assign-projects'](data, this.projects),
            'contract-modification': () => RenderEngine['contract-modification'](data),
            'client': () => RenderEngine['client-form'](),
            'edit-client': () => RenderEngine['client-form'](data),
            'item': () => {
                const p = this.projects.find(pj => pj.id === this.currentProjectId);
                const hasBaseline = p && p.hasBaseline();
                const typeSelector = hasBaseline ? `
                    <div class="full-width" style="margin-bottom:10px; padding:14px; border-radius:10px; border:1px solid rgba(245,158,11,0.4); background:rgba(245,158,11,0.06);">
                        <label style="font-weight:600; margin-bottom:8px; display:block;">⚠ Proyecto con Baseline definido — Tipo de Partida</label>
                        <select name="itemType" required style="width:100%;">
                            <option value="Convenida">Partida Convenida (absorbe exceso &gt;30% de ítem existente)</option>
                            <option value="Extraordinaria">Partida Extraordinaria (obra nueva fuera del presupuesto original)</option>
                        </select>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">Por RCOP, toda nueva partida debe clasificarse como Convenida o Extraordinaria.</p>
                    </div>` : '';
                return `
                <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2>Añadir Partida</h2><button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button></div>
                <form id="item-form" class="mop-form">
                    ${typeSelector}
                    <div class="mop-form-grid">
                        <div><label>Ítem</label><input type="text" name="itemId" required></div>
                        <div><label>Unidad</label><input type="text" name="unit" required></div>
                        <div class="full-width"><label>Clasificación</label><select name="classification" required><option value="Periódica">Periódica</option><option value="Rutinaria">Rutinaria</option><option value="Nivel de Servicio">Nivel de Servicio</option></select></div>
                        <div class="full-width"><label>Descripción</label><input type="text" name="name" required></div>
                        <div><label>Cantidad</label><input type="number" step="0.01" name="quantity" required></div>
                        <div><label>P. Unitario</label><input type="number" name="price" required></div>
                    </div>
                    <button type="submit" class="btn-primary full-width">Guardar Ítem</button>
                </form>`;
            },
            'progress': () => {
                const item = data.item;
                const ejec = data.executedQty || 0;
                const total = item ? item.quantity : 0;
                const saldo = Math.max(0, total - ejec);
                const pct = total > 0 ? Math.min(100, (ejec / total) * 100) : 0;
                const pctColor = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--accent)' : 'var(--secondary)';
                const infoCard = item ? `
                    <div style="background:var(--bg-dark); border-radius:10px; padding:16px; margin-bottom:18px; border:1px solid var(--border);">
                        <div style="font-size:0.82rem; color:var(--text-muted); font-weight:600; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.04em;">${item.id} — ${item.name}</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
                            <div style="text-align:center;">
                                <div style="font-size:0.75rem; color:var(--text-muted);">Total</div>
                                <div style="font-size:1.15rem; font-weight:800;">${total} ${item.unit}</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:0.75rem; color:var(--text-muted);">Ejec.</div>
                                <div style="font-size:1.15rem; font-weight:800; color:${pctColor};">${ejec} ${item.unit}</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:0.75rem; color:var(--text-muted);">Saldo</div>
                                <div style="font-size:1.15rem; font-weight:800; color:${saldo === 0 ? 'var(--danger)' : 'var(--primary)'};">${saldo.toFixed(2)} ${item.unit}</div>
                            </div>
                        </div>
                        <div style="background:var(--border); border-radius:99px; height:6px; overflow:hidden;">
                            <div style="height:100%; width:${pct}%; background:${pctColor}; border-radius:99px; transition:width 0.3s;"></div>
                        </div>
                        <div style="text-align:right; font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${pct.toFixed(1)}% ejecutado</div>
                    </div>` : '';
                return `
                <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2>Añadir Avance</h2><button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button></div>
                <form id="progress-form" class="mop-form">
                    <input type="hidden" name="itemId" value="${data.itemId}">
                    ${infoCard}
                    <div class="full-width">
                        <label>Avance Acumulado (Cantidad) — Máx. ${total} ${item ? item.unit : ''}</label>
                        <input type="number" step="0.01" name="quantity" required autofocus min="${ejec}" max="${total}" placeholder="Ingrese la cantidad acumulada total ejecutada">
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;"><i class="fas fa-info-circle"></i> Ingrese la cantidad <b>acumulada total</b> ejecutada a la fecha, no el incremento.</p>
                    <button type="submit" class="btn-primary full-width" style="margin-top:16px;">Registrar Avance</button>
                </form>`;
            },
            'edit-item': () => RenderEngine['edit-item-form'](data.item, data.advancedQty, data.project),
            'edit-project': () => RenderEngine['edit-project-form'](this.projects.find(pj => pj.id === this.currentProjectId), this.clients),
            'progress-history': () => {
                const history = data.project.progressEntries.filter(e => e.itemId === data.item.id).sort((a, b) => new Date(b.date) - new Date(a.date));
                return `
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                        <div><h2>Historial de Avances</h2><p>${data.item.id}: ${data.item.name}</p></div>
                        <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
                    </div>
                    <table class="mop-table">
                        <thead><tr><th>Fecha</th><th>Cantidad</th><th>Registrado por</th></tr></thead>
                        <tbody>${history.map(h => `<tr><td>${new Date(h.date).toLocaleString('es-CL')}</td><td>${h.quantity}</td><td style="color:var(--text-muted); font-size:0.85rem;"><i class="fas fa-user" style="margin-right:4px;"></i>${h.registeredBy || '—'}</td></tr>`).join('') || '<tr><td colspan="3">No hay registros</td></tr>'}</tbody>
                    </table>`;
            },
            'edp-detail': () => RenderEngine['edp-detail-modal'](data.project, data.edp),
            'indice-mop-form': () => RenderEngine['indice-mop-form'](data, this.MOP_SUBTYPES),
            'indice-ipc-form': () => RenderEngine['indice-ipc-form'](data)
        };

        if (templates[type]) {
            b.innerHTML = templates[type]();
            if (type === 'confirm') this.pendingAction = data.onConfirm;
            // Wide modal for types that need more space
            const mc = m.querySelector('.modal-content');
            if (mc) mc.classList.toggle('modal-wide', type === 'edp-detail');
        }
    },

    setReajusteTab(tab) {
        this.reajusteActiveTab = tab;
        this.render();
    }
};

window.onload = () => App.init();

