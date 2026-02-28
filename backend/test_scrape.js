const axios = require('axios');
const xlsx = require('xlsx');

const EXCEL_URL = 'https://planeamiento.mop.gob.cl/uploads/sites/12/2024/08/serie_indices-reajuste-polinomico-MOP-18.xls';

async function test() {
    const response = await axios.get(EXCEL_URL, { responseType: 'arraybuffer' });
    const workbook = xlsx.read(response.data, { type: 'buffer' });

    console.log("Hojas:", workbook.SheetNames);
    const sheet = workbook.Sheets['serie indices MOP'];

    const data = xlsx.utils.sheet_to_json(sheet, {
        header: 1,
        range: 4,
        defval: null
    });

    const tipos = new Set();
    data.forEach(r => {
        if (r[2]) tipos.add(r[2].trim() + " - " + (r[3] ? r[3].trim() : ""));
    });
    console.log(Array.from(tipos));
}
test();
