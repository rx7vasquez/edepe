const axios = require('axios');
const xlsx = require('xlsx');
const { query, getDriver, IS_POSTGRES } = require('../db/database');

const EXCEL_URL = 'https://planeamiento.mop.gob.cl/uploads/sites/12/2024/08/serie_indices-reajuste-polinomico-MOP-18.xls';

const MONTH_MAP = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

class PolinomioScraperService {
    static async seedDatabase() {
        console.log('🔄 Descargando archivo Excel desde el MOP...');
        const response = await axios.get(EXCEL_URL, { responseType: 'arraybuffer' });

        console.log('📊 Parseando archivo Excel...');
        const workbook = xlsx.read(response.data, { type: 'buffer' });
        const sheetName = 'serie indices MOP';
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error(`La hoja "${sheetName}" no existe en el archivo descargado.`);

        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 4, defval: null });

        const rowsToInsert = [];
        for (const row of data) {
            if (!row || row.length < 5) continue;

            const rawAnio = row[0]; const rawMes = row[1];
            const rawTipo = row[2]; const rawSubtipo = row[3]; const rawIndice = row[4];

            const anio = parseInt(rawAnio);
            if (isNaN(anio) || anio < 1900 || anio > 2100) continue;

            let mes;
            if (typeof rawMes === 'number') mes = rawMes;
            else if (typeof rawMes === 'string') mes = MONTH_MAP[rawMes.toLowerCase().trim()];
            if (!mes || mes < 1 || mes > 12) continue;

            const indiceValue = parseFloat(rawIndice);
            if (isNaN(indiceValue)) continue;

            let tipo = (rawTipo || 'General').trim();
            let subtipo = (rawSubtipo || 'General').trim();

            if (tipo.toLowerCase().includes('vial') || tipo.toLowerCase().includes('portuaria')) {
                tipo = 'Infraestructura vial y portuaria';
            } else if (tipo.toLowerCase().includes('hidráulica') || tipo.toLowerCase().includes('hidraulica')) {
                tipo = 'Infraestructura Hidráulica'; subtipo = 'General';
            } else if (tipo.toLowerCase().includes('aeroportuaria')) {
                tipo = 'Infraestructura aeroportuaria';
            } else if (tipo.toLowerCase().includes('edificación') || tipo.toLowerCase().includes('edificacion')) {
                tipo = 'Edificación Pública'; subtipo = 'General';
            }
            if (subtipo === '-' || subtipo === '') subtipo = 'General';

            rowsToInsert.push({
                anio, mes, tipo_obra: tipo, subtipo_obra: subtipo, indice: indiceValue,
                datos_extra: JSON.stringify({ originalTipo: rawTipo, originalSubtipo: rawSubtipo })
            });
        }

        let count = 0;

        if (IS_POSTGRES) {
            // PostgreSQL: bulk upsert row by row (pool handles transactions)
            for (const r of rowsToInsert) {
                await query(
                    `INSERT INTO PolinomioIndex (anio, mes, tipo_obra, subtipo_obra, indice, datos_extra)
                     VALUES ($1,$2,$3,$4,$5,$6)
                     ON CONFLICT(anio, mes, tipo_obra, subtipo_obra) DO UPDATE SET
                         indice = EXCLUDED.indice, datos_extra = EXCLUDED.datos_extra`,
                    [r.anio, r.mes, r.tipo_obra, r.subtipo_obra, r.indice, r.datos_extra]
                );
                count++;
            }
        } else {
            // SQLite: transacción atómica (más eficiente)
            const db = getDriver();
            const stmt = db.prepare(`
                INSERT INTO PolinomioIndex (anio, mes, tipo_obra, subtipo_obra, indice, datos_extra)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(anio, mes, tipo_obra, subtipo_obra) DO UPDATE SET
                    indice = excluded.indice, datos_extra = excluded.datos_extra`);
            const insertMany = db.transaction((rows) => {
                for (const r of rows) { stmt.run(r.anio, r.mes, r.tipo_obra, r.subtipo_obra, r.indice, r.datos_extra); count++; }
            });
            insertMany(rowsToInsert);
        }

        console.log(`✅ Se tabularon/actualizaron exitosamente ${count} índices de reajuste.`);
        return { success: true, count };
    }
}

module.exports = PolinomioScraperService;
