class PolinomioApiService {
    static BASE_URL = '/polinomios';

    static async getAll(params = {}) {
        const queryParams = new URLSearchParams();
        if (params.anio) queryParams.append('anio', params.anio);
        if (params.mes) queryParams.append('mes', params.mes);
        if (params.tipo_obra) queryParams.append('tipo_obra', params.tipo_obra);
        if (params.subtipo_obra) queryParams.append('subtipo_obra', params.subtipo_obra);

        const queryString = queryParams.toString();
        const endpoint = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL;

        return ApiService.get(endpoint);
    }

    static async getExactIndex(mes, anio, tipo_obra, subtipo_obra) {
        const indices = await this.getAll({ mes, anio, tipo_obra, subtipo_obra });
        return indices.length > 0 ? indices[0] : null;
    }

    static async seedExcel() {
        return ApiService.post(`${this.BASE_URL}/seed`, {});
    }

    static async create(indiceData) {
        return ApiService.post(this.BASE_URL, indiceData);
    }

    static async update(id, indiceData) {
        return ApiService.put(`${this.BASE_URL}/${id}`, indiceData);
    }
}
