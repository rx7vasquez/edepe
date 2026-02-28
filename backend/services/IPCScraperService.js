const axios = require('axios');
const xlsx = require('xlsx');
const { query, getDriver, IS_POSTGRES } = require('../db/database');

const EXCEL_URL = 'https://planeamiento.mop.gob.cl/uploads/sites/12/2024/08/indices-reajuste-polinomico-MOP-20.xls';

const MONTH_MAP = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

class IPCScraperService {
    static async seedDatabase() {
        console.log('🔄 Descargando archivo Excel IPC desde el MOP...');
        const response = await axios.get(EXCEL_URL, { responseType: 'arraybuffer', timeout: 20000 });

        console.log('📊 Parseando archivo Excel para extraer índice IPC...');
        const workbook = xlsx.read(response.data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error('No se encontró ninguna hoja en el archivo Excel del MOP.');

        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 6, defval: null });

        const rowsToInsert = [];
        for (const row of data) {
            if (!row || row.length < 2) continue;

            const rawAnio = row[0]; const rawMes = row[1]; const rawIpc = row[14];

            const anio = parseInt(rawAnio);
            if (isNaN(anio) || anio < 1900 || anio > 2100) continue;

            let mes;
            if (typeof rawMes === 'number') mes = rawMes;
            else if (typeof rawMes === 'string') mes = MONTH_MAP[rawMes.toLowerCase().trim()];
            if (!mes || mes < 1 || mes > 12) continue;

            const valor = parseFloat(rawIpc);
            if (isNaN(valor)) continue;

            rowsToInsert.push({ anio, mes, valor });
        }

        let count = 0;

        if (IS_POSTGRES) {
            for (const r of rowsToInsert) {
                await query(
                    `INSERT INTO IPCIndex (anio, mes, valor, variacion_mensual)
                     VALUES ($1, $2, $3, NULL)
                     ON CONFLICT(anio, mes) DO UPDATE SET valor = EXCLUDED.valor`,
                    [r.anio, r.mes, r.valor]
                );
                count++;
            }
        } else {
            const db = getDriver();
            const stmt = db.prepare(`
                INSERT INTO IPCIndex (anio, mes, valor, variacion_mensual)
                VALUES (?, ?, ?, NULL)
                ON CONFLICT(anio, mes) DO UPDATE SET valor = excluded.valor`);
            const insertMany = db.transaction((rows) => {
                for (const r of rows) { stmt.run(r.anio, r.mes, r.valor); count++; }
            });
            insertMany(rowsToInsert);
        }

        console.log(`✅ Se tabularon/actualizaron exitosamente ${count} índices IPC.`);
        return { success: true, count };
    }
}

module.exports = IPCScraperService;
