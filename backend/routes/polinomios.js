const express = require('express');
const router = express.Router();
const db = require('../db/database');
const PolinomioScraperService = require('../services/PolinomioScraperService');

// GET /api/polinomios (Filtros opcionales)
router.get('/', (req, res) => {
    try {
        const { anio, mes, tipo_obra, subtipo_obra } = req.query;
        let query = 'SELECT * FROM PolinomioIndex WHERE 1=1';
        let params = [];

        if (anio) { query += ' AND anio = ?'; params.push(anio); }
        if (mes) { query += ' AND mes = ?'; params.push(mes); }
        if (tipo_obra) { query += ' AND tipo_obra = ?'; params.push(tipo_obra); }
        if (subtipo_obra) { query += ' AND subtipo_obra = ?'; params.push(subtipo_obra); }

        query += ' ORDER BY anio DESC, mes DESC, tipo_obra ASC, subtipo_obra ASC';

        const rows = db.prepare(query).all(params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/polinomios/seed (Ejecuta el Scraper MOP masivo)
router.post('/seed', async (req, res) => {
    try {
        const result = await PolinomioScraperService.seedDatabase();
        res.json({ message: 'Scraping completado', result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/polinomios (Ingreso manual directo)
router.post('/', (req, res) => {
    try {
        const { anio, mes, tipo_obra, subtipo_obra, indice, datos_extra } = req.body;
        if (!anio || !mes || !tipo_obra || !subtipo_obra || !indice) {
            return res.status(400).json({ error: 'anio, mes, tipo_obra, subtipo_obra e indice son requeridos' });
        }

        const stmt = db.prepare(`
            INSERT INTO PolinomioIndex (anio, mes, tipo_obra, subtipo_obra, indice, datos_extra)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(anio, mes, tipo_obra, subtipo_obra, indice, datos_extra ? JSON.stringify(datos_extra) : null);

        res.status(201).json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'El índice para ese año, mes, tipo y subtipo ya existe' });
        }
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/polinomios/:id (Actualizar un índice existente)
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { indice, tipo_obra, subtipo_obra, datos_extra } = req.body;

        const stmt = db.prepare(`
            UPDATE PolinomioIndex 
            SET indice = COALESCE(?, indice), 
                tipo_obra = COALESCE(?, tipo_obra),
                subtipo_obra = COALESCE(?, subtipo_obra),
                datos_extra = COALESCE(?, datos_extra)
            WHERE id = ?
        `);
        const result = stmt.run(indice, tipo_obra, subtipo_obra, datos_extra ? JSON.stringify(datos_extra) : null, id);

        if (result.changes === 0) return res.status(404).json({ error: 'Índice no encontrado' });

        res.json({ success: true, message: 'Actualizado correctamente' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
