const express = require('express');
const { query, IS_POSTGRES } = require('../db/database');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authenticateToken);

// GET all users in the same company (Only Admin Cliente can view all, or anyone can view? Usually anyone can view their peers for assignment, but only Admin manages them)
router.get('/', async (req, res) => {
    try {
        const rawUsers = await query(
            'SELECT id, name, lastName, email, role, position, avatar, is_active, assignedProjectIds FROM users WHERE company_id = $1',
            [req.user.companyId]
        );
        const filteredUsers = req.user.role === 'SysAdmin'
            ? rawUsers
            : rawUsers.filter(u => u.role !== 'SysAdmin');

        const mappedUsers = filteredUsers.map(u => ({
            id: u.id,
            name: u.name,
            lastName: u.lastname || u.lastName || '',
            email: u.email,
            role: u.role,
            position: u.position || '',
            avatar: u.avatar,
            is_active: u.is_active,
            assignedProjectIds: JSON.parse(u.assignedprojectids || u.assignedProjectIds || '[]')
        }));
        res.json(mappedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST create new user in company (Only Admin Cliente)
router.post('/', requireRole(['Admin Cliente', 'Administrador', 'SysAdmin']), async (req, res) => {
    const { name, lastName, email, tempPassword, role, position, assignedProjectIds } = req.body;
    try {
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(tempPassword || 'temporal123', salt);

        const sql = `
            INSERT INTO users (company_id, name, lastName, email, password_hash, role, position, assignedProjectIds) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ${IS_POSTGRES ? 'RETURNING id' : ''}
        `;
        const params = [
            req.user.companyId, name, lastName, email, hash, role || 'Usuario Normal', position || '', JSON.stringify(assignedProjectIds || [])
        ];

        const result = await query(sql, params);
        res.status(201).json({ id: IS_POSTGRES ? result[0].id : result[0].id, message: 'User created' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT update user (role, active status, assigned projects, and basic info)
router.put('/:id', requireRole(['Admin Cliente', 'Administrador', 'SysAdmin']), async (req, res) => {
    const { name, lastName, email, role, position, is_active, assignedProjectIds } = req.body;
    try {
        // Prevention: Non-SysAdmin cannot target a SysAdmin
        const target = await query('SELECT role FROM users WHERE id = $1', [req.params.id]);
        if (target.length > 0 && target[0].role === 'SysAdmin' && req.user.role !== 'SysAdmin') {
            return res.status(403).json({ error: 'No tienes permisos para modificar a un Super Administrador.' });
        }

        const sql = `
            UPDATE users SET name = $1, lastName = $2, email = $3, role = $4, position = $5, is_active = $6, assignedProjectIds = $7
            WHERE id = $8 AND company_id = $9
        `;
        await query(sql, [
            name,
            lastName,
            email,
            role,
            position || '',
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            JSON.stringify(assignedProjectIds || []),
            req.params.id,
            req.user.companyId
        ]);
        res.json({ message: 'User updated' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE User (Optional, could just set is_active=0)
router.delete('/:id', requireRole(['Admin Cliente', 'Administrador', 'SysAdmin']), async (req, res) => {
    try {
        // Prevention: Non-SysAdmin cannot target a SysAdmin
        const target = await query('SELECT role FROM users WHERE id = $1', [req.params.id]);
        if (target.length > 0 && target[0].role === 'SysAdmin' && req.user.role !== 'SysAdmin') {
            return res.status(403).json({ error: 'No tienes permisos para eliminar a un Super Administrador.' });
        }

        await query('DELETE FROM users WHERE id = $1 AND company_id = $2', [req.params.id, req.user.companyId]);
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
