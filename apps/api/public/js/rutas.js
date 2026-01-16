/* ========================================
   RUTAS.JS - Gestión de Rutas (sin creación manual)
   - Se muestran PROGRAMADAS por defecto (desde el <select> en rutas.html)
   - Sin checkbox "mostrar finalizadas"
   - Sin botón / modal "nueva ruta" (las rutas se crean al importar pedidos)
   ======================================== */

const Rutas = {
  rutas: [],

  /**
   * Escapar HTML para prevenir XSS
   */
  escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  async init() {
    this.setupEventListeners();
    await this.cargarRutas();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterEstado = document.getElementById('filterEstado');

    searchInput?.addEventListener('input', () => this.filtrarRutas());
    filterEstado?.addEventListener('change', () => this.filtrarRutas());
  },

  async cargarRutas() {
    console.log('🔄 Cargando rutas...');
    try {
      const response = await API.get(CONFIG.ENDPOINTS.ROUTES, { take: 200 });

      this.rutas = response.items || [];
      this.rutas.sort((a, b) => b.id - a.id);

      console.log('✅ Rutas cargadas:', this.rutas.length);
      this.filtrarRutas();
    } catch (error) {
      console.error('❌ Error al cargar rutas:', error);
      UI.showError('Error al cargar las rutas');
      const container = document.getElementById('rutasTableContainer');
      if (container) container.innerHTML = '<p class="text-center text-danger">Error al cargar rutas</p>';
    }
  },

  filtrarRutas() {
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const estadoFilter = document.getElementById('filterEstado')?.value || '';

    let items = [...this.rutas];

    if (estadoFilter) {
      items = items.filter(r => r.estado === estadoFilter);
    }

    if (searchTerm) {
      items = items.filter(r => {
        const coincideId = String(r.id || '').includes(searchTerm);
        const coincideConductor = (r.conductor?.nombre || '').toLowerCase().includes(searchTerm);
        const coincideZona = (r.zona || '').toLowerCase().includes(searchTerm);
        const coincidePatente = (r.vehicle?.patente || '').toLowerCase().includes(searchTerm);
        return coincideId || coincideConductor || coincideZona || coincidePatente;
      });
    }

    this.renderizarTabla(items);
  },

  renderizarTabla(items) {
    const container = document.getElementById('rutasTableContainer');
    if (!container) return;
    const role = (typeof Auth !== 'undefined' && Auth.getUserRole) ? Auth.getUserRole() : null;
    const canCancel = ['ADMIN', 'PLANIFICADOR', 'SUPERVISOR'].includes(role);


    if (!items.length) {
      container.innerHTML = '<p class="text-center text-muted">No hay rutas para mostrar.</p>';
      return;
    }

    const html = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Conductor</th>
              <th>Vehículo</th>
              <th>Zona</th>
              <th>Paradas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(ruta => `
              <tr>
                <td><strong>#${ruta.id}</strong></td>
                <td>${UI.formatDate(ruta.fechaRuta)}</td>
                <td>${this.escapeHtml(ruta.conductor?.nombre || 'Sin asignar')}</td>
                <td>${this.escapeHtml(ruta.vehicle?.patente || 'Sin vehículo')}</td>
                <td>${this.escapeHtml(ruta.zona || '-')}</td>
                <td>${ruta.stops?.length || 0}</td>
                <td>${UI.createBadge(ruta.estado, ruta.estado)}</td>
                <td>
                  <div class="table-actions">
                    <button
                      class="btn btn-sm btn-primary btn-icon"
                      onclick="window.location.href='ruta-detalle.html?id=${ruta.id}'"
                      title="Ver Detalle"
                    >
                      👁️
                    </button>

                    ${ruta.estado === 'PROGRAMADA' ? `
                      <button
                        class="btn btn-sm btn-success btn-icon"
                        onclick="Rutas.cambiarEstado(${ruta.id}, 'EN_CURSO')"
                        title="Iniciar Ruta"
                      >
                        ▶️
                      </button>
                    ` : ''}

                    ${ruta.estado === 'EN_CURSO' ? `
                      <button
                        class="btn btn-sm btn-success btn-icon"
                        onclick="Rutas.cambiarEstado(${ruta.id}, 'FINALIZADA')"
                        title="Finalizar Ruta"
                      >
                        ✅
                      </button>
                    ` : ''}

                    ${canCancel ? `
                      <button
                        class="btn btn-sm btn-danger btn-icon"
                        onclick="Rutas.eliminarRuta(${ruta.id})"
                        title="Eliminar Ruta"
                      >
                        🗑️
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  },

  async cambiarEstado(id, nuevoEstado) {
    const estadoTexto = {
      EN_CURSO: 'iniciada',
      FINALIZADA: 'finalizada',
      CANCELADA: 'cancelada',
    }[nuevoEstado] || nuevoEstado;

    if (!UI.confirm(`¿Marcar ruta como ${estadoTexto}?`)) return;

    try {
      await API.patch(`${CONFIG.ENDPOINTS.ROUTES}/${id}/status`, { estado: nuevoEstado });
      await this.cargarRutas();
      UI.showSuccess(`Ruta marcada como ${estadoTexto}`);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      const mensaje = error?.message || 'Error al cambiar el estado de la ruta';
      UI.showAlert(mensaje, 'error');
    }
  },

  async eliminarRuta(id) {
    if (!UI.confirm('¿Estás seguro de que deseas eliminar esta ruta?')) return;

    const eliminarPedidos = UI.confirm(
      '¿Deseas eliminar también los pedidos asociados a esta ruta?\n\n' +
      '• SÍ (Aceptar): Se eliminarán la ruta Y sus pedidos\n' +
      '• NO (Cancelar): Solo se elimina la ruta, los pedidos quedan disponibles'
    );

    try {
      const endpoint = `${CONFIG.ENDPOINTS.ROUTES}/${id}${eliminarPedidos ? '?deletePedidos=true' : ''}`;
      await API.delete(endpoint);
      await this.cargarRutas();

      if (eliminarPedidos) {
        UI.showSuccess('Ruta y pedidos eliminados correctamente');
      } else {
        UI.showSuccess('Ruta eliminada correctamente');
      }
    } catch (error) {
      console.error('Error al eliminar ruta:', error);
      const mensaje = error?.message || 'Error al eliminar la ruta';
      UI.showAlert(mensaje, 'error');
    }
  },
};