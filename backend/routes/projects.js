const express = require('express');
const { query, IS_POSTGRES } = require('../db/database');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

function mapDBToProject(row) {
    let extra = {};
    try { extra = JSON.parse(row.extra_data || '{}'); } catch (e) { }

    return {
        id: row.id,
        name: row.nombre || '',
        contractId: row.codigo || '',
        client: extra.clientName || row.clientId || '',
        awardDate: extra.awardDate || '',
        startDate: row.fecha_inicio || '',
        term: row.plazo_dias || 365,
        contractType: extra.contractType || 'Precios Unitarios',
        codigoSafi: extra.codigoSafi || '',
        codigoBip: extra.codigoBip || '',
        items: JSON.parse(row.items || '[]'),
        progressEntries: JSON.parse(row.advances || '[]'),
        edps: JSON.parse(row.edps || '[]'),
        currency: row.moneda || 'CLP',
        annexes: {
            retentionRate: row.retencion_porcentaje != null ? parseFloat(row.retencion_porcentaje) : 0.10,
            retentionCapRate: row.retencion_tope != null ? parseFloat(row.retencion_tope) : 0.05,
            advanceTotal: row.anticipo_porcentaje || 0,
            tipo_obra: row.tipo_obra || '',
            subtipo_obra: row.subtipo_obra || '',
            tipoReajuste: row.tipo_reajuste || 'Polinomio',
            reajusteIndex: extra.reajusteIndex || 1.000
        },
        baselineItems: extra.baselineItems || null,
        baselineLockedAt: extra.baselineLockedAt || null,
        contractModifications: extra.contractModifications || []
    };
}

function mapProjectToDBParams(p) {
    const annexes = p.annexes || {};

    let clientIdParam = null;
    let clientNameParam = null;

    // Safely parse client into integer ID, or save it as name string if it was just texted.
    if (p.client && !isNaN(parseInt(p.client))) {
        clientIdParam = parseInt(p.client);
    } else if (p.client) {
        clientNameParam = p.client;
    }

    const extraData = {
        awardDate: p.awardDate || '',
        codigoSafi: p.codigoSafi || '',
        codigoBip: p.codigoBip || '',
        contractType: p.contractType || 'Precios Unitarios',
        reajusteIndex: annexes.reajusteIndex,
        baselineItems: p.baselineItems || null,
        baselineLockedAt: p.baselineLockedAt || null,
        contractModifications: p.contractModifications || [],
        clientName: clientNameParam
    };

    return [
        p.contractId || '',                      // codigo ($2)
        p.name || 'Proyecto Sin Nombre',         // nombre ($3)
        '',                                      // descripcion ($4)
        clientIdParam,                           // clientId ($5)
        annexes.tipo_obra || '',                 // tipo_obra ($6)
        annexes.subtipo_obra || '',              // subtipo_obra ($7)
        'Activo',                                // estado ($8)
        0, 0, 0,                                 // presupuesto totals ($9, $10, $11)
        parseInt(p.term) || 0,                   // plazo_dias ($12)
        p.startDate || p.awardDate || '',        // fecha_inicio ($13)
        parseFloat(annexes.advanceTotal) || 0,   // anticipo_porcentaje ($14)
        parseFloat(annexes.retentionRate) || 0,  // retencion_porcentaje ($15)
        parseFloat(annexes.retentionCapRate) || null, // retencion_tope ($16)
        1,                                       // proporcion_reajuste_mandante ($17)
        annexes.tipoReajuste || 'None',          // tipo_reajuste ($18)
        p.currency || 'CLP',                     // moneda ($19)
        JSON.stringify(p.items || []),           // items ($20)
        JSON.stringify(p.progressEntries || []), // advances ($21)
        JSON.stringify(p.edps || []),            // edps ($22)
        JSON.stringify(extraData)                // extra_data ($23)
    ];
}

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
        const parsedProjects = projects.map(mapDBToProject);

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

        const p = mapDBToProject(result[0]);

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
                proporcion_reajuste_mandante, tipo_reajuste, moneda, items, advances, edps, extra_data
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
            ) ${IS_POSTGRES ? 'RETURNING *' : ''}
        `;
        const params = [req.user.companyId, ...mapProjectToDBParams(p)];

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
                proporcion_reajuste_mandante=$16, tipo_reajuste=$17, moneda=$18, items=$19, advances=$20, edps=$21, extra_data=$22
            WHERE id=$23 AND company_id=$24
        `;
        const params = [...mapProjectToDBParams(p), req.params.id, req.user.companyId];

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
