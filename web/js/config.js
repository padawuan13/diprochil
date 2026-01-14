/* ========================================
   CONFIG.JS - Configuración de la aplicación
   ======================================== */

const CONFIG = {
  // URL del API - detecta automáticamente el entorno
  // En desarrollo: usa localhost:3000
  // En producción: usa la variable de entorno API_URL o la misma URL del frontend
  API_URL: window.ENV?.API_URL || (window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin),
  
  // Endpoints principales
  ENDPOINTS: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    USERS: '/users',
    CLIENTS: '/clients',
    VEHICLES: '/vehicles',
    PEDIDOS: '/pedidos',
    ROUTES: '/routes',
    INCIDENTS: '/incidents',
  },

  // Claves de localStorage
  STORAGE_KEYS: {
    TOKEN: 'diprochil_token',
    USER: 'diprochil_user',
  },

  // Roles de usuario
  ROLES: {
    ADMIN: 'ADMIN',
    PLANIFICADOR: 'PLANIFICADOR',
    SUPERVISOR: 'SUPERVISOR',
    CONDUCTOR: 'CONDUCTOR',
  },

  // Estados de pedidos
  PEDIDO_ESTADOS: {
    PENDIENTE: 'PENDIENTE',
    ENTREGADO: 'ENTREGADO',
    NO_ENTREGADO: 'NO_ENTREGADO',
  },

  // Estados de rutas
  RUTA_ESTADOS: {
    PROGRAMADA: 'PROGRAMADA',
    EN_CURSO: 'EN_CURSO',
    FINALIZADA: 'FINALIZADA',
    CANCELADA: 'CANCELADA',
  },

  // Estados de paradas
  PARADA_ESTADOS: {
    PENDIENTE: 'PENDIENTE',
    EN_CURSO: 'EN_CURSO',
    COMPLETADA: 'COMPLETADA',
    NO_ENTREGADA: 'NO_ENTREGADA',
  },

  // Estados de vehículos
  VEHICULO_ESTADOS: {
    ACTIVO: 'ACTIVO',
    INACTIVO: 'INACTIVO',
    MANTENCION: 'MANTENCION',
  },

  // Configuración de paginación
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 200, // ✅ Aumentado de 100 a 200 para DIPROCHIL
    OPTIONS: [10, 20, 50, 100, 200],
  },

  // Mensajes de error comunes
  ERROR_MESSAGES: {
    NETWORK: 'Error de conexión. Verifica tu internet.',
    UNAUTHORIZED: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
    FORBIDDEN: 'No tienes permisos para realizar esta acción.',
    NOT_FOUND: 'Recurso no encontrado.',
    SERVER_ERROR: 'Error del servidor. Intenta nuevamente.',
    VALIDATION: 'Por favor, revisa los campos del formulario.',
  },

  // Colores para badges según estado
  BADGE_COLORS: {
    // Pedidos
    PENDIENTE: 'warning',
    ENTREGADO: 'success',
    NO_ENTREGADO: 'danger',
    
    // Rutas
    PROGRAMADA: 'primary',
    EN_CURSO: 'warning',
    FINALIZADA: 'success',
    CANCELADA: 'danger',
    
    // Vehículos
    ACTIVO: 'success',
    INACTIVO: 'gray',
    MANTENCION: 'warning',
  },
};

// Exportar configuración (si usas módulos ES6)
// export default CONFIG;