/* ========================================
   RUTA-DETALLE.JS - Gestión de paradas y optimización
   ======================================== */

const RutaDetalle = {
  rutaId: null,
  ruta: null,
  pedidosPendientes: [],
  routeMap: null,
  optimizationData: null,
  mapMode: 'current', // current | optimized

  /**
   * Inicializar módulo
   */
  async init() {
    // Obtener ID de la ruta desde la URL
    const params = new URLSearchParams(window.location.search);
    this.rutaId = parseInt(params.get('id'));

    if (!this.rutaId || isNaN(this.rutaId)) {
      alert('ID de ruta inválido');
      window.location.href = 'rutas.html';
      return;
    }

    console.log('📍 Ruta ID:', this.rutaId);

    await this.cargarRuta();
    await this.cargarPedidosPendientes();
    this.setupEventListeners();
  },

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Agregar parada
    document.getElementById('btnAgregarParada').addEventListener('click', () => {
      this.abrirModalParada();
    });

    document.getElementById('btnCerrarModalParada').addEventListener('click', () => {
      this.cerrarModalParada();
    });

    document.getElementById('btnCancelarParada').addEventListener('click', () => {
      this.cerrarModalParada();
    });

    document.getElementById('formParada').addEventListener('submit', (e) => {
      e.preventDefault();
      this.agregarParada();
    });

    // Optimización
    document.getElementById('btnOptimizar')?.addEventListener('click', () => {
      this.optimizarRuta();
    });

    document.getElementById('btnAplicarOptimizacion')?.addEventListener('click', () => {
      this.aplicarOptimizacion();
    });

    document.getElementById('btnPrevisualizarOptimizacion')?.addEventListener('click', () => {
      this.previsualizarOptimizacion();
    });

    document.getElementById('btnCancelarOptimizacion')?.addEventListener('click', () => {
      this.cancelarOptimizacion();
    });
  },

  /**
   * Cargar información de la ruta (con dashboard)
   */
  async cargarRuta() {
    console.log('🔄 Cargando ruta...');
    try {
      const response = await API.get(`${CONFIG.ENDPOINTS.ROUTES}/${this.rutaId}/dashboard`);
      
      console.log('📊 Dashboard de ruta:', response);
      
      this.ruta = response.item;
      
      this.renderizarInfoRuta();
      this.renderizarResumen(response.summary);
      this.renderizarParadas();
      this.renderizarIncidencias(); // NUEVO: Renderizar incidencias

      // Renderizar mapa con el orden actual (si hay paradas)
      this.renderizarMapaRuta();
      
      // Mostrar card de optimización si hay paradas
      if (this.ruta?.stops?.length >= 2) {
        document.getElementById('optimizationCard').style.display = 'block';
      }
      
    } catch (error) {
      console.error('❌ Error al cargar ruta:', error);
      UI.showError('Error al cargar la ruta');
      document.getElementById('rutaInfo').innerHTML = 
        '<p class="text-center text-danger">Error al cargar la ruta</p>';
    }
  },

  /**
   * Renderizar mapa de la ruta (orden actual por defecto)
   */
  renderizarMapaRuta() {
    const mapCard = document.getElementById('mapCard');
    const msg = document.getElementById('routeMapMessage');

    if (!mapCard || !msg) return;

    const paradas = this.ruta?.stops || [];
    if (paradas.length === 0) {
      mapCard.style.display = 'none';
      return;
    }

    mapCard.style.display = 'block';
    msg.innerHTML = '';

    // Orden actual (por ordenVisita)
    const pedidoIds = paradas
      .slice()
      .sort((a, b) => a.ordenVisita - b.ordenVisita)
      .map(s => s.pedidoId);

    this.mapMode = 'current';
    this.renderRouteMap(pedidoIds, 'Vista: Orden actual');
  },

  /**
   * Cargar pedidos pendientes (sin asignar a ruta)
   */
  async cargarPedidosPendientes() {
    console.log('🔄 Cargando pedidos pendientes...');
    try {
      // Traer SOLO pedidos PENDIENTE sin asignar a ruta (backend: unassigned=true)
      // y paginar para no quedar limitados por take=200.
      const take = 200;
      let skip = 0;
      const all = [];

      while (true) {
        const response = await API.get(CONFIG.ENDPOINTS.PEDIDOS, {
          take,
          skip,
          estado: 'PENDIENTE',
          unassigned: true,
        });

        const items = response.items || [];
        all.push(...items);

        if (items.length < take) break;
        skip += take;
      }

      // Seguridad extra: si por algún motivo ya estuviera en esta ruta, lo excluimos
      const pedidosEnRuta = this.ruta?.stops?.map(s => s.pedidoId) || [];
      this.pedidosPendientes = all.filter(p => !pedidosEnRuta.includes(p.id));
      
      console.log('✅ Pedidos disponibles:', this.pedidosPendientes.length);
      
      this.llenarDropdownPedidos();
    } catch (error) {
      console.error('❌ Error al cargar pedidos:', error);
      this.pedidosPendientes = [];
    }
  },

  /**
   * Renderizar información de la ruta
   */
  renderizarInfoRuta() {
    const container = document.getElementById('rutaInfo');
    
    if (!this.ruta) {
      container.innerHTML = '<p class="text-center text-muted">No se pudo cargar la ruta</p>';
      return;
    }

    document.getElementById('pageTitle').textContent = `Ruta #${this.ruta.id}`;

    const html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
        <div>
          <p class="text-muted text-sm">Fecha</p>
          <p class="font-semibold">${UI.formatDate(this.ruta.fechaRuta)}</p>
        </div>
        <div>
          <p class="text-muted text-sm">Conductor</p>
          <p class="font-semibold">${this.ruta.conductor?.nombre || '-'}</p>
        </div>
        <div>
          <p class="text-muted text-sm">Vehículo</p>
          <p class="font-semibold">${this.ruta.vehicle?.patente || '-'}</p>
        </div>
        <div>
          <p class="text-muted text-sm">Zona</p>
          <p class="font-semibold">${this.ruta.zona || '-'}</p>
        </div>
        <div>
          <p class="text-muted text-sm">Estado</p>
          <p>${UI.createBadge(this.ruta.estado, this.ruta.estado)}</p>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Renderizar resumen
   */
  renderizarResumen(summary) {
    if (!summary) return;

    document.getElementById('rutaSummary').style.display = 'grid';
    
    document.getElementById('totalParadas').textContent = summary.totalStops || 0;
    document.getElementById('paradasPendientes').textContent = summary.stops?.PENDIENTE || 0;
    document.getElementById('paradasCompletadas').textContent = summary.stops?.COMPLETADA || 0;
    document.getElementById('totalCajas').textContent = summary.totalCajas || 0;
  },

  /**
   * Renderizar tabla de paradas
   */
  renderizarParadas() {
      const container = document.getElementById('paradasTableContainer');
      const paradas = this.ruta?.stops || [];

      if (paradas.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <h3 class="empty-state-title">Sin paradas</h3>
            <p class="empty-state-description">Agrega pedidos a esta ruta para comenzar</p>
          </div>
        `;
        return;
      }

      const html = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>RUT</th>
                <th>Dirección</th>
                <th>Comuna</th>
                <th>Teléfono</th>
                <th>Cajas</th>
                <th>📍 Geo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${paradas.map(parada => `
                <tr>
                  <td><strong>${parada.ordenVisita}</strong></td>
                  <td>#${parada.pedidoId}</td>
                  <td>
                    <a href="javascript:void(0)" 
                       onclick="RutaDetalle.abrirNavegacion(${parada.id})" 
                       style="color: #2563eb; text-decoration: underline; font-weight: 600;">
                      ${parada.pedido?.client?.razonSocial || '-'}
                    </a>
                  </td>
                  <td>${parada.pedido?.client?.rut || '-'}</td>
                  <td>${parada.pedido?.client?.direccion || '-'}</td>
                  <td>${parada.pedido?.client?.comuna || '-'}</td>
                  <td>${parada.pedido?.client?.telefono || '-'}</td>
                  <td>${parada.pedido?.cajas || 0}</td>
                  <td class="text-center">
                    ${parada.pedido?.client?.latitud && parada.pedido?.client?.longitud
                      ? '<span style="color: #10b981; font-size: 18px;" title="Con coordenadas">✓</span>'
                      : '<span style="color: #ef4444; font-size: 18px;" title="Sin coordenadas">✗</span>'
                    }
                  </td>
                  <td>${UI.createBadge(parada.estadoParada, parada.estadoParada)}</td>
                  <td>
                    <div class="table-actions">
  ${parada.estadoParada === 'PENDIENTE' ? `
                        <button 
                          class="btn btn-sm btn-success btn-icon" 
                          onclick="RutaDetalle.cambiarEstadoParada(${parada.id}, 'COMPLETADA')"
                          title="Marcar como Completada"
                        >
                          ✅
                        </button>
                        <button 
                          class="btn btn-sm btn-danger btn-icon" 
                          onclick="RutaDetalle.abrirModalIncidencia(${parada.id}, ${parada.pedidoId})"
                          title="Reportar Incidencia"
                        >
                          🚨
                        </button>
                        <button 
                          class="btn btn-sm btn-danger btn-icon" 
                          onclick="RutaDetalle.eliminarParada(${parada.id})"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      ` : parada.estadoParada === 'COMPLETADA' ? `
                        <button 
                          class="btn btn-sm btn-warning btn-icon" 
                          onclick="RutaDetalle.cambiarEstadoParada(${parada.id}, 'PENDIENTE')"
                          title="Marcar como Pendiente"
                        >
                          ↩
                        </button>
                      ` : parada.estadoParada === 'NO_ENTREGADA' ? `
                        <button 
                          class="btn btn-sm btn-success btn-icon" 
                          onclick="RutaDetalle.cambiarEstadoParada(${parada.id}, 'COMPLETADA')"
                          title="Marcar como Completada"
                        >
                          ✅
                        </button>
                        <button 
                          class="btn btn-sm btn-warning btn-icon" 
                          onclick="RutaDetalle.cambiarEstadoParada(${parada.id}, 'PENDIENTE')"
                          title="Marcar como Pendiente"
                        >
                          ↩
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
   * Llenar dropdown de pedidos pendientes
   */
  llenarDropdownPedidos() {
    const select = document.getElementById('pedidoId');
    select.innerHTML = '<option value="">Seleccione un pedido pendiente...</option>';
    
    this.pedidosPendientes.forEach(pedido => {
      const option = document.createElement('option');
      option.value = pedido.id;
      option.textContent = `#${pedido.id} - ${pedido.client?.razonSocial} (${pedido.cajas} cajas)`;
      select.appendChild(option);
    });

    if (this.pedidosPendientes.length === 0) {
      select.innerHTML = '<option value="">No hay pedidos pendientes disponibles</option>';
      select.disabled = true;
    } else {
      select.disabled = false;
    }
  },

  /**
   * Abrir modal de agregar parada
   */
  abrirModalParada() {
    const modal = document.getElementById('modalParada');
    const form = document.getElementById('formParada');

    form.reset();
    document.getElementById('modalParadaMessage').innerHTML = '';
    UI.clearForm('formParada');

    // Sugerir siguiente orden de visita
    const ultimaParada = this.ruta?.stops?.length || 0;
    const ordenEl = document.getElementById('ordenVisita');
    if (ordenEl) {
      ordenEl.value = ultimaParada + 1;
      // Lo dejamos automático para evitar conflictos de ordenVisita.
      ordenEl.readOnly = true;
    }

    modal.style.display = 'block';
  },

  /**
   * Cerrar modal
   */
  cerrarModalParada() {
    document.getElementById('modalParada').style.display = 'none';
  },

  /**
   * Agregar parada
   */
  async agregarParada() {
    console.log('🔵 Agregando parada...');

    document.getElementById('modalParadaMessage').innerHTML = '';
    const allErrors = document.querySelectorAll('.form-error');
    allErrors.forEach(el => el.textContent = '');

    const pedidoId = parseInt(document.getElementById('pedidoId').value);
    const horaEstimada = document.getElementById('horaEstimada').value;

    // Validaciones
    let hasErrors = false;

    if (!pedidoId || isNaN(pedidoId)) {
      UI.showFieldError('pedidoId', 'Selecciona un pedido');
      hasErrors = true;
    }

    if (hasErrors) {
      document.getElementById('modalParadaMessage').innerHTML = 
        '<div class="alert alert-danger">Completa los campos requeridos</div>';
      return;
    }

    const data = {
      pedidoId,
    };

    if (horaEstimada) data.horaEstimada = horaEstimada;

    console.log('📤 Datos de parada:', data);

    const btnGuardar = document.getElementById('btnGuardarParada');
    UI.setButtonLoading(btnGuardar, true);

    try {
      await API.post(`${CONFIG.ENDPOINTS.ROUTES}/${this.rutaId}/stops`, data);

      document.getElementById('modalParadaMessage').innerHTML = 
        '<div class="alert alert-success">Parada agregada correctamente</div>';

      // Recargar ruta
      await this.cargarRuta();
      await this.cargarPedidosPendientes();

      setTimeout(() => {
        this.cerrarModalParada();
      }, 1000);

    } catch (error) {
      console.error('❌ Error al agregar parada:', error);
      document.getElementById('modalParadaMessage').innerHTML = 
        `<div class="alert alert-danger">${error.message || 'Error al agregar la parada'}</div>`;
    } finally {
      UI.setButtonLoading(btnGuardar, false);
    }
  },

  /**
   * Eliminar parada
   */
  async eliminarParada(stopId) {
    if (!UI.confirm('¿Estás seguro de eliminar esta parada?')) {
      return;
    }

    try {
      await API.delete(`${CONFIG.ENDPOINTS.ROUTES}/${this.rutaId}/stops/${stopId}`);

      UI.showSuccess('Parada eliminada correctamente');
      
      // Recargar ruta
      await this.cargarRuta();
      await this.cargarPedidosPendientes();

    } catch (error) {
      console.error('❌ Error al eliminar parada:', error);
      UI.showError('Error al eliminar la parada');
    }
  },

  /* ==========================================
     OPTIMIZACIÓN DE RUTAS
     ========================================== */

  /**
   * Optimizar ruta usando el backend
   */
  async optimizarRuta() {
    console.log('🚀 Iniciando optimización...');

    // Verificar que haya al menos 2 paradas
    if (!this.ruta?.stops || this.ruta.stops.length < 2) {
      UI.showError('Se necesitan al menos 2 paradas para optimizar');
      return;
    }

    // Verificar que todas tengan coordenadas
    const sinCoordenadas = this.ruta.stops.filter(s => 
      !s.pedido?.client?.latitud || !s.pedido?.client?.longitud
    );

    if (sinCoordenadas.length > 0) {
      UI.showError(`${sinCoordenadas.length} paradas no tienen coordenadas. Geocodifica los clientes primero.`);
      return;
    }

    const btnOptimizar = document.getElementById('btnOptimizar');
    UI.setButtonLoading(btnOptimizar, true);

    try {
      // Obtener IDs de pedidos en orden actual
      const pedidoIds = this.ruta.stops.map(s => s.pedidoId);

      // Llamar al endpoint de optimización
      const response = await API.post('/routes/optimize', { pedidoIds });

      console.log('✅ Optimización recibida:', response);

      // CORRECCIÓN: El backend devuelve rutaOptimizada, no ruta
      if (!response.ok || !response.rutaOptimizada) {
        throw new Error('Error en la optimización');
      }

      // Mapear la respuesta al formato esperado
      this.optimizationData = {
        distanciaTotal: response.rutaOptimizada.distanciaTotal,
        tiempoTotal: response.rutaOptimizada.tiempoEstimado,
        combustibleTotal: response.rutaOptimizada.distanciaTotal * 0.12, // Número, no string
        ahorroEstimado: Math.round(response.rutaOptimizada.distanciaTotal * 500), // $500 por km
        ordenOptimizado: response.rutaOptimizada.orden,
        puntos: response.rutaOptimizada.puntos
      };

      console.log('📊 Datos de optimización procesados:', this.optimizationData);

      this.mostrarResultadosOptimizacion();

    } catch (error) {
      console.error('❌ Error al optimizar:', error);
      UI.showError('Error al optimizar la ruta: ' + error.message);
    } finally {
      UI.setButtonLoading(btnOptimizar, false);
    }
  },

  /**
   * Mostrar resultados de optimización
   */
  mostrarResultadosOptimizacion() {
    if (!this.optimizationData) return;

    const results = document.getElementById('optimizationResults');
    results.style.display = 'block';

    // Actualizar métricas
    document.getElementById('metricDistance').textContent = 
      this.optimizationData.distanciaTotal.toFixed(2);
    document.getElementById('metricTime').textContent = 
      Math.round(this.optimizationData.tiempoTotal);
    document.getElementById('metricFuel').textContent = 
      this.optimizationData.combustibleTotal.toFixed(2);
    document.getElementById('metricSavings').textContent = 
      '$' + this.optimizationData.ahorroEstimado.toLocaleString('es-CL');

    // Por defecto NO cambiamos el mapa automáticamente.
    // Se previsualiza explícitamente con el botón.
    this.mapMode = 'current';
    const btnPrev = document.getElementById('btnPrevisualizarOptimizacion');
    if (btnPrev) {
      btnPrev.disabled = false;
      btnPrev.textContent = '👁️ Previsualizar en mapa';
    }

    const btnCancel = document.getElementById('btnCancelarOptimizacion');
    if (btnCancel) btnCancel.disabled = false;

    // Mostrar comparación de órdenes
    this.mostrarComparacionOrdenes();

    // Scroll a resultados
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  /**
   * Renderizar mapa de ruta en base a una lista de pedidoIds
   */
  renderRouteMap(pedidoIds, label) {
    const msg = document.getElementById('routeMapMessage');
    const labelEl = document.getElementById('mapViewLabel');
    if (labelEl) labelEl.textContent = label;
    if (msg) msg.innerHTML = '';

    // Limpiar mapa anterior
    if (this.routeMap) {
      this.routeMap.remove();
      this.routeMap = null;
    }

    // Crear mapa
    this.routeMap = L.map('routeMap').setView([-42.4696, -73.7711], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.routeMap);

    // Agregar marcadores y líneas
    const markers = [];
    let faltanCoords = 0;

    pedidoIds.forEach((pedidoId, index) => {
      const parada = this.ruta?.stops?.find(s => s.pedidoId === pedidoId);
      const lat = parada?.pedido?.client?.latitud;
      const lng = parada?.pedido?.client?.longitud;

      if (!parada || !lat || !lng) {
        faltanCoords++;
        return;
      }

      L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="background: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
          iconSize: [32, 32]
        })
      }).bindPopup(`
        <strong>${parada.pedido.client.razonSocial}</strong><br>
        Orden: ${index + 1}<br>
        Cajas: ${parada.pedido.cajas}
      `).addTo(this.routeMap);

      markers.push([lat, lng]);
    });

    if (faltanCoords > 0 && msg) {
      msg.innerHTML = `<div class="alert alert-warning">⚠️ ${faltanCoords} parada(s) no tienen coordenadas. El mapa muestra solo las que sí tienen georreferencia.</div>`;
    }

    // Dibujar línea de ruta
    if (markers.length > 1) {
      L.polyline(markers, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.7
      }).addTo(this.routeMap);
    }

    // Ajustar vista
    if (markers.length > 0) {
      this.routeMap.fitBounds(markers, { padding: [50, 50] });
    }
  },

  /**
   * Previsualizar (toggle) el orden optimizado en el mapa
   */
  previsualizarOptimizacion() {
    if (!this.optimizationData?.ordenOptimizado?.length) {
      UI.showError('Primero debes optimizar la ruta');
      return;
    }

    const btnPrev = document.getElementById('btnPrevisualizarOptimizacion');

    if (this.mapMode === 'optimized') {
      // Volver al orden actual
      const pedidoIds = (this.ruta?.stops || [])
        .slice()
        .sort((a, b) => a.ordenVisita - b.ordenVisita)
        .map(s => s.pedidoId);

      this.mapMode = 'current';
      this.renderRouteMap(pedidoIds, 'Vista: Orden actual');
      if (btnPrev) btnPrev.textContent = '👁️ Previsualizar en mapa';
      return;
    }

    // Mostrar orden optimizado
    this.mapMode = 'optimized';
    this.renderRouteMap(this.optimizationData.ordenOptimizado, 'Vista: Orden optimizado');
    if (btnPrev) btnPrev.textContent = '↩️ Volver a orden actual';
  },

  /**
   * Cancelar optimización (sin aplicar cambios)
   */
  cancelarOptimizacion() {
    // Ocultar resultados y limpiar estado
    document.getElementById('optimizationResults').style.display = 'none';
    this.optimizationData = null;
    this.mapMode = 'current';

    const btnPrev = document.getElementById('btnPrevisualizarOptimizacion');
    if (btnPrev) {
      btnPrev.disabled = true;
      btnPrev.textContent = '👁️ Previsualizar en mapa';
    }

    const btnCancel = document.getElementById('btnCancelarOptimizacion');
    if (btnCancel) btnCancel.disabled = true;

    // Volver a mapa en orden actual
    this.renderizarMapaRuta();
    UI.showSuccess('Optimización cancelada');
  },

  /**
   * Mostrar comparación de órdenes
   */
  mostrarComparacionOrdenes() {
    // Orden actual
    const currentList = document.getElementById('currentOrderList');
    currentList.innerHTML = this.ruta.stops
      .sort((a, b) => a.ordenVisita - b.ordenVisita)
      .map(parada => `
        <div class="stop-item">
          <div style="display: flex; align-items: center; flex: 1;">
            <div class="stop-order">${parada.ordenVisita}</div>
            <div>
              <strong>${parada.pedido.client.razonSocial}</strong><br>
              <small style="color: #6b7280;">${parada.pedido.client.comuna}</small>
            </div>
          </div>
          <div style="color: #6b7280;">${parada.pedido.cajas} cajas</div>
        </div>
      `).join('');

    // Orden optimizado
    const optimizedList = document.getElementById('optimizedOrderList');
    optimizedList.innerHTML = this.optimizationData.ordenOptimizado
      .map((pedidoId, index) => {
        const parada = this.ruta.stops.find(s => s.pedidoId === pedidoId);
        return `
          <div class="stop-item">
            <div style="display: flex; align-items: center; flex: 1;">
              <div class="stop-order">${index + 1}</div>
              <div>
                <strong>${parada.pedido.client.razonSocial}</strong><br>
                <small style="color: #6b7280;">${parada.pedido.client.comuna}</small>
              </div>
            </div>
            <div style="color: #6b7280;">${parada.pedido.cajas} cajas</div>
          </div>
        `;
      }).join('');
  },

  /**
   * Aplicar optimización (actualizar órdenes en BD)
   */
  async aplicarOptimizacion() {
    if (!this.optimizationData) return;

    if (!UI.confirm('¿Aplicar el orden optimizado? Esto actualizará el orden de todas las paradas.')) {
      return;
    }

    const btnAplicar = document.getElementById('btnAplicarOptimizacion');
    UI.setButtonLoading(btnAplicar, true);

    try {
      // PASO 1: Mover todas las paradas a órdenes temporales altos (1000+)
      // para evitar conflictos de duplicados
      console.log('🔄 Paso 1: Asignando órdenes temporales...');
      for (let i = 0; i < this.ruta.stops.length; i++) {
        const parada = this.ruta.stops[i];
        await API.patch(`${CONFIG.ENDPOINTS.ROUTES}/${this.rutaId}/stops/${parada.id}`, {
          ordenVisita: 1000 + i
        });
      }

      console.log('✅ Paso 1 completado');

      // PASO 2: Actualizar cada parada con su nuevo orden definitivo
      console.log('🔄 Paso 2: Aplicando orden optimizado...');
      for (let i = 0; i < this.optimizationData.ordenOptimizado.length; i++) {
        const pedidoId = this.optimizationData.ordenOptimizado[i];
        const parada = this.ruta.stops.find(s => s.pedidoId === pedidoId);
        
        if (parada) {
          await API.patch(`${CONFIG.ENDPOINTS.ROUTES}/${this.rutaId}/stops/${parada.id}`, {
            ordenVisita: i + 1
          });
        }
      }

      console.log('✅ Paso 2 completado');

      UI.showSuccess('Orden optimizado aplicado correctamente');
      
      // Recargar ruta
      await this.cargarRuta();

      // Ocultar resultados
      document.getElementById('optimizationResults').style.display = 'none';

      // Reset estado de optimización
      this.optimizationData = null;
      this.mapMode = 'current';

      const btnPrev = document.getElementById('btnPrevisualizarOptimizacion');
      if (btnPrev) {
        btnPrev.disabled = true;
        btnPrev.textContent = '👁️ Previsualizar en mapa';
      }

      const btnCancel = document.getElementById('btnCancelarOptimizacion');
      if (btnCancel) btnCancel.disabled = true;

    } catch (error) {
      console.error('❌ Error al aplicar optimización:', error);
      UI.showError('Error al aplicar la optimización: ' + error.message);
    } finally {
      UI.setButtonLoading(btnAplicar, false);
    }
  },

  /* ==========================================
     SISTEMA DE INCIDENCIAS
     ========================================== */

  /**
   * Abrir modal de incidencia
   */
  abrirModalIncidencia(paradaId, pedidoId) {
    const parada = this.ruta.stops.find(s => s.id === paradaId);
    if (!parada) return;

    const modal = document.getElementById('modalIncidencia');
    document.getElementById('incidenciaParadaId').value = paradaId;
    document.getElementById('incidenciaPedidoId').value = pedidoId;
    document.getElementById('incidenciaCliente').textContent = parada.pedido.client.razonSocial;
    document.getElementById('modalIncidenciaMessage').innerHTML = '';
    
    // Limpiar formulario
    document.getElementById('formIncidencia').reset();
    
    modal.style.display = 'block';
  },

  /**
   * Cerrar modal de incidencia
   */
  cerrarModalIncidencia() {
    document.getElementById('modalIncidencia').style.display = 'none';
  },

  /**
   * Reportar incidencia
   */
  async reportarIncidencia() {
    console.log('🚨 Reportando incidencia...');

    document.getElementById('modalIncidenciaMessage').innerHTML = '';

    const paradaId = parseInt(document.getElementById('incidenciaParadaId').value);
    const pedidoId = parseInt(document.getElementById('incidenciaPedidoId').value);
    const tipo = document.getElementById('incidenciaTipo').value;
    const severidad = document.getElementById('incidenciaSeveridad').value;
    const descripcion = document.getElementById('incidenciaDescripcion').value.trim();

    if (!tipo || !descripcion) {
      document.getElementById('modalIncidenciaMessage').innerHTML = 
        '<div class="alert alert-danger">Completa todos los campos requeridos</div>';
      return;
    }

    const btnGuardar = document.getElementById('btnGuardarIncidencia');
    UI.setButtonLoading(btnGuardar, true);

    try {
      // Actualizar la parada a NO_ENTREGADA con incidencia
      await API.patch(`${CONFIG.ENDPOINTS.ROUTES}/${this.rutaId}/stops/${paradaId}`, {
        estadoParada: 'NO_ENTREGADA',
        incidente: {
          tipo,
          descripcion,
          severidad
        }
      });

      document.getElementById('modalIncidenciaMessage').innerHTML = 
        '<div class="alert alert-success">Incidencia reportada correctamente</div>';

      // Recargar ruta
      await this.cargarRuta();

      setTimeout(() => {
        this.cerrarModalIncidencia();
      }, 1500);

    } catch (error) {
      console.error('❌ Error al reportar incidencia:', error);
      document.getElementById('modalIncidenciaMessage').innerHTML = 
        `<div class="alert alert-danger">${error.message || 'Error al reportar incidencia'}</div>`;
    } finally {
      UI.setButtonLoading(btnGuardar, false);
    }
  },

  /**
   * Renderizar lista de incidencias
   */
  renderizarIncidencias() {
    const container = document.getElementById('incidenciasListContainer');
    if (!container) return;

    const incidencias = this.ruta?.incidents || [];

    if (incidencias.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No hay incidencias reportadas</p>';
      return;
    }

    const html = incidencias.map(inc => {
      const severidadColor = {
        'BAJA': '#10b981',
        'MEDIA': '#f59e0b',
        'ALTA': '#ef4444',
        'CRITICA': '#7c3aed'
      }[inc.severidad] || '#6b7280';

      return `
        <div style="border-left: 4px solid ${severidadColor}; padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <strong style="font-size: 15px;">${inc.tipo}</strong>
              <span style="background: ${severidadColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">
                ${inc.severidad}
              </span>
            </div>
            <span style="color: #6b7280; font-size: 13px;">${UI.formatDate(inc.createdAt)}</span>
          </div>
          <p style="margin: 8px 0; color: #374151;">${inc.descripcion}</p>
          <div style="color: #6b7280; font-size: 13px;">
            Pedido #${inc.pedidoId} • Reportado por: ${inc.createdBy?.nombre || 'Sistema'}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // Actualizar badge de contador
    const badge = document.getElementById('incidenciasBadge');
    if (badge) {
      badge.textContent = incidencias.length;
      badge.style.display = incidencias.length > 0 ? 'inline' : 'none';
    }
  },

  /**
   * Cambiar estado de parada
   */
  async cambiarEstadoParada(paradaId, nuevoEstado) {
    const estadosTexto = {
      'PENDIENTE': 'pendiente',
      'COMPLETADA': 'completada',
      'NO_ENTREGADA': 'no entregada'
    };

    if (!UI.confirm(`¿Marcar esta parada como ${estadosTexto[nuevoEstado]}?`)) {
      return;
    }

    try {
      await API.patch(`${CONFIG.ENDPOINTS.ROUTES}/${this.rutaId}/stops/${paradaId}`, {
        estadoParada: nuevoEstado
      });

      UI.showSuccess(`Parada marcada como ${estadosTexto[nuevoEstado]}`);
      
      // Recargar ruta
      await this.cargarRuta();

    } catch (error) {
      console.error('❌ Error al cambiar estado:', error);
      UI.showError('Error al cambiar el estado de la parada');
    }
  },

  abrirNavegacion(paradaId) {
      try {
        const parada = this.ruta?.stops?.find(p => p.id === paradaId);
        const client = parada?.pedido?.client;

        if (!client) {
          UI.showError('No se encontró la información del cliente');
          return;
        }

        // Preferir coordenadas si existen
        let destination = '';
        if (client.latitud && client.longitud) {
          destination = `${client.latitud},${client.longitud}`;
        } else {
          const address = [client.direccion, client.comuna, client.ciudad, 'Chile']
            .filter(Boolean)
            .join(', ');
          if (!address.trim()) {
            UI.showError('El cliente no tiene dirección ni coordenadas');
            return;
          }
          destination = address;
        }

        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
        window.open(url, '_blank');
      } catch (e) {
        console.error('❌ Error al abrir navegación:', e);
        UI.showError('No se pudo abrir la navegación');
      }
    }

};