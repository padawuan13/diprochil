/* ========================================
   PEDIDOS.JS - Con creación automática de rutas por comuna
   ======================================== */

const Pedidos = {
  pedidos: [],
  clientes: [],
  conductores: [],
  vehiculos: [],
  pedidoSeleccionado: null,
  previewData: null,
  selectedFile: null,

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

  /**
   * Inicializar módulo
   */
  async init() {
    await this.cargarClientes();
    await this.cargarConductores();
    await this.cargarVehiculos();
    await this.cargarPedidos();
    this.setupEventListeners();

  },

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    const btnAcciones = document.getElementById('btnAccionesPedidos');
    const menuAcciones = document.getElementById('menuAccionesPedidos');
    const btnAbrirNuevoPedido = document.getElementById('btnAbrirNuevoPedido');
    const btnAbrirImportExcel = document.getElementById('btnAbrirImportExcel');
    const btnDescargarReporteOperacion = document.getElementById('btnDescargarReporteOperacion');

    if (btnAcciones && menuAcciones) {
      btnAcciones.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menuAcciones.classList.toggle('show');
      });

      document.addEventListener('click', () => menuAcciones.classList.remove('show'));
      menuAcciones.addEventListener('click', (e) => e.stopPropagation());
    }

    if (btnAbrirNuevoPedido) {
      btnAbrirNuevoPedido.addEventListener('click', () => {
        if (menuAcciones) menuAcciones.classList.remove('show');
        this.abrirModalNuevoPedido();
      });
    }

    const checkAsignarRuta = document.getElementById('nuevo_asignarRuta');
    if (checkAsignarRuta) {
      checkAsignarRuta.addEventListener('change', () => {
        const seccion = document.getElementById('seccionAsignacionRuta');
        if (seccion) {
          seccion.style.display = checkAsignarRuta.checked ? 'block' : 'none';
        }
      });
    }

    if (btnAbrirImportExcel) {
      btnAbrirImportExcel.addEventListener('click', () => {
        if (menuAcciones) menuAcciones.classList.remove('show');
        this.abrirModal('modalImportExcel');
      });
    }

    if (btnDescargarReporteOperacion) {
      btnDescargarReporteOperacion.addEventListener('click', () => {
        if (menuAcciones) menuAcciones.classList.remove('show');
        if (typeof ExportarExcel !== 'undefined' && ExportarExcel.exportarReporteOperacion) {
          ExportarExcel.exportarReporteOperacion();
        } else if (typeof ExportarExcel !== 'undefined' && ExportarExcel.exportarRutas) {
          ExportarExcel.exportarRutas();
        } else {
          UI.showError('No se encontró la función de exportación');
        }
      });
    }

    const btnCerrarModalNuevo = document.getElementById('btnCerrarModalNuevo');
    const btnCancelarNuevo = document.getElementById('btnCancelarNuevo');
    const btnCerrarModalImport = document.getElementById('btnCerrarModalImport');

    if (btnCerrarModalNuevo) btnCerrarModalNuevo.addEventListener('click', () => this.cerrarModal('modalNuevoPedido'));
    if (btnCancelarNuevo) btnCancelarNuevo.addEventListener('click', () => this.cerrarModal('modalNuevoPedido'));
    if (btnCerrarModalImport) btnCerrarModalImport.addEventListener('click', () => this.cerrarModal('modalImportExcel'));

    ['modalNuevoPedido', 'modalImportExcel', 'modalEditarPedido'].forEach((id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.cerrarModal(id);
      });
    });

    const searchInput = document.getElementById('searchInput');
    const filterEstado = document.getElementById('filterEstado');

    if (searchInput) searchInput.addEventListener('input', () => this.filtrarPedidos());
    if (filterEstado) filterEstado.addEventListener('change', () => this.filtrarPedidos());

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const btnSelectFile = document.getElementById('btnSelectFile');
    const btnRemoveFile = document.getElementById('btnRemoveFile');
    const btnPreview = document.getElementById('btnPreview');
    const btnCrearRutas = document.getElementById('btnCrearRutas');
    
    if (btnSelectFile && fileInput) {
      btnSelectFile.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
    }
    
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
      });
      uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) this.handleFileSelect(e.dataTransfer.files[0]);
      });
    }

    if (btnRemoveFile) btnRemoveFile.addEventListener('click', () => this.removeFile());
    if (btnPreview) btnPreview.addEventListener('click', () => this.previewFile());
    if (btnCrearRutas) btnCrearRutas.addEventListener('click', () => this.crearRutasAutomaticas());

    const formNuevoPedido = document.getElementById('formNuevoPedido');
    
    if (formNuevoPedido) {
      formNuevoPedido.addEventListener('submit', (e) => {
        e.preventDefault();
        this.crearPedidoNuevo();
      });
    }

    const btnCerrarModalEditar = document.getElementById('btnCerrarModalEditar');
    const btnCancelarEditar = document.getElementById('btnCancelarEditar');
    const formEditarPedido = document.getElementById('formEditarPedido');
    
    if (btnCerrarModalEditar) btnCerrarModalEditar.addEventListener('click', () => this.cerrarModalEditar());
    if (btnCancelarEditar) btnCancelarEditar.addEventListener('click', () => this.cerrarModalEditar());
    if (formEditarPedido) {
      formEditarPedido.addEventListener('submit', (e) => {
        e.preventDefault();
        this.actualizarPedido();
      });
    }
  },

  /**
   * Abrir modal de nuevo pedido con configuración inicial
   */
  abrirModalNuevoPedido() {
    const form = document.getElementById('formNuevoPedido');
    if (form) form.reset();

    const msg = document.getElementById('nuevoMessage');
    if (msg) msg.innerHTML = '';

    const clienteBusqueda = document.getElementById('nuevo_clienteBusqueda');
    const clienteId = document.getElementById('nuevo_clientId');
    const clienteResultados = document.getElementById('nuevo_clienteResultados');
    if (clienteBusqueda) clienteBusqueda.value = '';
    if (clienteId) clienteId.value = '';
    if (clienteResultados) clienteResultados.style.display = 'none';

    const cajas = document.getElementById('nuevo_cajas');
    if (cajas) cajas.value = '1';

    const hoy = new Date();
    const diaSemana = hoy.getDay();
    let diasAgregar = 1;
    if (diaSemana === 5) diasAgregar = 3;
    else if (diaSemana === 6) diasAgregar = 2;
    else if (diaSemana === 0) diasAgregar = 1;

    const fechaCompromiso = new Date(hoy);
    fechaCompromiso.setDate(fechaCompromiso.getDate() + diasAgregar);

    const year = fechaCompromiso.getFullYear();
    const month = String(fechaCompromiso.getMonth() + 1).padStart(2, '0');
    const day = String(fechaCompromiso.getDate()).padStart(2, '0');
    const fechaInput = document.getElementById('nuevo_fechaCompromiso');
    if (fechaInput) fechaInput.value = `${year}-${month}-${day}`;

    const checkAsignarRuta = document.getElementById('nuevo_asignarRuta');
    if (checkAsignarRuta) checkAsignarRuta.checked = false;

    const seccionRuta = document.getElementById('seccionAsignacionRuta');
    if (seccionRuta) seccionRuta.style.display = 'none';

    this.llenarDropdownConductoresVehiculos();

    this.abrirModal('modalNuevoPedido');
  },

  /**
   * Llenar dropdowns de conductores y vehículos en el modal de nuevo pedido
   */
  llenarDropdownConductoresVehiculos() {
    const selectConductor = document.getElementById('nuevo_conductorId');
    const selectVehiculo = document.getElementById('nuevo_vehicleId');

    if (selectConductor) {
      selectConductor.innerHTML = '<option value="">Seleccionar...</option>';
      this.conductores.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.nombre;
        selectConductor.appendChild(option);
      });
    }

    if (selectVehiculo) {
      selectVehiculo.innerHTML = '<option value="">Seleccionar...</option>';
      this.vehiculos.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.patente} - ${v.tipo || 'Sin tipo'}`;
        selectVehiculo.appendChild(option);
      });
    }
  },

  abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (modalId === 'modalImportExcel') {
      const alerts = document.getElementById('importAlerts');
      if (alerts) alerts.innerHTML = '';
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  },

  cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');

    if (modalId === 'modalNuevoPedido') {
      const msg = document.getElementById('nuevoMessage');
      if (msg) msg.innerHTML = '';
    }
    if (modalId === 'modalEditarPedido') {
      const msg = document.getElementById('modalEditarMessage');
      if (msg) msg.innerHTML = '';
    }
  },

  /**
   * Cargar clientes
   */
  async cargarClientes() {
    try {
      const take = 500;
      let skip = 0;
      const all = [];
      let total = null;

      for (let guard = 0; guard < 200; guard++) {
        const response = await API.get(CONFIG.ENDPOINTS.CLIENTS, { take, skip });
        const items = response.items || [];

        all.push(...items);

        if (typeof response.total === 'number') total = response.total;

        if (items.length < take) break;
        if (total !== null && all.length >= total) break;

        skip += take;
      }

      const map = new Map();
      all.forEach(c => {
        if (c && c.id != null) map.set(c.id, c);
      });

      this.clientes = Array.from(map.values());
      this.clientes.sort((a, b) => (a.razonSocial || '').localeCompare(b.razonSocial || ''));
      this.llenarDropdownClientes();
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  },

  /**
   * Cargar conductores
   */
  async cargarConductores() {
    console.log('Cargando conductores...');
    try {
      const response = await API.get('/users', { take: 200, role: 'CONDUCTOR' });
      this.conductores = response.items?.filter(u => u.role === 'CONDUCTOR' && u.active) || [];
      console.log('Conductores cargados:', this.conductores.length);
    } catch (error) {
      console.error('Error al cargar conductores:', error);
      this.conductores = [];
    }
  },

  /**
   * Cargar vehículos
   */
  async cargarVehiculos() {
    console.log('Cargando vehículos...');
    try {
      const response = await API.get(CONFIG.ENDPOINTS.VEHICLES, { take: 200 });
      this.vehiculos = response.items?.filter(v => v.estado === 'ACTIVO') || [];
      console.log('Vehículos cargados:', this.vehiculos.length);
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
      this.vehiculos = [];
    }
  },

  /**
   * Configurar autocompletado de clientes
   */
  setupClienteAutocomplete(inputId, hiddenId, resultsId) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const results = document.getElementById(resultsId);

    if (!input || !hidden || !results) return;

    let activeIndex = -1;

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase().trim();
      hidden.value = '';

      if (query.length < 1) {
        results.style.display = 'none';
        return;
      }

      const filtrados = this.clientes.filter(c => {
        const matchNombre = c.razonSocial.toLowerCase().includes(query);
        const matchRut = c.rut.toLowerCase().includes(query);
        return matchNombre || matchRut;
      }).slice(0, 10);

      if (filtrados.length === 0) {
        results.innerHTML = '<div class="autocomplete-item" style="color: #6b7280;">No se encontraron clientes</div>';
        results.style.display = 'block';
        return;
      }

      results.innerHTML = filtrados.map((c, idx) => `
        <div class="autocomplete-item" data-id="${c.id}" data-index="${idx}">
          <div class="cliente-nombre">${this.escapeHtml(c.razonSocial)}${c.active === false ? ' <span style="color: #ef4444;">(INACTIVO)</span>' : ''}</div>
          <div class="cliente-rut">RUT: ${this.escapeHtml(c.rut)}</div>
          <div class="cliente-comuna">${this.escapeHtml(c.comuna)}, ${this.escapeHtml(c.ciudad)}</div>
        </div>
      `).join('');

      results.style.display = 'block';
      activeIndex = -1;

      results.querySelectorAll('.autocomplete-item[data-id]').forEach(item => {
        item.addEventListener('click', () => {
          const clienteId = item.dataset.id;
          const cliente = this.clientes.find(c => c.id === parseInt(clienteId));
          if (cliente) {
            input.value = `${cliente.razonSocial} (${cliente.rut})`;
            hidden.value = cliente.id;
            results.style.display = 'none';
          }
        });
      });
    });

    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.autocomplete-item[data-id]');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        items.forEach((item, idx) => item.classList.toggle('active', idx === activeIndex));
        items[activeIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        items.forEach((item, idx) => item.classList.toggle('active', idx === activeIndex));
        items[activeIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].click();
        }
      } else if (e.key === 'Escape') {
        results.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.style.display = 'none';
      }
    });
  },

  /**
   * Llenar dropdowns de clientes (para editar - mantiene el select)
   */
  llenarDropdownClientes() {
    this.setupClienteAutocomplete('nuevo_clienteBusqueda', 'nuevo_clientId', 'nuevo_clienteResultados');

    const select = document.getElementById('editar_clientId');
    if (select) {
      select.innerHTML = '<option value="">Seleccione un cliente...</option>';
      this.clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        const inactiveTag = (cliente.active === false) ? ' (INACTIVO)' : '';
        option.textContent = `${cliente.razonSocial} (${cliente.rut})${inactiveTag}`;
        select.appendChild(option);
      });
    }
  },

  /**
   * Cargar pedidos
   */
  async cargarPedidos() {
    try {
      const response = await API.get(CONFIG.ENDPOINTS.PEDIDOS, { take: 200, skip: 0 });
      this.pedidos = response.items || [];
      this.pedidos.sort((a, b) => b.id - a.id);
      this.filtrarPedidos();
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      document.getElementById('pedidosTableContainer').innerHTML = 
        '<p class="text-center text-danger">Error al cargar pedidos</p>';
    }
  },

  /**
   * Renderizar tabla
   */
  renderizarTabla(pedidos) {
    const container = document.getElementById('pedidosTableContainer');

    const puedeEliminar = (typeof Auth !== 'undefined' && Auth.hasAnyRole)
      ? Auth.hasAnyRole([CONFIG.ROLES.ADMIN, CONFIG.ROLES.PLANIFICADOR, CONFIG.ROLES.SUPERVISOR])
      : false;

    if (pedidos.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">No hay pedidos registrados</p>';
      return;
    }

    const html = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Fecha Solicitud</th>
              <th>Fecha Compromiso</th>
              <th>Cajas</th>
              <th>Estado</th>
              <th>Ruta / Asignación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${pedidos.map(pedido => `
              <tr>
                <td><strong>#${pedido.id}</strong></td>
                <td>${this.escapeHtml(pedido.client?.razonSocial || 'Cliente eliminado')}</td>
                <td>${UI.formatDate(pedido.fechaSolicitud)}</td>
                <td>${pedido.fechaCompromiso ? UI.formatDate(pedido.fechaCompromiso) : '-'}</td>
                <td>${pedido.cajas || 0}</td>
                <td>${UI.createBadge(pedido.estado, pedido.estado)}</td>
                <td>
                  ${(() => {
                    const stop = Array.isArray(pedido.stops) ? pedido.stops[0] : null;
                    const route = stop?.route;

                    if (!route) {
                      return `<span class="text-muted">Sin ruta</span>`;
                    }

                    const conductor = Pedidos.escapeHtml(route.conductor?.nombre || '—');
                    const patente = Pedidos.escapeHtml(route.vehicle?.patente || '—');

                    return `
                      <div style="display:flex; flex-direction:column; gap:4px;">
                        <div>
                          <strong>Ruta #${route.id}</strong>
                          ${UI.createBadge(route.estado, route.estado)}
                        </div>
                        <div class="text-muted" style="font-size:12px; line-height:1.2;">
                          👤 ${conductor}<br>
                          🚚 ${patente}
                        </div>
                      </div>
                    `;
                  })()}
                </td>
                <td>
                  <div class="table-actions">
                    <button
                      class="btn btn-sm btn-primary btn-icon"
                      onclick="Pedidos.editarPedido(${pedido.id})"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    ${puedeEliminar ? `
                      <button
                        class="btn btn-sm btn-danger btn-icon"
                        onclick="Pedidos.eliminarPedido(${pedido.id})"
                        title="Eliminar"
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

  /**
   * Filtrar pedidos
   */
  filtrarPedidos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const estadoFilter = document.getElementById('filterEstado').value;

    let filtrados = [...this.pedidos];

    if (estadoFilter) {
      filtrados = filtrados.filter(p => p.estado === estadoFilter);
    }

    if (searchTerm) {
      filtrados = filtrados.filter(p => {
        const coincideId = p.id.toString().includes(searchTerm);
        const coincideCliente = p.client?.razonSocial?.toLowerCase().includes(searchTerm);
        const coincideRut = p.client?.rut?.toLowerCase().includes(searchTerm);
        return coincideId || coincideCliente || coincideRut;
      });
    }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      filtrados = filtrados.filter(p => {
        const esHistoricoPorEstado = (p.estado === 'ENTREGADO' || p.estado === 'NO_ENTREGADO');
        if (!esHistoricoPorEstado) return true;
        if (!p.fechaCompromiso) return true;

        const d = new Date(p.fechaCompromiso);
        if (Number.isNaN(d.getTime())) return true;
        d.setHours(0, 0, 0, 0);

        return d >= hoy;
      });

    this.renderizarTabla(filtrados);
  },

  /**
   * Crear pedido nuevo con opción de asignar a ruta
   */
  async crearPedidoNuevo() {
    document.getElementById('nuevoMessage').innerHTML = '';

    const clientIdValue = document.getElementById('nuevo_clientId').value;
    const clientId = clientIdValue ? parseInt(clientIdValue) : null;
    const cajas = parseInt(document.getElementById('nuevo_cajas').value);
    const fechaCompromiso = document.getElementById('nuevo_fechaCompromiso').value;
    const comentarios = document.getElementById('nuevo_comentarios').value.trim();
    const asignarRuta = document.getElementById('nuevo_asignarRuta')?.checked || false;

    if (!clientId) {
      document.getElementById('nuevoMessage').innerHTML =
        '<div class="alert alert-danger">Debes seleccionar un cliente de la lista</div>';
      document.getElementById('nuevo_clienteBusqueda')?.focus();
      return;
    }

    if (!cajas || !fechaCompromiso) {
      document.getElementById('nuevoMessage').innerHTML =
        '<div class="alert alert-danger">Por favor completa los campos requeridos (cajas y fecha)</div>';
      return;
    }

    let conductorId = parseInt(document.getElementById('nuevo_conductorId')?.value) || null;
    let vehicleId = parseInt(document.getElementById('nuevo_vehicleId')?.value) || null;

    const btnGuardar = document.getElementById('btnGuardarNuevo');
    UI.setButtonLoading(btnGuardar, true);

    try {
      const pedidoData = { clientId, cajas, fechaCompromiso };
      if (comentarios) pedidoData.comentarios = comentarios;

      const pedidoRes = await API.post(CONFIG.ENDPOINTS.PEDIDOS, pedidoData);
      const pedido = pedidoRes.item;

      let mensaje = 'Pedido creado correctamente';

      if (asignarRuta && pedido) {
        const cliente = this.clientes.find(c => c.id === clientId);
        const zona = cliente?.comuna || 'Sin zona';

        console.log('Asignando pedido a ruta...');
        console.log('Zona del cliente:', zona);
        console.log('Conductor seleccionado:', conductorId || 'AUTO');
        console.log('Vehículo seleccionado:', vehicleId || 'AUTO');

        let rutaId = null;

        if (!conductorId || !vehicleId) {
          try {
            const autoRes = await API.get(`${CONFIG.ENDPOINTS.ROUTES}/auto-asignar`, {
              fecha: fechaCompromiso,
              zona: zona,
            });

            if (autoRes.ok) {
              conductorId = autoRes.conductorId;
              vehicleId = autoRes.vehicleId;

              if (autoRes.rutaExistenteId) {
                rutaId = autoRes.rutaExistenteId;
                mensaje = `Pedido auto-asignado a ruta #${rutaId} existente (${zona})`;
                console.log('Auto-asignación: ruta existente', rutaId);
              } else {
                console.log('Auto-asignación: conductor', conductorId, 'vehículo', vehicleId);
              }
            }
          } catch (autoErr) {
            console.warn('Error en auto-asignación, usando primer conductor disponible:', autoErr);
            if (this.conductores.length > 0) conductorId = this.conductores[0].id;
            if (this.vehiculos.length > 0) vehicleId = this.vehiculos[0].id;
          }
        }

        if (!conductorId || !vehicleId) {
          throw new Error('No hay conductores o vehículos disponibles para asignar');
        }

        if (!rutaId) {
          const rutasRes = await API.get(CONFIG.ENDPOINTS.ROUTES, {
            take: 200,
            dateFrom: fechaCompromiso,
            dateTo: fechaCompromiso,
          });

          const rutasActivas = (rutasRes.items || []).filter(r =>
            r.estado !== 'CANCELADA' && r.estado !== 'FINALIZADA'
          );

          const zonaNorm = zona.toLowerCase().trim();
          const zonasCoinciden = (zonaRuta) => zonaRuta?.toLowerCase().trim() === zonaNorm;

          let rutaExistente = rutasActivas.find(r => zonasCoinciden(r.zona));

          if (rutaExistente) {
            rutaId = rutaExistente.id;
            mensaje = `Pedido agregado a ruta #${rutaId} existente (${zona})`;
          } else {
            const nuevaRuta = await API.post(CONFIG.ENDPOINTS.ROUTES, {
              conductorId,
              vehicleId,
              fechaRuta: fechaCompromiso,
              zona,
              estado: 'PROGRAMADA',
            });
            rutaId = nuevaRuta.item?.id;

            const conductorNombre = this.conductores.find(c => c.id === conductorId)?.nombre || 'Conductor';
            mensaje = `Pedido asignado a ${conductorNombre} (nueva ruta #${rutaId})`;
          }
        }

        if (rutaId) {
          await API.post(`${CONFIG.ENDPOINTS.ROUTES}/${rutaId}/stops`, {
            pedidoId: pedido.id,
          });
        }
      }

      document.getElementById('nuevoMessage').innerHTML =
        `<div class="alert alert-success">${mensaje}</div>`;
      document.getElementById('formNuevoPedido').reset();
      await this.cargarPedidos();

      setTimeout(() => {
        this.cerrarModal('modalNuevoPedido');
      }, 1500);
    } catch (error) {
      document.getElementById('nuevoMessage').innerHTML =
        `<div class="alert alert-danger">${error.message || 'Error al crear pedido'}</div>`;
    } finally {
      UI.setButtonLoading(btnGuardar, false);
    }
  },

  /**
   * Editar pedido (modal)
   */
  editarPedido(id) {
    const pedido = this.pedidos.find(p => p.id === id);
    if (!pedido) return;

    document.getElementById('modalEditarMessage').innerHTML = '';
    document.getElementById('editar_pedidoId').value = pedido.id;
    document.getElementById('editar_clientId').value = pedido.clientId;
    document.getElementById('editar_cajas').value = pedido.cajas || 1;

    if (pedido.fechaCompromiso) {
      const fecha = new Date(pedido.fechaCompromiso);
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      document.getElementById('editar_fechaCompromiso').value = `${year}-${month}-${day}`;
    } else {
      document.getElementById('editar_fechaCompromiso').value = '';
    }

    document.getElementById('editar_comentarios').value = pedido.comentarios || '';

    this.llenarDropdownEditarConductorVehiculo();

    const rutaInfo = document.getElementById('editar_rutaInfo');
    const stop = Array.isArray(pedido.stops) ? pedido.stops[0] : null;
    const route = stop?.route;

    if (route) {
      rutaInfo.innerHTML = `
        <div style="background: #eff6ff; padding: 10px; border-radius: 6px; font-size: 13px;">
          <strong>Ruta actual:</strong> #${route.id} - ${route.zona || 'Sin zona'}
          <span class="badge badge-${route.estado === 'PROGRAMADA' ? 'primary' : route.estado === 'EN_CURSO' ? 'warning' : 'success'}" style="margin-left: 8px;">${route.estado}</span>
        </div>
      `;
      document.getElementById('editar_conductorId').value = route.conductorId || '';
      document.getElementById('editar_vehicleId').value = route.vehicleId || '';
    } else {
      rutaInfo.innerHTML = '<p class="text-muted text-sm">Este pedido no esta asignado a ninguna ruta.</p>';
      document.getElementById('editar_conductorId').value = '';
      document.getElementById('editar_vehicleId').value = '';
    }

    this.abrirModal('modalEditarPedido');
  },

  /**
   * Llenar dropdowns de conductor y vehiculo en modal editar
   */
  llenarDropdownEditarConductorVehiculo() {
    const selectConductor = document.getElementById('editar_conductorId');
    const selectVehiculo = document.getElementById('editar_vehicleId');

    if (selectConductor) {
      selectConductor.innerHTML = '<option value="">Sin asignar</option>';
      this.conductores.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.nombre;
        selectConductor.appendChild(option);
      });
    }

    if (selectVehiculo) {
      selectVehiculo.innerHTML = '<option value="">Sin asignar</option>';
      this.vehiculos.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.patente} - ${v.tipo || 'Sin tipo'}`;
        selectVehiculo.appendChild(option);
      });
    }
  },

  cerrarModalEditar() {
    this.cerrarModal('modalEditarPedido');
  },

  /**
   * Actualizar pedido
   */
  async actualizarPedido() {
    document.getElementById('modalEditarMessage').innerHTML = '';

    const id = parseInt(document.getElementById('editar_pedidoId').value);
    const clientId = parseInt(document.getElementById('editar_clientId').value);
    const cajas = parseInt(document.getElementById('editar_cajas').value);
    const fechaCompromiso = document.getElementById('editar_fechaCompromiso').value;
    const comentarios = document.getElementById('editar_comentarios').value.trim();
    const conductorId = document.getElementById('editar_conductorId').value ? parseInt(document.getElementById('editar_conductorId').value) : null;
    const vehicleId = document.getElementById('editar_vehicleId').value ? parseInt(document.getElementById('editar_vehicleId').value) : null;

    const data = { clientId, cajas };
    if (fechaCompromiso) data.fechaCompromiso = fechaCompromiso;
    if (comentarios) data.comentarios = comentarios;

    const btnGuardar = document.getElementById('btnGuardarEditar');
    UI.setButtonLoading(btnGuardar, true);

    try {
      await API.patch(`${CONFIG.ENDPOINTS.PEDIDOS}/${id}`, data);

      const pedido = this.pedidos.find(p => p.id === id);
      const stop = Array.isArray(pedido?.stops) ? pedido.stops[0] : null;
      const routeActual = stop?.route;

      if (conductorId && vehicleId) {
        if (routeActual) {
          await API.patch(`${CONFIG.ENDPOINTS.ROUTES}/${routeActual.id}`, {
            conductorId,
            vehicleId
          });
        } else {
          const cliente = this.clientes.find(c => c.id === clientId);
          const zona = cliente?.comuna || 'Sin zona';
          const fechaRuta = fechaCompromiso || new Date().toISOString().split('T')[0];

          const rutasRes = await API.get(CONFIG.ENDPOINTS.ROUTES, {
            take: 50,
            conductorId,
            dateFrom: fechaRuta,
            dateTo: fechaRuta,
          });

          let rutaId = null;
          const rutaExistente = rutasRes.items?.find(r =>
            r.conductorId === conductorId &&
            r.vehicleId === vehicleId &&
            (r.zona === zona || !r.zona) &&
            r.estado !== 'CANCELADA' &&
            r.estado !== 'FINALIZADA'
          );

          if (rutaExistente) {
            rutaId = rutaExistente.id;
          } else {
            const nuevaRuta = await API.post(CONFIG.ENDPOINTS.ROUTES, {
              conductorId,
              vehicleId,
              fechaRuta,
              zona,
              estado: 'PROGRAMADA',
            });
            rutaId = nuevaRuta.item?.id;
          }

          if (rutaId) {
            await API.post(`${CONFIG.ENDPOINTS.ROUTES}/${rutaId}/stops`, {
              pedidoId: id,
            });
          }
        }
      }

      document.getElementById('modalEditarMessage').innerHTML =
        '<div class="alert alert-success">Pedido actualizado correctamente</div>';
      await this.cargarPedidos();

      setTimeout(() => {
        this.cerrarModalEditar();
      }, 1000);
    } catch (error) {
      document.getElementById('modalEditarMessage').innerHTML =
        `<div class="alert alert-danger">${error.message || 'Error al actualizar'}</div>`;
    } finally {
      UI.setButtonLoading(btnGuardar, false);
    }
  },

  /**
   * Cambiar estado rápido
   */
  async cambiarEstado(id, nuevoEstado) {
    if (!UI.confirm(`¿Marcar pedido #${id} como ${nuevoEstado}?`)) return;

    try {
      await API.patch(`${CONFIG.ENDPOINTS.PEDIDOS}/${id}`, { estado: nuevoEstado });
      await this.cargarPedidos();
      UI.showSuccess(`Pedido marcado como ${nuevoEstado}`);
    } catch (error) {
      UI.showError('Error al cambiar el estado');
    }
  },

  async eliminarPedido(id) {
    if (typeof Auth !== 'undefined' && Auth.hasAnyRole) {
      const permitido = Auth.hasAnyRole([CONFIG.ROLES.ADMIN, CONFIG.ROLES.PLANIFICADOR, CONFIG.ROLES.SUPERVISOR]);
      if (!permitido) {
        UI.showError(CONFIG.ERROR_MESSAGES.FORBIDDEN);
        return;
      }
    }

    if (!UI.confirm(`¿Eliminar el pedido #${id}? Esta acción no se puede deshacer.`)) return;

    try {
      await API.delete(`${CONFIG.ENDPOINTS.PEDIDOS}/${id}`);
      await this.cargarPedidos();
      UI.showSuccess(`Pedido #${id} eliminado`);
    } catch (error) {
      UI.showError(error.message || 'Error al eliminar el pedido');
    }
  },

  
  /* ==========================================
     FUNCIONES DE IMPORTACIÓN EXCEL
     ========================================== */

  handleFileSelect(file) {
    if (!file) return;

    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      this.showImportAlert('error', 'Tipo de archivo inválido', 'Selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showImportAlert('error', 'Archivo muy grande', 'El archivo no debe superar 10MB');
      return;
    }

    this.selectedFile = file;
    this.showFileInfo(file);
  },

  showFileInfo(file) {
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
    document.getElementById('previewResults').style.display = 'none';
    document.getElementById('rutasConfigSection').style.display = 'none';
    document.getElementById('btnCrearRutas').disabled = true;
    document.getElementById('importAlerts').innerHTML = '';
    
    this.calcularFechaCompromiso();
  },

  calcularFechaCompromiso() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    let diasAgregar = 1;

    if (diaSemana === 5) diasAgregar = 3;
    else if (diaSemana === 6) diasAgregar = 2;
    else if (diaSemana === 0) diasAgregar = 1;

    const fechaCompromiso = new Date(hoy);
    fechaCompromiso.setDate(fechaCompromiso.getDate() + diasAgregar);

    const year = fechaCompromiso.getFullYear();
    const month = String(fechaCompromiso.getMonth() + 1).padStart(2, '0');
    const day = String(fechaCompromiso.getDate()).padStart(2, '0');
    
    document.getElementById('fechaCompromisoImport').value = `${year}-${month}-${day}`;
  },

  removeFile() {
    this.selectedFile = null;
    this.previewData = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('previewResults').style.display = 'none';
    document.getElementById('rutasConfigSection').style.display = 'none';
    document.getElementById('importAlerts').innerHTML = '';
  },

  async previewFile() {
    if (!this.selectedFile) return;

    document.getElementById('importLoading').style.display = 'block';
    document.getElementById('importAlerts').innerHTML = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    try {
      const response = await fetch(`${CONFIG.API_URL}/routes/import/preview`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Error al procesar el archivo');
      }

      this.previewData = data;
      this.displayPreview(data);

    } catch (error) {
      this.showImportAlert('error', 'Error', error.message);
    } finally {
      document.getElementById('importLoading').style.display = 'none';
    }
  },

  displayPreview(data) {
    document.getElementById('previewResults').style.display = 'block';
    document.getElementById('totalComunas').textContent = data.resumen.totalComunas;
    document.getElementById('totalClientes').textContent = data.resumen.totalClientes;
    document.getElementById('totalCajas').textContent = data.resumen.totalCajas;

    // Warnings
    if (data.clientesNoEncontrados?.length > 0) {
      this.showImportAlert('warning', 
        `${data.clientesNoEncontrados.length} RUTs no encontrados`,
        `Los siguientes RUTs no existen: ${data.clientesNoEncontrados.slice(0, 5).join(', ')}...`
      );
    }

    if (data.clientesSinCoordenadas?.length > 0) {
      this.showImportAlert('warning',
        `${data.clientesSinCoordenadas.length} clientes sin coordenadas`,
        'Estos clientes necesitan geocodificación.'
      );
    }

    this.mostrarConfiguracionRutas(data.rutasPorComuna);
  },

  /* ==========================================
     NUEVA FUNCIONALIDAD: CONFIGURAR RUTAS
     ========================================== */

  mostrarConfiguracionRutas(rutasPorComuna) {
    const container = document.getElementById('rutasConfigList');
    
    const html = rutasPorComuna.map(ruta => `
      <div class="ruta-config-item" data-comuna="${ruta.comuna}">
        <div class="ruta-config-header">
          <input 
            type="checkbox" 
            id="check_${ruta.comuna}" 
            class="ruta-checkbox"
            checked
          >
          <label for="check_${ruta.comuna}" style="font-weight: 600; margin-left: 8px;">
            ${ruta.comuna} - ${ruta.totalClientes} clientes, ${ruta.totalCajas} cajas
          </label>
        </div>
        <div class="ruta-config-selects" style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 13px; color: #6b7280;">Conductor:</label>
            <select class="form-select conductor-select" data-comuna="${ruta.comuna}">
              <option value="">Seleccionar...</option>
              ${this.conductores.map(c => `
                <option value="${c.id}">${c.nombre}</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 13px; color: #6b7280;">Vehículo:</label>
            <select class="form-select vehiculo-select" data-comuna="${ruta.comuna}">
              <option value="">Seleccionar...</option>
              ${this.vehiculos.map(v => `
                <option value="${v.id}">${v.patente} - ${v.tipo || 'Sin tipo'}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
    document.getElementById('rutasConfigSection').style.display = 'block';
    document.getElementById('btnCrearRutas').disabled = false;
  },

  /* ==========================================
     NUEVA FUNCIONALIDAD: CREAR RUTAS AUTOMÁTICAS
     ========================================== */

  async crearRutasAutomaticas() {
    if (!this.selectedFile || !this.previewData) return;

    console.log('Iniciando creación de rutas automáticas...');

    const fechaCompromisoInput = document.getElementById('fechaCompromisoImport').value;
    
    if (!fechaCompromisoInput) {
      this.showImportAlert('error', 'Fecha requerida', 'Por favor selecciona la fecha de compromiso');
      return;
    }

    const rutasConfig = [];
    const checkboxes = document.querySelectorAll('.ruta-checkbox:checked');

    for (const checkbox of checkboxes) {
      const comuna = checkbox.id.replace('check_', '');
      const conductorSelect = document.querySelector(`.conductor-select[data-comuna="${comuna}"]`);
      const vehiculoSelect = document.querySelector(`.vehiculo-select[data-comuna="${comuna}"]`);

      const conductorId = parseInt(conductorSelect.value);
      const vehicleId = parseInt(vehiculoSelect.value);

      if (!conductorId || !vehicleId) {
        this.showImportAlert('error', 'Configuración incompleta', 
          `Por favor selecciona conductor y vehículo para ${comuna}`);
        return;
      }

      rutasConfig.push({ comuna, conductorId, vehicleId });
    }

    if (rutasConfig.length === 0) {
      this.showImportAlert('error', 'Sin comunas seleccionadas', 
        'Por favor selecciona al menos una comuna para crear rutas');
      return;
    }

    console.log('Configuración de rutas:', rutasConfig);

    const [year, month, day] = fechaCompromisoInput.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;

    if (!UI.confirm(`¿Crear ${rutasConfig.length} rutas automáticas con fecha ${fechaFormateada}?`)) return;

    document.getElementById('importLoading').style.display = 'block';
    document.getElementById('loadingText').textContent = 'Creando rutas y pedidos...';

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('fechaCompromiso', `${fechaCompromisoInput}T12:00:00.000Z`);
    formData.append('rutasConfig', JSON.stringify(rutasConfig));

    try {
      console.log('Enviando request a /routes/import-with-routes...');
      console.log('Datos a enviar:', {
        fechaCompromiso: `${fechaCompromisoInput}T12:00:00.000Z`,
        rutasConfig: rutasConfig
      });

      const response = await fetch(`${CONFIG.API_URL}/routes/import-with-routes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: formData
      });

      const data = await response.json();

      console.log('Respuesta del servidor:', data);

      if (!response.ok || !data.ok) {
        if (data.issues) {
          console.error('Errores de validación:', data.issues);
        }
        throw new Error(data.message || 'Error al crear rutas');
      }

      this.showImportAlert('success', '¡Éxito!', 
        `✅ Se crearon ${data.rutasCreadas} rutas con ${data.pedidosCreados} pedidos y ${data.paradasCreadas} paradas`);
      
      document.getElementById('btnCrearRutas').disabled = true;
      document.getElementById('btnCrearRutas').textContent = '✓ Rutas Creadas';

      await this.cargarPedidos();

      setTimeout(() => {
        if (UI.confirm('¿Ir a ver las rutas creadas?')) {
          window.location.href = 'rutas.html';
        }
      }, 2000);

    } catch (error) {
      console.error('Error al crear rutas:', error);
      this.showImportAlert('error', 'Error', error.message);
    } finally {
      document.getElementById('importLoading').style.display = 'none';
      document.getElementById('loadingText').textContent = 'Procesando archivo...';
    }
  },

  showImportAlert(type, title, message) {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const colors = { 
      success: '#d1fae5', 
      error: '#fee2e2', 
      warning: '#fef3c7', 
      info: '#dbeafe' 
    };

    const alert = document.createElement('div');
    alert.style.cssText = `
      padding: 16px;
      background: ${colors[type]};
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
    `;
    alert.innerHTML = `
      <div style="display: flex; gap: 12px;">
        <span style="font-size: 20px;">${icons[type]}</span>
        <div>
          <strong>${title}</strong>
          <p style="margin: 4px 0 0 0;">${message}</p>
        </div>
      </div>
    `;
    
    document.getElementById('importAlerts').appendChild(alert);
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
};

