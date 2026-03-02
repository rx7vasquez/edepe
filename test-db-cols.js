const { query, IS_POSTGRES } = require('./backend/db/database');

async function debugColumnNames() {
    try {
        if (!IS_POSTGRES) {
            const tableInfo = await query("PRAGMA table_info(projects)");
            console.log("SQLITE COLUMNS:", tableInfo.map(r => r.name));
        } else {
            const tableInfo = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'");
            console.log("POSTGRES COLUMNS:", tableInfo.rows ? tableInfo.rows.map(r => r.column_name) : tableInfo.map(r => r.column_name));
        }

        const rows = await query('SELECT * FROM projects LIMIT 1');
        console.log("FIRST PROJECT ROW DUMP:", rows[0]);
    } catch (e) { console.error(e) }
    process.exit(0);
}
debugColumnNames();
