class Project {
    constructor(d) {
        this.id = d.id || Math.random().toString(36).substr(2, 9);
        this.name = d.name || '';
        this.contractId = d.contractId || '';
        this.client = d.client || '';
        this.awardDate = d.awardDate || '';
        this.startDate = d.startDate || d.awardDate || '';
        this.term = parseInt(d.term) || 365;
        this.contractType = d.contractType || 'Precios Unitarios';
        this.codigoSafi = d.codigoSafi || '';
        this.codigoBip = d.codigoBip || '';
        this.items = d.items || [];
        this.progressEntries = d.progressEntries || [];
        this.edps = d.edps || [];
        this.currency = d.currency || 'CLP';
        this.annexes = d.annexes || {
            retentionRate: 0.10,
            retentionCapRate: 0.05,
            reajusteIndex: this.currency === 'UF' ? 1.0 : 1.05,
            advanceTotal: 0,
            advanceReturned: 0
        };
        // --- Venta Contractual & Modificaciones ---
        this.baselineItems = d.baselineItems || null;         // null = no baseline defined yet
        this.baselineLockedAt = d.baselineLockedAt || null;   // ISO date string
        this.contractModifications = d.contractModifications || []; // [{number, date, description, itemsSnapshot}]
    }

    // --- Core Calculations ---
    calculateTotalContract() { return (this.items || []).reduce((s, i) => s + (i.quantity * i.price), 0); }
    calculateRetentionCap() { return this.calculateTotalContract() * (this.annexes.retentionCapRate || 0.05); }

    getAccumulatedRetention() {
        return (this.edps || []).reduce((s, e) => {
            if (e.type === 'Devolución de Retenciones') return s - (e.workValue || 0);
            return s + (e.retention || 0);
        }, 0);
    }

    calculatePhysicalProgress() {
        const total = this.calculateTotalContract(); if (total === 0) return 0;
        const exec = this.items.reduce((s, i) => {
            const q = (this.progressEntries || []).filter(e => e.itemId === i.id).reduce((sq, e) => sq + parseFloat(e.quantity), 0);
            return s + (q * i.price);
        }, 0);
        return (exec / total) * 100;
    }

    calculateTimeProgress() {
        if (!this.startDate) return 0;
        const start = new Date(this.startDate);
        const today = new Date();
        const elapsed = (today - start) / (1000 * 60 * 60 * 24);
        return Math.min(100, Math.max(0, (elapsed / this.term) * 100));
    }

    calculateRCOPIndex() {
        const physical = this.calculatePhysicalProgress();
        const time = this.calculateTimeProgress();
        if (time === 0) return 100;
        return (physical / time) * 100;
    }

    getAccumulatedQty(itemId) {
        return (this.progressEntries || [])
            .filter(e => e.itemId === itemId)
            .reduce((s, e) => s + parseFloat(e.quantity), 0);
    }

    getInvoicedQty(itemId) {
        return (this.edps || []).filter(edp => !edp.type || edp.type === 'Avance de Obra').reduce((s, edp) => {
            const item = (edp.items || []).find(i => i.itemId === itemId);
            return s + (item ? parseFloat(item.quantity) : 0);
        }, 0);
    }

    getPendingQty(itemId) { return this.getAccumulatedQty(itemId) - this.getInvoicedQty(itemId); }

    getExecutedValue() {
        return (this.items || []).reduce((s, i) => s + (this.getAccumulatedQty(i.id) * i.price), 0);
    }

    getTotalInvoicedValue() {
        return (this.edps || []).filter(edp => !edp.type || edp.type === 'Avance de Obra').reduce((s, e) => s + (e.workValue || 0), 0);
    }

    // --- Venta Contractual & Modificaciones ---
    hasBaseline() { return this.baselineLockedAt !== null && this.baselineItems !== null; }

    getBaselineValue() {
        if (!this.baselineItems) return 0;
        return this.baselineItems.reduce((s, i) => s + (i.quantity * i.price), 0);
    }

    // Returns current total minus baseline. Positive = increase, negative = decrease.
    getContractVariation() {
        if (!this.hasBaseline()) return 0;
        return this.calculateTotalContract() - this.getBaselineValue();
    }

    // % increase relative to original contract value
    getContractIncreasePercent() {
        const baseline = this.getBaselineValue();
        if (baseline === 0) return 0;
        return (this.getContractVariation() / baseline) * 100;
    }

    // RCOP limit: max 35% increase OR decrease
    isOverRCOPLimit() { return Math.abs(this.getContractIncreasePercent()) > 35; }

    isNearRCOPLimit() {
        const pct = Math.abs(this.getContractIncreasePercent());
        return pct >= 20 && pct <= 35;
    }

    // --- Per-Item RCOP Rules (30% limit per individual item) ---
    getItemBaselineQty(itemId) {
        if (!this.baselineItems) return null;
        const b = this.baselineItems.find(i => i.id === itemId);
        return b ? b.quantity : null;
    }

    getItemBaselinePrice(itemId) {
        if (!this.baselineItems) return null;
        const b = this.baselineItems.find(i => i.id === itemId);
        return b ? b.price : null;
    }

    // % variation of a specific item quantity vs baseline. Returns null if not in baseline.
    getItemVariationPct(itemId) {
        const baseQty = this.getItemBaselineQty(itemId);
        if (baseQty === null || baseQty === 0) return null;
        const current = (this.items.find(i => i.id === itemId) || {}).quantity || 0;
        return ((current - baseQty) / baseQty) * 100;
    }

    // RCOP: individual item increase cannot exceed 30%
    isItemOverIndividualLimit(itemId) {
        const pct = this.getItemVariationPct(itemId);
        return pct !== null && pct > 30;
    }

    // Determine display type of an item
    getItemDisplayType(item) {
        if (!this.hasBaseline()) return null;
        if (item.itemType === 'Convenida') return 'Convenida';
        if (item.itemType === 'Extraordinaria') return 'Extraordinaria';
        const baselineItem = this.baselineItems.find(b => b.id === item.id);
        if (!baselineItem) return 'Extraordinaria'; // new item not in baseline
        const pct = this.getItemVariationPct(item.id);
        if (pct !== null && pct > 30) return 'Modificada>30%';
        if (pct !== null && pct !== 0) return 'Modificada';
        return 'Original';
    }
}
