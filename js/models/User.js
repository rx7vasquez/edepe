class User {
    constructor(d) {
        this.id = d.id || Math.random().toString(36).substr(2, 9);
        this.name = d.name || '';
        this.lastName = d.lastName || '';
        this.email = d.email || '';
        this.password = d.password || '123456'; // Default password for new users
        this.position = d.position || ''; // Cargo
        this.role = d.role || 'Operador de Terreno'; // Default role
        this.assignedProjectIds = d.assignedProjectIds || [];
        this.avatar = d.avatar || null;
    }
}
