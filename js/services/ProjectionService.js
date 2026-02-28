const ProjectionService = {
    /**
     * Estimates the completion date based on current performance (RCOP Index).
     */
    estimateCompletionDate(project) {
        if (!project.startDate || project.term <= 0) return null;

        const rcop = project.calculateRCOPIndex();
        if (rcop <= 0) return "Indefinida (Sin avance)";

        // If performance is 100%, estimated term = contractual term.
        // If performance is 50%, estimated term = 2 * contractual term.
        const estimatedTotalDays = project.term * (100 / rcop);
        const startDate = new Date(project.startDate);
        const estDate = new Date(startDate.getTime() + estimatedTotalDays * 24 * 60 * 60 * 1000);

        return estDate;
    },

    /**
     * Generates a monthly financial flow projection based on remaining work.
     */
    generateFinancialFlow(project) {
        const remainingVal = project.calculateTotalContract() - project.getExecutedValue();
        if (remainingVal <= 0) return [];

        const physicalProg = project.calculatePhysicalProgress();
        const timeProg = project.calculateTimeProgress();

        // Simple linear distribution for now, but we'll prepare for "S-Curve" adjustments if needed
        const remainingDays = project.term * (1 - timeProg / 100);
        if (remainingDays <= 0) return [{ month: "Mes Final", value: remainingVal }];

        const monthsToProject = Math.ceil(remainingDays / 30);
        const monthlyAverage = remainingVal / monthsToProject;

        const flow = [];
        const today = new Date();

        for (let i = 1; i <= monthsToProject; i++) {
            const projectionDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            flow.push({
                month: projectionDate.toLocaleString('es-ES', { month: 'short', year: '2-digit' }),
                value: monthlyAverage,
                date: projectionDate
            });
        }

        return flow;
    },

    /**
     * Returns a health status based on RCOP Index.
     */
    getHealthStatus(project) {
        const rcop = project.calculateRCOPIndex();
        if (rcop >= 95) return { status: 'Normal', color: '#10b981', icon: 'fa-check-circle' };
        if (rcop >= 80) return { status: 'Alerta', color: '#f59e0b', icon: 'fa-exclamation-triangle' };
        return { status: 'Crítico', color: '#ef4444', icon: 'fa-times-circle' };
    }
};
