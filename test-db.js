const { query } = require('./backend/db/database');

async function test() {
    try {
        const rows = await query('SELECT * FROM projects ORDER BY id DESC LIMIT 1');
        console.log("LAST PROJECT:", rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

test();
