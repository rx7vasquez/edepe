const AuthService = {
    async login(email, password) {
        try {
            const data = await ApiService.post('/auth/login', { email, password });

            // Store token and user data
            localStorage.setItem('edepe_jwt_token', data.token);
            sessionStorage.setItem('mop_current_user', JSON.stringify(data.user));

            return data.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error; // Rethrow to show error in UI
        }
    },
    async register(companyName, rut, userName, lastName, email, password) {
        return ApiService.post('/auth/register', { companyName, rut, userName, lastName, email, password });
    },
    logout() {
        localStorage.removeItem('edepe_jwt_token');
        sessionStorage.removeItem('mop_current_user');
    },
    getCurrentUser() {
        const d = sessionStorage.getItem('mop_current_user');
        return d ? JSON.parse(d) : null;
    },
    isAdmin() {
        const u = this.getCurrentUser();
        // In the new model, global is SysAdmin. Admin Cliente is company admin.
        return u && (u.role === 'Administrador' || u.role === 'SysAdmin' || u.role === 'Admin Cliente');
    },
    isSysAdmin() {
        const u = this.getCurrentUser();
        return u && u.role === 'SysAdmin';
    },
    canEditItems(project) {
        const u = this.getCurrentUser();
        if (!u) return false;
        if (u.role === 'Administrador' || u.role === 'SysAdmin' || u.role === 'Admin Cliente') return true;
        // The jwt assignedProjectIds was flattened to u.assignedProjectIds array? Usually yes if parsed correctly.
        if (u.role === 'Usuario Normal' && (u.assignedProjectIds || []).includes(project.id)) return true;
        return false;
    },
    hasProjectAccess(projectId) {
        const u = this.getCurrentUser();
        if (!u) return false;
        if (u.role === 'Administrador' || u.role === 'SysAdmin' || u.role === 'Admin Cliente') return true;
        return (u.assignedProjectIds || []).includes(projectId);
    }
};
