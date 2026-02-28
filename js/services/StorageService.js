const StorageService = {
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
    },
    saveUsers(u) { localStorage.setItem('mop_users', JSON.stringify(u)); },
    loadUsers() {
        const d = localStorage.getItem('mop_users');
        if (!d) {
            // Initialize default admin
            const defaultAdmin = new User({
                name: 'Admin',
                lastName: 'Sistema',
                email: 'admin@mop.cl',
                password: 'admin',
                position: 'Administrador de Sistema',
                role: 'Administrador'
            });
            const users = [defaultAdmin];
            this.saveUsers(users);
            return users;
        }
        return JSON.parse(d).map(u => new User(u));
    }
};
