const ProjectApiService = {
    // Proyectos
    async getProjects() {
        return ApiService.get('/projects');
    },
    async getProjectById(id) {
        return ApiService.get(`/projects/${id}`);
    },
    async createProject(projectData) {
        return ApiService.post('/projects', projectData);
    },
    async updateProject(id, projectData) {
        return ApiService.put(`/projects/${id}`, projectData);
    },
    async deleteProject(id) {
        return ApiService.delete(`/projects/${id}`);
    },

    // Mandantes (Clients)
    async getClients() {
        return ApiService.get('/clients');
    },
    async createClient(clientData) {
        return ApiService.post('/clients', clientData);
    },
    async updateClient(id, clientData) {
        return ApiService.put(`/clients/${id}`, clientData);
    },
    async deleteClient(id) {
        return ApiService.delete(`/clients/${id}`);
    },

    // Usuarios del Tenant
    async getUsers() {
        return ApiService.get('/users');
    },
    async createUser(userData) {
        return ApiService.post('/users', userData);
    },
    async updateUser(id, userData) {
        return ApiService.put(`/users/${id}`, userData);
    },
    async deleteUser(id) {
        return ApiService.delete(`/users/${id}`);
    },

    // Compañías (SaaS Tenant Management - SysAdmin Only)
    async getCompanies() {
        return ApiService.get('/companies');
    },
    async createCompany(data) {
        return ApiService.post('/companies', data);
    },
    async updateCompanyStatus(id, status) {
        return ApiService.put(`/companies/${id}/status`, { status });
    }
};
