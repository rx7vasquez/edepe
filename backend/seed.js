const bcrypt = require('bcryptjs');
const db = require('./db/database');

async function seed() {
    try {
        await db.initDb();
        const query = db.IS_POSTGRES ?
            'INSERT INTO companies (name, status) VALUES ($1, $2) RETURNING id' :
            'INSERT INTO companies (name, status) VALUES (?, ?) RETURNING id';
        const params = ['Edepe Platform Admin', 'active'];

        const comp = await db.query(query, params);
        console.log('Company creation result:', comp);

        let compId;
        if (db.IS_POSTGRES) {
            compId = comp[0].id;
        } else {
            compId = comp[0].id;
            if (comp.id) compId = comp.id;
        }

        console.log('Admin company created:', compId);

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);

        const userQuery = db.IS_POSTGRES ?
            'INSERT INTO users (company_id, name, lastName, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)' :
            'INSERT INTO users (company_id, name, lastName, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)';
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
