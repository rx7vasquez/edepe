/**
 * Database Adapter
 * 
 * - LOCAL (dev):  Si NO hay DATABASE_URL → usa SQLite (better-sqlite3)
 * - PRODUCCIÓN:   Si HAY DATABASE_URL   → usa PostgreSQL (pg / Supabase / Railway)
 * 
 * Exporta { query, getDb } con una API asíncrona uniforme.
 */
require('dotenv').config();
const path = require('path');

const IS_POSTGRES = !!process.env.DATABASE_URL;

let pgPool = null;
let sqliteDb = null;

if (IS_POSTGRES) {
    const { Pool } = require('pg');
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }  // Requerido por Railway / Supabase
    });
    console.log('🐘 Usando PostgreSQL (Supabase/Railway)');
} else {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, 'edepe.db');
    sqliteDb = new Database(dbPath);
    console.log('🗄️  Usando SQLite local');
}

// ---------------------------------------------------------------
// API unificada: query(sql, params) → siempre devuelve Promise
// Los parámetros usan la notación de PostgreSQL ($1, $2...) en modo PG
// y ? en modo SQLite — esta función maneja la conversión automáticamente.
// ---------------------------------------------------------------
async function query(sql, params = []) {
    if (IS_POSTGRES) {
        // PostgreSQL ya usa $1, $2... — pasamos directo
        const result = await pgPool.query(sql, params);
        return result.rows;
    } else {
        // SQLite: es síncrono pero lo envolvemos en Promise para API uniforme
        // Reemplaza $1, $2... por ? si alguien usó notación PG
        const sqliteSQL = sql.replace(/\$\d+/g, '?');
        const stmt = sqliteDb.prepare(sqliteSQL);
        // Determinar si es SELECT o una mutación
        const trimmed = sql.trim().toUpperCase();
        if (trimmed.startsWith('SELECT')) {
            return stmt.all(...params);
        } else {
            const result = stmt.run(...params);
            return [{ id: result.lastInsertRowid, changes: result.changes }];
        }
    }
}

// Acceso directo al driver nativo (para los scrapers que hacen transacciones masivas)
function getDriver() {
    return IS_POSTGRES ? pgPool : sqliteDb;
}

// ---------------------------------------------------------------
// Inicialización de tablas
// ---------------------------------------------------------------
async function initDb() {
    const createPolinomio = `
        CREATE TABLE IF NOT EXISTS PolinomioIndex (
            id ${IS_POSTGRES ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${IS_POSTGRES ? '' : 'AUTOINCREMENT'},
            anio INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            tipo_obra TEXT NOT NULL,
            subtipo_obra TEXT NOT NULL,
            indice REAL NOT NULL,
            datos_extra TEXT,
            UNIQUE(anio, mes, tipo_obra, subtipo_obra)
        )`;

    const createIPC = `
        CREATE TABLE IF NOT EXISTS IPCIndex (
            id ${IS_POSTGRES ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${IS_POSTGRES ? '' : 'AUTOINCREMENT'},
            anio INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            valor REAL NOT NULL,
            variacion_mensual REAL,
            UNIQUE(anio, mes)
        )`;

    await query(createPolinomio);
    await query(createIPC);
    console.log('✅ Base de datos inicializada o sincronizada.');
}

module.exports = { query, getDriver, initDb, IS_POSTGRES };
