const AuthService = {
    login(email, password, users) {
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            sessionStorage.setItem('mop_current_user', JSON.stringify(user));
            return user;
        }
        return null;
    },
    logout() {
        sessionStorage.removeItem('mop_current_user');
    },
    getCurrentUser() {
        const d = sessionStorage.getItem('mop_current_user');
        return d ? JSON.parse(d) : null;
    },
    isAdmin() {
        const u = this.getCurrentUser();
        return u && u.role === 'Administrador';
    },
    canEditItems(project) {
        const u = this.getCurrentUser();
        if (!u) return false;
        if (u.role === 'Administrador') return true;
        if (u.role === 'Jefe de Proyecto' && u.assignedProjectIds.includes(project.id)) return true;
        return false;
    },
    hasProjectAccess(projectId) {
        const u = this.getCurrentUser();
        if (!u) return false;
        if (u.role === 'Administrador') return true;
        return u.assignedProjectIds.includes(projectId);
    }
};
