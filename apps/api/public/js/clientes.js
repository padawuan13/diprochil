/* ========================================
   CLIENTES.JS - Lógica del módulo de clientes
   ======================================== */

const Clientes = {
  clientes: [],
  clienteSeleccionado: null,
  mainMap: null, // Mapa principal de la vista
  mainMarkers: [], // Marcadores del mapa principal
  modalMap: null, // Mapa del modal
  modalMarker: null, // Marcador del modal
  mapVisible: true, // Estado de visibilidad del mapa principal

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
  init() {
    this.initMainMap();
    this.cargarClientes();
    this.setupEventListeners();
  },

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    document.getElementById('btnNuevoCliente').addEventListener('click', () => {
      this.abrirModal();
    });

    document.getElementById('btnCerrarModal').addEventListener('click', () => {
      this.cerrarModal();
    });

    document.getElementById('btnCancelar').addEventListener('click', () => {
      this.cerrarModal();
    });

    document.getElementById('formCliente').addEventListener('submit', (e) => {
      e.preventDefault();
      this.guardarCliente();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filtrarClientes(e.target.value);
    });

    const btnToggleMapView = document.getElementById('btnToggleMapView');
    if (btnToggleMapView) {
      btnToggleMapView.addEventListener('click', () => {
        this.toggleMainMapView();
      });
    }

    const btnMostrarMapa = document.getElementById('btnMostrarMapa');
    if (btnMostrarMapa) {
      btnMostrarMapa.addEventListener('click', () => {
        this.toggleModalMapa();
      });
    }

    document.getElementById('btnGeocodificar').addEventListener('click', () => {
      this.abrirModalGeocodificar();
    });

    document.getElementById('btnCerrarModalGeo').addEventListener('click', () => {
      this.cerrarModalGeocodificar();
    });

    document.getElementById('btnCancelarGeo').addEventListener('click', () => {
      this.cerrarModalGeocodificar();
    });

    document.getElementById('btnIniciarGeo').addEventListener('click', () => {
      this.iniciarGeocodificacion();
    });

    document.getElementById('rut').addEventListener('input', (e) => {
      const input = e.target;
      const cursorPos = input.selectionStart;
      const valueBefore = input.value;
      let cleaned = valueBefore.replace(/[^0-9kK]/g, '');

      if (cleaned.length > 9) {
        cleaned = cleaned.substring(0, 9);
      }

      if (cleaned.length > 1) {
        const dv = cleaned.slice(-1);
        const numero = cleaned.slice(0, -1);
        const formatted = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
        input.value = formatted;
      } else {
        input.value = cleaned;
      }
    });
  },

  /**
   * Inicializar mapa principal
   */
  initMainMap() {
    try {
      this.mainMap = L.map('mainMap').setView([-42.4696, -73.7711], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(this.mainMap);

      console.log('✅ Mapa principal inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar mapa principal:', error);
    }
  },

  /**
   * Actualizar marcadores del mapa principal
   */
  updateMainMapMarkers(clientes) {
    this.mainMarkers.forEach(marker => this.mainMap.removeLayer(marker));
    this.mainMarkers = [];

    let withGeo = 0;
    let withoutGeo = 0;

    clientes.forEach(cliente => {
      if (cliente.latitud && cliente.longitud) {
        withGeo++;

        const marker = L.marker([cliente.latitud, cliente.longitud])
          .bindPopup(`
            <div style="min-width: 200px;">
              <strong style="color: #2563eb; font-size: 16px;">${this.escapeHtml(cliente.razonSocial)}</strong><br>
              <span style="color: #6b7280;">RUT:</span> <strong>${cliente.rut ? UI.formatRUT(cliente.rut) : ''}</strong><br>
              <span style="color: #6b7280;">📍</span> ${this.escapeHtml(cliente.direccion || cliente.comuna)}<br>
              <span style="color: #6b7280;">🏙️</span> ${this.escapeHtml(cliente.comuna)}, ${this.escapeHtml(cliente.ciudad)}<br>
              ${cliente.telefono ? `<span style="color: #6b7280;">📞</span> ${this.escapeHtml(cliente.telefono)}<br>` : ''}
              <button
                onclick="Clientes.editarCliente(${parseInt(cliente.id)})"
                style="margin-top: 8px; padding: 4px 12px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
              >
                ✏️ Editar
              </button>
            </div>
          `)
          .addTo(this.mainMap);

        this.mainMarkers.push(marker);
      } else {
        withoutGeo++;
      }
    });

    document.getElementById('countWithGeo').textContent = withGeo;
    document.getElementById('countWithoutGeo').textContent = withoutGeo;
    document.getElementById('countTotal').textContent = clientes.length;

    if (this.mainMarkers.length > 0) {
      const group = L.featureGroup(this.mainMarkers);
      this.mainMap.fitBounds(group.getBounds().pad(0.1));
    }

    console.log(`📍 Mapa actualizado: ${withGeo} con ubicación, ${withoutGeo} sin ubicación`);
  },

  /**
   * Toggle visibilidad del mapa principal
   */
  toggleMainMapView() {
    const container = document.getElementById('mainMapContainer');
    const btn = document.getElementById('btnToggleMapView');
    
    this.mapVisible = !this.mapVisible;
    
    if (this.mapVisible) {
      container.style.display = 'block';
      btn.textContent = 'Ocultar Mapa';

      setTimeout(() => {
        this.mainMap.invalidateSize();
      }, 100);
    } else {
      container.style.display = 'none';
      btn.textContent = 'Mostrar Mapa';
    }
  },

  /**
   * Inicializar mapa del modal
   */
  initModalMap() {
    if (this.modalMap) {
      return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Contenedor de mapa modal no encontrado');
      return;
    }

    try {
      this.modalMap = L.map('map').setView([-42.4696, -73.7711], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(this.modalMap);

      this.modalMap.on('click', (e) => {
        this.setUbicacionModal(e.latlng.lat, e.latlng.lng);
      });

      console.log('✅ Mapa del modal inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar mapa del modal:', error);
    }
  },

  /**
   * Establecer ubicación en el mapa del modal
   */
  setUbicacionModal(lat, lng) {
    if (this.modalMarker) {
      this.modalMap.removeLayer(this.modalMarker);
    }

    this.modalMarker = L.marker([lat, lng], {
      draggable: true
    }).addTo(this.modalMap);

    document.getElementById('latitud').value = lat.toFixed(6);
    document.getElementById('longitud').value = lng.toFixed(6);

    this.updateCoordsDisplay(lat, lng);

    this.modalMarker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      this.setUbicacionModal(position.lat, position.lng);
    });

    this.modalMap.setView([lat, lng], 13);
  },

  /**
   * Actualizar display de coordenadas
   */
  updateCoordsDisplay(lat, lng) {
    const coordsText = document.getElementById('coordsText');
    if (coordsText) {
      coordsText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  },

  /**
   * Mostrar/Ocultar mapa del modal
   */
  toggleModalMapa() {
    const mapaGroup = document.getElementById('mapaGroup');
    const btnMostrarMapa = document.getElementById('btnMostrarMapa');
    
    if (mapaGroup.style.display === 'none') {
      mapaGroup.style.display = 'block';
      btnMostrarMapa.textContent = 'Ocultar Mapa';

      if (!this.modalMap) {
        setTimeout(() => {
          this.initModalMap();

          const lat = parseFloat(document.getElementById('latitud').value);
          const lng = parseFloat(document.getElementById('longitud').value);

          if (lat && lng) {
            this.setUbicacionModal(lat, lng);
          }
        }, 100);
      } else {
        this.modalMap.invalidateSize();

        const lat = parseFloat(document.getElementById('latitud').value);
        const lng = parseFloat(document.getElementById('longitud').value);

        if (lat && lng) {
          this.setUbicacionModal(lat, lng);
        }
      }
    } else {
      mapaGroup.style.display = 'none';
      btnMostrarMapa.textContent = 'Ver/Editar en Mapa';
    }
  },

  /**
   * Limpiar mapa del modal
   */
  clearModalMap() {
    if (this.modalMarker) {
      this.modalMap.removeLayer(this.modalMarker);
      this.modalMarker = null;
    }
    
    if (this.modalMap) {
      this.modalMap.remove();
      this.modalMap = null;
    }
    
    document.getElementById('latitud').value = '';
    document.getElementById('longitud').value = '';
    
    const coordsText = document.getElementById('coordsText');
    if (coordsText) {
      coordsText.textContent = 'No establecidas';
    }
  },

  /**
   * Cargar clientes desde el API
   */
  async cargarClientes() {
    console.log('🔄 Cargando clientes...');
    try {
      const response = await API.get(CONFIG.ENDPOINTS.CLIENTS, {
        take: 1000,
        skip: 0,
      });
      console.log('📊 Respuesta del API:', response);
      console.log('📋 Total de clientes en BD:', response.total);
      console.log('📦 Clientes cargados:', response.items?.length);
      
      this.clientes = response.items || [];
      this.clientes.sort((a, b) => b.id - a.id);
      
      console.log('✅ Clientes listos para mostrar');
      this.renderizarTabla(this.clientes);
      this.updateMainMapMarkers(this.clientes);
    } catch (error) {
      console.error('❌ Error al cargar clientes:', error);
      UI.showError('Error al cargar los clientes');
      document.getElementById('clientesTableContainer').innerHTML = 
        '<p class="text-center text-danger">Error al cargar clientes</p>';
    }
  },

  /**
   * Renderizar tabla de clientes
   */
  renderizarTabla(clientes) {
    const container = document.getElementById('clientesTableContainer');

    if (clientes.length === 0) {
      UI.renderEmptyState(container, 'No hay clientes registrados', {
        text: 'Crear Primer Cliente',
        onClick: 'Clientes.abrirModal()'
      });
      return;
    }

    const html = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>RUT</th>
              <th>Razón Social</th>
              <th>Dirección</th>
              <th>Comuna</th>
              <th>Ciudad</th>
              <th>Teléfono</th>
              <th>📍 Geo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${clientes.map(cliente => `
              <tr>
                <td>${cliente.rut ? UI.formatRUT(cliente.rut) : '-'}</td>
                <td><strong>${this.escapeHtml(cliente.razonSocial)}</strong></td>
                <td>${this.escapeHtml(cliente.direccion || '-')}</td>
                <td>${this.escapeHtml(cliente.comuna || '-')}</td>
                <td>${this.escapeHtml(cliente.ciudad || '-')}</td>
                <td>${this.escapeHtml(cliente.telefono || '-')}</td>
                <td class="text-center">
                  ${cliente.latitud && cliente.longitud 
                    ? '<span style="color: #10b981; font-size: 18px;" title="Ubicación establecida">✓</span>' 
                    : '<span style="color: #ef4444; font-size: 18px;" title="Sin ubicación">✗</span>'
                  }
                </td>
                <td>
                  ${cliente.active 
                    ? UI.createBadge('Activo', 'ACTIVO') 
                    : UI.createBadge('Inactivo', 'INACTIVO')
                  }
                </td>
                <td>
                  <div class="table-actions">
                    <button 
                      class="btn btn-sm btn-primary btn-icon" 
                      onclick="Clientes.editarCliente(${cliente.id})"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      class="btn btn-sm ${cliente.active ? 'btn-danger' : 'btn-success'} btn-icon" 
                      onclick="Clientes.toggleEstado(${cliente.id}, ${cliente.active})"
                      title="${cliente.active ? 'Desactivar' : 'Activar'}"
                    >
                      ${cliente.active ? '🚫' : '✅'}
                    </button>
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
   * Filtrar clientes por búsqueda
   */
  filtrarClientes(termino) {
    console.log('🔍 Buscando:', termino);
    
    if (!termino || termino.trim() === '') {
      console.log('📋 Mostrando todos los clientes:', this.clientes.length);
      this.renderizarTabla(this.clientes);
      this.updateMainMapMarkers(this.clientes);
      return;
    }

    const terminoLower = termino.toLowerCase().trim();
    const filtrados = this.clientes.filter(c => {
      const coincideRazonSocial = c.razonSocial?.toLowerCase().includes(terminoLower);
      const coincideRUT = c.rut?.toLowerCase().includes(terminoLower);
      const coincideComuna = c.comuna?.toLowerCase().includes(terminoLower);
      const coincideCiudad = c.ciudad?.toLowerCase().includes(terminoLower);
      const coincideDireccion = c.direccion?.toLowerCase().includes(terminoLower);
      
      return coincideRazonSocial || coincideRUT || coincideComuna || coincideCiudad || coincideDireccion;
    });

    console.log('✅ Clientes encontrados:', filtrados.length);
    this.renderizarTabla(filtrados);
    this.updateMainMapMarkers(filtrados);
  },

  /**
   * Abrir modal (crear o editar)
   */
  abrirModal(cliente = null) {
    this.clienteSeleccionado = cliente;
    const modal = document.getElementById('modalCliente');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('formCliente');

    form.reset();
    document.getElementById('modalMessage').innerHTML = '';
    UI.clearForm('formCliente');

    this.clearModalMap();
    document.getElementById('mapaGroup').style.display = 'none';

    const coordsDisplay = document.getElementById('coordsDisplay');
    if (coordsDisplay) {
      coordsDisplay.style.display = 'block';
    }

    if (cliente) {
      title.textContent = 'Editar Cliente';
      document.getElementById('clienteId').value = cliente.id;
      document.getElementById('rut').value = cliente.rut ? UI.formatRUT(cliente.rut) : '';
      document.getElementById('razonSocial').value = cliente.razonSocial;
      document.getElementById('comuna').value = cliente.comuna || '';
      document.getElementById('ciudad').value = cliente.ciudad || '';
      document.getElementById('direccion').value = cliente.direccion || '';
      document.getElementById('isla').value = cliente.isla || '';
      document.getElementById('telefono').value = cliente.telefono || '';
      document.getElementById('giro').value = cliente.giro || '';

      if (cliente.latitud && cliente.longitud) {
        document.getElementById('latitud').value = cliente.latitud;
        document.getElementById('longitud').value = cliente.longitud;
        this.updateCoordsDisplay(cliente.latitud, cliente.longitud);
      }
    } else {
      title.textContent = 'Nuevo Cliente';
      document.getElementById('clienteId').value = '';
      document.getElementById('coordsText').textContent = 'No establecidas';
    }

    modal.style.display = 'block';
  },

  /**
   * Cerrar modal
   */
  cerrarModal() {
    document.getElementById('modalCliente').style.display = 'none';
    this.clienteSeleccionado = null;
    this.clearModalMap();
  },

  /**
   * Editar cliente (abrir modal con datos)
   */
  editarCliente(id) {
    const cliente = this.clientes.find(c => c.id === id);
    if (cliente) {
      this.abrirModal(cliente);
    }
  },

  /**
   * Guardar cliente (crear o actualizar)
   */
  async guardarCliente() {
    console.log('🔵 Iniciando guardarCliente()...');

    document.getElementById('modalMessage').innerHTML = '';

    const allErrors = document.querySelectorAll('.form-error');
    allErrors.forEach(el => el.textContent = '');
    const allInputsWithError = document.querySelectorAll('.form-input.error');
    allInputsWithError.forEach(el => el.classList.remove('error'));

    const id = document.getElementById('clienteId').value;
    const rutFormateado = document.getElementById('rut').value.trim();
    const razonSocial = document.getElementById('razonSocial').value.trim();
    const comuna = document.getElementById('comuna').value.trim();
    const ciudad = document.getElementById('ciudad').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const isla = document.getElementById('isla').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const giro = document.getElementById('giro').value.trim();
    const latitud = document.getElementById('latitud').value;
    const longitud = document.getElementById('longitud').value;

    console.log('📋 Valores capturados:', {
      rutFormateado,
      razonSocial,
      comuna,
      ciudad,
      latitud,
      longitud
    });

    // Validaciones
    let hasErrors = false;

    if (!rutFormateado) {
      UI.showFieldError('rut', 'El RUT es requerido');
      hasErrors = true;
    } else if (!UI.validateRUT(rutFormateado)) {
      UI.showFieldError('rut', 'RUT inválido');
      hasErrors = true;
    }

    if (!razonSocial) {
      UI.showFieldError('razonSocial', 'La Razón Social es requerida');
      hasErrors = true;
    }

    if (!comuna) {
      UI.showFieldError('comuna', 'La Comuna es requerida');
      hasErrors = true;
    }

    if (!ciudad) {
      UI.showFieldError('ciudad', 'La Ciudad es requerida');
      hasErrors = true;
    }

    if (hasErrors) {
      console.log('❌ Errores de validación detectados');
      document.getElementById('modalMessage').innerHTML = 
        '<div class="alert alert-danger">Por favor, completa todos los campos requeridos correctamente</div>';
      return;
    }

    console.log('✅ Validaciones pasadas');

    const rutNormalizado = rutFormateado
      .replace(/\./g, '')
      .replace(/-/g, '')
      .replace(/\s+/g, '')
      .toUpperCase();

    const rutCanonical = rutNormalizado.length > 1
      ? `${rutNormalizado.slice(0, -1)}-${rutNormalizado.slice(-1)}`
      : rutNormalizado;

    const data = {
      rut: rutCanonical,
      razonSocial,
      comuna,
      ciudad,
    };

    if (direccion) data.direccion = direccion;
    if (isla) data.isla = isla;
    if (telefono) data.telefono = telefono;
    if (giro) data.giro = giro;
    if (latitud) data.latitud = parseFloat(latitud);
    if (longitud) data.longitud = parseFloat(longitud);

    console.log('📤 Datos a enviar:', data);

    const btnGuardar = document.getElementById('btnGuardar');
    UI.setButtonLoading(btnGuardar, true);

    try {
      let response;
      
      if (id) {
        console.log(`🔄 Actualizando cliente ID: ${id}`);
        response = await API.patch(`${CONFIG.ENDPOINTS.CLIENTS}/${id}`, data);
      } else {
        console.log('➕ Creando nuevo cliente');
        response = await API.post(CONFIG.ENDPOINTS.CLIENTS, data);
      }

      console.log('✅ Respuesta del servidor:', response);

      document.getElementById('modalMessage').innerHTML =
        `<div class="alert alert-success">${id ? 'Cliente actualizado' : 'Cliente creado'} correctamente</div>`;

      await this.cargarClientes();

      setTimeout(() => {
        this.cerrarModal();
      }, 1000);

    } catch (error) {
      console.error('❌ Error al guardar cliente:', error);
      document.getElementById('modalMessage').innerHTML = 
        `<div class="alert alert-danger">${error.message || 'Error al guardar el cliente'}</div>`;
    } finally {
      UI.setButtonLoading(btnGuardar, false);
    }
  },

  /**
   * Activar/Desactivar cliente
   */
  async toggleEstado(id, estadoActual) {
    const accion = estadoActual ? 'desactivar' : 'activar';
    
    if (!UI.confirm(`¿Estás seguro de ${accion} este cliente?`)) {
      return;
    }

    try {
      await API.patch(`${CONFIG.ENDPOINTS.CLIENTS}/${id}`, {
        active: !estadoActual
      });

      await this.cargarClientes();

      UI.showSuccess(`Cliente ${accion === 'desactivar' ? 'desactivado' : 'activado'} correctamente`);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      UI.showError('Error al cambiar el estado del cliente');
    }
  },

  /* ==========================================
     GEOCODIFICACIÓN
     ========================================== */

  /**
   * Abrir modal de geocodificación
   */
  abrirModalGeocodificar() {
    const modal = document.getElementById('modalGeocodificar');

    const total = this.clientes.length;
    const conUbicacion = this.clientes.filter(c => c.latitud && c.longitud).length;
    const sinUbicacion = total - conUbicacion;

    document.getElementById('geoTotal').textContent = total;
    document.getElementById('geoConUbicacion').textContent = conUbicacion;
    document.getElementById('geoSinUbicacion').textContent = sinUbicacion;

    document.getElementById('geoMessage').innerHTML = '';
    document.getElementById('geoProgreso').style.display = 'none';
    document.getElementById('geoResultados').style.display = 'none';
    document.getElementById('btnIniciarGeo').disabled = sinUbicacion === 0;

    if (sinUbicacion === 0) {
      document.getElementById('geoMessage').innerHTML = 
        '<div style="padding: 16px; background: #d1fae5; border-radius: 8px; color: #065f46; border-left: 4px solid #10b981;">✓ Todos los clientes ya tienen ubicación asignada</div>';
    }

    modal.style.display = 'block';
  },

  /**
   * Cerrar modal de geocodificación
   */
  cerrarModalGeocodificar() {
    document.getElementById('modalGeocodificar').style.display = 'none';
  },

  /**
   * Iniciar proceso de geocodificación
   */
  async iniciarGeocodificacion() {
    const clientesSinUbicacion = this.clientes.filter(c => !c.latitud || !c.longitud);
    
    if (clientesSinUbicacion.length === 0) {
      return;
    }

    if (!UI.confirm(`¿Geocodificar ${clientesSinUbicacion.length} clientes sin ubicación?`)) {
      return;
    }

    const btnIniciar = document.getElementById('btnIniciarGeo');
    btnIniciar.disabled = true;
    btnIniciar.textContent = 'Geocodificando...';

    document.getElementById('geoProgreso').style.display = 'block';
    document.getElementById('geoResultados').style.display = 'block';
    document.getElementById('geoResultados').innerHTML = '';

    const resultados = {
      exitosos: 0,
      fallidos: 0,
      detalles: []
    };

    for (let i = 0; i < clientesSinUbicacion.length; i++) {
      const cliente = clientesSinUbicacion[i];

      const progreso = Math.round(((i + 1) / clientesSinUbicacion.length) * 100);
      document.getElementById('geoProgresoTexto').textContent = `${i + 1} de ${clientesSinUbicacion.length}`;
      document.getElementById('geoProgresoBar').style.width = `${progreso}%`;

      try {
        const response = await API.patch(`${CONFIG.ENDPOINTS.CLIENTS}/${cliente.id}/geocode`, {});
        
        if (response.ok && response.item?.latitud && response.item?.longitud) {
          resultados.exitosos++;
          resultados.detalles.push({
            cliente: cliente.razonSocial,
            exito: true,
            lat: response.item.latitud,
            lng: response.item.longitud
          });
          
          this.agregarResultadoGeo(cliente.razonSocial, true, 
            `${response.item.latitud.toFixed(6)}, ${response.item.longitud.toFixed(6)}`);
        } else {
          resultados.fallidos++;
          resultados.detalles.push({
            cliente: cliente.razonSocial,
            exito: false,
            error: response.message || 'No se pudo geocodificar'
          });
          
          this.agregarResultadoGeo(cliente.razonSocial, false, 
            response.message || 'No se encontró ubicación');
        }
      } catch (error) {
        resultados.fallidos++;
        resultados.detalles.push({
          cliente: cliente.razonSocial,
          exito: false,
          error: error.message
        });
        
        this.agregarResultadoGeo(cliente.razonSocial, false, error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mostrar resumen final
    document.getElementById('geoMessage').innerHTML = `
      <div style="padding: 16px; background: ${resultados.exitosos > 0 ? '#d1fae5' : '#fee2e2'}; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid ${resultados.exitosos > 0 ? '#10b981' : '#ef4444'};">
        <strong>Geocodificación completada</strong><br>
        ✓ Exitosos: ${resultados.exitosos}<br>
        ✗ Fallidos: ${resultados.fallidos}
      </div>
    `;

    await this.cargarClientes();

    btnIniciar.textContent = 'Finalizado';
  },

  /**
   * Agregar resultado individual al listado
   */
  agregarResultadoGeo(nombreCliente, exito, detalle) {
    const container = document.getElementById('geoResultados');
    const resultado = document.createElement('div');
    resultado.style.cssText = `
      padding: 12px;
      margin-bottom: 8px;
      background: ${exito ? '#f0fdf4' : '#fef2f2'};
      border-radius: 6px;
      border-left: 3px solid ${exito ? '#10b981' : '#ef4444'};
      font-size: 14px;
    `;
    resultado.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: #111827;">${this.escapeHtml(nombreCliente)}</strong><br>
          <span style="color: #6b7280; font-size: 13px;">${this.escapeHtml(detalle)}</span>
        </div>
        <span style="font-size: 18px;">${exito ? '✓' : '✗'}</span>
      </div>
    `;
    container.appendChild(resultado);
    container.scrollTop = container.scrollHeight;
  }
};