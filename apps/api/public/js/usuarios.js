/* ========================================
   USUARIOS.JS - Lógica del módulo de usuarios
   ======================================== */

const Usuarios = {
  usuarios: [],
  usuarioSeleccionado: null,

  /**
   * Inicializar módulo
   */
  async init() {
    await this.cargarUsuarios();
    this.setupEventListeners();
  },

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    document.getElementById('btnNuevoUsuario').addEventListener('click', () => {
      this.abrirModal();
    });

    document.getElementById('btnCerrarModal').addEventListener('click', () => {
      this.cerrarModal();
    });

    document.getElementById('btnCancelar').addEventListener('click', () => {
      this.cerrarModal();
    });

    document.getElementById('btnCerrarModalPassword').addEventListener('click', () => {
      this.cerrarModalPassword();
    });

    document.getElementById('btnCancelarPassword').addEventListener('click', () => {
      this.cerrarModalPassword();
    });

    document.getElementById('formUsuario').addEventListener('submit', (e) => {
      e.preventDefault();
      this.guardarUsuario();
    });

    document.getElementById('formPassword').addEventListener('submit', (e) => {
      e.preventDefault();
      this.cambiarPassword();
    });

    document.getElementById('searchInput').addEventListener('input', () => {
      this.filtrarUsuarios();
    });

    document.getElementById('filterRole').addEventListener('change', () => {
      this.filtrarUsuarios();
    });
  },

  /**
   * Cargar usuarios desde el API
   */
  async cargarUsuarios() {
    console.log('Cargando usuarios...');
    try {
      const response = await API.get('/users', { take: 200 });
      
      console.log('Respuesta del API:', response);
      console.log('Total de usuarios:', response.total);
      console.log('Usuarios cargados:', response.items?.length);
      
      this.usuarios = response.items || [];
      
      this.usuarios.sort((a, b) => b.id - a.id);
      
      console.log('Usuarios listos para mostrar');
      this.renderizarTabla(this.usuarios);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      UI.showError('Error al cargar los usuarios');
      document.getElementById('usuariosTableContainer').innerHTML = 
        '<p class="text-center text-danger">Error al cargar usuarios</p>';
    }
  },

  /**
   * Renderizar tabla de usuarios
   */
  renderizarTabla(usuarios) {
    const container = document.getElementById('usuariosTableContainer');

    if (usuarios.length === 0) {
      UI.renderEmptyState(container, 'No hay usuarios registrados', {
        text: 'Crear Primer Usuario',
        onClick: 'Usuarios.abrirModal()'
      });
      return;
    }

    const html = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${usuarios.map(usuario => `
              <tr>
                <td><strong>${usuario.nombre}</strong></td>
                <td>${usuario.email}</td>
                <td>${this.getRoleBadge(usuario.role)}</td>
                <td>
                  ${usuario.active 
                    ? UI.createBadge('Activo', 'ACTIVO') 
                    : UI.createBadge('Inactivo', 'INACTIVO')
                  }
                </td>
                <td>
                  <div class="table-actions">
                    <button 
                      class="btn btn-sm btn-primary btn-icon" 
                      onclick="Usuarios.editarUsuario(${usuario.id})"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      class="btn btn-sm btn-warning btn-icon" 
                      onclick="Usuarios.abrirModalPassword(${usuario.id}, '${usuario.nombre}')"
                      title="Cambiar Contraseña"
                    >
                      🔑
                    </button>
                    <button 
                      class="btn btn-sm ${usuario.active ? 'btn-danger' : 'btn-success'} btn-icon" 
                      onclick="Usuarios.toggleEstado(${usuario.id}, ${usuario.active})"
                      title="${usuario.active ? 'Desactivar' : 'Activar'}"
                    >
                      ${usuario.active ? '🚫' : '✅'}
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
   * Badge según rol
   */
  getRoleBadge(role) {
    const badges = {
      'ADMIN': '<span class="badge badge-danger">Administrador</span>',
      'PLANIFICADOR': '<span class="badge badge-primary">Planificador</span>',
      'SUPERVISOR': '<span class="badge badge-warning">Supervisor</span>',
      'CONDUCTOR': '<span class="badge badge-success">Conductor</span>',
    };
    return badges[role] || role;
  },

  /**
   * Filtrar usuarios
   */
  filtrarUsuarios() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const roleFilter = document.getElementById('filterRole').value;

    let filtrados = [...this.usuarios];

    if (roleFilter) {
      filtrados = filtrados.filter(u => u.role === roleFilter);
    }

    if (searchTerm) {
      filtrados = filtrados.filter(u => {
        const coincideNombre = u.nombre?.toLowerCase().includes(searchTerm);
        const coincideEmail = u.email?.toLowerCase().includes(searchTerm);
        return coincideNombre || coincideEmail;
      });
    }

    this.renderizarTabla(filtrados);
  },

  /**
   * Abrir modal (crear o editar)
   */
  abrirModal(usuario = null) {
    this.usuarioSeleccionado = usuario;
    const modal = document.getElementById('modalUsuario');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('formUsuario');
    const passwordGroup = document.getElementById('passwordGroup');
    const activeGroup = document.getElementById('activeGroup');
    const passwordInput = document.getElementById('password');

    form.reset();
    document.getElementById('modalMessage').innerHTML = '';
    UI.clearForm('formUsuario');

    if (usuario) {
      title.textContent = 'Editar Usuario';
      document.getElementById('usuarioId').value = usuario.id;
      document.getElementById('nombre').value = usuario.nombre;
      document.getElementById('email').value = usuario.email;
      document.getElementById('role').value = usuario.role;
      document.getElementById('active').checked = usuario.active;
      
      passwordGroup.style.display = 'none';
      passwordInput.required = false;
      
      activeGroup.style.display = 'block';
    } else {

      title.textContent = 'Nuevo Usuario';
      document.getElementById('usuarioId').value = '';
      
      passwordGroup.style.display = 'block';
      passwordInput.required = true;
      
      activeGroup.style.display = 'none';
    }

    modal.style.display = 'block';
  },

  /**
   * Cerrar modal
   */
  cerrarModal() {
    document.getElementById('modalUsuario').style.display = 'none';
    this.usuarioSeleccionado = null;
  },

  /**
   * Editar usuario
   */
  editarUsuario(id) {
    const usuario = this.usuarios.find(u => u.id === id);
    if (usuario) {
      this.abrirModal(usuario);
    }
  },

  /**
   * Guardar usuario
   */
  async guardarUsuario() {
    console.log('Iniciando guardarUsuario()...');

    document.getElementById('modalMessage').innerHTML = '';
    const allErrors = document.querySelectorAll('.form-error');
    allErrors.forEach(el => el.textContent = '');

    const id = document.getElementById('usuarioId').value;
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const role = document.getElementById('role').value;
    const password = document.getElementById('password').value;
    const active = document.getElementById('active').checked;

    let hasErrors = false;

    if (!nombre) {
      UI.showFieldError('nombre', 'El nombre es requerido');
      hasErrors = true;
    }

    if (!email) {
      UI.showFieldError('email', 'El email es requerido');
      hasErrors = true;
    } else if (!UI.validateEmail(email)) {
      UI.showFieldError('email', 'Email inválido');
      hasErrors = true;
    }

    if (!role) {
      UI.showFieldError('role', 'Selecciona un rol');
      hasErrors = true;
    }

    if (!id && (!password || password.length < 6)) {
      UI.showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
      hasErrors = true;
    }

    if (hasErrors) {
      document.getElementById('modalMessage').innerHTML = 
        '<div class="alert alert-danger">Completa los campos requeridos correctamente</div>';
      return;
    }

    const data = {
      nombre,
      email,
      role,
    };

    if (!id) {
      data.password = password;
    } else {
      data.active = active;
    }

    console.log('Datos a enviar:', data);

    const btnGuardar = document.getElementById('btnGuardar');
    UI.setButtonLoading(btnGuardar, true);

    try {
      let response;
      
      if (id) {
        console.log(`Actualizando usuario ID: ${id}`);
        response = await API.patch(`/users/${id}`, data);
      } else {
        console.log('Creando nuevo usuario');
        response = await API.post('/users', data);
      }

      console.log('Respuesta del servidor:', response);

      document.getElementById('modalMessage').innerHTML = 
        `<div class="alert alert-success">${id ? 'Usuario actualizado' : 'Usuario creado'} correctamente</div>`;

      await this.cargarUsuarios();

      setTimeout(() => {
        this.cerrarModal();
      }, 1000);

    } catch (error) {
      console.error('Error al guardar usuario:', error);
      document.getElementById('modalMessage').innerHTML = 
        `<div class="alert alert-danger">${error.message || 'Error al guardar el usuario'}</div>`;
    } finally {
      UI.setButtonLoading(btnGuardar, false);
    }
  },

  /**
   * Abrir modal de cambio de contraseña
   */
  abrirModalPassword(id, nombre) {
    const modal = document.getElementById('modalPassword');
    const form = document.getElementById('formPassword');

    form.reset();
    document.getElementById('modalPasswordMessage').innerHTML = '';
    
    document.getElementById('passwordUserId').value = id;

    modal.style.display = 'block';
  },

  /**
   * Cerrar modal de contraseña
   */
  cerrarModalPassword() {
    document.getElementById('modalPassword').style.display = 'none';
  },

  /**
   * Cambiar contraseña
   */
  async cambiarPassword() {
    console.log('Cambiando contraseña...');

    document.getElementById('modalPasswordMessage').innerHTML = '';

    const id = document.getElementById('passwordUserId').value;
    const password = document.getElementById('newPassword').value;

    if (!password || password.length < 6) {
      document.getElementById('modalPasswordMessage').innerHTML = 
        '<div class="alert alert-danger">La contraseña debe tener al menos 6 caracteres</div>';
      return;
    }

    const btnGuardar = document.getElementById('btnGuardarPassword');
    UI.setButtonLoading(btnGuardar, true);

    try {
      await API.patch(`/users/${id}/password`, { password });

      document.getElementById('modalPasswordMessage').innerHTML = 
        '<div class="alert alert-success">Contraseña actualizada correctamente</div>';

      setTimeout(() => {
        this.cerrarModalPassword();
      }, 1500);

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      document.getElementById('modalPasswordMessage').innerHTML = 
        `<div class="alert alert-danger">${error.message || 'Error al cambiar la contraseña'}</div>`;
    } finally {
      UI.setButtonLoading(btnGuardar, false);
    }
  },

  /**
   * Activar/Desactivar usuario
   */
  async toggleEstado(id, estadoActual) {
    const accion = estadoActual ? 'desactivar' : 'activar';
    
    if (!UI.confirm(`¿Estás seguro de ${accion} este usuario?`)) {
      return;
    }

    try {
      await API.patch(`/users/${id}`, {
        active: !estadoActual
      });

      await this.cargarUsuarios();

      UI.showSuccess(`Usuario ${accion === 'desactivar' ? 'desactivado' : 'activado'} correctamente`);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      UI.showError('Error al cambiar el estado del usuario');
    }
  }
};