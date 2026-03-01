const express = require('express');
const { query, IS_POSTGRES } = require('../db/database');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// GET - Obtener todos los proyectos de la empresa del usuario
router.get('/', async (req, res) => {
    try {
        let sql = 'SELECT * FROM projects WHERE company_id = $1';
        const params = [req.user.companyId];

        // Si el usuario es 'Usuario Normal', solo devolver proyectos asignados
        if (req.user.role === 'Usuario Normal') {
            const projectIds = req.user.assignedProjectIds || [];
            if (projectIds.length === 0) {
                return res.json([]);
            }
            // Array bindings can be tricky between SQLite and PG. Let's do dynamic IN clause
            // o simplemente retornarlos todos y filtrar en memoria por ahora. Para BD relacional, lo mejor es tabla pivot,
            // pero vamos a usar un IN dinamico
            if (IS_POSTGRES) {
                sql += ' AND id = ANY($2::int[])';
                params.push(projectIds);
            } else {
                const placeholders = projectIds.map(() => '?').join(',');
                sql = `SELECT * FROM projects WHERE company_id = ? AND id IN (${placeholders})`;
                params.length = 0;
                params.push(req.user.companyId, ...projectIds);
            }
        }

        const projects = await query(sql, params);

        // Parsear JSON strings
        const parsedProjects = projects.map(p => ({
            ...p,
            items: JSON.parse(p.items || '[]'),
            advances: JSON.parse(p.advances || '[]'),
            edps: JSON.parse(p.edps || '[]')
        }));

        res.json(parsedProjects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// GET - Obetener un solo proyecto (valida company_id)
router.get('/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM projects WHERE id = $1 AND company_id = $2', [req.params.id, req.user.companyId]);
        if (result.length === 0) return res.status(404).json({ error: 'Proyecto no encontrado' });

        const p = result[0];
        p.items = JSON.parse(p.items || '[]');
        p.advances = JSON.parse(p.advances || '[]');
        p.edps = JSON.parse(p.edps || '[]');

        res.json(p);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// POST - Crear nuevo proyecto (solo Admin)
router.post('/', async (req, res) => {
    if (req.user.role === 'Usuario Normal') return res.status(403).json({ error: 'Sin permisos' });

    const p = req.body;
    try {
        const sql = `
            INSERT INTO projects (
                company_id, codigo, nombre, descripcion, clientId, tipo_obra, subtipo_obra,
                estado, presupuesto_total, presupuesto_gastos_generales, presupuesto_utilidades,
                plazo_dias, fecha_inicio, anticipo_porcentaje, retencion_porcentaje, retencion_tope,
                proporcion_reajuste_mandante, tipo_reajuste, moneda, items, advances, edps
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            ) ${IS_POSTGRES ? 'RETURNING *' : ''}
        `;
        const params = [
            req.user.companyId, p.codigo, p.nombre, p.descripcion || '', p.clientId || null,
            p.tipo_obra || '', p.subtipo_obra || '', p.estado || 'Activo', p.presupuesto_total || 0,
            p.presupuesto_gastos_generales || 0, p.presupuesto_utilidades || 0, p.plazo_dias || 0,
            p.fecha_inicio || '', p.anticipo_porcentaje || 0, p.retencion_porcentaje || 0, p.retencion_tope || null,
            p.proporcion_reajuste_mandante || 1, p.tipo_reajuste || 'None', p.moneda || 'CLP',
            JSON.stringify(p.items || []), JSON.stringify(p.advances || []), JSON.stringify(p.edps || [])
        ];

        const result = await query(sql, params);
        res.status(201).json(IS_POSTGRES ? result[0] : { id: result[0].id, message: 'Creado' });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// PUT - Actualizar proyecto
router.put('/:id', async (req, res) => {
    // Basic permissions check
    if (req.user.role === 'Usuario Normal' && !req.user.assignedProjectIds.includes(Number(req.params.id))) {
        return res.status(403).json({ error: 'Sin permisos' });
    }

    const p = req.body;
    try {
        const sql = `
            UPDATE projects SET 
                codigo=$1, nombre=$2, descripcion=$3, clientId=$4, tipo_obra=$5, subtipo_obra=$6,
                estado=$7, presupuesto_total=$8, presupuesto_gastos_generales=$9, presupuesto_utilidades=$10,
                plazo_dias=$11, fecha_inicio=$12, anticipo_porcentaje=$13, retencion_porcentaje=$14, retencion_tope=$15,
                proporcion_reajuste_mandante=$16, tipo_reajuste=$17, moneda=$18, items=$19, advances=$20, edps=$21
            WHERE id=$22 AND company_id=$23
        `;
        const params = [
            p.codigo, p.nombre, p.descripcion, p.clientId, p.tipo_obra, p.subtipo_obra,
            p.estado, p.presupuesto_total, p.presupuesto_gastos_generales, p.presupuesto_utilidades,
            p.plazo_dias, p.fecha_inicio, p.anticipo_porcentaje, p.retencion_porcentaje, p.retencion_tope,
            p.proporcion_reajuste_mandante, p.tipo_reajuste, p.moneda,
            JSON.stringify(p.items || []), JSON.stringify(p.advances || []), JSON.stringify(p.edps || []),
            req.params.id, req.user.companyId
        ];

        await query(sql, params);
        res.json({ message: 'Proyecto actualizado' });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    if (req.user.role === 'Usuario Normal') return res.status(403).json({ error: 'Sin permisos' });
    try {
        await query('DELETE FROM projects WHERE id = $1 AND company_id = $2', [req.params.id, req.user.companyId]);
        res.json({ message: 'Proyecto eliminado' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

module.exports = router;
