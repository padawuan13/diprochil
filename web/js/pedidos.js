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
    // ACCIONES (dropdown)
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

      // Cerrar dropdown al hacer click fuera
      document.addEventListener('click', () => menuAcciones.classList.remove('show'));
      menuAcciones.addEventListener('click', (e) => e.stopPropagation());
    }

    if (btnAbrirNuevoPedido) {
      btnAbrirNuevoPedido.addEventListener('click', () => {
        if (menuAcciones) menuAcciones.classList.remove('show');
        this.abrirModal('modalNuevoPedido');
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
          // Fallback (si no está el nuevo reporte)
          ExportarExcel.exportarRutas();
        } else {
          UI.showError('No se encontró la función de exportación');
        }
      });
    }

    // MODALES - cerrar por botones y click fuera
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

    // TAB 1: LISTA
    const searchInput = document.getElementById('searchInput');
    const filterEstado = document.getElementById('filterEstado');

    if (searchInput) searchInput.addEventListener('input', () => this.filtrarPedidos());
    if (filterEstado) filterEstado.addEventListener('change', () => this.filtrarPedidos());

    // TAB 2: IMPORTAR
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
    
    // Drag and drop
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

    // NUEVO: NUEVO PEDIDO
    const formNuevoPedido = document.getElementById('formNuevoPedido');
    
    if (formNuevoPedido) {
      formNuevoPedido.addEventListener('submit', (e) => {
        e.preventDefault();
        this.crearPedidoNuevo();
      });
    }

    // MODAL EDITAR (puede no existir)
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

  abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Reset básico al abrir
    if (modalId === 'modalNuevoPedido') {
      const form = document.getElementById('formNuevoPedido');
      if (form) form.reset();
      const msg = document.getElementById('nuevoMessage');
      if (msg) msg.innerHTML = '';
      const cajas = document.getElementById('nuevo_cajas');
      if (cajas) cajas.value = '1';
    }

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

    // Limpieza básica de mensajes en ciertos modales
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

      // Traer todos los clientes paginando (evita quedarnos solo con los primeros 200)
      // y evita problemas cuando existen más de 200 clientes.
      for (let guard = 0; guard < 200; guard++) {
        const response = await API.get(CONFIG.ENDPOINTS.CLIENTS, { take, skip });
        const items = response.items || [];

        all.push(...items);

        // total viene desde backend (items, total, take, skip)
        if (typeof response.total === 'number') total = response.total;

        // Condiciones de término
        if (items.length < take) break;
        if (total !== null && all.length >= total) break;

        skip += take;
      }

      // Deduplicar por id por si el backend cambia el orden o hay solapamientos
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
    console.log('🔄 Cargando conductores...');
    try {
      const response = await API.get('/users', { take: 200, role: 'CONDUCTOR' });
      this.conductores = response.items?.filter(u => u.role === 'CONDUCTOR' && u.active) || [];
      console.log('✅ Conductores cargados:', this.conductores.length);
    } catch (error) {
      console.error('❌ Error al cargar conductores:', error);
      this.conductores = [];
    }
  },

  /**
   * Cargar vehículos
   */
  async cargarVehiculos() {
    console.log('🔄 Cargando vehículos...');
    try {
      const response = await API.get(CONFIG.ENDPOINTS.VEHICLES, { take: 200 });
      this.vehiculos = response.items?.filter(v => v.estado === 'ACTIVO') || [];
      console.log('✅ Vehículos cargados:', this.vehiculos.length);
    } catch (error) {
      console.error('❌ Error al cargar vehículos:', error);
      this.vehiculos = [];
    }
  },

  /**
   * Llenar dropdowns de clientes
   */
  llenarDropdownClientes() {
    const selects = ['nuevo_clientId', 'editar_clientId'];
    
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return; // Si el select no existe, skip
      
      select.innerHTML = '<option value="">Seleccione un cliente...</option>';
      
      this.clientes
        .forEach(cliente => {
          const option = document.createElement('option');
          option.value = cliente.id;
          const inactiveTag = (cliente.active === false) ? ' (INACTIVO)' : '';
          option.textContent = `${cliente.razonSocial} (${cliente.rut})${inactiveTag}`;
          select.appendChild(option);
        });
    });
  },

  /**
   * Cargar pedidos
   */
  async cargarPedidos() {
    try {
      const response = await API.get(CONFIG.ENDPOINTS.PEDIDOS, { take: 200, skip: 0 });
      this.pedidos = response.items || [];
      this.pedidos.sort((a, b) => b.id - a.id);
      this.filtrarPedidos(); // Usar filtrarPedidos en lugar de renderizar directo
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

    // Permiso: eliminar solo para ADMIN / PLANIFICADOR / SUPERVISOR
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
                <td>${pedido.client?.razonSocial || 'Cliente eliminado'}</td>
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

                    const conductor = route.conductor?.nombre || '—';
                    const patente = route.vehicle?.patente || '—';
                    
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
                    ${pedido.estado === 'PENDIENTE' ? `
                      <button 
                        class="btn btn-sm btn-success btn-icon" 
                        onclick="Pedidos.cambiarEstado(${pedido.id}, 'ENTREGADO')"
                        title="Marcar como Entregado"
                      >
                        ✅
                      </button>
                    ` : ''}
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

    // Filtrar por estado
    if (estadoFilter) {
      filtrados = filtrados.filter(p => p.estado === estadoFilter);
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      filtrados = filtrados.filter(p => {
        const coincideId = p.id.toString().includes(searchTerm);
        const coincideCliente = p.client?.razonSocial?.toLowerCase().includes(searchTerm);
        const coincideRut = p.client?.rut?.toLowerCase().includes(searchTerm);
        return coincideId || coincideCliente || coincideRut;
      });
    }
    // UX/UI: ocultar pedidos históricos (ENTREGADO / NO_ENTREGADO) una vez pasada su fecha de compromiso
    // Se mantienen en BD y exportación, solo se limpian de la vista por defecto.
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      filtrados = filtrados.filter(p => {
        const esHistoricoPorEstado = (p.estado === 'ENTREGADO' || p.estado === 'NO_ENTREGADO');
        if (!esHistoricoPorEstado) return true;
        if (!p.fechaCompromiso) return true; // sin fecha -> mostrar

        const d = new Date(p.fechaCompromiso);
        if (Number.isNaN(d.getTime())) return true;
        d.setHours(0, 0, 0, 0);

        return d >= hoy;
      });

    this.renderizarTabla(filtrados);
  },

  /**
   * Crear pedido nuevo (Tab 3)
   */
  async crearPedidoNuevo() {
    document.getElementById('nuevoMessage').innerHTML = '';
    
    const clientId = parseInt(document.getElementById('nuevo_clientId').value);
    const cajas = parseInt(document.getElementById('nuevo_cajas').value);
    const fechaCompromiso = document.getElementById('nuevo_fechaCompromiso').value;
    const comentarios = document.getElementById('nuevo_comentarios').value.trim();

    if (!clientId || !cajas) {
      document.getElementById('nuevoMessage').innerHTML = 
        '<div class="alert alert-danger">Por favor completa los campos requeridos</div>';
      return;
    }

    const data = { clientId, cajas };
    if (fechaCompromiso) data.fechaCompromiso = fechaCompromiso;
    if (comentarios) data.comentarios = comentarios;

    const btnGuardar = document.getElementById('btnGuardarNuevo');
    UI.setButtonLoading(btnGuardar, true);

    try {
      await API.post(CONFIG.ENDPOINTS.PEDIDOS, data);
      document.getElementById('nuevoMessage').innerHTML = 
        '<div class="alert alert-success">Pedido creado correctamente</div>';
      document.getElementById('formNuevoPedido').reset();
      await this.cargarPedidos();

      // Cerrar modal y volver a la lista (la lista ya está en pantalla)
      setTimeout(() => {
        this.cerrarModal('modalNuevoPedido');
      }, 900);
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
    document.getElementById('editar_estado').value = pedido.estado;

    this.abrirModal('modalEditarPedido');
  },

  cerrarModalEditar() {
    this.cerrarModal('modalEditarPedido');
  },

  /**
   * Actualizar pedido
   */
  async actualizarPedido() {
    document.getElementById('modalEditarMessage').innerHTML = '';
    
    const id = document.getElementById('editar_pedidoId').value;
    const clientId = parseInt(document.getElementById('editar_clientId').value);
    const cajas = parseInt(document.getElementById('editar_cajas').value);
    const fechaCompromiso = document.getElementById('editar_fechaCompromiso').value;
    const comentarios = document.getElementById('editar_comentarios').value.trim();
    const estado = document.getElementById('editar_estado').value;

    const data = { clientId, cajas, estado };
    if (fechaCompromiso) data.fechaCompromiso = fechaCompromiso;
    if (comentarios) data.comentarios = comentarios;

    const btnGuardar = document.getElementById('btnGuardarEditar');
    UI.setButtonLoading(btnGuardar, true);

    try {
      await API.patch(`${CONFIG.ENDPOINTS.PEDIDOS}/${id}`, data);
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

  /**
   * Eliminar pedido
   * Permiso: ADMIN / PLANIFICADOR / SUPERVISOR
   */
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

    // Mostrar sección de configuración de rutas
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

    console.log('🚀 Iniciando creación de rutas automáticas...');

    const fechaCompromisoInput = document.getElementById('fechaCompromisoImport').value;
    
    if (!fechaCompromisoInput) {
      this.showImportAlert('error', 'Fecha requerida', 'Por favor selecciona la fecha de compromiso');
      return;
    }

    // Obtener configuración de rutas seleccionadas
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

    console.log('📋 Configuración de rutas:', rutasConfig);

    const [year, month, day] = fechaCompromisoInput.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;

    if (!UI.confirm(`¿Crear ${rutasConfig.length} rutas automáticas con fecha ${fechaFormateada}?`)) return;

    document.getElementById('importLoading').style.display = 'block';
    document.getElementById('loadingText').textContent = 'Creando rutas y pedidos...';

    // CORRECCIÓN: Enviar file por FormData y el resto por body JSON
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('fechaCompromiso', `${fechaCompromisoInput}T12:00:00.000Z`);
    formData.append('rutasConfig', JSON.stringify(rutasConfig));

    try {
      console.log('📤 Enviando request a /routes/import-with-routes...');
      console.log('📋 Datos a enviar:', {
        fechaCompromiso: `${fechaCompromisoInput}T12:00:00.000Z`,
        rutasConfig: rutasConfig
      });

      const response = await fetch(`${CONFIG.API_URL}/routes/import-with-routes`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${Auth.getToken()}`
          // NO incluir Content-Type, fetch lo hace automáticamente con FormData
        },
        body: formData
      });

      const data = await response.json();

      console.log('📥 Respuesta del servidor:', data);

      if (!response.ok || !data.ok) {
        // Mostrar detalles del error
        if (data.issues) {
          console.error('❌ Errores de validación:', data.issues);
        }
        throw new Error(data.message || 'Error al crear rutas');
      }

      this.showImportAlert('success', '¡Éxito!', 
        `✅ Se crearon ${data.rutasCreadas} rutas con ${data.pedidosCreados} pedidos y ${data.paradasCreadas} paradas`);
      
      document.getElementById('btnCrearRutas').disabled = true;
      document.getElementById('btnCrearRutas').textContent = '✓ Rutas Creadas';
      
      // Recargar pedidos
      await this.cargarPedidos();

      // Sugerencia para ir a rutas
      setTimeout(() => {
        if (UI.confirm('¿Ir a ver las rutas creadas?')) {
          window.location.href = 'rutas.html';
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Error al crear rutas:', error);
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

