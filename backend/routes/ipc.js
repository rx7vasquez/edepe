const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const IPCScraperService = require('../services/IPCScraperService');

// GET /api/ipc
router.get('/', async (req, res) => {
    try {
        let sql = 'SELECT * FROM IPCIndex WHERE 1=1';
        const params = [];
        let i = 1;

        if (req.query.anio) { sql += ` AND anio = $${i++}`; params.push(parseInt(req.query.anio)); }
        if (req.query.mes) { sql += ` AND mes = $${i++}`; params.push(parseInt(req.query.mes)); }

        sql += ' ORDER BY anio DESC, mes DESC';

        const rows = await query(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/ipc/seed
router.post('/seed', async (req, res) => {
    try {
        const result = await IPCScraperService.seedDatabase();
        res.json({ success: true, message: `Se actualizaron ${result.count} índices IPC.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/ipc
router.post('/', async (req, res) => {
    try {
        const { anio, mes, valor, variacion_mensual } = req.body;
        const rows = await query(
            `INSERT INTO IPCIndex (anio, mes, valor, variacion_mensual)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [anio, mes, valor, variacion_mensual || null]
        );
        res.json({ success: true, id: rows[0].id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/ipc/:id
router.put('/:id', async (req, res) => {
    try {
        const { valor, variacion_mensual } = req.body;
        await query(
            'UPDATE IPCIndex SET valor = $1, variacion_mensual = $2 WHERE id = $3',
            [valor, variacion_mensual || null, req.params.id]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
