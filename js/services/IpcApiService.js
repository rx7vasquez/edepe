const API_BASE_URL = '/api/ipc';

class IpcApiService {
    /**
     * Get all IPC indices, optionally filtered by year/month
     */
    static async getAll(params = {}) {
        try {
            const url = new URL(API_BASE_URL, window.location.origin);
            Object.keys(params).forEach(key => {
                if (params[key]) url.searchParams.append(key, params[key]);
            });

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Error fetching IPC data:", error);
            throw error;
        }
    }

    /**
     * Get a specific IPC index for a given month and year
     */
    static async getExactIndex(mes, anio) {
        try {
            const data = await this.getAll({ mes, anio });
            if (data && data.length > 0) {
                return data[0]; // Exact match
            }
            return null; // Not found
        } catch (error) {
            console.error(`Error fetching exact IPC index for ${mes}/${anio}:`, error);
            throw error;
        }
    }

    /**
     * Create a new manual IPC index
     */
    static async create(payload) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Error creating IPC index:", error);
            throw error;
        }
    }

    /**
     * Update an existing IPC index
     */
    static async update(id, payload) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error updating IPC index ${id}:`, error);
            throw error;
        }
    }

    /**
     * Trigger the backend to run the web scraper (INE)
     */
    static async syncFromSource() {
        try {
            const response = await fetch(`${API_BASE_URL}/seed`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Error syncing IPC data from source:", error);
            throw error;
        }
    }
}

window.IpcApiService = IpcApiService;
