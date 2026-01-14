/* ========================================
   INCIDENCIAS.JS - Gestión de incidencias
   ======================================== */

const Incidencias = {
  incidencias: [],

  badgeColorEstado: {
    ABIERTA: 'warning',
    EN_REVISION: 'primary',
    CERRADA: 'success',
  },

  badgeColorSeveridad: {
    BAJA: 'gray',
    MEDIA: 'warning',
    ALTA: 'danger',
    CRITICA: 'danger',
  },

  async init() {
    this.setupEventListeners();
    await this.cargarIncidencias();
    this.filtrarYRenderizar();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterEstado = document.getElementById('filterEstado');
    const filterSeveridad = document.getElementById('filterSeveridad');
    const btnRefrescar = document.getElementById('btnRefrescar');

    searchInput?.addEventListener('input', () => this.filtrarYRenderizar());
    filterEstado?.addEventListener('change', () => this.filtrarYRenderizar());
    filterSeveridad?.addEventListener('change', () => this.filtrarYRenderizar());

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
      // Traemos hartas para que sea útil como “estudio” sin paginar por ahora
      // NOTE: el backend limita take a máx 100 (validación Zod), por eso 200 da 400.
      const res = await API.get(CONFIG.ENDPOINTS.INCIDENTS, { take: 100, skip: 0 });
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
    const severidad = document.getElementById('filterSeveridad')?.value || '';

    let items = [...this.incidencias];

    if (estado) items = items.filter(i => i.estado === estado);
    if (severidad) items = items.filter(i => (i.severidad || '') === severidad);

    if (searchTerm) {
      items = items.filter(i => {
        const routeId = String(i.routeId || '');
        const pedidoId = String(i.pedidoId || '');
        const tipo = (i.tipo || '').toLowerCase();
        const descripcion = (i.descripcion || '').toLowerCase();
        const cliente = (i.pedido?.client?.nombre || '').toLowerCase();
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
      const estadoBadge = this.crearBadge(
        i.estado === 'ABIERTA' ? 'Abierta' : i.estado === 'EN_REVISION' ? 'En revisión' : 'Cerrada',
        this.badgeColorEstado[i.estado] || 'gray'
      );

      const sevLabel = i.severidad ? (i.severidad === 'CRITICA' ? 'Crítica' : i.severidad.charAt(0) + i.severidad.slice(1).toLowerCase()) : '-';
      const sevBadge = i.severidad
        ? this.crearBadge(sevLabel, this.badgeColorSeveridad[i.severidad] || 'gray')
        : `<span class="text-muted">-</span>`;

      const rutaLink = i.routeId
        ? `<a href="ruta-detalle.html?id=${i.routeId}" class="text-primary" style="font-weight: 600;">#${i.routeId}</a>`
        : '-';

      const pedido = i.pedidoId ? `#${i.pedidoId}` : '-';
      const cliente = i.pedido?.client?.nombre || '-';
      const comuna = i.pedido?.client?.comuna || '-';
      const conductor = i.route?.conductor?.nombre || '-';
      const patente = i.route?.vehicle?.patente || '-';

      const acciones = this.renderAcciones(i);

      return `
        <tr>
          <td>${fecha}</td>
          <td>${estadoBadge}</td>
          <td>${sevBadge}</td>
          <td style="min-width: 160px;">
            <div style="font-weight: 700;">${this.escapeHtml(i.tipo || '-')}</div>
            <div class="text-muted text-sm" style="max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(i.descripcion || '')}">
              ${this.escapeHtml(i.descripcion || '')}
            </div>
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
              <th>Severidad</th>
              <th>Detalle</th>
              <th>Ruta</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Conductor / Vehículo</th>
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

    if (inc.estado === 'CERRADA') {
      return `<span class="text-muted">-</span>`;
    }

    const btnRevision = inc.estado !== 'EN_REVISION'
      ? `<button class="btn btn-sm btn-secondary" onclick="Incidencias.actualizarEstado(${id}, 'EN_REVISION')">🔎 En revisión</button>`
      : '';

    const btnCerrar = `<button class="btn btn-sm btn-success" onclick="Incidencias.actualizarEstado(${id}, 'CERRADA')">✅ Cerrar</button>`;

    return `
      <div style="display:flex; gap:8px; flex-wrap: wrap;">
        ${btnRevision}
        ${btnCerrar}
      </div>
    `;
  },

  async actualizarEstado(id, estado) {
    try {
      UI.showLoadingOverlay(true);
      await API.patch(`${CONFIG.ENDPOINTS.INCIDENTS}/${id}`, { estado });
      // refrescamos localmente
      await this.cargarIncidencias();
      this.filtrarYRenderizar();
      UI.showSuccess('Incidencia actualizada');
    } catch (err) {
      console.error(err);
      UI.showError(err?.message || 'No se pudo actualizar la incidencia');
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
