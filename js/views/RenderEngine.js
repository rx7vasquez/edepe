const RenderEngine = {
    formatCurrency(v, currency = 'CLP') {
        if (currency === 'UF') {
            return `UF ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
        }
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v);
    },

    dashboard(pjs) {
        const total = pjs.length;
        const val = pjs.reduce((s, p) => s + p.calculateTotalContract(), 0);
        return `
        <div class="view active">
            <div class="view-header"><h1>Dashboard Global</h1><p>Control de Gestión MOP</p></div>
            <div class="stats-grid">
                <div class="stat-card"><div><h3>Contratos Activos</h3><div class="value">${total}</div></div></div>
                <div class="stat-card"><div><h3>Cartera Total</h3><div class="value">${this.formatCurrency(val)}</div></div></div>
            </div>
            <div class="items-section" style="margin-top:20px;">
                <h3>Resumen de Estados de Pago</h3>
                <p style="color:var(--text-muted); margin-top:10px;">En esta sección se visualizarán los indicadores financieros globales.</p>
            </div>
        </div>`;
    },

    proyectos(pjs) {
        return `
        <div class="view active">
            <div class="view-header header-flex"><h1>Proyectos MOP</h1><button class="btn-primary" data-view="project-form"><i class="fas fa-plus"></i> Nuevo Proyecto</button></div>
            <div class="project-grid">
                ${pjs.length ? pjs.map(p => `
                    <div class="project-card" data-project-id="${p.id}">
                        <div class="card-header"><span class="status-badge">${p.contractId}</span></div>
                        <h3 style="margin:10px 0;">${p.name}</h3>
                        <p style="font-size:0.8rem; color:#94a3b8; margin-bottom:15px;">${p.client}</p>
                        <div class="progress-bar"><div class="fill" style="width:${p.calculatePhysicalProgress()}%"></div></div>
                        <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-top:10px;">
                            <span>Avance: ${p.calculatePhysicalProgress().toFixed(1)}%</span>
                            <span>${this.formatCurrency(p.calculateTotalContract(), p.currency)}</span>
                        </div>
                    </div>`).join('') : '<div class="stat-card full-width">No se encontraron proyectos.</div>'}
            </div>
        </div>`;
    },

    details(p) {
        const prog = p.calculatePhysicalProgress().toFixed(1);
        const totalInvoiced = p.edps.reduce((s, e) => s + e.net, 0);
        const totalRetention = p.edps.reduce((s, e) => s + e.retention, 0);
        const totalReajuste = p.edps.reduce((s, e) => s + (e.reajuste || 0), 0);

        // --- Baseline & Aumentos ---
        const hasBaseline = p.hasBaseline();
        const baselineValue = p.getBaselineValue();
        const increasePct = p.getContractIncreasePercent();
        const variation = p.getContractVariation();
        const overLimit = p.isOverRCOPLimit();
        const nearLimit = p.isNearRCOPLimit();

        const increaseColor = overLimit ? 'var(--danger)' : nearLimit ? 'var(--accent)' : 'var(--secondary)';
        const isDecrease = increasePct < 0;
        const increaseIcon = overLimit ? '⛔' : nearLimit ? '⚠️' : (isDecrease ? '📉' : '✅');

        const baselineBadge = !hasBaseline
            ? `<span style="background:var(--accent); color:white; font-size:0.75rem; padding:4px 10px; border-radius:20px; font-weight:600; margin-left:10px; vertical-align:middle;">SIN BASELINE</span>`
            : `<span style="background:var(--secondary); color:white; font-size:0.75rem; padding:4px 10px; border-radius:20px; font-weight:600; margin-left:10px; vertical-align:middle;">✔ BASELINE DEFINIDO</span>`;

        const baselineBtn = !hasBaseline && p.items.length > 0
            ? `<button class="btn-primary" id="btn-lock-baseline"><i class="fas fa-lock"></i> Definir Venta Contractual</button>`
            : hasBaseline
                ? `<button class="btn-secondary" id="btn-register-modification"><i class="fas fa-plus-circle"></i> Modificación de Obras</button>`
                : '';

        const baselineCard = hasBaseline ? `
        <div class="baseline-summary-card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
                <div>
                    <div class="baseline-label">Venta Contractual Original</div>
                    <div class="baseline-value">${this.formatCurrency(baselineValue, p.currency)}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Definida el ${new Date(p.baselineLockedAt).toLocaleDateString('es-CL')}</div>
                </div>
                <div style="text-align:center;">
                    <div class="baseline-label">Contrato Actual</div>
                    <div class="baseline-value">${this.formatCurrency(p.calculateTotalContract(), p.currency)}</div>
                </div>
                <div style="text-align:center; border-left: 2px solid var(--border); padding-left: 20px;">
                    <div class="baseline-label">Variación</div>
                    <div style="font-size:1.1rem; font-weight:700; color:${variation >= 0 ? 'var(--secondary)' : 'var(--danger)'};">
                        ${variation >= 0 ? '+' : ''}${this.formatCurrency(variation, p.currency)}
                    </div>
                </div>
                <div class="baseline-increase-badge" style="background:${overLimit ? 'rgba(239,68,68,0.12)' : nearLimit ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'}; border: 1px solid ${increaseColor}; color:${increaseColor};">
                    <div style="font-size:1.6rem; font-weight:800;">${increaseIcon} ${Math.abs(increasePct).toFixed(2)}% ${isDecrease ? 'Dism.' : 'Aum.'}</div>
                    <div style="font-size:0.75rem; opacity:0.85; margin-top:2px;">Variación de Obra (máx. ±35% RCOP)</div>
                    ${overLimit ? `<div style="font-size:0.75rem; font-weight:700; margin-top:4px; color:var(--danger);">⛔ LÍMITE ±35% REGLAMENTARIO SUPERADO</div>` : ''}
                </div>
            </div>
        </div>` : `
        <div class="baseline-empty-banner">
            <i class="fas fa-info-circle" style="font-size:1.3rem; color:var(--accent);"></i>
            <div>
                <b>Venta Contractual sin definir</b>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
                    Cargue las partidas de contrato original y presione "Definir Venta Contractual" para fijar la línea base.
                </p>
            </div>
        </div>`;

        const modificationsHtml = hasBaseline && p.contractModifications.length > 0 ? `
        <div class="items-section" style="margin-top:24px;">
            <h3 style="margin-bottom:16px;"><i class="fas fa-clipboard-list"></i> Historial de Modificaciones de Obras</h3>
            <div class="table-container">
                <table class="mop-table">
                    <thead><tr>
                        <th style="width:60px;">N°</th>
                        <th>Descripción</th>
                        <th>Fecha</th>
                        <th>Valor Contrato</th>
                        <th>Aumento Acum. %</th>
                        <th>Registrado por</th>
                    </tr></thead>
                    <tbody>
                        <tr style="background:var(--bg-card);">
                            <td><span class="status-badge">Base</span></td>
                            <td>Venta Contractual Original</td>
                            <td>${new Date(p.baselineLockedAt).toLocaleDateString('es-CL')}</td>
                            <td><b>${this.formatCurrency(baselineValue, p.currency)}</b></td>
                            <td><span style="color:var(--secondary);">0.00%</span></td>
                            <td style="color:var(--text-muted); font-size:0.85rem;"><i class="fas fa-user" style="margin-right:4px;"></i>${p.baselineLockedBy || '—'}</td>
                        </tr>
                        ${p.contractModifications.map(m => {
            const val = m.itemsSnapshot.reduce((s, i) => s + (i.quantity * i.price), 0);
            const pct = baselineValue > 0 ? ((val - baselineValue) / baselineValue * 100) : 0;
            const c = pct > 35 ? 'var(--danger)' : pct >= 20 ? 'var(--accent)' : 'var(--secondary)';
            return `<tr>
                                <td><span class="status-badge" style="background:var(--primary); color:white; white-space:nowrap;">MO-${String(m.number).padStart(2, '0')}</span></td>
                                <td>${m.description}</td>
                                <td>${new Date(m.date).toLocaleDateString('es-CL')}</td>
                                <td><b>${this.formatCurrency(val, p.currency)}</b></td>
                                <td><span style="color:${c}; font-weight:bold;">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span></td>
                                <td style="color:var(--text-muted); font-size:0.85rem;"><i class="fas fa-user" style="margin-right:4px;"></i>${m.registeredBy || '—'}</td>
                            </tr>`;
        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : '';

        return `
        <div class="view active">
            <div class="view-header header-flex">
                <div>
                    <button class="btn-text" id="btn-back-projects"><i class="fas fa-arrow-left"></i> Volver a Lista</button>
                    <h1>${p.name} ${baselineBadge}</h1>
                    <p>Contrato: ${p.contractId} | SAFI: ${p.codigoSafi || 'N/A'} | BIP: ${p.codigoBip || 'N/A'}</p>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn-secondary" id="btn-edit-project"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-secondary" id="btn-add-item"><i class="fas fa-plus"></i> Partida</button>
                    ${baselineBtn}
                </div>
            </div>

            ${baselineCard}

            <div class="stats-grid" style="margin-top:24px;">
                <div class="stat-card"><div><h3>Presupuesto Actual</h3><div class="value">${this.formatCurrency(p.calculateTotalContract(), p.currency)}</div></div></div>
                <div class="stat-card"><div><h3>Avance Actual</h3><div class="value">${prog}%</div></div></div>
                <div class="stat-card"><div><h3>Valor Facturado</h3><div class="value">${this.formatCurrency(totalInvoiced, p.currency)}</div></div></div>
                <div class="stat-card">
                    <div>
                        <h3>Retención Acum.</h3>
                        <div class="value">${this.formatCurrency(totalRetention, p.currency)}</div>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Tasa: ${(p.annexes.retentionRate * 100).toFixed(0)}% | Máx: ${this.formatCurrency(p.calculateRetentionCap(), p.currency)}</span>
                    </div>
                </div>
                ${p.currency === 'UF' ? '' : `<div class="stat-card"><div><h3>Reajuste Acum.</h3><div class="value" style="color:${totalReajuste >= 0 ? 'var(--primary)' : 'var(--danger)'}">${this.formatCurrency(totalReajuste, p.currency)}</div></div></div>`}
            </div>

            <div class="items-section" style="margin-top:24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">Control de Partidas Contractuales</h3>
                </div>
                <div class="table-container">
                    <table class="mop-table">
                        <thead><tr>
                            <th>Ítem</th>
                            <th>Descripción</th>
                            <th>Unidad</th>
                            <th>Cant.</th>
                            <th>P. Unitario</th>
                            <th>Subtotal</th>
                            ${hasBaseline ? '<th>Var. %</th>' : ''}
                            <th>Tipo</th>
                            <th>Acción</th>
                        </tr></thead>
                        <tbody>
                            ${p.items.length ? p.items.map(i => {
            const displayType = p.getItemDisplayType(i);
            const varPct = hasBaseline ? p.getItemVariationPct(i.id) : null;
            const typeStyles = {
                'Original': 'background:#10b981; color:white;',
                'Modificada': 'background:#f59e0b; color:white;',
                'Modificada>30%': 'background:#ef4444; color:white;',
                'Convenida': 'background:#3b82f6; color:white;',
                'Extraordinaria': 'background:#8b5cf6; color:white;'
            };
            const typeLabels = {
                'Original': 'Original',
                'Modificada': 'Modificada',
                'Modificada>30%': '\u26a0 Mod. >30%',
                'Convenida': 'Convenida',
                'Extraordinaria': 'Extraordinaria'
            };
            const tag = displayType
                ? `<span class="status-badge" style="${typeStyles[displayType] || ''} font-size:0.7rem;">${typeLabels[displayType] || ''}</span>`
                : '';
            const varCell = hasBaseline ? (() => {
                if (varPct === null) return '<td style="color:var(--text-muted); font-size:0.8rem;">&mdash;</td>';
                const c = varPct > 30 ? 'var(--danger)' : varPct > 0 ? 'var(--accent)' : varPct < 0 ? '#3b82f6' : 'var(--text-muted)';
                return `<td style="color:${c}; font-weight:600;">${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%</td>`;
            })() : '';
            const rowStyle = (hasBaseline && p.isItemOverIndividualLimit(i.id)) ? 'background:rgba(239,68,68,0.04);' : '';
            return `<tr style="${rowStyle}">
                                    <td>${i.id}</td>
                                    <td>${i.name}</td>
                                    <td>${i.unit}</td>
                                    <td>${i.quantity}</td>
                                    <td>${this.formatCurrency(i.price, p.currency)}</td>
                                    <td><b>${this.formatCurrency(i.quantity * i.price, p.currency)}</b></td>
                                    ${varCell}
                                    <td>${tag}</td>
                                    <td>
                                        <div style="display:flex; gap:5px;">
                                            <button class="btn-icon btn-edit-item" data-project-id="${p.id}" data-item-id="${i.id}" title="Editar Partida" style="color:var(--primary);"><i class="fas fa-edit"></i></button>
                                            <button class="btn-icon btn-delete-item" data-project-id="${p.id}" data-item-id="${i.id}" title="Eliminar Partida" style="color:var(--danger);"><i class="fas fa-trash-alt"></i></button>
                                        </div>
                                    </td>
                                </tr>`;
        }).join('') : `<tr><td colspan="${hasBaseline ? 9 : 8}" style="text-align:center; padding:40px;">Cargue partidas al proyecto para iniciar el control.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            ${modificationsHtml}
        </div>`;
    },


    clients(cls) {
        return `
        <div class="view active">
            <div class="view-header header-flex"><h1>Maestro de Mandantes</h1><button class="btn-primary" id="btn-add-client"><i class="fas fa-user-plus"></i> Nuevo Mandante</button></div>
            <div class="items-section">
                <table class="mop-table">
                    <thead><tr><th>RUT</th><th>Nombre</th><th>Departamento</th><th>Dirección</th><th>Acciones</th></tr></thead>
                    <tbody>
                        ${cls.length ? cls.map((c, i) => `
                            <tr>
                                <td>${c.rut}</td>
                                <td>${c.name}</td>
                                <td>${c.dept || '-'}</td>
                                <td>${c.addr || '-'}</td>
                                <td>
                                    <div style="display:flex; gap:10px; align-items:center;">
                                        <button class="btn-icon btn-edit-client" data-index="${i}" style="color:var(--primary)"><i class="fas fa-edit"></i></button>
                                        <button class="btn-icon btn-delete-client" data-index="${i}" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:30px;">No hay mandantes registrados.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    financial(pjs, selectedProjectId, filters = {}) {
        if (!selectedProjectId || selectedProjectId === 'ALL') {
            selectedProjectId = pjs.length ? pjs[0].id : null;
            if (window.App && selectedProjectId) {
                window.App.currentProjectId = selectedProjectId;
            }
        }

        const projectOptions = `
            ${pjs.map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${p.contractId} - ${p.name}</option>`).join('')}
        `;

        const filteredPjs = selectedProjectId ? pjs.filter(p => p.id === selectedProjectId) : [];
        let allEdps = filteredPjs.flatMap(p => p.edps.map(e => ({ ...e, projectName: p.name, projectId: p.id, currency: p.currency })));

        const availableYears = [...new Set(filteredPjs.flatMap(p => p.edps.map(e => new Date(e.date).getFullYear())))].sort((a, b) => b - a);
        const yearOptions = `<option value="ALL" ${!filters.year || filters.year === 'ALL' ? 'selected' : ''}>Todos los Años</option>` + availableYears.map(y => `<option value="${y}" ${filters.year === y.toString() ? 'selected' : ''}>${y}</option>`).join('');

        const typeOptions = `
            <option value="ALL" ${!filters.type || filters.type === 'ALL' ? 'selected' : ''}>Todos los Tipos</option>
            <option value="Avance de Obra" ${filters.type === 'Avance de Obra' ? 'selected' : ''}>Avance de Obra</option>
            <option value="Anticipo" ${filters.type === 'Anticipo' ? 'selected' : ''}>Anticipo</option>
            <option value="Devolución de Retenciones" ${filters.type === 'Devolución de Retenciones' ? 'selected' : ''}>Devolución de Retenciones</option>
        `;

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const monthOptions = `<option value="ALL" ${!filters.month || filters.month === 'ALL' ? 'selected' : ''}>Todos los Meses</option>` + monthNames.map((m, i) => `<option value="${i + 1}" ${filters.month === (i + 1).toString() ? 'selected' : ''}>${m}</option>`).join('');

        if (filters.type && filters.type !== 'ALL') allEdps = allEdps.filter(e => (e.type || 'Avance de Obra') === filters.type);
        if (filters.year && filters.year !== 'ALL') allEdps = allEdps.filter(e => new Date(e.date).getFullYear().toString() === filters.year);
        if (filters.month && filters.month !== 'ALL') allEdps = allEdps.filter(e => (new Date(e.date).getMonth() + 1).toString() === filters.month);
        if (filters.hasRetention) allEdps = allEdps.filter(e => (e.retention || 0) > 0);

        allEdps.sort((a, b) => new Date(b.date) - new Date(a.date));

        return `
        <div class="view active">
            <div class="view-header header-flex" style="flex-wrap: wrap; gap: 20px; align-items: flex-end;">
                <div>
                    <h1>Estados de Pago</h1>
                    <p>Registro histórico y control financiero consolidado</p>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    <button class="btn-primary" id="btn-generate-edp" ${!selectedProjectId ? 'disabled' : ''} style="padding: 10px 15px;"><i class="fas fa-file-invoice"></i> Generar Estado de Pago</button>
                    <select id="financial-project-select" class="form-control" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); min-width: 200px;">
                        ${projectOptions}
                    </select>
                    <select id="financial-filter-type" class="form-control" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main);">
                        ${typeOptions}
                    </select>
                    <select id="financial-filter-year" class="form-control" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main);">
                        ${yearOptions}
                    </select>
                    <select id="financial-filter-month" class="form-control" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main);">
                        ${monthOptions}
                    </select>
                    <label style="display: flex; align-items: center; gap: 5px; color: var(--text-main); cursor: pointer;">
                        <input type="checkbox" id="financial-filter-retention" ${filters.hasRetention ? 'checked' : ''}>
                        Solo con Retenciones
                    </label>
                </div>
            </div>
            <div class="items-section">
                <table class="mop-table">
                    <thead><tr><th>Proyecto</th><th>EDP N°</th><th>Tipo</th><th>Fecha</th><th>Bruto</th><th>Reajuste (+/-)</th><th>Retención</th><th>Líquido</th><th>Acción</th></tr></thead>
                    <tbody>
                        ${allEdps.length ? allEdps.map(e => `
                            <tr>
                                <td>${e.projectName}</td>
                                <td style="text-align:center;"><b>${e.number}</b></td>
                                <td><span class="status-badge" style="background:var(--primary); color:white;">${e.type || 'Avance de Obra'}</span></td>
                                <td>${new Date(e.date).toLocaleDateString()}</td>
                                <td>${this.formatCurrency(e.workValue, e.currency)}</td>
                                ${e.currency === 'UF' ? '<td>-</td>' : `<td style="color:${(e.reajuste || 0) >= 0 ? 'var(--primary)' : 'var(--danger)'}">${this.formatCurrency(e.reajuste || 0, e.currency)}</td>`}
                                <td style="color:var(--accent)">-${this.formatCurrency(e.retention || 0, e.currency)}</td>
                                <td style="font-weight:bold; color:var(--text-main);">${this.formatCurrency(e.net, e.currency)}</td>
                                <td>
                                    <button class="btn-icon btn-view-edp" data-project-id="${e.projectId}" data-edp-number="${e.number}" title="Ver Detalle Ítemizado">
                                        <i class="fas fa-search-dollar"></i>
                                    </button>
                                </td>
                            </tr>`).join('') : '<tr><td colspan="9" style="text-align:center; padding:30px;">No hay estados de pago generados para esta selección.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    projections(pjs) {
        if (!pjs || pjs.length === 0) {
            return `
            <div class="view active">
                <div class="view-header"><h1>Proyecciones y Flujos</h1><p>Análisis de cumplimiento y estimaciones</p></div>
                <div class="items-section" style="text-align:center; padding:40px;">
                    <h3>No hay proyectos para proyectar.</h3>
                </div>
            </div>`;
        }

        const projectForecasts = pjs.map(p => {
            const health = ProjectionService.getHealthStatus(p);
            const rcop = p.calculateRCOPIndex().toFixed(1);
            const estEnd = ProjectionService.estimateCompletionDate(p);
            const flow = ProjectionService.generateFinancialFlow(p);
            const maxVal = flow.length > 0 ? Math.max(...flow.map(f => f.value)) : 1;

            return `
            <div class="items-section" style="margin-bottom:30px; border-left: 5px solid ${health.color}; padding-left: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:20px;">
                    <div>
                        <h3 style="margin:0;">${p.name}</h3>
                        <p style="color:var(--text-muted); font-size:0.9rem;">Estado: <b style="color:${health.color}">${health.status}</b> | RCOP: ${rcop}%</p>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:0.8rem; color:var(--text-muted);">Término Estimado:</span>
                        <div style="font-weight:bold; color:white;">${estEnd instanceof Date ? estEnd.toLocaleDateString() : estEnd}</div>
                    </div>
                </div>

                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom:20px;">
                    <div class="stat-card" style="padding:15px; background:rgba(255,255,255,0.02);">
                        <div style="font-size:0.8rem; color:var(--text-muted);">Avance Físico</div>
                        <div style="font-size:1.2rem; font-weight:bold;">${p.calculatePhysicalProgress().toFixed(1)}%</div>
                    </div>
                    <div class="stat-card" style="padding:15px; background:rgba(255,255,255,0.02);">
                        <div style="font-size:0.8rem; color:var(--text-muted);">Avance Temporal</div>
                        <div style="font-size:1.2rem; font-weight:bold;">${p.calculateTimeProgress().toFixed(1)}%</div>
                    </div>
                    <div class="stat-card" style="padding:15px; background:rgba(255,255,255,0.02);">
                        <div style="font-size:0.8rem; color:var(--text-muted);">Saldo por Ejecutar</div>
                        <div style="font-size:1.1rem; font-weight:bold; color:var(--primary);">${this.formatCurrency(p.calculateTotalContract() - p.getExecutedValue(), p.currency)}</div>
                    </div>
                </div>

                <h4>Proyección de Flujo Mensual (EDPs Estimados)</h4>
                <div style="display:flex; align-items:flex-end; gap:8px; height:120px; margin-top:15px; background:rgba(0,0,0,0.2); border-radius:8px; padding:10px;">
                    ${flow.length > 0 ? flow.map(f => `
                        <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:5px;">
                            <div style="width:100%; background:var(--primary); opacity:0.7; height:${(f.value / maxVal) * 80}px; border-top-left-radius:4px; border-top-right-radius:4px; position:relative;" title="${this.formatCurrency(f.value, p.currency)}">
                                <span style="position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-size:0.6rem; color:var(--primary); font-weight:bold;">${p.currency === 'UF' ? (f.value / 1000).toFixed(1) + 'k' : (f.value / 1000000).toFixed(1) + 'M'}</span>
                            </div>
                            <span style="font-size:0.6rem; color:var(--text-muted);">${f.month}</span>
                        </div>
                    `).join('') : '<div style="width:100%; text-align:center; color:var(--text-muted); line-height:100px;">No hay saldo pendiente para proyectar flujo.</div>'}
                </div>
            </div>`;
        }).join('');

        return `
        <div class="view active">
            <div class="view-header"><h1>Análisis RCOP y Proyecciones</h1><p>Salud contractual y estimaciones financieras de cartera</p></div>
            ${projectForecasts}
        </div>`;
    },

    avances(pjs, selectedProjectId) {
        if (!pjs || pjs.length === 0) {
            return `
            <div class="view active">
                <div class="view-header"><h1>Control de Avances</h1><p>Seleccione un proyecto para gestionar sus partidas</p></div>
                <div class="items-section" style="text-align:center; padding:40px;">
                    <i class="fas fa-folder-open fa-3x" style="margin-bottom:20px; color:var(--text-muted);"></i>
                    <h3>No hay proyectos registrados</h3>
                </div>
            </div>`;
        }

        const projectOptions = pjs.map(p =>
            `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${p.contractId} - ${p.name}</option>`
        ).join('');

        const selectedProject = pjs.find(p => p.id === selectedProjectId) || pjs[0];

        // Gather metrics for the selected project
        const totalContract = selectedProject.calculateTotalContract();
        const totalExecuted = selectedProject.getExecutedValue();
        const totalBilled = selectedProject.getTotalInvoicedValue();
        const balanceToExecute = totalContract - totalExecuted;

        // Group items by classification
        const itemsByClass = {};
        (selectedProject.items || []).forEach(item => {
            const c = item.classification || 'Sin Clasificar';
            if (!itemsByClass[c]) itemsByClass[c] = [];

            const physicalQty = selectedProject.getAccumulatedQty(item.id);
            const invoicedQty = selectedProject.getInvoicedQty(item.id);
            const pendingQty = physicalQty - invoicedQty;
            const balanceQty = item.quantity - physicalQty;

            itemsByClass[c].push({
                item,
                physicalQty,
                invoicedQty,
                pendingQty,
                balanceQty,
                physicalValue: physicalQty * item.price,
                pendingValue: pendingQty * item.price,
                balanceValue: balanceQty * item.price
            });
        });

        const renderGroup = (className, items) => {
            if (!items || items.length === 0) return '';
            const subtotalContract = items.reduce((s, d) => s + (d.item.quantity * d.item.price), 0);
            const subtotalExecuted = items.reduce((s, d) => s + d.physicalValue, 0);
            const groupPct = subtotalContract > 0 ? Math.min(100, (subtotalExecuted / subtotalContract) * 100) : 0;
            const groupColor = groupPct >= 100 ? 'var(--danger)' : groupPct >= 80 ? 'var(--accent)' : 'var(--secondary)';

            const groupKey = encodeURIComponent(className);
            let html = `
            <tbody>
                <tr class="avance-group-header" data-group-toggle="${groupKey}" style="background: rgba(255,255,255,0.05); font-weight:bold; font-size:0.78rem; cursor:pointer; user-select:none;" title="Clic para expandir/contraer">
                    <td colspan="2" style="color: var(--primary);">
                        <i class="fas fa-chevron-down avance-chevron" style="font-size:0.65rem; margin-right:6px; transition:transform 0.2s;"></i><i class="fas fa-folder-open" style="margin-right:5px;"></i> ${className}
                    </td>
                    <td></td>
                    <td></td>
                    <td style="white-space:nowrap; font-size:0.75rem; color:var(--primary);">${this.formatCurrency(subtotalExecuted, selectedProject.currency)} / ${this.formatCurrency(subtotalContract, selectedProject.currency)}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <div style="flex:1; background:var(--border); border-radius:99px; height:5px; min-width:50px;">
                                <div style="height:100%; width:${groupPct.toFixed(1)}%; background:${groupColor}; border-radius:99px;"></div>
                            </div>
                            <span style="font-size:0.72rem; color:${groupColor}; white-space:nowrap; font-weight:700;">${groupPct.toFixed(1)}%</span>
                        </div>
                    </td>
                    <td></td>
                </tr>`;

            items.forEach(d => {
                const itemPct = d.item.quantity > 0 ? Math.min(100, (d.physicalQty / d.item.quantity) * 100) : 0;
                const itemColor = itemPct >= 100 ? 'var(--danger)' : itemPct >= 80 ? 'var(--accent)' : 'var(--secondary)';
                html += `
                <tr class="avance-group-item" data-group-id="${groupKey}" style="font-size:0.78rem;">
                    <td><span class="status-badge" style="font-size:0.68rem; padding:2px 6px;">${d.item.id}</span></td>
                    <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${d.item.name}">${d.item.name}</td>
                    <td>
                        <div style="font-size:0.72rem; line-height:1.7;">
                            <div><span style="color:var(--text-muted);">Total:</span> <b>${d.item.quantity}</b></div>
                            <div><span style="color:var(--primary);">Ejec.:</span> <b>${d.physicalQty}</b></div>
                            <div><span style="color:var(--text-muted);">Saldo:</span> ${d.balanceQty}</div>
                        </div>
                    </td>
                    <td style="color:var(--text-muted);">${d.item.unit}</td>
                    <td>
                        <div style="font-size:0.72rem; line-height:1.5;">
                            <div style="color:var(--primary);">${this.formatCurrency(d.physicalValue, selectedProject.currency)}</div>
                            <div style="color:var(--text-muted);">Saldo: ${this.formatCurrency(d.balanceValue, selectedProject.currency)}</div>
                        </div>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:5px;">
                            <div style="flex:1; background:var(--border); border-radius:99px; height:5px; min-width:40px;">
                                <div style="height:100%; width:${itemPct.toFixed(1)}%; background:${itemColor}; border-radius:99px;"></div>
                            </div>
                            <span style="font-size:0.72rem; color:${itemColor}; white-space:nowrap; font-weight:700;">${itemPct.toFixed(1)}%</span>
                        </div>
                    </td>
                    <td>
                        <div style="display:flex; gap:5px; flex-wrap:nowrap; align-items:center;">
                            <button class="btn-icon btn-add-progress" data-project-id="${selectedProject.id}" data-item-id="${d.item.id}" title="Añadir Avance"><i class="fas fa-plus-circle"></i></button>
                            <button class="btn-icon btn-view-history" data-project-id="${selectedProject.id}" data-item-id="${d.item.id}" title="Ver Historial"><i class="fas fa-history"></i></button>
                        </div>
                    </td>
                </tr>`;
            });
            html += '</tbody>';
            return html;
        };

        const groupsHtml = Object.keys(itemsByClass).map(c => renderGroup(c, itemsByClass[c])).join('');

        return `
        <div class="view active">
            <div class="view-header header-flex">
                <div>
                    <h1>Reporte de Avances y Saldos</h1>
                    <p>Métricas consolidadas de ejecución física, saldos por cobrar y saldos de obra.</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
                    <label style="font-size:0.8rem; color:var(--text-muted);">Proyecto</label>
                    <select id="avances-project-select" style="padding: 12px; border-radius: 8px; background: white; color: var(--text-main); border: 2px solid var(--primary); min-width: 320px; font-weight: 500; font-size: 1.05rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; outline: none; transition: all 0.2s ease;">
                        ${projectOptions}
                    </select>
                </div>
            </div>

            <div class="stats-grid" style="margin-bottom: 25px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                <div class="stat-card" style="border-left: 4px solid var(--text-muted);">
                    <div><h3>Total Contrato</h3><div class="value">${this.formatCurrency(totalContract, selectedProject.currency)}</div></div>
                </div>
                <div class="stat-card" style="border-left: 4px solid var(--primary);">
                    <div><h3>Ejecución Física Acum.</h3><div class="value" style="color:var(--primary);">${this.formatCurrency(totalExecuted, selectedProject.currency)}</div></div>
                </div>
                <div class="stat-card" style="border-left: 4px solid var(--accent);">
                    <div><h3>Recepcionado (Facturado)</h3><div class="value">${this.formatCurrency(totalBilled, selectedProject.currency)}</div></div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #f59e0b;">
                    <div><h3>Saldo por Ejecutar</h3><div class="value">${this.formatCurrency(balanceToExecute, selectedProject.currency)}</div></div>
                </div>
            </div>

            <div class="items-section">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">Desglose de Partidas</h3>
                </div>
                <div class="table-container">
                    <table class="mop-table">
                        <thead>
                            <tr style="font-size:0.78rem;">
                                <th>Ítem</th>
                                <th>Descripción</th>
                                <th>Cantidades</th>
                                <th>Un.</th>
                                <th>Valorización</th>
                                <th>Avance %</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        ${groupsHtml || '<tbody><tr><td colspan="7" style="text-align:center; padding:20px;">No hay partidas registradas.</td></tr></tbody>'}
                    </table>
                </div>
            </div>
        </div>`;
    },


    'project-form'(clients) {
        return `
        <div class="view active">
            <div class="view-header"><button class="btn-text" id="btn-back-projects"><i class="fas fa-arrow-left"></i> Cancelar</button><h1>Configuración de Nuevo Proyecto</h1></div>
            <form id="project-form" class="mop-form">
                <div class="mop-form-grid">
                    <div class="full-width"><label>Nombre Obra</label><input type="text" name="name" placeholder="Ej: Mejoramiento Ruta X" required></div>
                    <div><label>Contrato ID / MP</label><input type="text" name="contractId" placeholder="Ej: 1234-56-LP23" required></div>
                    <div>
                        <label>Mandante</label>
                        <select name="client" required>
                            ${clients.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div><label>SAFI</label><input type="text" name="codigoSafi"></div>
                    <div><label>BIP</label><input type="text" name="codigoBip"></div>
                    <div><label>Adjudicación</label><input type="date" name="awardDate" required></div>
                    <div><label>Inicio de Obra</label><input type="date" name="startDate" required></div>
                    <div><label>Plazo (Días)</label><input type="number" name="term" value="365" required></div>
                    <div class="full-width"><label>Moneda del Contrato</label>
                        <select name="currency" onchange="
                            const isUf = this.value === 'UF';
                            document.getElementById('form-new-reajuste-sys').style.display = isUf ? 'none' : 'block';
                            if(isUf) document.getElementById('project-tipo-reajuste-select').value = 'Ninguno';
                            document.getElementById('project-tipo-reajuste-select').dispatchEvent(new Event('change'));
                        ">
                            <option value="CLP">Pesos Chilenos (CLP)</option>
                            <option value="UF">Unidad de Fomento (UF)</option>
                        </select>
                    </div>
                    <div><label>Retención (0.10)</label><input type="number" step="0.01" name="retentionRate" value="0.10"></div>
                    <div><label>Límite Retención (0.05)</label><input type="number" step="0.01" name="retentionCapRate" value="0.05"></div>
                    <div><label>Anticipo ($)</label><input type="number" name="advanceTotal" value="0"></div>
                    
                    <div id="form-new-reajuste-sys" class="full-width" style="margin-bottom:10px;">
                        <label>Sistema de Reajuste</label>
                        <select name="tipoReajuste" id="project-tipo-reajuste-select" onchange="
                            const v = this.value;
                            document.getElementById('form-new-reajuste-mop').style.display = v === 'Polinomio' ? 'flex' : 'none';
                            document.getElementById('form-new-reajuste-ipc').style.display = v === 'IPC' ? 'flex' : 'none';
                        ">
                            <option value="Polinomio">Reajuste Polinómico (MOP)</option>
                            <option value="IPC">Reajuste por IPC (INE)</option>
                            <option value="Ninguno">Sin Reajuste</option>
                        </select>
                    </div>

                    <!-- MOP Polinomio Container -->
                    <div id="form-new-reajuste-mop" class="full-width" style="display:flex; gap:10px; flex-wrap:wrap; background:rgba(255,152,0,0.05); padding:15px; border-radius:10px; border:1px solid rgba(255,152,0,0.2); margin-bottom:10px;">
                        <h4 style="width:100%; margin:0 0 10px 0; color:var(--accent); font-size:0.9rem;"><i class="fas fa-hammer"></i> Configuración Polinómica</h4>
                        <div style="flex:1; min-width:200px;">
                            <label>Tipo de Obra</label>
                            <select name="tipo_obra" id="project-tipo-reajuste">
                                <option value="Infraestructura vial y portuaria">Infraestructura vial y portuaria</option>
                                <option value="Infraestructura Hidráulica">Infraestructura Hidráulica</option>
                                <option value="Infraestructura aeroportuaria">Infraestructura aeroportuaria</option>
                                <option value="Edificación Pública">Edificación Pública</option>
                            </select>
                        </div>
                        <div style="flex:1; min-width:200px;">
                            <label>Subtipo de Obra</label>
                            <select name="subtipo_obra" id="project-subtipo-reajuste">
                                <option value="General">General</option>
                                <option value="Intensivo en mano de obra">Intensivo en mano de obra</option>
                <div style="flex:1; min-width:150px;">
                            <label>Índice Mes Presupuesto (Base)</label>
                            <input type="number" step="0.0001" name="reajusteIndex" value="100.0000" required>
                        </div>
                    </div>

                    <!-- IPC Container -->
                    <div id="form-new-reajuste-ipc" class="full-width" style="display:none; gap:10px; flex-wrap:wrap; background:rgba(59,130,246,0.05); padding:15px; border-radius:10px; border:1px solid rgba(59,130,246,0.2); margin-bottom:10px;">
                        <h4 style="width:100%; margin:0 0 10px 0; color:var(--primary); font-size:0.9rem;"><i class="fas fa-chart-pie"></i> Configuración IPC</h4>
                        <div style="flex:1; min-width:150px;">
                            <label>Índice Mes Presupuesto (Base IPC Points)</label>
                            <input type="number" step="0.0001" name="reajusteIndex" value="100.0000">
                        </div>
                    </div>

                    <div class="full-width"><label>Tipo de Contrato</label>
                        <select name="contractType">
                            <option value="Precios Unitarios">Precios Unitarios</option>
                            <option value="Suma Alzada">Suma Alzada</option>
                            <option value="Mixto">Mixto</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn-primary" style="width:200px; justify-content:center;">Crear Contrato</button>
            </form>
        </div>`;
    },

    login() {
        return `
        <div style="height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg);">
            <div class="stat-card" style="width:100%; max-width:400px; padding:40px; text-align:center; border:1px solid var(--border);">
                <div style="margin-bottom:30px;">
                    <i class="fas fa-microchip fa-3x" style="color:var(--primary); margin-bottom:15px;"></i>
                    <h1 style="margin:0;">MOP Project Control</h1>
                    <p style="color:var(--text-muted);">Inicie sesión para continuar</p>
                </div>
                <form id="login-form" class="mop-form">
                    <div style="text-align:left; margin-bottom:15px;">
                        <label>Correo Electrónico</label>
                        <input type="email" name="email" required placeholder="ejemplo@mop.cl">
                    </div>
                    <div style="text-align:left; margin-bottom:15px;">
                        <label>Contraseña</label>
                        <input type="password" name="password" required placeholder="••••••••">
                    </div>
                    <div style="text-align:right; margin-bottom:20px;">
                        <button type="button" id="btn-forgot-password" class="btn-text" style="padding:0; font-size:0.8rem; color:var(--primary);">¿Olvidó su contraseña?</button>
                    </div>
                    <button type="submit" class="btn-primary full-width" style="justify-content:center;">Entrar al Sistema</button>
                    <p id="login-error" style="color:var(--danger); margin-top:15px; display:none; font-size:0.9rem;">Credenciales incorrectas.</p>
                </form>
            </div>
        </div>`;
    },

    recovery() {
        return `
        <div style="height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg);">
            <div class="stat-card" style="width:100%; max-width:400px; padding:40px; text-align:center; border:1px solid var(--border);">
                <div style="margin-bottom:30px;">
                    <i class="fas fa-key fa-3x" style="color:var(--primary); margin-bottom:15px;"></i>
                    <h1 style="margin:0;">Recuperar Acceso</h1>
                    <p style="color:var(--text-muted);">Ingrese su correo para iniciar la recuperación</p>
                </div>
                <form id="recovery-form" class="mop-form">
                    <div style="text-align:left; margin-bottom:25px;">
                        <label>Correo Electrónico</label>
                        <input type="email" name="email" required placeholder="ejemplo@mop.cl">
                    </div>
                    <button type="submit" class="btn-primary full-width" style="justify-content:center;">Verificar Cuenta</button>
                    <button type="button" id="btn-back-login" class="btn-text full-width" style="margin-top:15px;"><i class="fas fa-arrow-left"></i> Volver al Login</button>
                    <p id="recovery-error" style="color:var(--danger); margin-top:15px; display:none; font-size:0.9rem;">El correo no está registrado en el sistema.</p>
                </form>
            </div>
        </div>`;
    },

    reset(email) {
        return `
        <div style="height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg);">
            <div class="stat-card" style="width:100%; max-width:400px; padding:40px; text-align:center; border:1px solid var(--border);">
                <div style="margin-bottom:30px;">
                    <i class="fas fa-shield-alt fa-3x" style="color:var(--primary); margin-bottom:15px;"></i>
                    <h1 style="margin:0;">Nueva Contraseña</h1>
                    <p style="color:var(--text-muted);">Cuenta verificada: <b>${email}</b></p>
                </div>
                <form id="reset-form" class="mop-form">
                    <input type="hidden" name="email" value="${email}">
                    <div style="text-align:left; margin-bottom:15px;">
                        <label>Contraseña Nueva</label>
                        <input type="password" name="password" required placeholder="••••••••" autofocus>
                    </div>
                    <div style="text-align:left; margin-bottom:25px;">
                        <label>Confirmar Contraseña</label>
                        <input type="password" name="confirmPassword" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn-primary full-width" style="justify-content:center;">Actualizar Contraseña</button>
                    <p id="reset-error" style="color:var(--danger); margin-top:15px; display:none; font-size:0.9rem;">Las contraseñas no coinciden.</p>
                </form>
            </div>
        </div>`;
    },

    usuarios(users, projects, searchTerm = '', roleFilter = 'Todos') {
        const filteredUsers = users.filter(u => {
            const matchesSearch = `${u.name} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'Todos' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });

        return `
        <div class="view active">
            <div class="view-header" style="flex-wrap: wrap; gap: 20px;">
                <div>
                    <h1>Gestión de Colaboradores</h1>
                    <p style="color:var(--text-muted);">Administre el acceso y roles del personal</p>
                </div>
                <button class="btn-primary" id="btn-nuevo-usuario"><i class="fas fa-user-plus"></i> Nuevo Usuario</button>
            </div>

            <div class="stat-card" style="margin-bottom:20px; padding:20px; display:flex; gap:15px; align-items:flex-end; flex-wrap:wrap;">
                <div class="form-group" style="flex:1; min-width:250px;">
                    <label style="font-size:0.8rem; color:var(--text-muted); margin-bottom:5px; display:block;">Buscar Usuario</label>
                    <div style="position:relative;">
                        <i class="fas fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
                        <input type="text" id="user-search" value="${searchTerm}" placeholder="Nombre, apellido o correo..." style="padding-left:35px; width:100%;">
                    </div>
                </div>
                <div class="form-group" style="width:200px;">
                    <label style="font-size:0.8rem; color:var(--text-muted); margin-bottom:5px; display:block;">Filtrar por Rol</label>
                    <select id="user-role-filter" style="width:100%;">
                        <option value="Todos" ${roleFilter === 'Todos' ? 'selected' : ''}>Todos los Roles</option>
                        <option value="Administrador" ${roleFilter === 'Administrador' ? 'selected' : ''}>Administrador</option>
                        <option value="Jefe de Proyecto" ${roleFilter === 'Jefe de Proyecto' ? 'selected' : ''}>Jefe de Proyecto</option>
                        <option value="Inspector" ${roleFilter === 'Inspector' ? 'selected' : ''}>Inspector</option>
                        <option value="Operador de Terreno" ${roleFilter === 'Operador de Terreno' ? 'selected' : ''}>Operador de Terreno</option>
                    </select>
                </div>
                <div style="color:var(--text-muted); font-size:0.9rem; padding-bottom:10px;">
                    Mostrando ${filteredUsers.length} de ${users.length}
                </div>
            </div>

            <div class="items-section">
                <div class="table-container">
                    <table class="mop-table">
                        <thead>
                            <tr>
                                <th>Colaborador</th>
                                <th>Email</th>
                                <th>Cargo</th>
                                <th>Rol</th>
                                <th>Proyectos</th>
                                <th style="text-align:right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredUsers.length ? filteredUsers.map(u => `
                                <tr>
                                    <td>
                                        <div style="display:flex; align-items:center; gap:10px;">
                                            <div style="width:32px; height:32px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.8rem;">
                                                ${u.name[0]}${u.lastName[0]}
                                            </div>
                                            <b>${u.name} ${u.lastName}</b>
                                        </div>
                                    </td>
                                    <td style="color:var(--text-muted); font-size:0.9rem;">${u.email}</td>
                                    <td>${u.position}</td>
                                    <td>
                                        <span class="status-badge" style="${u.role === 'Administrador' ? 'background:var(--primary); color:white;' : 'background:rgba(23,129,156,0.1); color:var(--primary);'}">
                                            ${u.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span style="font-size:0.9rem;">
                                            <i class="fas fa-project-diagram" style="margin-right:5px; opacity:0.5;"></i> ${u.assignedProjectIds.length}
                                        </span>
                                    </td>
                                    <td>
                                        <div style="display:flex; gap:10px; justify-content:flex-end;">
                                            <button class="btn-icon btn-assign-projects" data-user-id="${u.id}" title="Asignar Proyectos"><i class="fas fa-link"></i></button>
                                            <button class="btn-icon btn-edit-user" data-user-id="${u.id}" title="Editar" style="color:var(--primary);"><i class="fas fa-edit"></i></button>
                                            ${u.role !== 'Administrador' ? `
                                                <button class="btn-icon btn-delete-user" data-user-id="${u.id}" title="Eliminar" style="color:var(--danger);"><i class="fas fa-trash-alt"></i></button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>`).join('') : `
                                <tr>
                                    <td colspan="6" style="text-align:center; padding:40px;">
                                        <i class="fas fa-user-slash fa-2x" style="display:block; margin-bottom:10px; opacity:0.3;"></i>
                                        No se encontraron colaboradores con los filtros aplicados.
                                    </td>
                                </tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    },

    'user-form'(u = {}) {
        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2>${u.id ? 'Editar' : 'Nuevo'} Usuario</h2><button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button></div>
        <form id="user-form" class="mop-form">
            <input type="hidden" name="userId" value="${u.id || ''}">
            <div class="mop-form-grid">
                <div><label>Nombre</label><input type="text" name="name" value="${u.name || ''}" required></div>
                <div><label>Apellido</label><input type="text" name="lastName" value="${u.lastName || ''}" required></div>
                <div class="full-width"><label>Email</label><input type="email" name="email" value="${u.email || ''}" required></div>
                <div class="full-width"><label>Cargo</label><input type="text" name="position" value="${u.position || ''}" required></div>
                <div class="full-width"><label>Rol</label>
                    <select name="role">
                        <option value="Administrador" ${u.role === 'Administrador' ? 'selected' : ''}>Administrador</option>
                        <option value="Jefe de Proyecto" ${u.role === 'Jefe de Proyecto' ? 'selected' : ''}>Jefe de Proyecto</option>
                        <option value="Inspector" ${u.role === 'Inspector' ? 'selected' : ''}>Inspector</option>
                        <option value="Operador de Terreno" ${u.role === 'Operador de Terreno' ? 'selected' : ''}>Operador de Terreno</option>
                    </select>
                </div>
                <div><label>Contraseña</label><input type="password" name="password" placeholder="${u.id ? '(Sin cambios)' : 'Obligatorio'}" ${u.id ? '' : 'required'}></div>
            </div>
            <button type="submit" class="btn-primary full-width" style="justify-content:center; margin-top:20px;">Guardar Usuario</button>
        </form>`;
    },

    'user-profile'(u) {
        const avatarHtml = u.avatar
            ? `<img src="${u.avatar}" class="avatar-img" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); margin:0 auto 15px auto; display:block;">`
            : `<div style="width:80px; height:80px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 15px auto; border:2px solid var(--primary);">${u.name.charAt(0)}${u.lastName ? u.lastName.charAt(0) : ''}</div>`;

        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2>Mi Perfil</h2>
            <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <form id="user-profile-form" class="mop-form">
            <div style="text-align:center;">
                ${avatarHtml}
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-size:0.8rem; color:var(--text-muted); margin-bottom:5px;">Cambiar Foto de Perfil</label>
                    <input type="file" name="avatarFile" accept="image/*" style="font-size:0.8rem; width:100%; max-width:250px; margin:0 auto; display:block; padding:5px;">
                </div>
            </div>
            
            <div class="mop-form-grid">
                <div><label>Nombre</label><input type="text" name="name" value="${u.name}" required></div>
                <div><label>Apellido</label><input type="text" name="lastName" value="${u.lastName}" required></div>
                <div class="full-width"><label>Email</label><input type="email" name="email" value="${u.email}" required></div>
            </div>
            
            <button type="submit" class="btn-primary full-width" style="justify-content:center; margin-top:10px;">Guardar Cambios</button>
        </form>`;
    },

    'mantenedor-reajuste'({ polinomioIndices = [], ipcIndices = [], activeTab = 'polinomio', isSyncingMop = false, isSyncingIpc = false } = {}) {

        // ---- Tabla Polinomio ----
        const mopRowsHtml = polinomioIndices.length > 0 ? polinomioIndices.map(i => `
            <tr>
                <td style="text-align:center;">${i.id}</td>
                <td style="text-align:center; font-weight:bold;">${i.anio}</td>
                <td style="text-align:center;">${String(i.mes).padStart(2, '0')}</td>
                <td>
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-main);">${i.tipo_obra || 'General'}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${i.subtipo_obra || 'General'}</div>
                </td>
                <td style="text-align:right; color:var(--primary); font-weight:bold;">${i.indice ? i.indice.toFixed(2) : '0.00'}</td>
                <td style="text-align:center;">
                    <button class="btn-icon btn-edit-indice" data-id="${i.id}" title="Editar"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No hay índices registrados. Haga clic en Sincronizar MOP.</td></tr>`;

        // ---- Tabla IPC ----
        const ipcRowsHtml = ipcIndices.length > 0 ? ipcIndices.map(i => `
            <tr>
                <td style="text-align:center;">${i.id}</td>
                <td style="text-align:center; font-weight:bold;">${i.anio}</td>
                <td style="text-align:center;">${String(i.mes).padStart(2, '0')}</td>
                <td style="text-align:right; color:var(--primary); font-weight:bold;">${i.valor ? i.valor.toFixed(2) : '0.00'}</td>
                <td style="text-align:center;">
                    <button class="btn-icon btn-edit-ipc" data-id="${i.id}" title="Editar"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No hay índices IPC registrados. Haga clic en Sincronizar INE.</td></tr>`;

        const tabStyle = (tab) => `
            padding: 8px 20px; border:none; cursor:pointer; font-weight:600; font-size:0.9rem; border-radius:8px 8px 0 0; transition:all 0.2s;
            background: ${activeTab === tab ? 'var(--primary)' : 'transparent'};
            color: ${activeTab === tab ? 'white' : 'var(--text-muted)'};
        `;

        return `
        <div class="view active">
            <div class="view-header" style="flex-wrap:wrap; gap:20px;">
                <div>
                    <h1>Mantenedor de Reajustes</h1>
                    <p style="color:var(--text-muted);">Índices históricos para el cálculo de reajustabilidad de contratos MOP</p>
                </div>
            </div>

            <!-- Tabs -->
            <div style="display:flex; gap:4px; border-bottom:2px solid var(--border); margin-bottom:20px;">
                <button id="tab-polinomio" style="${tabStyle('polinomio')}" onclick="App.setReajusteTab('polinomio')">
                    <i class="fas fa-chart-line"></i> Polinómico MOP
                </button>
                <button id="tab-ipc" style="${tabStyle('ipc')}" onclick="App.setReajusteTab('ipc')">
                    <i class="fas fa-chart-pie"></i> IPC
                </button>
            </div>

            <!-- Panel Polinomio -->
            <div id="panel-polinomio" style="display:${activeTab === 'polinomio' ? 'block' : 'none'}">
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-bottom:15px;">
                    <button class="btn-primary" id="btn-sync-mop" ${isSyncingMop ? 'disabled' : ''} style="background:var(--danger);">
                        ${isSyncingMop ? '<i class="fas fa-spinner fa-spin"></i> Sincronizando...' : '<i class="fas fa-cloud-download-alt"></i> Sincronizar MOP'}
                    </button>
                    <button class="btn-primary" id="btn-add-indice"><i class="fas fa-plus"></i> Nuevo Manual</button>
                </div>
                <div class="table-container" style="max-height:55vh; overflow-y:auto;">
                    <table class="mop-table">
                        <thead><tr>
                            <th style="text-align:center; width:60px;">ID</th>
                            <th style="text-align:center;">Año</th>
                            <th style="text-align:center;">Mes</th>
                            <th>Tipo / Subtipo</th>
                            <th style="text-align:right;">Índice Base</th>
                            <th style="text-align:center; width:80px;">Acción</th>
                        </tr></thead>
                        <tbody>${mopRowsHtml}</tbody>
                    </table>
                </div>
            </div>

            <!-- Panel IPC -->
            <div id="panel-ipc" style="display:${activeTab === 'ipc' ? 'block' : 'none'}">
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-bottom:15px;">
                    <button class="btn-primary" id="btn-sync-ipc" ${isSyncingIpc ? 'disabled' : ''} style="background:var(--danger);">
                        ${isSyncingIpc ? '<i class="fas fa-spinner fa-spin"></i> Sincronizando...' : '<i class="fas fa-cloud-download-alt"></i> Sincronizar MOP'}
                    </button>
                    <button class="btn-primary" id="btn-add-ipc"><i class="fas fa-plus"></i> Nuevo Manual</button>
                </div>
                <div class="table-container" style="max-height:55vh; overflow-y:auto;">
                    <table class="mop-table">
                        <thead><tr>
                            <th style="text-align:center; width:60px;">ID</th>
                            <th style="text-align:center;">Año</th>
                            <th style="text-align:center;">Mes</th>
                            <th style="text-align:right;">Valor Índice (Puntos)</th>
                            <th style="text-align:center; width:80px;">Acción</th>
                        </tr></thead>
                        <tbody>${ipcRowsHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    },

    'mantenedor-ipc'(indices = [], isLoading = false) {
        const rowsHtml = indices.length > 0 ? indices.map(i => `
            <tr>
                <td style="text-align:center;">${i.id}</td>
                <td style="text-align:center; font-weight:bold;">${i.anio}</td>
                <td style="text-align:center;">${String(i.mes).padStart(2, '0')}</td>
                <td style="text-align:right; color:var(--primary); font-weight:bold;">${i.valor ? i.valor.toFixed(2) : '0.00'}</td>
                <td style="text-align:center;">
                    <button class="btn-icon btn-edit-ipc" data-id="${i.id}" title="Editar Manualmente"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="5" style="text-align:center; padding:20px;">No hay índices IPC registrados. Haga clic en Sincronizar.</td></tr>`;

        return `
        <div class="view active">
            <div class="view-header" style="flex-wrap: wrap; gap: 20px;">
                <div>
                    <h1>Mantenedor de Índices (IPC)</h1>
                    <p style="color:var(--text-muted);">Administre la serie histórica del Índice de Precios al Consumidor (Base 2023=100)</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-primary" id="btn-sync-ipc" ${isLoading ? 'disabled' : ''} style="background:var(--danger);">
                        ${isLoading ? '<i class="fas fa-spinner fa-spin"></i> Sincronizando...' : '<i class="fas fa-cloud-download-alt"></i> Sincronizar INE'}
                    </button>
                    <button class="btn-primary" id="btn-add-ipc"><i class="fas fa-plus"></i> Nuevo Manual</button>
                </div>
            </div>

            <div class="table-container" style="max-height: 60vh; overflow-y: auto;">
                <table class="mop-table">
                    <thead>
                        <tr>
                            <th style="text-align:center; width:60px;">ID</th>
                            <th style="text-align:center;">Año</th>
                            <th style="text-align:center;">Mes</th>
                            <th style="text-align:right;">Valor Índice (Puntos)</th>
                            <th style="text-align:center; width:80px;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    'assign-projects'(user, projects) {
        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div><h2>Asignar Proyectos</h2><p>${user.name} ${user.lastName}</p></div>
            <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <form id="assign-projects-form">
            <input type="hidden" name="userId" value="${user.id}">
            <div style="max-height:300px; overflow-y:auto; margin-bottom:20px;">
                ${projects.map(p => `
                    <label style="display:flex; align-items:center; gap:10px; padding:10px; margin-bottom:5px; background:rgba(255,255,255,0.02); border-radius:5px; cursor:pointer;">
                        <input type="checkbox" name="projectIds" value="${p.id}" ${user.assignedProjectIds.includes(p.id) ? 'checked' : ''}>
                        <span><b>${p.contractId}</b>: ${p.name}</span>
                    </label>`).join('')}
            </div>
            <button type="submit" class="btn-primary full-width" style="justify-content:center;">Actualizar Asignaciones</button>
        </form>`;
    },

    'edit-item-form'(item, advancedQty, project) {
        const hasProgress = advancedQty > 0;

        // Baseline / RCOP 30% limit info
        let baselineInfo = '';
        let maxQty = null;
        if (project && project.hasBaseline()) {
            const baseQty = project.getItemBaselineQty(item.id);
            if (baseQty !== null) {
                maxQty = Math.floor(baseQty * 1.30 * 100) / 100;
                baselineInfo = `
                <div style="padding:12px 16px; border-radius:10px; border:1px solid rgba(59,130,246,0.4); background:rgba(59,130,246,0.06); margin-bottom:14px; font-size:0.85rem;">
                    <div style="font-weight:700; color:var(--primary); margin-bottom:6px;"><i class="fas fa-info-circle"></i> Límite RCOP — Máx. 30% por partida</div>
                    <div style="display:flex; gap:20px; flex-wrap:wrap;">
                        <span>📋 Cantidad original: <b>${baseQty} ${item.unit}</b></span>
                        <span>✅ Máximo permitido: <b style="color:#10b981;">${maxQty} ${item.unit}</b> (+30%)</span>
                    </div>
                    <div style="margin-top:6px; color:var(--text-muted);">Para cantidades superiores, cree una <b>Partida Convenida</b> desde "+ Partida".</div>
                </div>`;
            }
        }

        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2>Editar Partida: ${item.id}</h2>
            <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <form id="edit-item-form" class="mop-form">
                <input type="hidden" name="oldItemId" value="${item.id}">
                <input type="hidden" name="advancedQty" value="${advancedQty}">
                ${baselineInfo}
                <div class="mop-form-grid">
                    <div><label>Ítem ID</label><input type="text" name="itemId" value="${item.id}" required ${hasProgress ? 'readonly title="No se puede cambiar el ID si tiene avances"' : ''}></div>
                    <div><label>Unidad</label><input type="text" name="unit" value="${item.unit}" required></div>
                    <div class="full-width"><label>Clasificación</label>
                        <select name="classification" required>
                            <option value="Periódica" ${item.classification === 'Periódica' ? 'selected' : ''}>Periódica</option>
                            <option value="Rutinaria" ${item.classification === 'Rutinaria' ? 'selected' : ''}>Rutinaria</option>
                            <option value="Nivel de Servicio" ${item.classification === 'Nivel de Servicio' ? 'selected' : ''}>Nivel de Servicio</option>
                        </select>
                    </div>
                    <div class="full-width"><label>Descripción</label><input type="text" name="name" value="${item.name}" required></div>
                    <div>
                        <label>Cantidad ${hasProgress ? `(Mín. ${advancedQty})` : ''}${maxQty !== null ? ` (Máx. ${maxQty})` : ''}</label>
                        <input type="number" step="0.01" name="quantity" value="${item.quantity}" required min="${advancedQty}" ${maxQty !== null ? `max="${maxQty}"` : ''}>
                    </div>
                    <div><label>P. Unitario</label><input type="number" name="price" value="${item.price}" required></div>
                </div>
                ${hasProgress ? `<p style="color:var(--accent); font-size:0.8rem; margin-top:10px;"><i class="fas fa-info-circle"></i> Item tiene ${advancedQty} ${item.unit} avanzados. No se puede disminuir la cantidad total bajo ese valor.</p>` : ''}
                <button type="submit" class="btn-primary full-width" style="justify-content:center; margin-top:20px;">Actualizar Partida</button>
            </form>`;
    },

    'indice-mop-form'(data = {}) {
        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2>${data.id ? 'Editar' : 'Nuevo'} Índice MOP Manual</h2><button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button></div>
        <form id="indice-mop-form" class="mop-form">
                ${data.id ? `<input type="hidden" name="id" value="${data.id}">` : ''}
                <div class="mop-form-grid">
                    <div><label>Año</label><input type="number" name="anio" value="${data.anio || new Date().getFullYear()}" required min="2000" max="2050"></div>
                    <div><label>Mes (1-12)</label><input type="number" name="mes" value="${data.mes || new Date().getMonth() + 1}" required min="1" max="12"></div>
                    <div class="full-width"><label>Tipo de Obra</label>
                        <select name="tipo_obra" required id="indice-mop-tipo-reajuste">
                            <option value="Infraestructura vial y portuaria" ${data.tipo_obra === 'Infraestructura vial y portuaria' ? 'selected' : ''}>Infraestructura vial y portuaria</option>
                            <option value="Infraestructura Hidráulica" ${data.tipo_obra === 'Infraestructura Hidráulica' ? 'selected' : ''}>Infraestructura Hidráulica</option>
                            <option value="Infraestructura aeroportuaria" ${data.tipo_obra === 'Infraestructura aeroportuaria' ? 'selected' : ''}>Infraestructura aeroportuaria</option>
                            <option value="Edificación Pública" ${data.tipo_obra === 'Edificación Pública' ? 'selected' : ''}>Edificación Pública</option>
                        </select>
                    </div>
                    <div class="full-width"><label>Subtipo de Obra</label>
                        <select name="subtipo_obra" required id="indice-mop-subtipo-reajuste">
                            <option value="${data.subtipo_obra || 'General'}">${data.subtipo_obra || 'General'}</option>
                        </select>
                    </div>
                    <div><label>Índice Base</label><input type="number" step="0.0001" name="indice" value="${data.indice || ''}" required placeholder="Ej: 100.0000"></div>
                </div>
                <div style="background:rgba(255,152,0,0.1); padding:10px; border-radius:5px; margin-top:15px; font-size:0.8rem; color:var(--accent);">
                    <i class="fas fa-exclamation-triangle"></i> Evite editar índices históricos si estos ya han sido utilizados en Estados de Pago aprobados.
                </div>
                <button type="submit" class="btn-primary full-width" style="justify-content:center; margin-top:20px;">${data.id ? 'Actualizar Índice' : 'Guardar Nuevo Índice'}</button>
            </form>`;
    },

    'indice-ipc-form'(data = {}) {
        return `
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2>${data.id ? 'Editar' : 'Nuevo'} Índice IPC Manual</h2><button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button></div>
            <form id="indice-ipc-form" class="mop-form">
                ${data.id ? `<input type="hidden" name="id" value="${data.id}">` : ''}
                <div class="mop-form-grid">
                    <div><label>Año</label><input type="number" name="anio" value="${data.anio || new Date().getFullYear()}" required min="2000" max="2050"></div>
                    <div><label>Mes (1-12)</label><input type="number" name="mes" value="${data.mes || new Date().getMonth() + 1}" required min="1" max="12"></div>
                    <div><label>Valor Índice (Puntos)</label><input type="number" step="0.01" name="valor" value="${data.valor || ''}" required placeholder="Ej: 104.5"></div>
                    <div><label>Var. Mensual (%)</label><input type="number" step="0.1" name="variacion_mensual" value="${data.variacion_mensual || ''}" placeholder="Ej: 0.4"></div>
                </div>
                <div style="background:rgba(255,152,0,0.1); padding:10px; border-radius:5px; margin-top:15px; font-size:0.8rem; color:var(--accent);">
                    <i class="fas fa-exclamation-triangle"></i> Evite editar índices históricos si estos ya han sido utilizados en Estados de Pago aprobados.
                </div>
                <button type="submit" class="btn-primary full-width" style="justify-content:center; margin-top:20px;">${data.id ? 'Actualizar Índice' : 'Guardar Nuevo Índice'}</button>
            </form>`;
    },

    'edit-project-form'(p, clients) {
        return `
                <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2>Editar Contrato</h2><button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button></div>
                <form id="edit-project-form" class="mop-form">
                    <div class="mop-form-grid">
                        <div class="full-width"><label>Nombre Obra</label><input type="text" name="name" value="${p.name}" required></div>
                        <div><label>Contrato ID</label><input type="text" name="contractId" value="${p.contractId}" required></div>
                        <div>
                            <label>Mandante</label>
                            <select name="client" required>
                                ${clients.map(c => `<option value="${c.name}" ${p.client === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div><label>SAFI</label><input type="text" name="codigoSafi" value="${p.codigoSafi || ''}"></div>
                        <div><label>BIP</label><input type="text" name="codigoBip" value="${p.codigoBip || ''}"></div>
                        <div><label>Adjudicación</label><input type="date" name="awardDate" value="${p.awardDate}" required></div>
                        <div><label>Inicio de Obra</label><input type="date" name="startDate" value="${p.startDate}" required></div>
                        <div><label>Plazo</label><input type="number" name="term" value="${p.term}" required></div>
                        <div class="full-width"><label>Moneda del Contrato</label>
                        <select name="currency" onchange="
                            const isUf = this.value === 'UF';
                            document.getElementById('form-edit-reajuste-sys').style.display = isUf ? 'none' : 'block';
                            if(isUf) document.getElementById('edit-project-tipo-reajuste-select').value = 'Ninguno';
                            document.getElementById('edit-project-tipo-reajuste-select').dispatchEvent(new Event('change'));
                        ">
                            <option value="CLP" ${p.currency === 'CLP' ? 'selected' : ''}>Pesos Chilenos (CLP)</option>
                            <option value="UF" ${p.currency === 'UF' ? 'selected' : ''}>Unidad de Fomento (UF)</option>
                        </select>
                        </div>
                        <div><label>Retención</label><input type="number" step="0.01" name="retentionRate" value="${p.annexes.retentionRate}"></div>
                        <div><label>Límite Retención</label><input type="number" step="0.01" name="retentionCapRate" value="${p.annexes.retentionCapRate || 0.05}"></div>
                        <div><label>Anticipo</label><input type="number" name="advanceTotal" value="${p.annexes.advanceTotal}"></div>
                        
                        <div id="form-edit-reajuste-sys" class="full-width" style="display: ${p.currency === 'UF' ? 'none' : 'block'}; margin-bottom:10px;">
                            <label>Sistema de Reajuste</label>
                            <select name="tipoReajuste" id="edit-project-tipo-reajuste-select" onchange="
                                const v = this.value;
                                document.getElementById('form-edit-reajuste-mop').style.display = v === 'Polinomio' ? 'flex' : 'none';
                                document.getElementById('form-edit-reajuste-ipc').style.display = v === 'IPC' ? 'flex' : 'none';
                            ">
                                <option value="Polinomio" ${(p.annexes.tipoReajuste || 'Polinomio') === 'Polinomio' ? 'selected' : ''}>Reajuste Polinómico (MOP)</option>
                                <option value="IPC" ${p.annexes.tipoReajuste === 'IPC' ? 'selected' : ''}>Reajuste por IPC (INE)</option>
                                <option value="Ninguno" ${p.annexes.tipoReajuste === 'Ninguno' ? 'selected' : ''}>Sin Reajuste</option>
                            </select>
                        </div>

                        <!-- MOP Polinomio Container -->
                        <div id="form-edit-reajuste-mop" class="full-width" style="display: ${(p.annexes.tipoReajuste || 'Polinomio') === 'Polinomio' && p.currency !== 'UF' ? 'flex' : 'none'}; gap:10px; flex-wrap:wrap; background:rgba(255,152,0,0.05); padding:15px; border-radius:10px; border:1px solid rgba(255,152,0,0.2); margin-bottom:10px;">
                            <h4 style="width:100%; margin:0 0 10px 0; color:var(--accent); font-size:0.9rem;"><i class="fas fa-hammer"></i> Configuración Polinómica</h4>
                            <div style="flex:1; min-width:200px;">
                                <label>Tipo de Obra</label>
                                <select name="tipo_obra" required id="project-tipo-reajuste">
                                    <option value="Infraestructura vial y portuaria" ${p.annexes.tipo_obra === 'Infraestructura vial y portuaria' ? 'selected' : ''}>Infraestructura vial y portuaria</option>
                                    <option value="Infraestructura Hidráulica" ${p.annexes.tipo_obra === 'Infraestructura Hidráulica' ? 'selected' : ''}>Infraestructura Hidráulica</option>
                                    <option value="Infraestructura aeroportuaria" ${p.annexes.tipo_obra === 'Infraestructura aeroportuaria' ? 'selected' : ''}>Infraestructura aeroportuaria</option>
                                    <option value="Edificación Pública" ${p.annexes.tipo_obra === 'Edificación Pública' ? 'selected' : ''}>Edificación Pública</option>
                                </select>
                            </div>
                            <div style="flex:1; min-width:200px;">
                                <label>Subtipo de Obra</label>
                                <select name="subtipo_obra" required id="project-subtipo-reajuste">
                                    <option value="${p.annexes.subtipo_obra || 'General'}">${p.annexes.subtipo_obra || 'General'}</option>
                                </select>
                            </div>
                            </div>
                        </div>

                        <!-- IPC Container -->
                        <div id="form-edit-reajuste-ipc" class="full-width" style="display: ${p.annexes.tipoReajuste === 'IPC' && p.currency !== 'UF' ? 'flex' : 'none'}; gap:10px; flex-wrap:wrap; background:rgba(59,130,246,0.05); padding:15px; border-radius:10px; border:1px solid rgba(59,130,246,0.2); margin-bottom:10px;">
                            <h4 style="width:100%; margin:0 0 10px 0; color:var(--primary); font-size:0.9rem;"><i class="fas fa-chart-pie"></i> Configuración IPC</h4>
                            <div style="flex:1; min-width:150px;">
                                <label>Índice Mes Presupuesto (Base IPC Points)</label>
                                <input type="number" step="0.0001" name="reajusteIndex" value="${p.annexes.reajusteIndex || 100.0000}">
                            </div>
                        </div>
                        <div class="full-width"><label>Tipo</label><select name="contractType">
                            <option value="Precios Unitarios" ${p.contractType === 'Precios Unitarios' ? 'selected' : ''}>Precios Unitarios</option>
                            <option value="Suma Alzada" ${p.contractType === 'Suma Alzada' ? 'selected' : ''}>Suma Alzada</option>
                            <option value="Mixto" ${p.contractType === 'Mixto' ? 'selected' : ''}>Mixto</option>
                        </select></div>
                    </div>
                    <button type="submit" class="btn-primary full-width" style="justify-content:center;">Actualizar Contrato</button>
                </form>`;
    },

    'edp-generation-form'(p) {
        const items = p.items.map(i => ({
            ...i,
            accumulated: p.getAccumulatedQty(i.id),
            invoiced: p.getInvoicedQty(i.id),
            pending: p.getPendingQty(i.id)
        })).filter(i => i.accumulated > 0);

        const accumulatedRetention = p.getAccumulatedRetention();
        const retentionCap = p.calculateRetentionCap();

        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div><h2>Generar Estado de Pago N°${p.edps.length + 1}</h2><p>${p.name}</p></div>
            <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <form id="edp-generation-form" class="mop-form">
            <div class="mop-form-grid" style="grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="full-width">
                    <label>Tipo de Estado de Pago</label>
                    <select name="type" id="edp-type-selector" required>
                        <option value="Avance de Obra">Avance de Obra (Estándar)</option>
                        <option value="Anticipo">Estado de Pago de Anticipo</option>
                        <option value="Devolución de Retenciones">Devolución de Retenciones</option>
                    </select>
                </div>
                <div><label>Fecha de Emisión</label><input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required></div>
                ${p.currency === 'UF' ? '<input type="hidden" name="reajuste" value="0">' : '<div><label>Reajuste (+/-)</label><input type="number" step="0.01" name="reajuste" value="0"></div>'}
            </div>

            <!-- Sección Avance de Obra -->
            <div id="section-avance">
                <div class="table-container" style="max-height:400px; overflow-y:auto; margin-bottom:20px;">
                    <table class="mop-table">
                        <thead>
                            <tr>
                                <th>Ítem</th>
                                <th>Unidad</th>
                                <th>Ejecutado</th>
                                <th>Facturado</th>
                                <th>A Cobrar (Hoy)</th>
                                <th style="text-align:right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.length ? items.map(i => `
                                <tr>
                                    <td><small><b>${i.id}</b></small><br><span style="font-size:0.7rem; color:var(--text-muted);">${i.name}</span></td>
                                    <td>${i.unit}</td>
                                    <td>${i.accumulated}</td>
                                    <td>${i.invoiced}</td>
                                    <td style="width:120px;">
                                        <input type="number" step="0.01" name="qty_${i.id}" value="${i.pending}" max="${i.pending}" min="0" 
                                               data-price="${i.price}" class="edp-item-input" style="padding:5px; height:30px; font-size:0.8rem;">
                                    </td>
                                    <td style="text-align:right; font-weight:bold;" id="subtotal_${i.id}">${this.formatCurrency(i.pending * i.price, p.currency)}</td>
                                </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay avances ejecutados pendientes de cobro.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Sección Anticipo -->
            <div id="section-anticipo" style="display:none; margin-bottom:20px;">
                <div class="stat-card" style="background:rgba(255,255,255,0.02);">
                    <label>Monto del Anticipo (${p.currency === 'UF' ? 'UF' : '$'})</label>
                    <input type="number" name="advanceAmount" value="0" style="font-size:1.2rem; font-weight:bold;">
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">Este monto se registrará como pago adelantado según RCOP.</p>
                </div>
            </div>

            <!-- Sección Devolución -->
            <div id="section-devolucion" style="display:none; margin-bottom:20px;">
                <div class="stat-card" style="background:rgba(255,255,255,0.02); border-left:4px solid var(--accent);">
                    <h5>Retenciones Acumuladas Disponibles</h5>
                    <h2 style="color:var(--accent);">${this.formatCurrency(accumulatedRetention, p.currency)}</h2>
                    <div style="margin-top:15px;">
                        <label>Monto a Devolver (${p.currency === 'UF' ? 'UF' : '$'})</label>
                        <input type="number" name="returnAmount" value="0" max="${accumulatedRetention}" style="font-size:1.2rem; font-weight:bold;">
                    </div>
                </div>
            </div>

            <div class="stat-card" style="background:var(--bg-main); padding: 20px;">
                <h3 style="margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">Resumen del Cobro</h3>
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span>Total Bruto:</span>
                    <strong id="edp-total-bruto">${this.formatCurrency(0, p.currency)}</strong>
                </div>
                ${p.currency === 'UF' ? '' : `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span>Reajuste:</span>
                    <strong id="edp-total-reajuste" style="color:var(--primary);">${this.formatCurrency(0, p.currency)}</strong>
                </div>`}
                
                <div id="retention-row" style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--accent);">
                    <span>Retención (${(p.annexes.retentionRate * 100).toFixed(0)}%):</span>
                    <strong id="edp-total-retention">-${this.formatCurrency(0, p.currency)}</strong>
                </div>
                <div id="retention-info" style="font-size:0.75rem; color:var(--text-muted); margin-bottom:15px; text-align:right;">
                    Tope Retención: ${this.formatCurrency(retentionCap, p.currency)} | Acumulado Actual: ${this.formatCurrency(accumulatedRetention, p.currency)}
                </div>

                <div style="display:flex; justify-content:space-between; margin-top:15px; padding-top:15px; border-top:1px solid var(--border); font-size:1.2rem;">
                    <span>Total Líquido a Pagar:</span>
                    <strong id="edp-total-liquido" style="color:var(--text-main);">${this.formatCurrency(0, p.currency)}</strong>
                </div>
            </div>
            
            <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                <button type="submit" class="btn-primary" id="btn-submit-edp" disabled>Emitir Estado de Pago</button>
            </div>
        </form>`;
    },

    edpGenerationView(p) {
        const items = p.items.map(i => ({
            ...i,
            accumulated: p.getAccumulatedQty(i.id),
            invoiced: p.getInvoicedQty(i.id),
            pending: p.getPendingQty(i.id)
        })).filter(i => i.accumulated > 0);

        const accumulatedRetention = p.getAccumulatedRetention();
        const retentionCap = p.calculateRetentionCap();

        return `
        <div class="view active">
            <div class="view-header header-flex">
                <div>
                    <button class="btn-text" data-view="financial"><i class="fas fa-arrow-left"></i> Volver a Estados de Pago</button>
                    <h1>Generar Estado de Pago N°${p.edps.length + 1}</h1>
                    <p>${p.name}</p>
                </div>
            </div>
            <div class="stat-card" style="max-width: 900px; margin: 0 auto; padding: 30px;">
                <form id="edp-generation-form" class="mop-form">
                    <div class="mop-form-grid" style="grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div class="full-width">
                            <label>Tipo de Estado de Pago</label>
                            <select name="type" id="edp-type-selector" required>
                                <option value="Avance de Obra">Avance de Obra (Estándar)</option>
                                <option value="Anticipo">Estado de Pago de Anticipo</option>
                                <option value="Devolución de Retenciones">Devolución de Retenciones</option>
                            </select>
                        </div>
                        <div><label>Fecha de Emisión</label><input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required></div>
                        ${p.currency === 'UF' ? '<input type="hidden" name="reajuste" value="0">' : '<div><label>Reajuste (+/-)</label><input type="number" step="0.01" name="reajuste" value="0"></div>'}
                    </div>

                    <!-- Sección Avance de Obra -->
                    <div id="section-avance">
                        <div class="table-container" style="max-height:600px; overflow-y:auto; margin-bottom:20px;">
                            <table class="mop-table">
                                <thead>
                                    <tr>
                                        <th>Ítem</th>
                                        <th>Unidad</th>
                                        <th>Ejecutado</th>
                                        <th>Facturado</th>
                                        <th>A Cobrar (Hoy)</th>
                                        <th style="text-align:right;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items.length ? items.map(i => `
                                        <tr>
                                            <td><small><b>${i.id}</b></small><br><span style="font-size:0.7rem; color:var(--text-muted);">${i.name}</span></td>
                                            <td>${i.unit}</td>
                                            <td>${i.accumulated}</td>
                                            <td>${i.invoiced}</td>
                                            <td style="width:120px;">
                                                <input type="number" step="0.01" name="qty_${i.id}" value="${i.pending}" max="${i.pending}" min="0" 
                                                    data-price="${i.price}" class="edp-item-input" style="padding:5px; height:30px; font-size:0.8rem;">
                                            </td>
                                            <td style="text-align:right; font-weight:bold;" id="subtotal_${i.id}">${this.formatCurrency(i.pending * i.price, p.currency)}</td>
                                        </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay avances ejecutados pendientes de cobro.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Sección Anticipo -->
                    <div id="section-anticipo" style="display:none; margin-bottom:20px;">
                        <div class="edp-card" style="background:var(--bg-card); border:1px solid var(--border);">
                            <label>Monto del Anticipo (${p.currency === 'UF' ? 'UF' : '$'})</label>
                            <input type="number" name="advanceAmount" value="0" class="edp-amount-input">
                            <p class="text-sm text-muted mt-5">Este monto se registrará como pago adelantado según RCOP.</p>
                        </div>
                    </div>

                    <!-- Sección Devolución -->
                    <div id="section-devolucion" style="display:none; margin-bottom:20px;">
                        <div class="edp-card" style="background:var(--bg-card); border-left:4px solid var(--accent);">
                            <h5 style="margin-bottom: 15px;">Retenciones Acumuladas Disponibles</h5>
                            <h2 style="color:var(--accent); font-size: 1.8rem;">${this.formatCurrency(accumulatedRetention, p.currency)}</h2>
                            <div style="margin-top:20px;">
                                <label>Monto a Devolver (${p.currency === 'UF' ? 'UF' : '$'})</label>
                                <input type="number" name="returnAmount" value="0" max="${accumulatedRetention}" class="edp-amount-input">
                            </div>
                        </div>
                    </div>

                    <div class="edp-summary-card">
                        <h3 class="edp-summary-title">Resumen del Cobro</h3>
                        
                        <div class="edp-summary-row">
                            <span>Total Bruto:</span>
                            <strong id="edp-total-bruto">${this.formatCurrency(0, p.currency)}</strong>
                        </div>
                        
                        ${p.currency === 'UF' ? '' : `
                        <div class="edp-summary-row">
                            <span>Reajuste:</span>
                            <strong id="edp-total-reajuste" style="color:var(--primary);">${this.formatCurrency(0, p.currency)}</strong>
                        </div>`}
                        
                        <div class="edp-summary-row" style="color:var(--accent);">
                            <span>Retención (${(p.annexes.retentionRate * 100).toFixed(0)}%):</span>
                            <strong id="edp-total-retention">-${this.formatCurrency(0, p.currency)}</strong>
                        </div>
                        
                        <div class="edp-summary-note">
                            <span>Tope Retención: ${this.formatCurrency(retentionCap, p.currency)}</span>
                            <span>Acumulado Actual: ${this.formatCurrency(accumulatedRetention, p.currency)}</span>
                        </div>

                        <div class="edp-summary-total">
                            <span>Total Líquido a Pagar:</span>
                            <strong id="edp-total-liquido">${this.formatCurrency(0, p.currency)}</strong>
                        </div>
                    </div>
                    
                    <div class="edp-actions-container">
                        <button type="button" class="btn-secondary" data-view="financial">Cancelar</button>
                        <button type="submit" class="btn-primary" id="btn-submit-edp" disabled>Emitir Estado de Pago</button>
                    </div>
                </form>
            </div>
        </div>`;
    },

    'edp-detail-modal'(project, edp) {
        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div>
                <h2>Detalle Estado de Pago N°${edp.number}</h2>
                <p>${project.name} | Fecha: ${new Date(edp.date).toLocaleDateString()}</p>
            </div>
            <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <div style="background:rgba(255,255,255,0.02); padding:20px; border-radius:10px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>Valor Bruto:</span>
                <b>${this.formatCurrency(edp.workValue)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--accent);">
                <span>Retención (${(project.annexes.retentionRate * 100).toFixed(0)}%):</span>
                <b>-${this.formatCurrency(edp.retention)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>Reajuste Aplicado:</span>
                <b style="color:${(edp.reajuste || 0) >= 0 ? 'var(--primary)' : 'var(--danger)'}">${this.formatCurrency(edp.reajuste || 0)}</b>
            </div>
            <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">
            <div style="display:flex; justify-content:space-between; font-size:1.2rem; color:white;">
                <span>Líquido a Pago:</span>
                <b style="color:var(--primary);">${this.formatCurrency(edp.net)}</b>
            </div>
        </div>

        <h3>Partidas Facturadas en este EDP</h3>
        <div style="margin-top:15px; border-radius:8px; border:1px solid var(--border); overflow:hidden;">
            <div style="max-height:420px; overflow-y:auto; overflow-x:auto;">
            <table class="mop-table" style="width:100%; min-width:600px; table-layout:auto;">
                <thead>
                    <tr>
                        <th>Ítem</th>
                        <th>Descripción</th>
                        <th>Unidad</th>
                        <th>Cantidad</th>
                        <th>P. Unitario</th>
                        <th style="text-align:right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${edp.items.length ? edp.items.map(item => `
                        <tr>
                            <td>${item.itemId}</td>
                            <td>${item.name}</td>
                            <td>${item.unit}</td>
                            <td>${item.quantity}</td>
                            <td>${this.formatCurrency(item.price)}</td>
                            <td style="text-align:right; font-weight:600;">${this.formatCurrency(item.quantity * item.price)}</td>
                        </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay partidas detalladas para este estado de pago.</td></tr>'}
                </tbody>
            </table>
            </div>
        </div>`;
    },

    'client-form'(c = {}) {
        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2>${c.rut ? 'Editar' : 'Nuevo'} Mandante</h2>
            <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <form id="client-form" class="mop-form">
            <input type="hidden" name="clientIndex" value="${c.index !== undefined ? c.index : ''}">
            <div class="mop-form-grid">
                <div><label>RUT</label><input type="text" name="rut" value="${c.rut || ''}" required placeholder="12.345.678-9"></div>
                <div><label>Nombre / Razón Social</label><input type="text" name="name" value="${c.name || ''}" required placeholder="MOP - Dirección de Vialidad"></div>
                <div><label>Departamento</label><input type="text" name="dept" value="${c.dept || ''}" placeholder="Ej: Depto. de Contratos"></div>
                <div><label>Dirección</label><input type="text" name="addr" value="${c.addr || ''}" placeholder="Ej: Morandé 59, Santiago"></div>
            </div>
            <button type="submit" class="btn-primary full-width" style="justify-content:center; margin-top:20px;">Guardar Mandante</button>
        </form>`;
    },

    'contract-modification'(p) {
        const nextNumber = p.contractModifications.length + 1;
        const variation = p.getContractVariation();
        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div>
                <h2>Registrar Modificación de Obras</h2>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-top:4px;">${p.name} — MO-${String(nextNumber).padStart(2, '0')}</p>
            </div>
            <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <div style="background:var(--bg-dark); border-radius:10px; padding:16px; margin-bottom:20px; border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between;">
                <div><div style="font-size:0.8rem; color:var(--text-muted);">Venta Contractual Original</div><div style="font-weight:700;">${RenderEngine.formatCurrency(p.getBaselineValue(), p.currency)}</div></div>
                <div><div style="font-size:0.8rem; color:var(--text-muted);">Contrato Actual</div><div style="font-weight:700;">${RenderEngine.formatCurrency(p.calculateTotalContract(), p.currency)}</div></div>
                <div style="text-align:center;">
                    <div style="font-size:0.8rem; color:var(--text-muted);">Variación Acumulada</div>
                    <div style="font-weight:700; color:${p.getContractIncreasePercent() > 35 ? 'var(--danger)' : 'var(--secondary)'};">
                        ${p.getContractIncreasePercent() >= 0 ? '+' : ''}${p.getContractIncreasePercent().toFixed(2)}%
                        ${p.isOverRCOPLimit() ? '<span style="color:var(--danger); font-size:0.75rem;"> ⛔ SUPERA 35% RCOP</span>' : ''}
                    </div>
                </div>
            </div>
        </div>
        <form id="contract-modification-form" class="mop-form">
            <input type="hidden" name="projectId" value="${p.id}">
            <input type="hidden" name="modNumber" value="${nextNumber}">
            <div style="margin-bottom:15px;">
                <label>Descripción de la Modificación</label>
                <textarea name="description" required rows="3" placeholder="Ej: Aumento de Ítem 1.1 Hormigón Armado por ajuste de diseño..." style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-main); color:var(--text-main); font-family:inherit; resize:vertical;"></textarea>
            </div>
            <div style="margin-bottom:15px;">
                <label>Fecha de la Modificación</label>
                <input type="date" name="modDate" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <button type="submit" class="btn-primary full-width" style="justify-content:center;">Registrar Modificación MO-${String(nextNumber).padStart(2, '0')}</button>
        </form>`;
    },

    'indice-form'(i = {}) {
        return `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2>${i.id ? 'Editar' : 'Nuevo'} Índice de Reajuste</h2>
            <button class="btn-close-modal" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <form id="indice-form" class="mop-form">
            <input type="hidden" name="id" value="${i.id || ''}">
            <div class="mop-form-grid">
                <div>
                    <label>Año</label>
                    <input type="number" name="anio" value="${i.anio || new Date().getFullYear()}" required min="1900" max="2100" ${i.id ? 'readonly style="opacity:0.7"' : ''}>
                </div>
                <div>
                    <label>Mes</label>
                    <input type="number" name="mes" value="${i.mes || new Date().getMonth() + 1}" required min="1" max="12" ${i.id ? 'readonly style="opacity:0.7"' : ''}>
                </div>
                <div class="full-width">
                    <label>Tipo de Obra</label>
                    <select name="tipo_obra" required id="indice-form-tipo">
                        <option value="Infraestructura vial y portuaria" ${i.tipo_obra === 'Infraestructura vial y portuaria' ? 'selected' : ''}>Infraestructura vial y portuaria</option>
                        <option value="Infraestructura Hidráulica" ${i.tipo_obra === 'Infraestructura Hidráulica' ? 'selected' : ''}>Infraestructura Hidráulica</option>
                        <option value="Infraestructura aeroportuaria" ${i.tipo_obra === 'Infraestructura aeroportuaria' ? 'selected' : ''}>Infraestructura aeroportuaria</option>
                        <option value="Edificación Pública" ${i.tipo_obra === 'Edificación Pública' ? 'selected' : ''}>Edificación Pública</option>
                    </select>
                </div>
                <div class="full-width">
                    <label>Subtipo de Obra</label>
                    <select name="subtipo_obra" required id="indice-form-subtipo">
                        <option value="${i.subtipo_obra || 'General'}">${i.subtipo_obra || 'General'}</option>
                        <!-- Options populated dynamically by app.js -->
                    </select>
                </div>
                <div class="full-width">
                    <label>Índice Base</label>
                    <input type="number" step="0.0001" name="indice" value="${i.indice || ''}" required placeholder="Ej: 145.2413">
                </div>
            </div>
            <button type="submit" class="btn-primary full-width" style="justify-content:center; margin-top:20px;">Guardar Índice</button>
        </form>`;
    }
};
