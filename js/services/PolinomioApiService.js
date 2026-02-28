class PolinomioApiService {
    static BASE_URL = '/api/polinomios';

    static async getAll(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.anio) queryParams.append('anio', params.anio);
            if (params.mes) queryParams.append('mes', params.mes);
            if (params.tipo_obra) queryParams.append('tipo_obra', params.tipo_obra);
            if (params.subtipo_obra) queryParams.append('subtipo_obra', params.subtipo_obra);

            const queryString = queryParams.toString();
            const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al obtener índices');
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async getExactIndex(mes, anio, tipo_obra, subtipo_obra) {
        try {
            const indices = await this.getAll({ mes, anio, tipo_obra, subtipo_obra });
            // Should return at most 1 element if unique constraint holds
            return indices.length > 0 ? indices[0] : null;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async seedExcel() {
        try {
            const response = await fetch(`${this.BASE_URL}/seed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al ejecutar semilla');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async create(indiceData) {
        try {
            const response = await fetch(this.BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(indiceData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al crear índice');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async update(id, indiceData) {
        try {
            const response = await fetch(`${this.BASE_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(indiceData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al actualizar índice');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}
