# DIPROCHIL – Sistema de Gestión y Optimización de Rutas de Despacho

Sistema web para apoyar la planificación, ejecución y trazabilidad de las rutas de despacho de Distribuidora Chiloé (DIPROCHIL).  

Permite administrar clientes, pedidos, vehículos, rutas e incidencias, entregando visibilidad en tiempo real de la operación y una interfaz responsiva que se adapta tanto a escritorio como a dispositivos móviles.

---

## 1. Alcance del proyecto

Este repositorio contiene:

- **API REST** desarrollada con **Node.js + Express + TypeScript**.
- **Capa de datos** implementada con **Prisma ORM** sobre **MySQL 8**.
- **Frontend web responsivo** (HTML, CSS y JavaScript) servido de forma estática por la misma API:
  - Vista de escritorio para roles administrativos.
  - Vista móvil optimizada para conductores.

El sistema está diseñado bajo una **arquitectura en tres capas**:

1. **Presentación**  
   - Páginas HTML en `apps/api/public` (login, dashboard, clientes, pedidos, rutas, vehículos, incidencias y usuarios).  
   - Diseño responsive, compatible con navegadores de escritorio y móviles.  
   - Uso de **Leaflet** para el mapa de clientes en Chiloé.

2. **Lógica de negocio / API**  
   - Endpoints REST agrupados por módulos: autenticación, usuarios, clientes, vehículos, pedidos, rutas, paradas e incidencias.  
   - Validación de datos, manejo de errores centralizado y logging de peticiones.

3. **Datos**  
   - Modelo relacional normalizado (1FN, 2FN y 3FN) con las tablas principales:
     - `usuario`, `cliente`, `vehiculo`, `pedido`, `ruta`, `parada_ruta`, `incidencia`.
   - Migraciones gestionadas por Prisma.

---

## 2. Funcionalidades principales

### 2.1 Módulo de autenticación y usuarios

- Inicio de sesión con correo/usuario y contraseña.
- Gestión de sesiones mediante **JWT**.
- Roles de usuario:
  - **Administrador**
  - **Planificador**
  - **Supervisor**
  - **Conductor**
- CRUD de usuarios desde la interfaz web (alta, edición, cambio de contraseña y desactivación).

### 2.2 Gestión de clientes

- Importación y administración de clientes de Chiloé.
- Listado con filtros y buscador.
- Mapa interactivo con ubicación de clientes (Leaflet + OpenStreetMap).
- Indicadores rápidos: total de clientes, con/sin geolocalización.
- CRUD de clientes (crear, editar, desactivar).

### 2.3 Gestión de pedidos

- Registro de pedidos con:
  - Cliente, fechas de solicitud y compromiso.
  - Volumen estimado.
  - Estado del pedido (pendiente, en ruta, entregado, cancelado).
- Filtros por estado y buscador.
- Asociación de pedidos a rutas de despacho.

### 2.4 Gestión de rutas

- Creación de rutas por día, zona y vehículo.
- Asignación de conductor y vehículo.
- Visualización de rutas recientes y estados:
  - Programada, en curso, finalizada, cancelada.
- Exportación de rutas a Excel (para apoyo operativo).

### 2.5 Gestión de vehículos

- Registro de vehículos con:
  - Patente, tipo, capacidad de carga, estado y observaciones.
- Filtros por estado.
- CRUD completo de vehículos.

### 2.6 Gestión de incidencias

- Registro de incidencias asociadas a ruta y pedido:
  - Tipo (cliente cerrado, rechazo, dirección incorrecta, etc.).
  - Descripción, fecha y severidad.
  - Estado de tratamiento (abierta, en revisión, resuelta, cerrada).
- Vista de incidencias abiertas con acciones rápidas para tomar y cerrar.

### 2.7 Interfaz responsive y vista para conductores

- Las mismas pantallas se adaptan a **dispositivos móviles**:
  - Menú lateral colapsable tipo “hamburguesa”.
  - Dashboard simplificado para conducción.
  - Formularios y tablas adaptados al alto de pantalla y a interacción táctil.

---

## 3. Tecnologías utilizadas

**Backend / API**

- Node.js 20+
- Express
- TypeScript
- Prisma ORM
- MySQL 8
- JSON Web Tokens (JWT)
- bcrypt para hash de contraseñas
- Zod para validación de datos
- Helmet, CORS y Morgan para seguridad y logging

**Frontend**

- HTML5, CSS3, JavaScript
- Layout responsive (flexbox / grid)
- Leaflet + OpenStreetMap para mapas
- Íconos y estilos personalizados

**Infraestructura y herramientas**

- Docker + Docker Compose (servicio `db` con MySQL 8)
- npm como gestor de paquetes
- Scripts de smoke test básicos sobre la API (PowerShell)

---

## 4. Estructura del repositorio

```text
diprochil-main/
├── README.md                # Este archivo
├── compose.yaml             # Servicio Docker de MySQL
└── apps/
    └── api/
        ├── package.json     # Dependencias y scripts de la API
        ├── .env.example     # Ejemplo de configuración de entorno
        ├── prisma/
        │   └── schema.prisma   # Modelo de datos y migraciones
        ├── public/          # Frontend estático (HTML, CSS, JS)
        │   ├── index.html      # Login
        │   ├── dashboard.html  # Panel principal
        │   ├── clientes.html   # Gestión de clientes + mapa
        │   ├── pedidos.html    # Gestión de pedidos
        │   ├── rutas.html      # Gestión de rutas
        │   ├── vehiculos.html  # Gestión de vehículos
        │   ├── incidencias.html# Gestión de incidencias
        │   └── usuarios.html   # Gestión de usuarios
        ├── src/
        │   ├── server.ts       # Bootstrap de Express y archivos estáticos
        │   ├── routes/         # Rutas agrupadas por módulo (/api/...)
        │   ├── middlewares/    # Auth, roles, manejo de errores, etc.
        │   ├── modules/        # Controladores y servicios de cada módulo
        │   └── seed.ts         # Carga de datos iniciales
        └── tsconfig.json
