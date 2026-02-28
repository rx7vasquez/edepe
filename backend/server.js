require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir el frontend (archivos estáticos desde la carpeta raíz del proyecto)
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// Rutas API
const polinomiosRoutes = require('./routes/polinomios');
app.use('/api/polinomios', polinomiosRoutes);

const ipcRoutes = require('./routes/ipc');
app.use('/api/ipc', ipcRoutes);

// Fallback SPA → siempre devuelve index.html para rutas no-API
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// Inicialización del servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Edepé corriendo en http://localhost:${PORT}`);
    console.log(`   → Acceso en la red local: http://<IP-del-servidor>:${PORT}`);
});
