const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_edepe_key_2026';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }

        req.user = user;
        next();
    });
}

function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            console.log(`[AUTH DEBUG] Rejection! User Role: "${req.user?.role}", Allowed: ${JSON.stringify(roles)}`);
            return res.status(403).json({
                error: `No tienes permisos para realizar esta acción. (Rol: ${req.user?.role || 'Ninguno'})`
            });
        }
        next();
    };
}

module.exports = { authenticateToken, requireRole, JWT_SECRET };
