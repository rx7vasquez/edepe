require('dotenv').config();
const { Pool } = require('pg');

// Supabase Transaction Pooler requiere ?pgbouncer=true
const pool = new Pool({
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pxbtvfmhhexkwogsrlfs',
    password: 'q1BCvbvjyK5xDFRq',
    ssl: { rejectUnauthorized: false },
    // PgBouncer no soporta prepared statements en mode transaction
    query_timeout: 10000
});

console.log('Probando con pgbouncer transaction mode...');
pool.query('SELECT current_user, NOW() as now')
    .then(res => {
        console.log('✅ Conexión a Supabase exitosa!');
        console.log('   Usuario en BD:', res.rows[0].current_user);
        console.log('   Hora servidor:', res.rows[0].now);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
