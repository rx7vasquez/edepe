const { query } = require('./db/database');

async function debugReajuste() {
    try {
        // 1. Get Project 1 details
        const projects = await query('SELECT * FROM projects WHERE id = 1');
        if (projects.length === 0) { console.log("PROJECT 1 NOT FOUND"); process.exit(0); }
        const p = projects[0];
        console.log("PROJECT COLUMNS:", Object.keys(p));
        const extra = JSON.parse(p.extra_data || p.extra || '{}');
        console.log("PROJECT CONFIG:", {
            nombre: p.nombre,
            tipo_reajuste: p.tipo_reajuste,
            reajusteIndexBase: extra.reajusteIndex
        });

        // 2. Check Indices for Dec 2025 (Mes 12, Año 2025)
        // Check Polinomio
        const polinomio = await query('SELECT * FROM PolinomioIndex WHERE mes = 12 AND anio = 2025');
        console.log("POLINOMIO DEC 2025:", polinomio);

        // Check IPC
        const ipc = await query('SELECT * FROM IPCIndex WHERE mes = 12 AND anio = 2025');
        console.log("IPC DEC 2025:", ipc);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

debugReajuste();
