/* ========================================
   UI.JS - Utilidades para manipulación del DOM
   ======================================== */

const UI = {
  /**
   * Mostrar alerta flotante (toast) visible en cualquier página
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duración en ms (default 5000)
   */
  showAlert(message, type = 'info', duration = 5000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(toastContainer);
    }

    const config = {
      success: { bg: '#d1fae5', border: '#10b981', icon: '✅', title: 'Éxito' },
      error: { bg: '#fee2e2', border: '#ef4444', icon: '❌', title: 'Error' },
      warning: { bg: '#fef3c7', border: '#f59e0b', icon: '⚠️', title: 'Atención' },
      info: { bg: '#dbeafe', border: '#3b82f6', icon: 'ℹ️', title: 'Información' },
    }[type] || { bg: '#f3f4f6', border: '#6b7280', icon: 'ℹ️', title: 'Aviso' };

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${config.bg};
      border-left: 4px solid ${config.border};
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
      position: relative;
    `;

    toast.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      </style>
      <div style="display: flex; gap: 12px; align-items: start;">
        <span style="font-size: 20px;">${config.icon}</span>
        <div style="flex: 1;">
          <strong style="display: block; margin-bottom: 4px;">${config.title}</strong>
          <span style="color: #374151; font-size: 14px;">${this.escapeHtml(message)}</span>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; padding: 0;">&times;</button>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Mostrar mensaje de error (toast flotante)
   */
  showError(message, containerId = 'error-container') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error:</strong> ${message}
        </div>
      `;
      setTimeout(() => { container.innerHTML = ''; }, 5000);
    }
    this.showAlert(message, 'error');
  },

  /**
   * Mostrar mensaje de éxito (toast flotante)
   */
  showSuccess(message, containerId = 'success-container') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="alert alert-success">
          <strong>Éxito:</strong> ${message}
        </div>
      `;
      setTimeout(() => { container.innerHTML = ''; }, 3000);
    }
    this.showAlert(message, 'success', 3000);
  },

  /**
   * Mostrar loading en un botón
   */
  setButtonLoading(button, loading = true) {
    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = `
        <span class="spinner"></span>
        <span>Cargando...</span>
      `;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
  },

  /**
   * Mostrar overlay de loading en toda la página
   */
  showLoadingOverlay(show = true) {
    let overlay = document.getElementById('loading-overlay');

    if (show) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner spinner-lg"></div>';
        document.body.appendChild(overlay);
      }
      overlay.style.display = 'flex';
    } else {
      if (overlay) {
        overlay.style.display = 'none';
      }
    }
  },

  /**
   * Crear badge según estado
   */
  createBadge(text, status) {
    const color = CONFIG.BADGE_COLORS[status] || 'gray';
    return `<span class="badge badge-${color}">${text}</span>`;
  },

  /**
   * Formatear fecha (YYYY-MM-DD a DD/MM/YYYY)
   * Usa UTC para evitar problemas de timezone donde la fecha aparece un día antes
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    // Usar UTC para evitar que Chile (UTC-3/-4) muestre el día anterior
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  },

  /**
   * Formatear fecha y hora (usa hora local para mostrar correctamente)
   */
  formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const formattedDate = this.formatDate(dateString);
    // La hora sí la mostramos en local
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${formattedDate} ${hours}:${minutes}`;
  },

  /**
   * Validar email
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Validar RUT chileno (básico)
   */
  validateRUT(rut) {
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    
    if (rut.length < 8 || rut.length > 9) return false;

    const dv = rut.slice(-1).toUpperCase();
    const numero = rut.slice(0, -1);

    if (!/^\d+$/.test(numero)) return false;

    let suma = 0;
    let multiplo = 2;

    for (let i = numero.length - 1; i >= 0; i--) {
      suma += multiplo * parseInt(numero.charAt(i));
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado);

    return dv === dvCalculado;
  },

  /**
   * Formatear RUT (agregar puntos y guión)
   */
  formatRUT(rut) {
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    const dv = rut.slice(-1);
    let numero = rut.slice(0, -1);

    numero = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${numero}-${dv}`;
  },

  /**
   * Limpiar formulario
   */
  clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
      const errorElements = form.querySelectorAll('.form-error');
      errorElements.forEach(el => el.textContent = '');
      const inputsWithError = form.querySelectorAll('.error');
      inputsWithError.forEach(el => el.classList.remove('error'));
    }
  },

  /**
   * Mostrar error en un campo específico
   */
  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('error');

    let errorEl = field.parentElement.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      field.parentElement.appendChild(errorEl);
    }

    errorEl.textContent = message;
  },

  /**
   * Limpiar error de un campo específico
   */
  clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('error');

    const errorEl = field.parentElement.querySelector('.form-error');
    if (errorEl) {
      errorEl.textContent = '';
    }
  },

  /**
   * Confirmar acción (usar confirm nativo por ahora)
   */
  confirm(message) {
    return window.confirm(message);
  },

  /**
   * Estado vacío (cuando no hay datos)
   */
  renderEmptyState(container, message = 'No hay datos para mostrar', actionButton = null) {
    const actionHtml = actionButton
      ? `<button class="btn btn-primary" onclick="${actionButton.onClick}">${actionButton.text}</button>`
      : '';

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3 class="empty-state-title">Sin resultados</h3>
        <p class="empty-state-description">${message}</p>
        ${actionHtml}
      </div>
    `;
  },

  /**
   * Sistema de notificaciones de incidencias pendientes
   */
  notificationInterval: null,

  async initNotifications() {
    const user = Auth.getUser();
    if (!user || !['ADMIN', 'SUPERVISOR'].includes(user.role)) return;

    this.createNotificationBell();
    await this.updateNotificationCount();

    this.notificationInterval = setInterval(() => {
      this.updateNotificationCount();
    }, 30000);
  },

  createNotificationBell() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight || document.getElementById('notificationBell')) return;

    const bellHtml = `
      <div id="notificationBell" class="notification-bell" onclick="UI.toggleNotificationDropdown()" style="position: relative; cursor: pointer; padding: 8px; margin-right: 12px;">
        <span style="font-size: 20px;">🔔</span>
        <span id="notificationBadge" class="notification-badge" style="display: none; position: absolute; top: 0; right: 0; background: #ef4444; color: white; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 10px; min-width: 18px; text-align: center;">0</span>
        <div id="notificationDropdown" class="notification-dropdown" style="display: none; position: absolute; top: 100%; right: 0; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 300px; z-index: 1000; max-height: 400px; overflow-y: auto;">
          <div style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>Incidencias Pendientes</strong>
          </div>
          <div id="notificationContent" style="padding: 12px;">
            <p class="text-muted text-center">Cargando...</p>
          </div>
          <div style="padding: 12px; border-top: 1px solid #e5e7eb; text-align: center;">
            <a href="incidencias.html" class="text-primary" style="font-weight: 600; text-decoration: none;">Ver todas las incidencias</a>
          </div>
        </div>
      </div>
    `;

    headerRight.insertAdjacentHTML('afterbegin', bellHtml);

    document.addEventListener('click', (e) => {
      const bell = document.getElementById('notificationBell');
      if (bell && !bell.contains(e.target)) {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.style.display = 'none';
      }
    });
  },

  toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      if (dropdown.style.display === 'block') {
        this.loadNotificationContent();
      }
    }
  },

  async updateNotificationCount() {
    try {
      const res = await API.get(`${CONFIG.ENDPOINTS.INCIDENTS}/pending/count`);
      const count = res.count || 0;

      const badge = document.getElementById('notificationBadge');
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'block' : 'none';
      }
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
    }
  },

  async loadNotificationContent() {
    const content = document.getElementById('notificationContent');
    if (!content) return;

    try {
      const res = await API.get(CONFIG.ENDPOINTS.INCIDENTS, { take: 5, estado: 'ABIERTA' });
      const incidencias = res.items || [];

      if (incidencias.length === 0) {
        content.innerHTML = '<p class="text-muted text-center">No hay incidencias pendientes</p>';
        return;
      }

      content.innerHTML = incidencias.map(inc => `
        <div style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <strong style="font-size: 13px;">${this.escapeHtml(inc.tipo)}</strong>
              <p class="text-muted text-sm" style="margin: 4px 0; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${this.escapeHtml(inc.descripcion)}
              </p>
              <span class="text-muted text-sm">Ruta #${inc.routeId}</span>
            </div>
            <a href="incidencias.html" class="btn btn-sm btn-secondary" style="font-size: 11px;">Ver</a>
          </div>
        </div>
      `).join('');
    } catch (err) {
      content.innerHTML = '<p class="text-danger text-center">Error al cargar</p>';
    }
  },

  escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  stopNotifications() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  },
};

// PWA: Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
