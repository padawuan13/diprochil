/* ========================================
   AUTH.JS - Manejo de autenticación
   ======================================== */

const Auth = {
  /**
   * Iniciar sesión
   */
  async login(email, password) {
    try {
      const response = await API.post(CONFIG.ENDPOINTS.LOGIN, { email, password }, false);

      if (response.ok && response.token && response.user) {
        // Guardar token y usuario en localStorage
        this.setToken(response.token);
        this.setUser(response.user);
        return response;
      } else {
        throw new Error('Credenciales inválidas');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Cerrar sesión
   */
  logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    window.location.href = 'index.html'; // ✅ Ruta relativa
  },

  /**
   * Verificar si está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Obtener token
   */
  getToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  /**
   * Guardar token
   */
  setToken(token) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
  },

  /**
   * Obtener usuario
   */
  getUser() {
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  },

  /**
   * Guardar usuario
   */
  setUser(user) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
  },

  /**
   * Obtener rol del usuario
   */
  getUserRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole(role) {
    return this.getUserRole() === role;
  },

  /**
   * Verificar si el usuario tiene alguno de los roles especificados
   */
  hasAnyRole(roles) {
    const userRole = this.getUserRole();
    return roles.includes(userRole);
  },

  /**
   * Proteger página (redirigir si no está autenticado)
   */
  requireAuth(allowedRoles = null) {
    if (!this.isAuthenticated()) {
      window.location.href = 'index.html'; // ✅ Ruta relativa
      return false;
    }

    // Si se especifican roles permitidos, verificar
    if (allowedRoles && !this.hasAnyRole(allowedRoles)) {
      alert('No tienes permisos para acceder a esta página');
      this.redirectToDashboard();
      return false;
    }

    return true;
  },

  /**
   * Redirigir al dashboard según rol
   */
  redirectToDashboard() {
    const role = this.getUserRole();

    switch (role) {
      case CONFIG.ROLES.CONDUCTOR:
        window.location.href = 'conductor.html'; // ✅ Ruta relativa
        break;
      default:
        window.location.href = 'dashboard.html'; // ✅ Ruta relativa
        break;
    }
  },

  /**
   * Obtener datos del usuario actual desde el servidor
   */
  async getCurrentUser() {
    try {
      const response = await API.get(CONFIG.ENDPOINTS.ME);
      if (response.ok && response.user) {
        this.setUser(response.user);
        return response.user;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  },

  /**
   * Refrescar información del usuario
   */
  async refreshUser() {
    return await this.getCurrentUser();
  },
};

// Exportar Auth (si usas módulos ES6)
// export default Auth;