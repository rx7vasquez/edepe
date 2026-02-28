const express = require('express');
const router = express.Router();
const db = require('../db/database');
const IPCScraperService = require('../services/IPCScraperService');

// Get indices with optional filters
router.get('/', (req, res) => {
    try {
        let query = 'SELECT * FROM IPCIndex WHERE 1=1';
        const params = [];

        if (req.query.anio) {
            query += ' AND anio = ?';
            params.push(parseInt(req.query.anio));
        }

        if (req.query.mes) {
            query += ' AND mes = ?';
            params.push(parseInt(req.query.mes));
        }

        query += ' ORDER BY anio DESC, mes DESC';

        const stmt = db.prepare(query);
        const records = stmt.all(...params);
        res.json(records);
    } catch (error) {
        console.error('Error fetching IPC indices:', error);
        res.status(500).json({ error: error.message });
    }
});

// Seed data from source
router.post('/seed', async (req, res) => {
    try {
        const result = await IPCScraperService.seedDatabase();
        res.json({ success: true, message: `Se actualizaron ${result.count} índices IPC.` });
    } catch (error) {
        console.error('Error seeding IPC database:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add new manual index
router.post('/', (req, res) => {
    const { anio, mes, valor, variacion_mensual } = req.body;
    try {
        const stmt = db.prepare('INSERT INTO IPCIndex (anio, mes, valor, variacion_mensual) VALUES (?, ?, ?, ?)');
        const result = stmt.run(anio, mes, valor, variacion_mensual || null);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        console.error('Error adding manual IPC index:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update an existing index
router.put('/:id', (req, res) => {
    const { valor, variacion_mensual } = req.body;
    try {
        const stmt = db.prepare('UPDATE IPCIndex SET valor = ?, variacion_mensual = ? WHERE id = ?');
        stmt.run(valor, variacion_mensual || null, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating IPC index:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
