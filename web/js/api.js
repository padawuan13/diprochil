/* ========================================
   API.JS - Cliente HTTP para consumir el backend
   ======================================== */

const API = {
  /**
   * Obtener el token de autenticación
   */
  getToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  /**
   * Construir headers con autenticación
   */
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  },

  /**
   * Manejar respuestas de la API
   */
  async handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      // Si es 401, el token expiró
      if (response.status === 401) {
        Auth.logout();
        window.location.href = '/index.html';
        throw new Error(CONFIG.ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Si es 403, no tiene permisos
      if (response.status === 403) {
        throw new Error(CONFIG.ERROR_MESSAGES.FORBIDDEN);
      }

      // Lanzar error con mensaje del servidor o genérico
      throw new Error(data.message || CONFIG.ERROR_MESSAGES.SERVER_ERROR);
    }

    return data;
  },

  /**
   * GET - Obtener recursos
   */
  async get(endpoint, params = {}) {
    try {
      // Construir query string
      const queryString = new URLSearchParams(params).toString();
      const url = `${CONFIG.API_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },

  /**
   * POST - Crear recursos
   */
  async post(endpoint, body = {}, includeAuth = true) {
    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(includeAuth),
        body: JSON.stringify(body),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  },

  /**
   * PUT - Actualizar recursos
   */
  async put(endpoint, body = {}) {
    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  },

  /**
   * PATCH - Actualizar recursos parcialmente
   */
  async patch(endpoint, body = {}) {
    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('API PATCH Error:', error);
      throw error;
    }
  },

  /**
   * DELETE - Eliminar recursos
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  },
};

// Exportar API (si usas módulos ES6)
// export default API;