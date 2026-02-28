const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'edepe.db');
const db = new Database(dbPath);

// Create tables if they don't exist
const initDb = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS PolinomioIndex (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anio INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            tipo_obra TEXT NOT NULL,
            subtipo_obra TEXT NOT NULL,
            indice REAL NOT NULL,
            datos_extra TEXT,
            UNIQUE(anio, mes, tipo_obra, subtipo_obra)
        );

        CREATE TABLE IF NOT EXISTS IPCIndex (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anio INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            valor REAL NOT NULL,
            variacion_mensual REAL,
            UNIQUE(anio, mes)
        );
    `);
    console.log('✅ Base de datos inicializada o sincronizada.');
};

initDb();

module.exports = db;
