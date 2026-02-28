const axios = require('axios');
const xlsx = require('xlsx');
const db = require('../db/database');

// Mismo archivo Excel del MOP, columnas distintas
const EXCEL_URL = 'https://planeamiento.mop.gob.cl/uploads/sites/12/2024/08/indices-reajuste-polinomico-MOP-20.xls';

const MONTH_MAP = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

class IPCScraperService {
    static async seedDatabase() {
        try {
            console.log('🔄 Descargando archivo Excel IPC desde el MOP...');
            const response = await axios.get(EXCEL_URL, {
                responseType: 'arraybuffer',
                timeout: 20000
            });

            console.log('📊 Parseando archivo Excel para extraer índice IPC...');
            const workbook = xlsx.read(response.data, { type: 'buffer' });

            // Usar la primera hoja (índices más recientes: dic 2020 en adelante)
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            if (!sheet) {
                throw new Error(`No se encontró ninguna hoja en el archivo Excel del MOP.`);
            }

            // Parsear desde fila 7 (índice 6 en base 0)
            const data = xlsx.utils.sheet_to_json(sheet, {
                header: 1,
                range: 6,   // Fila 7 en el Excel (0-indexed = 6)
                defval: null
            });

            const insertStmt = db.prepare(`
                INSERT INTO IPCIndex (anio, mes, valor, variacion_mensual)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(anio, mes) DO UPDATE SET
                    valor = excluded.valor,
                    variacion_mensual = excluded.variacion_mensual
            `);

            let count = 0;
            const rowsToInsert = [];

            for (const row of data) {
                if (!row || row.length < 2) continue;

                const rawAnio = row[0];   // Columna A: Año
                const rawMes = row[1];   // Columna B: Mes (texto: "enero", "febrero", ...)
                const rawIpc = row[14];  // Columna O (índice 14 en base 0): Índice IPC

                // Validar año
                const anio = parseInt(rawAnio);
                if (isNaN(anio) || anio < 1900 || anio > 2100) continue;

                // Resolver mes: puede venir como número o como nombre en español
                let mes;
                if (typeof rawMes === 'number') {
                    mes = rawMes;
                } else if (typeof rawMes === 'string') {
                    mes = MONTH_MAP[rawMes.toLowerCase().trim()];
                }
                if (!mes || mes < 1 || mes > 12) continue;

                // Validar valor IPC
                const valor = parseFloat(rawIpc);
                if (isNaN(valor)) continue;

                rowsToInsert.push({ anio, mes, valor });
            }

            // Insertar como transacción atómica
            const insertMany = db.transaction((records) => {
                for (const rec of records) {
                    insertStmt.run(rec.anio, rec.mes, rec.valor, null);
                    count++;
                }
            });

            insertMany(rowsToInsert);

            console.log(`✅ Se tabularon/actualizaron exitosamente ${count} índices IPC.`);
            return { success: true, count };

        } catch (error) {
            console.error('❌ Error en el Scraper de IPC:', error.message);
            throw error;
        }
    }
}

module.exports = IPCScraperService;
