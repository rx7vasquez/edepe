const bcrypt = require('bcryptjs');
const db = require('./backend/db/database');

async function seed() {
    try {
        const query = 'INSERT INTO companies (name, status) VALUES (?, ?) RETURNING id';
        const params = ['Edepe Platform Admin', 'active'];

        const comp = await db.query(query, params);
        console.log('Company creation result:', comp);

        let compId;
        if (db.IS_POSTGRES) {
            compId = comp[0].id; // Postgres RETURNING id returns [{id: 1}]
        } else {
            compId = comp[0].id; // The SQLite wrapper returns [{id: insertRowId}] when RETURNING is emulated or used
            // SQLite wrapper (run) returns { id: this.lastInsertRowid }
            if (comp.id) compId = comp.id;
        }

        console.log('Admin company created:', compId);

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);

        const userQuery = 'INSERT INTO users (company_id, name, lastName, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const userParams = [compId, 'Super', 'Admin', 'admin@edepe.cl', hash, 'SysAdmin', 1];

        await db.query(userQuery, userParams);
        console.log('SysAdmin created: admin@edepe.cl / admin123');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
