const axios = require('axios');
const xlsx = require('xlsx');
const db = require('../db/database');

const EXCEL_URL = 'https://planeamiento.mop.gob.cl/uploads/sites/12/2024/08/serie_indices-reajuste-polinomico-MOP-18.xls';

const MONTH_MAP = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

class PolinomioScraperService {
    static async seedDatabase() {
        try {
            console.log('🔄 Descargando archivo Excel desde el MOP...');
            const response = await axios.get(EXCEL_URL, { responseType: 'arraybuffer' });

            console.log('📊 Parseando archivo Excel...');
            const workbook = xlsx.read(response.data, { type: 'buffer' });

            const sheetName = 'serie indices MOP';
            const sheet = workbook.Sheets[sheetName];

            if (!sheet) {
                throw new Error(`La hoja "${sheetName}" no existe en el archivo descargado.`);
            }

            // Convert to JSON, starting from A5 (row 5 implies skipping 4 rows)
            const data = xlsx.utils.sheet_to_json(sheet, {
                header: 1, // Let's use array of arrays to map columns A-E manually
                range: 4,  // 0-indexed, so row 5 is index 4
                defval: null
            });

            const insertStmt = db.prepare(`
                INSERT INTO PolinomioIndex (anio, mes, tipo_obra, subtipo_obra, indice, datos_extra)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(anio, mes, tipo_obra, subtipo_obra) DO UPDATE SET 
                    indice = excluded.indice, 
                    datos_extra = excluded.datos_extra
            `);

            let count = 0;
            const insertMany = db.transaction((records) => {
                for (const row of records) {
                    insertStmt.run(row.anio, row.mes, row.tipo_obra, row.subtipo_obra, row.indice, JSON.stringify(row.datos_extra));
                    count++;
                }
            });

            const rowsToInsert = [];
            for (const row of data) {
                if (!row || row.length < 5) continue;

                const rawAnio = row[0]; // A
                const rawMes = row[1];  // B: It is an integer in the Excel
                const rawTipo = row[2]; // C
                const rawSubtipo = row[3]; // D
                const rawIndice = row[4]; // E

                // Sanitation
                const anio = parseInt(rawAnio);
                if (isNaN(anio) || anio < 1900 || anio > 2100) continue;

                const mes = parseInt(rawMes);
                if (isNaN(mes) || mes < 1 || mes > 12) continue;

                const indiceValue = parseFloat(rawIndice);
                if (isNaN(indiceValue)) continue;

                let tipo = (rawTipo || 'General').trim();
                let subtipo = (rawSubtipo || 'General').trim();

                // Normalización de MOP
                if (tipo.toLowerCase().includes('vial') || tipo.toLowerCase().includes('portuaria')) {
                    tipo = 'Infraestructura vial y portuaria';
                } else if (tipo.toLowerCase().includes('hidráulica') || tipo.toLowerCase().includes('hidraulica')) {
                    tipo = 'Infraestructura Hidráulica';
                    subtipo = 'General';
                } else if (tipo.toLowerCase().includes('aeroportuaria')) {
                    tipo = 'Infraestructura aeroportuaria';
                } else if (tipo.toLowerCase().includes('edificación') || tipo.toLowerCase().includes('edificacion')) {
                    tipo = 'Edificación Pública';
                    subtipo = 'General';
                }

                if (subtipo === '-' || subtipo === '') subtipo = 'General';

                rowsToInsert.push({
                    anio,
                    mes,
                    tipo_obra: tipo,
                    subtipo_obra: subtipo,
                    indice: indiceValue,
                    datos_extra: { originalTipo: rawTipo, originalSubtipo: rawSubtipo }
                });
            }

            insertMany(rowsToInsert);
            console.log(`✅ Se tabularon/actualizaron exitosamente ${count} índices de reajuste desglosados.`);
            return { success: true, count };

        } catch (error) {
            console.error('❌ Error en el Scraper de Polinomio:', error.message);
            throw error;
        }
    }
}

module.exports = PolinomioScraperService;
