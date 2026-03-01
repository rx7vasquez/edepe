const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, IS_POSTGRES } = require('../db/database');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { companyName, rut, userName, lastName, email, password } = req.body;
    try {
        // Verificar si correo existe
        const existingUsers = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado.' });
        }

        // Crear Company (estado pending por defecto)
        const insertCompany = `INSERT INTO companies (name, rut, status) VALUES ($1, $2, 'pending') ${IS_POSTGRES ? 'RETURNING id' : ''}`;
        const companyResult = await query(insertCompany, [companyName, rut || null]);
        const companyId = IS_POSTGRES ? companyResult[0].id : companyResult[0].id;

        // Crear User Admin Cliente
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertUser = `INSERT INTO users (company_id, name, lastName, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, 'Admin Cliente') ${IS_POSTGRES ? 'RETURNING id' : ''}`;
        await query(insertUser, [companyId, userName, lastName, email, passwordHash]);

        res.status(201).json({ message: 'Registro exitoso. Tu cuenta está pendiente de aprobación.' });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar cuenta.' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const users = await query('SELECT u.*, c.status as company_status FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = $1', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const user = users[0];

        if (!user.is_active || user.is_active === 0 || user.is_active === 'false') {
            return res.status(403).json({ error: 'Tu usuario ha sido desactivado.' });
        }

        if (user.company_status === 'pending') {
            return res.status(403).json({ error: 'La cuenta de tu empresa aún está en revisión.' });
        }
        if (user.company_status === 'suspended') {
            return res.status(403).json({ error: 'La cuenta de tu empresa ha sido suspendida.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Generar JWT
        const assignedProjectsRaw = user.assignedprojectids || user.assignedProjectIds || '[]';
        const userRole = user.role || 'Usuario Normal';
        const companyId = user.company_id || user.companyId;

        const token = jwt.sign(
            {
                userId: user.id,
                companyId: companyId,
                role: userRole,
                assignedProjectIds: JSON.parse(assignedProjectsRaw)
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                name: user.name,
                lastName: user.lastname || user.lastName || '',
                email: user.email,
                role: userRole,
                avatar: user.avatar,
                companyId: companyId
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
