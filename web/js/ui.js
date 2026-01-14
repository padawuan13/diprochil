/* ========================================
   UI.JS - Utilidades para manipulación del DOM
   ======================================== */

const UI = {
  /**
   * Mostrar mensaje de error
   */
  showError(message, containerId = 'error-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${message}
      </div>
    `;

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      container.innerHTML = '';
    }, 5000);
  },

  /**
   * Mostrar mensaje de éxito
   */
  showSuccess(message, containerId = 'success-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="alert alert-success">
        <strong>Éxito:</strong> ${message}
      </div>
    `;

    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      container.innerHTML = '';
    }, 3000);
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
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  },

  /**
   * Formatear fecha y hora
   */
  formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const formattedDate = this.formatDate(dateString);
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
    // Remover puntos y guión
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    
    // Debe tener entre 8 y 9 caracteres
    if (rut.length < 8 || rut.length > 9) return false;

    // El último carácter es el dígito verificador
    const dv = rut.slice(-1).toUpperCase();
    const numero = rut.slice(0, -1);

    // Validar que el número sea numérico
    if (!/^\d+$/.test(numero)) return false;

    // Calcular dígito verificador
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
    // Remover formato previo
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    
    // Separar número y dígito verificador
    const dv = rut.slice(-1);
    let numero = rut.slice(0, -1);

    // Agregar puntos cada 3 dígitos
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
      // Limpiar mensajes de error
      const errorElements = form.querySelectorAll('.form-error');
      errorElements.forEach(el => el.textContent = '');
      // Remover clases de error
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

    // Buscar o crear elemento de error
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
};

// Exportar UI (si usas módulos ES6)
// export default UI;