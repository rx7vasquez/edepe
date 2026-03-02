const express = require('express');
const { query, IS_POSTGRES } = require('../db/database');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// GET all clients
router.get('/', async (req, res) => {
    try {
        const clients = await query('SELECT * FROM clients WHERE company_id = $1', [req.user.companyId]);
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// POST create client
router.post('/', requireRole(['Admin Cliente', 'Administrador', 'SysAdmin']), async (req, res) => {
    const c = req.body;
    try {
        const sql = `
            INSERT INTO clients (company_id, rut, name, address, email, phone) 
            VALUES ($1, $2, $3, $4, $5, $6) ${IS_POSTGRES ? 'RETURNING *' : ''}
        `;
        const result = await query(sql, [req.user.companyId, c.rut, c.name, c.address || '', c.email || '', c.phone || '']);
        res.status(201).json(IS_POSTGRES ? result[0] : { id: result[0].id, ...c });
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// PUT update
router.put('/:id', requireRole(['Admin Cliente', 'Administrador', 'SysAdmin']), async (req, res) => {
    const c = req.body;
    try {
        const sql = `
            UPDATE clients SET rut=$1, name=$2, address=$3, email=$4, phone=$5
            WHERE id=$6 AND company_id=$7
        `;
        await query(sql, [c.rut, c.name, c.address, c.email, c.phone, req.params.id, req.user.companyId]);
        res.json({ message: 'Cliente actualizado' });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// DELETE
router.delete('/:id', requireRole(['Admin Cliente', 'Administrador', 'SysAdmin']), async (req, res) => {
    try {
        await query('DELETE FROM clients WHERE id=$1 AND company_id=$2', [req.params.id, req.user.companyId]);
        res.json({ message: 'Cliente eliminado' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
