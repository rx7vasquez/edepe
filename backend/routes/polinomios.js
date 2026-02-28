const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const PolinomioScraperService = require('../services/PolinomioScraperService');

// GET /api/polinomios
router.get('/', async (req, res) => {
    try {
        const { anio, mes, tipo_obra, subtipo_obra } = req.query;
        let sql = 'SELECT * FROM PolinomioIndex WHERE 1=1';
        const params = [];
        let i = 1;

        if (anio) { sql += ` AND anio = $${i++}`; params.push(anio); }
        if (mes) { sql += ` AND mes = $${i++}`; params.push(mes); }
        if (tipo_obra) { sql += ` AND tipo_obra = $${i++}`; params.push(tipo_obra); }
        if (subtipo_obra) { sql += ` AND subtipo_obra = $${i++}`; params.push(subtipo_obra); }

        sql += ' ORDER BY anio DESC, mes DESC, tipo_obra ASC, subtipo_obra ASC';

        const rows = await query(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/polinomios/seed
router.post('/seed', async (req, res) => {
    try {
        const result = await PolinomioScraperService.seedDatabase();
        res.json({ message: 'Scraping completado', result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/polinomios
router.post('/', async (req, res) => {
    try {
        const { anio, mes, tipo_obra, subtipo_obra, indice, datos_extra } = req.body;
        if (!anio || !mes || !tipo_obra || !subtipo_obra || !indice) {
            return res.status(400).json({ error: 'anio, mes, tipo_obra, subtipo_obra e indice son requeridos' });
        }
        const rows = await query(
            `INSERT INTO PolinomioIndex (anio, mes, tipo_obra, subtipo_obra, indice, datos_extra)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [anio, mes, tipo_obra, subtipo_obra, indice, datos_extra ? JSON.stringify(datos_extra) : null]
        );
        res.status(201).json({ success: true, id: rows[0].id });
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === '23505') {
            return res.status(409).json({ error: 'El índice para ese año, mes, tipo y subtipo ya existe' });
        }
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/polinomios/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { indice, tipo_obra, subtipo_obra, datos_extra } = req.body;
        await query(
            `UPDATE PolinomioIndex
             SET indice = COALESCE($1, indice),
                 tipo_obra = COALESCE($2, tipo_obra),
                 subtipo_obra = COALESCE($3, subtipo_obra),
                 datos_extra = COALESCE($4, datos_extra)
             WHERE id = $5`,
            [indice, tipo_obra, subtipo_obra, datos_extra ? JSON.stringify(datos_extra) : null, id]
        );
        res.json({ success: true, message: 'Actualizado correctamente' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
