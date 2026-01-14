# DIPROCHIL - Sistema de Gestión de Rutas de Despacho

Sistema web full-stack para la gestión de rutas de entrega, vehículos, clientes y pedidos de una empresa de logística.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Roles y Permisos](#roles-y-permisos)
- [Desarrollo](#desarrollo)

## ✨ Características

- **Gestión de Usuarios**: Sistema de autenticación con roles (Admin, Planificador, Supervisor, Conductor)
- **Gestión de Clientes**: CRUD de clientes con importación desde Excel
- **Gestión de Vehículos**: Control de flota de vehículos con estados
- **Gestión de Pedidos**: Creación y seguimiento de pedidos/entregas
- **Gestión de Rutas**: Planificación y optimización de rutas de entrega
- **Incidentes**: Reporte de incidentes durante las entregas
- **Importación Excel**: Importación masiva de clientes y rutas desde archivos Excel
- **Exportación de Reportes**: Generación de reportes en formato Excel

## 🚀 Tecnologías

### Backend
- **Node.js** con TypeScript
- **Express.js** - Framework web
- **Prisma** - ORM para MySQL
- **MySQL 8.0** - Base de datos
- **JWT** - Autenticación
- **Zod** - Validación de schemas
- **ExcelJS** - Procesamiento de archivos Excel

### Frontend
- **HTML5/CSS3/JavaScript** - Vanilla (sin frameworks)
- **Fetch API** - Cliente HTTP
- **LocalStorage** - Almacenamiento de tokens

### DevOps
- **Docker Compose** - Orquestación de contenedores

## 📦 Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x
- MySQL 8.0 (o Docker para ejecutarlo)
- Git

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/diprochil.git
cd diprochil
```

### 2. Instalar dependencias del backend

```bash
cd apps/api
npm install
```

### 3. Configurar base de datos

#### Opción A: Usar Docker Compose (recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up -d
```

Esto levantará MySQL en el puerto 3306 con las credenciales del archivo `.env`.

#### Opción B: MySQL local

Asegúrate de tener MySQL 8.0 instalado y ejecutándose, luego crea la base de datos:

```sql
CREATE DATABASE diprochil;
CREATE USER 'diprochil_user'@'localhost' IDENTIFIED BY 'diprochil_pass';
GRANT ALL PRIVILEGES ON diprochil.* TO 'diprochil_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Configurar variables de entorno

```bash
cd apps/api
cp .env.example .env
```

Edita el archivo `.env` y configura tus credenciales:

```env
PORT=3000
DATABASE_URL="mysql://diprochil_user:diprochil_pass@localhost:3306/diprochil"
SHADOW_DATABASE_URL="mysql://diprochil_user:diprochil_pass@localhost:3306/diprochil_shadow"

# Genera un JWT_SECRET fuerte con:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="tu_secret_muy_fuerte_y_aleatorio"

# Credenciales del administrador inicial
ADMIN_EMAIL="admin@diprochil.cl"
ADMIN_PASSWORD="TuContraseñaSegura123!"
ADMIN_NAME="Administrador"
```

### 5. Ejecutar migraciones de Prisma

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

### 6. Poblar la base de datos (seed)

```bash
npm run seed
```

Esto creará el usuario administrador con las credenciales del `.env`.

## 🎯 Uso

### Iniciar el servidor backend

```bash
cd apps/api
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### Abrir el frontend

Abre el archivo `web/index.html` en tu navegador, o usa un servidor estático:

```bash
# Opción 1: Usando Python
cd web
python -m http.server 8080

# Opción 2: Usando Node.js (npx http-server)
npx http-server web -p 8080

# Opción 3: Usando VS Code Live Server
# Haz clic derecho en index.html > "Open with Live Server"
```

Luego ve a `http://localhost:8080`

### Credenciales de acceso por defecto

- **Email**: admin@diprochil.cl
- **Contraseña**: (la que configuraste en `.env`)

## 📁 Estructura del Proyecto

```
diprochil/
├── apps/
│   └── api/                      # Backend API
│       ├── src/
│       │   ├── server.ts         # Punto de entrada
│       │   ├── seed.ts           # Script de seeding
│       │   ├── lib/              # Utilidades (Prisma client)
│       │   ├── middlewares/      # Auth, roles, errores
│       │   ├── types/            # Definiciones de tipos TypeScript
│       │   └── modules/          # Módulos de la aplicación
│       │       ├── auth/         # Autenticación y login
│       │       ├── users/        # Gestión de usuarios
│       │       ├── clients/      # Gestión de clientes
│       │       ├── vehicles/     # Gestión de vehículos
│       │       ├── pedidos/      # Gestión de pedidos
│       │       ├── routes/       # Gestión de rutas
│       │       ├── incidents/    # Gestión de incidentes
│       │       └── exports/      # Exportación de reportes
│       ├── prisma/
│       │   ├── schema.prisma     # Schema de base de datos
│       │   └── migrations/       # Migraciones
│       ├── .env                  # Variables de entorno (no commitear)
│       ├── .env.example          # Ejemplo de variables de entorno
│       ├── tsconfig.json         # Configuración TypeScript
│       └── package.json
├── web/                          # Frontend
│   ├── index.html               # Página de login
│   ├── dashboard.html           # Dashboard principal
│   ├── js/                      # Scripts JavaScript
│   │   ├── config.js           # Configuración de la app
│   │   ├── api.js              # Cliente HTTP
│   │   ├── auth.js             # Lógica de autenticación
│   │   └── [módulos].js        # Lógica de cada módulo
│   └── css/                     # Estilos
│       ├── reset.css
│       ├── variables.css
│       ├── layout.css
│       ├── components.css
│       └── responsive.css
├── compose.yaml                 # Docker Compose (MySQL)
├── .gitignore
└── README.md
```

## 🔗 API Endpoints

### Autenticación
- `POST /auth/login` - Login de usuario
- `GET /auth/me` - Obtener usuario actual (requiere token)

### Usuarios (requiere rol ADMIN)
- `GET /users` - Listar usuarios
- `GET /users/:id` - Obtener usuario por ID
- `POST /users` - Crear usuario
- `PATCH /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Eliminar usuario

### Clientes
- `GET /clients` - Listar clientes
- `GET /clients/:id` - Obtener cliente por ID
- `POST /clients` - Crear cliente
- `PATCH /clients/:id` - Actualizar cliente
- `POST /clients/import` - Importar clientes desde Excel

### Vehículos
- `GET /vehicles` - Listar vehículos
- `GET /vehicles/:id` - Obtener vehículo por ID
- `POST /vehicles` - Crear vehículo
- `PATCH /vehicles/:id` - Actualizar vehículo

### Pedidos
- `GET /pedidos` - Listar pedidos
- `GET /pedidos/:id` - Obtener pedido por ID
- `POST /pedidos` - Crear pedido
- `PATCH /pedidos/:id` - Actualizar pedido

### Rutas
- `GET /routes` - Listar rutas
- `GET /routes/:id` - Obtener ruta por ID
- `POST /routes` - Crear ruta
- `POST /routes/:id/stops` - Agregar parada a ruta
- `PATCH /routes/:id/stops/:stopId` - Actualizar parada
- `DELETE /routes/:id/stops/:stopId` - Eliminar parada
- `POST /routes/optimize` - Optimizar ruta
- `POST /routes/import` - Importar rutas desde Excel

### Incidentes
- `GET /incidents` - Listar incidentes
- `POST /incidents` - Crear incidente

### Exportar
- `GET /exports/routes` - Exportar rutas a Excel
- `GET /exports/clients` - Exportar clientes a Excel

## 👥 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **ADMIN** | Acceso completo a todo el sistema |
| **PLANIFICADOR** | Crear/editar rutas, clientes, vehículos, pedidos |
| **SUPERVISOR** | Ver y gestionar rutas, marcar incidentes |
| **CONDUCTOR** | Ver sus rutas asignadas, actualizar estado de paradas, reportar incidentes |

## 🛠️ Desarrollo

### Scripts disponibles

```bash
# Backend
cd apps/api
npm run dev          # Ejecutar en modo desarrollo
npm run build        # Compilar TypeScript
npm start            # Ejecutar compilado
npm run seed         # Poblar base de datos

# Prisma
npx prisma studio    # Abrir Prisma Studio (GUI para DB)
npx prisma migrate dev --name nombre_migracion  # Crear migración
npx prisma generate  # Generar Prisma Client
```

### Ejecutar tests (próximamente)

```bash
npm test
```

### Convenciones de código

- **TypeScript**: Strict mode habilitado
- **Linting**: ESLint (próximamente)
- **Formatting**: Prettier (próximamente)
- **Commits**: Conventional Commits

## 🔒 Seguridad

- Las contraseñas se hashean con bcrypt (10 rounds)
- Autenticación basada en JWT con expiración
- Control de acceso basado en roles (RBAC)
- Validación de inputs con Zod
- Headers de seguridad con Helmet
- CORS configurado

**IMPORTANTE**:
- Nunca commitees el archivo `.env`
- Usa un `JWT_SECRET` fuerte en producción
- Cambia las credenciales por defecto

## 📝 Licencia

Este proyecto es privado y pertenece a DIPROCHIL.

## 👨‍💻 Autor

Felipe Hernández - Proyecto de Título 2025

## 🐛 Reporte de Bugs

Si encuentras un bug, por favor abre un issue en el repositorio.

---

**Nota**: Este README asume un entorno de desarrollo local. Para instrucciones de deployment en producción, consulta la documentación de deployment (próximamente).
