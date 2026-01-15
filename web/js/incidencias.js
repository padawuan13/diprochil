/* ========================================
   INCIDENCIAS.JS - Gestión de incidencias
   ======================================== */

const Incidencias = {
  incidencias: [],

  badgeColorEstado: {
    ABIERTA: 'danger',
    EN_REVISION: 'warning',
    CERRADA: 'success',
  },

  async init() {
    this.setupEventListeners();
    await this.cargarIncidencias();
    this.filtrarYRenderizar();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterEstado = document.getElementById('filterEstado');
    const btnRefrescar = document.getElementById('btnRefrescar');

    searchInput?.addEventListener('input', () => this.filtrarYRenderizar());
    filterEstado?.addEventListener('change', () => this.filtrarYRenderizar());

    btnRefrescar?.addEventListener('click', async () => {
      UI.showLoadingOverlay(true);
      try {
        await this.cargarIncidencias();
        this.filtrarYRenderizar();
      } finally {
        UI.showLoadingOverlay(false);
      }
    });
  },

  async cargarIncidencias() {
    try {
      const user = Auth.getUser();
      const params = { take: 100, skip: 0 };

      if (user?.role === 'CONDUCTOR') {
        params.createdById = user.id;
      }

      const res = await API.get(CONFIG.ENDPOINTS.INCIDENTS, params);
      this.incidencias = res.items || [];
    } catch (err) {
      console.error(err);
      UI.showError(err?.message || 'No se pudieron cargar las incidencias');
      this.incidencias = [];
    }
  },

  filtrarYRenderizar() {
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('filterEstado')?.value || '';

    let items = [...this.incidencias];

    if (estado) items = items.filter(i => i.estado === estado);

    if (searchTerm) {
      items = items.filter(i => {
        const routeId = String(i.routeId || '');
        const pedidoId = String(i.pedidoId || '');
        const tipo = (i.tipo || '').toLowerCase();
        const descripcion = (i.descripcion || '').toLowerCase();
        const cliente = (i.pedido?.client?.razonSocial || '').toLowerCase();
        const rut = (i.pedido?.client?.rut || '').toLowerCase();
        const comuna = (i.pedido?.client?.comuna || '').toLowerCase();
        const ciudad = (i.pedido?.client?.ciudad || '').toLowerCase();
        const conductor = (i.route?.conductor?.nombre || '').toLowerCase();
        const patente = (i.route?.vehicle?.patente || '').toLowerCase();

        return (
          routeId.includes(searchTerm) ||
          pedidoId.includes(searchTerm) ||
          tipo.includes(searchTerm) ||
          descripcion.includes(searchTerm) ||
          cliente.includes(searchTerm) ||
          rut.includes(searchTerm) ||
          comuna.includes(searchTerm) ||
          ciudad.includes(searchTerm) ||
          conductor.includes(searchTerm) ||
          patente.includes(searchTerm)
        );
      });
    }

    this.renderizarTabla(items);
  },

  crearBadge(text, color) {
    const safe = (text ?? '').toString();
    const c = color || 'gray';
    return `<span class="badge badge-${c}">${safe}</span>`;
  },

  renderizarTabla(items) {
    const container = document.getElementById('incidenciasTableContainer');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `<p class="text-center text-muted">No hay incidencias para mostrar.</p>`;
      return;
    }

    const rows = items.map(i => {
      const fecha = UI.formatDateTime(i.fechaHora);
      const estadoTexto = i.estado === 'ABIERTA' ? 'Abierta' : i.estado === 'EN_REVISION' ? 'En Revisión' : 'Cerrada';
      const estadoBadge = this.crearBadge(estadoTexto, this.badgeColorEstado[i.estado] || 'gray');

      const rutaLink = i.routeId
        ? `<a href="ruta-detalle.html?id=${i.routeId}" class="text-primary" style="font-weight: 600;">#${i.routeId}</a>`
        : '-';

      const pedido = i.pedidoId ? `#${i.pedidoId}` : '-';
      const cliente = i.pedido?.client?.razonSocial || '-';
      const comuna = i.pedido?.client?.comuna || '-';
      const conductor = i.route?.conductor?.nombre || '-';
      const patente = i.route?.vehicle?.patente || '-';
      const reportadoPor = i.createdBy?.nombre || 'Sistema';

      const acciones = this.renderAcciones(i);

      const resolucion = i.comentarioResolucion
        ? `<div class="text-sm text-muted mt-1" style="font-style: italic;">
            <strong>Resolución:</strong> ${this.escapeHtml(i.comentarioResolucion)}
            ${i.reviewedBy ? `<br>Por: ${this.escapeHtml(i.reviewedBy.nombre)}` : ''}
           </div>`
        : '';

      return `
        <tr>
          <td>${fecha}</td>
          <td>${estadoBadge}</td>
          <td style="min-width: 200px;">
            <div style="font-weight: 700;">${this.escapeHtml(i.tipo || '-')}</div>
            <div class="text-muted text-sm" style="max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(i.descripcion || '')}">
              ${this.escapeHtml(i.descripcion || '')}
            </div>
            ${resolucion}
          </td>
          <td>${rutaLink}</td>
          <td>${pedido}</td>
          <td>
            <div style="font-weight: 600;">${this.escapeHtml(cliente)}</div>
            <div class="text-muted text-sm">${this.escapeHtml(comuna)}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${this.escapeHtml(conductor)}</div>
            <div class="text-muted text-sm">${this.escapeHtml(patente)}</div>
          </td>
          <td class="text-muted text-sm">${this.escapeHtml(reportadoPor)}</td>
          <td>${acciones}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Detalle</th>
              <th>Ruta</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Conductor / Vehículo</th>
              <th>Reportado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  },

  renderAcciones(inc) {
    const id = inc.id;
    const user = Auth.getUser();

    if (user?.role === 'CONDUCTOR') {
      const estadoTexto = inc.estado === 'ABIERTA' ? 'Pendiente' : inc.estado === 'EN_REVISION' ? 'En revisión' : 'Resuelta';
      return `<span class="text-muted text-sm">${estadoTexto}</span>`;
    }

    if (inc.estado === 'CERRADA') {
      return `<span class="text-muted text-sm">Resuelta</span>`;
    }

    const btnTomarRevision = inc.estado === 'ABIERTA'
      ? `<button class="btn btn-sm btn-secondary" onclick="Incidencias.tomarEnRevision(${id})">🔎 Tomar</button>`
      : '';

    const btnCerrar = `<button class="btn btn-sm btn-success" onclick="Incidencias.abrirModalCerrar(${id})">✅ Cerrar</button>`;

    return `
      <div style="display:flex; gap:8px; flex-wrap: wrap;">
        ${btnTomarRevision}
        ${btnCerrar}
      </div>
    `;
  },

  async tomarEnRevision(id) {
    if (!confirm('¿Tomar esta incidencia en revisión?')) return;

    try {
      UI.showLoadingOverlay(true);
      await API.post(`${CONFIG.ENDPOINTS.INCIDENTS}/${id}/review`, { estado: 'EN_REVISION' });
      await this.cargarIncidencias();
      this.filtrarYRenderizar();
      UI.showSuccess('Incidencia tomada en revisión');
    } catch (err) {
      console.error(err);
      UI.showError(err?.message || 'No se pudo tomar la incidencia');
    } finally {
      UI.showLoadingOverlay(false);
    }
  },

  abrirModalCerrar(id) {
    const incidencia = this.incidencias.find(i => i.id === id);
    if (!incidencia) return;

    const modalHtml = `
      <div class="modal-overlay" id="modalCerrarIncidencia" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal-content" style="background: white; padding: 24px; border-radius: 12px; max-width: 500px; width: 90%;">
          <h3 style="margin-bottom: 16px;">Cerrar Incidencia #${id}</h3>

          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <strong>${this.escapeHtml(incidencia.tipo)}</strong>
            <p class="text-sm text-muted" style="margin-top: 4px;">${this.escapeHtml(incidencia.descripcion)}</p>
          </div>

          <div class="form-group">
            <label class="form-label">Comentario de resolución</label>
            <textarea
              id="comentarioResolucion"
              class="form-input"
              rows="3"
              placeholder="Ingrese el comentario de resolución (opcional)..."
              style="width: 100%;"
            ></textarea>
          </div>

          <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px;">
            <button class="btn btn-secondary" onclick="Incidencias.cerrarModal()">Cancelar</button>
            <button class="btn btn-success" onclick="Incidencias.confirmarCerrar(${id})">Confirmar Cierre</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  cerrarModal() {
    const modal = document.getElementById('modalCerrarIncidencia');
    if (modal) modal.remove();
  },

  async confirmarCerrar(id) {
    const comentario = document.getElementById('comentarioResolucion')?.value?.trim() || '';

    try {
      UI.showLoadingOverlay(true);

      const payload = { estado: 'CERRADA' };
      if (comentario) payload.comentarioResolucion = comentario;

      await API.post(`${CONFIG.ENDPOINTS.INCIDENTS}/${id}/review`, payload);

      this.cerrarModal();
      await this.cargarIncidencias();
      this.filtrarYRenderizar();
      UI.showSuccess('Incidencia cerrada correctamente');
    } catch (err) {
      console.error(err);
      UI.showError(err?.message || 'No se pudo cerrar la incidencia');
    } finally {
      UI.showLoadingOverlay(false);
    }
  },

  escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};
