const API_BASE_URL = '/ipc';

class IpcApiService {
    /**
     * Get all IPC indices, optionally filtered by year/month
     */
    static async getAll(params = {}) {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key]) queryParams.append(key, params[key]);
        });

        const queryString = queryParams.toString();
        const endpoint = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;

        return ApiService.get(endpoint);
    }

    /**
     * Get a specific IPC index for a given month and year
     */
    static async getExactIndex(mes, anio) {
        const data = await this.getAll({ mes, anio });
        return (data && data.length > 0) ? data[0] : null;
    }

    /**
     * Create a new manual IPC index
     */
    static async create(payload) {
        return ApiService.post(API_BASE_URL, payload);
    }

    /**
     * Update an existing IPC index
     */
    static async update(id, payload) {
        return ApiService.put(`${API_BASE_URL}/${id}`, payload);
    }

    /**
     * Trigger the backend to run the web scraper (INE)
     */
    static async syncFromSource() {
        return ApiService.post(`${API_BASE_URL}/seed`, {});
    }
}

window.IpcApiService = IpcApiService;
