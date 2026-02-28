const db = require('../db/database');

class EDPService {
    /**
     * Valida que exista el índice de reajuste para un mes y año y lo retorna.
     * @param {number} mes - Mes (1-12)
     * @param {number} anio - Año
     * @returns {number} El índice principal para el periodo
     */
    static getReajusteParaEDP(mes, anio) {
        if (!mes || !anio) {
            throw new Error('Mes y Año son requeridos para la consulta de reajuste.');
        }

        const stmt = db.prepare(`SELECT indice FROM PolinomioIndex WHERE anio = ? AND mes = ?`);
        const result = stmt.get(anio, mes);

        if (!result) {
            // Error estricto solicitado si no está tabulado el índice
            const msg = `El índice de reajuste para [Mes ${mes}/Año ${anio}] aún no está tabulado en el sistema.`;
            console.error(msg);
            throw new Error(msg);
        }

        return result.indice;
    }
}

module.exports = EDPService;
