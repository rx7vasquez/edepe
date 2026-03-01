const ApiService = {
    // Base URL dinámica
    baseUrl: window.location.origin + '/api',

    getToken() {
        return localStorage.getItem('edepe_jwt_token');
    },

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);

            // Handle 401 Unauthorized globally
            if (response.status === 401) {
                console.warn('Unauthorized access. Token expired or invalid.');
                localStorage.removeItem('edepe_jwt_token');
                sessionStorage.removeItem('mop_current_user');
                window.location.reload();
                throw new Error('No autorizado. Por favor inicie sesión nuevamente.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en la petición API');
            }

            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error; // Rethrow to be handled by specific services/components
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};
