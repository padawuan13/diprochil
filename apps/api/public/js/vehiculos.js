/* ========================================
   VEHICULOS.JS - Lógica del módulo de vehículos
   ======================================== */

const Vehiculos = {
  vehiculos: [],
  vehiculoSeleccionado: null,

  /**
   * Inicializar módulo
   */
  async init() {
    await this.cargarVehiculos();
    this.setupEventListeners();
  },

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    document.getElementById('btnNuevoVehiculo').addEventListener('click', () => {
      this.abrirModal();
    });

    document.getElementById('btnCerrarModal').addEventListener('click', () => {
      this.cerrarModal();
    });

    document.getElementById('btnCancelar').addEventListener('click', () => {
      this.cerrarModal();
    });

    document.getElementById('formVehiculo').addEventListener('submit', (e) => {
      e.preventDefault();
      this.guardarVehiculo();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filtrarVehiculos();
    });

    document.getElementById('filterEstado').addEventListener('change', (e) => {
      this.filtrarVehiculos();
    });

    document.getElementById('patente').addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  },

  /**
   * Cargar vehículos desde el API
   */
  async cargarVehiculos() {
    console.log('Cargando vehículos...');
    try {
      const response = await API.get(CONFIG.ENDPOINTS.VEHICLES, { 
        take: 200, 
        skip: 0,
      });
      
      console.log('Respuesta del API:', response);
      console.log('Total de vehículos en BD:', response.total);
      console.log('Vehículos cargados:', response.items?.length);
      
      this.vehiculos = response.items || [];
      
      this.vehiculos.sort((a, b) => b.id - a.id);
      
      console.log('Vehículos listos para mostrar');
      this.renderizarTabla(this.vehiculos);
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
      UI.showError('Error al cargar los vehículos');
      document.getElementById('vehiculosTableContainer').innerHTML = 
        '<p class="text-center text-danger">Error al cargar vehículos</p>';
    }
  },

  /**
   * Renderizar tabla de vehículos
   */
  renderizarTabla(vehiculos) {
    const container = document.getElementById('vehiculosTableContainer');

    if (vehiculos.length === 0) {
      UI.renderEmptyState(container, 'No hay vehículos registrados', {
        text: 'Crear Primer Vehículo',
        onClick: 'Vehiculos.abrirModal()'
      });
      return;
    }

    const html = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Patente</th>
              <th>Tipo</th>
              <th>Capacidad (Kg)</th>
              <th>Estado</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${vehiculos.map(vehiculo => `
              <tr>
                <td><strong>${vehiculo.patente}</strong></td>
                <td>${vehiculo.tipo || '-'}</td>
                <td>${vehiculo.capacidadKg ? vehiculo.capacidadKg.toLocaleString() : '-'}</td>
                <td>${UI.createBadge(vehiculo.estado, vehiculo.estado)}</td>
                <td>${vehiculo.observaciones || '-'}</td>
                <td>
                  <div class="table-actions">
                    <button 
                      class="btn btn-sm btn-primary btn-icon" 
                      onclick="Vehiculos.editarVehiculo(${vehiculo.id})"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    ${vehiculo.estado === 'ACTIVO' ? `
                      <button 
                        class="btn btn-sm btn-warning btn-icon" 
                        onclick="Vehiculos.cambiarEstado(${vehiculo.id}, 'MANTENCION')"
                        title="Enviar a Mantención"
                      >
                        🔧
                      </button>
                    ` : ''}
                    ${vehiculo.estado === 'MANTENCION' ? `
                      <button 
                        class="btn btn-sm btn-success btn-icon" 
                        onclick="Vehiculos.cambiarEstado(${vehiculo.id}, 'ACTIVO')"
                        title="Activar"
                      >
                        ✅
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
   * Filtrar vehículos por búsqueda y estado
   */
  filtrarVehiculos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const estadoFilter = document.getElementById('filterEstado').value;

    console.log('Filtrando:', { searchTerm, estadoFilter });

    let filtrados = [...this.vehiculos];

    if (estadoFilter) {
      filtrados = filtrados.filter(v => v.estado === estadoFilter);
    }

    if (searchTerm) {
      filtrados = filtrados.filter(v => {
        const coincidePatente = v.patente?.toLowerCase().includes(searchTerm);
        const coincideTipo = v.tipo?.toLowerCase().includes(searchTerm);
        return coincidePatente || coincideTipo;
      });
    }

    console.log('Vehículos filtrados:', filtrados.length);
    this.renderizarTabla(filtrados);
  },

  /**
   * Abrir modal (crear o editar)
   */
  abrirModal(vehiculo = null) {
    this.vehiculoSeleccionado = vehiculo;
    const modal = document.getElementById('modalVehiculo');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('formVehiculo');
    const estadoGroup = document.getElementById('estadoGroup');

    form.reset();
    document.getElementById('modalMessage').innerHTML = '';
    UI.clearForm('formVehiculo');

    if (vehiculo) {
      title.textContent = 'Editar Vehículo';
      document.getElementById('vehiculoId').value = vehiculo.id;
      document.getElementById('patente').value = vehiculo.patente;
      document.getElementById('tipo').value = vehiculo.tipo || '';
      document.getElementById('capacidadKg').value = vehiculo.capacidadKg || '';
      document.getElementById('observaciones').value = vehiculo.observaciones || '';
      document.getElementById('estado').value = vehiculo.estado;
      
      estadoGroup.style.display = 'block';
    } else {
      title.textContent = 'Nuevo Vehículo';
      document.getElementById('vehiculoId').value = '';
      
      estadoGroup.style.display = 'none';
    }

    modal.style.display = 'block';
  },

  /**
   * Cerrar modal
   */
  cerrarModal() {
    document.getElementById('modalVehiculo').style.display = 'none';
    this.vehiculoSeleccionado = null;
  },

  /**
   * Editar vehículo 
   */
  editarVehiculo(id) {
    const vehiculo = this.vehiculos.find(v => v.id === id);
    if (vehiculo) {
      this.abrirModal(vehiculo);
    }
  },

  /**
   * Guardar vehículo (crear o actualizar)
   */
  async guardarVehiculo() {
    console.log('Iniciando guardarVehiculo()...');

    document.getElementById('modalMessage').innerHTML = '';
    const allErrors = document.querySelectorAll('.form-error');
    allErrors.forEach(el => el.textContent = '');
    const allInputsWithError = document.querySelectorAll('.form-input.error, .form-select.error');
    allInputsWithError.forEach(el => el.classList.remove('error'));

    const id = document.getElementById('vehiculoId').value;
    const patente = document.getElementById('patente').value.trim().toUpperCase();
    const tipo = document.getElementById('tipo').value;
    const capacidadKg = document.getElementById('capacidadKg').value;
    const observaciones = document.getElementById('observaciones').value.trim();
    const estado = document.getElementById('estado').value;

    console.log('Valores capturados:', {
      patente,
      tipo,
      capacidadKg,
      estado,
    });

    let hasErrors = false;

    if (!patente) {
      UI.showFieldError('patente', 'La patente es requerida');
      hasErrors = true;
    } else if (patente.length < 4) {
      UI.showFieldError('patente', 'La patente debe tener al menos 4 caracteres');
      hasErrors = true;
    }

    if (hasErrors) {
      console.log('Errores de validación detectados');
      document.getElementById('modalMessage').innerHTML = 
        '<div class="alert alert-danger">Por favor, completa todos los campos requeridos correctamente</div>';
      return;
    }

    console.log('Validaciones pasadas');

    const data = {
      patente,
    };

    if (tipo) data.tipo = tipo;
    if (capacidadKg) data.capacidadKg = parseInt(capacidadKg);
    if (observaciones) data.observaciones = observaciones;
    if (id) data.estado = estado; 

    console.log('Datos a enviar:', data);

    const btnGuardar = document.getElementById('btnGuardar');
    UI.setButtonLoading(btnGuardar, true);

    try {
      let response;
      
      if (id) {
        console.log(`Actualizando vehículo ID: ${id}`);
        response = await API.patch(`${CONFIG.ENDPOINTS.VEHICLES}/${id}`, data);
      } else {
        console.log('Creando nuevo vehículo');
        response = await API.post(CONFIG.ENDPOINTS.VEHICLES, data);
      }

      console.log('Respuesta del servidor:', response);

      document.getElementById('modalMessage').innerHTML = 
        `<div class="alert alert-success">${id ? 'Vehículo actualizado' : 'Vehículo creado'} correctamente</div>`;

      await this.cargarVehiculos();

      setTimeout(() => {
        this.cerrarModal();
      }, 1000);

    } catch (error) {
      console.error('Error al guardar vehículo:', error);
      document.getElementById('modalMessage').innerHTML = 
        `<div class="alert alert-danger">${error.message || 'Error al guardar el vehículo'}</div>`;
    } finally {
      UI.setButtonLoading(btnGuardar, false);
    }
  },

  /**
   * Cambiar estado rápido de un vehículo
   */
  async cambiarEstado(id, nuevoEstado) {
    const estadoTexto = {
      'ACTIVO': 'activo',
      'INACTIVO': 'inactivo',
      'MANTENCION': 'en mantención'
    }[nuevoEstado];

    if (!UI.confirm(`¿Marcar vehículo como ${estadoTexto}?`)) {
      return;
    }

    try {
      await API.patch(`${CONFIG.ENDPOINTS.VEHICLES}/${id}`, {
        estado: nuevoEstado
      });

      await this.cargarVehiculos();

      UI.showSuccess(`Vehículo marcado como ${estadoTexto}`);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      UI.showError('Error al cambiar el estado del vehículo');
    }
  }
};