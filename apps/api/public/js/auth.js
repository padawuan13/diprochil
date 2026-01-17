/* ========================================
   AUTH.JS - Manejo de autenticación
   ======================================== */

const Auth = {
  _useLocalStorage: true,

  /**
   * Iniciar sesión
   * @param {string} email
   * @param {string} password
   * @param {boolean} remember 
   */
  async login(email, password, remember = false) {
    try {
      const response = await API.post(CONFIG.ENDPOINTS.LOGIN, { email, password }, false);

      if (response.ok && response.token && response.user) {
        this._useLocalStorage = remember;

        if (remember) {
          localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER, 'true');
        } else {
          localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER);
        }

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
    localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    window.location.href = 'index.html';
  },

  /**
   * Verificar si está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Obtener el storage a usar (localStorage si recuerda, sessionStorage si no)
   */
  _getStorage() {
    if (localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)) {
      return localStorage;
    }
    if (sessionStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)) {
      return sessionStorage;
    }
    return this._useLocalStorage ? localStorage : sessionStorage;
  },

  /**
   * Obtener token
   */
  getToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN) ||
           sessionStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  /**
   * Guardar token
   */
  setToken(token) {
    const storage = this._useLocalStorage ? localStorage : sessionStorage;
    storage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
  },

  /**
   * Obtener usuario
   */
  getUser() {
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.USER) ||
                     sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  },

  /**
   * Guardar usuario
   */
  setUser(user) {
    const storage = this._useLocalStorage ? localStorage : sessionStorage;
    storage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
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
      window.location.href = 'index.html'; 
      return false;
    }

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
        window.location.href = 'conductor.html'; 
        break;
      default:
        window.location.href = 'dashboard.html'; 
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

