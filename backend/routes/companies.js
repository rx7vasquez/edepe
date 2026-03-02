const express = require('express');
const { query, IS_POSTGRES } = require('../db/database');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Aplica el middleware a TODAS las rutas (solo SysAdmin)
router.use(authenticateToken);
router.use(requireRole(['SysAdmin']));

// GET todas las empresas
router.get('/', async (req, res) => {
    try {
        const companies = await query("SELECT * FROM companies ORDER BY created_at DESC");
        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// POST crear empresa y usuario inicial (Solo SysAdmin)
router.post('/', async (req, res) => {
    const { name, rut, adminName, adminLastName, adminEmail, adminPassword, status } = req.body;
    try {
        if (!name || !adminEmail || !adminPassword) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        const bcrypt = require('bcryptjs'); // require locally to minimize changes
        const existingUsers = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'El correo del administrador ya está registrado.' });
        }

        const insertCompany = `INSERT INTO companies (name, rut, status) VALUES ($1, $2, $3) ${IS_POSTGRES ? 'RETURNING id' : ''}`;
        const companyResult = await query(insertCompany, [name, rut || null, status || 'active']);
        const companyId = IS_POSTGRES ? companyResult[0].id : (companyResult.id || companyResult[0].id);

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        const insertUser = `INSERT INTO users (company_id, name, lastName, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, 'Administrador', ${IS_POSTGRES ? 'true' : '1'}) ${IS_POSTGRES ? 'RETURNING id' : ''}`;
        await query(insertUser, [companyId, adminName, adminLastName, adminEmail, passwordHash]);

        res.status(201).json({ message: 'Empresa y usuario administrador creados exitosamente' });
    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({ error: 'Error del servidor al crear la empresa.' });
    }
});

// PUT actualizar estado de empresa (approve, suspend, etc.)
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        // Validation simple
        if (!['active', 'pending', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido.' });
        }

        await query('UPDATE companies SET status = $1 WHERE id = $2', [status, id]);
        res.json({ message: 'Estado de la empresa actualizado', id, status });
    } catch (error) {
        console.error('Error update company status:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

module.exports = router;
