/* ========================================
   CONFIG.JS - Configuración de la aplicación
   ======================================== */

function resolveApiUrl() {
  const envUrl = window.ENV?.API_URL;
  if (envUrl) return envUrl;

  const { protocol, hostname, port, origin } = window.location;

  if (protocol === "file:") return "http://localhost:3000";

  if (port && port !== "3000") {
    return `${protocol}//${hostname}:3000`;
  }

  return origin;
}

const CONFIG = {
  API_URL: resolveApiUrl(),

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

  STORAGE_KEYS: {
    TOKEN: 'diprochil_token',
    USER: 'diprochil_user',
    REMEMBER: 'diprochil_remember',
  },

  ROLES: {
    ADMIN: 'ADMIN',
    PLANIFICADOR: 'PLANIFICADOR',
    SUPERVISOR: 'SUPERVISOR',
    CONDUCTOR: 'CONDUCTOR',
  },

  PEDIDO_ESTADOS: {
    PENDIENTE: 'PENDIENTE',
    ENTREGADO: 'ENTREGADO',
    NO_ENTREGADO: 'NO_ENTREGADO',
  },

  RUTA_ESTADOS: {
    PROGRAMADA: 'PROGRAMADA',
    EN_CURSO: 'EN_CURSO',
    FINALIZADA: 'FINALIZADA',
    CANCELADA: 'CANCELADA',
  },

  PARADA_ESTADOS: {
    PENDIENTE: 'PENDIENTE',
    EN_CURSO: 'EN_CURSO',
    COMPLETADA: 'COMPLETADA',
    NO_ENTREGADA: 'NO_ENTREGADA',
  },

  VEHICULO_ESTADOS: {
    ACTIVO: 'ACTIVO',
    INACTIVO: 'INACTIVO',
    MANTENCION: 'MANTENCION',
  },

  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 200,
    OPTIONS: [10, 20, 50, 100, 200],
  },

  ERROR_MESSAGES: {
    NETWORK: 'Error de conexión. Verifica tu internet.',
    UNAUTHORIZED: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
    FORBIDDEN: 'No tienes permisos para realizar esta acción.',
    NOT_FOUND: 'Recurso no encontrado.',
    SERVER_ERROR: 'Error del servidor. Intenta nuevamente.',
    VALIDATION: 'Por favor, revisa los campos del formulario.',
  },

  BADGE_COLORS: {
    PENDIENTE: 'warning',
    ENTREGADO: 'success',
    NO_ENTREGADO: 'danger',
    PROGRAMADA: 'primary',
    EN_CURSO: 'warning',
    FINALIZADA: 'success',
    CANCELADA: 'danger',
    ACTIVO: 'success',
    INACTIVO: 'gray',
    MANTENCION: 'warning',
  },
};