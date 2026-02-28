// Configuración de PM2 para producción
module.exports = {
    apps: [
        {
            name: 'edepe',               // Nombre del proceso en PM2
            script: 'server.js',         // Punto de entrada del servidor
            cwd: './backend',            // Directorio de trabajo
            instances: 1,
            autorestart: true,           // Reiniciar si el proceso cae
            watch: false,                // No recargar en cambios de archivo (producción)
            max_memory_restart: '300M',  // Reiniciar si supera 300MB de RAM
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
};
