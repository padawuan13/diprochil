DIPROCHIL - Sistema de Gestión de Rutas de Despacho

Bienvenido a DIPROCHIL, un sistema web integral diseñado para optimizar la gestión de rutas de entrega en empresas de logística. Con nuestra plataforma, podrás administrar vehículos, clientes y pedidos de manera eficiente.

📋 Tabla de Contenidos
Características
Tecnologías
Requisitos previos
Instalación
Configuración
Uso
Estructura del Proyecto
Puntos de acceso API
Roles y Permisos
Desarrollo
✨ Características
Gestión de Usuarios: Administra usuarios con un sistema de roles que incluye Administrador, Planificador, Supervisor y Conductor.
Gestión de Clientes: Crea, lee, actualiza y elimina información de clientes, con opción de importar datos desde Excel.
Gestión de Vehículos: Monitorea el estado de tu flota de vehículos.
Gestión de Pedidos: Crea y realiza seguimiento de pedidos y entregas.
Gestión de Rutas: Planifica y optimiza rutas de entrega para mejorar la eficiencia.
Incidentes: Reporta cualquier incidente que ocurra durante las entregas.
Importación desde Excel: Facilita la carga masiva de datos de clientes y rutas desde archivos Excel.
Exportación de Informes: Genera informes en formato Excel para un análisis más detallado.
🚀 Tecnologías
Backend
Node.js con TypeScript
Express.js - Framework web
Prisma - ORM para MySQL
MySQL 8.0 - Base de datos
JWT - Autenticación
Zod - Validación de esquemas
ExcelJS - Procesamiento de archivos Excel
Frontend
HTML5/CSS3/JavaScript - Sin frameworks (Vanilla)
Fetch API - Cliente HTTP
LocalStorage - Almacenamiento de tokens
DevOps
Docker Compose - Orquestación de contenedores
📦 Requisitos previos
Asegúrate de tener instalados los siguientes programas:

Node.js >= 18.x
npm >= 9.x
MySQL 8.0 (o usar Docker para ejecutarlo)
Git
🔧 Instalación
1. Clonar el repositorio
git clone https://github.com/your-username/diprochil.git
cd diprochil
2. Instalar dependencias del backend
cd apps/api
npm install
3. Configurar la base de datos
Opción A: Usar Docker Compose (recomendado)
# Desde la raíz del proyecto
docker-compose up -d
Esto iniciará MySQL en el puerto 3306 utilizando las credenciales que definiste en el archivo .env.

Opción B: MySQL local
Si decides no usar Docker, asegúrate de tener MySQL 8.0 instalado y en funcionamiento. Luego, crea la base de datos ejecutando:

CREATE DATABASE diprochil;
CREATE USER 'diprochil_user'@'localhost' IDENTIFIED BY 'diprochil_pass';
GRANT ALL PRIVILEGES ON diprochil.* TO 'diprochil_user'@'localhost';
FLUSH PRIVILEGES;
4. Establecer variables de entorno
cd apps/api
cp .env.example .env
Edita el archivo .env para configurar las credenciales necesarias:

PORT=3000
DATABASE_URL="mysql://diprochil_user:diprochil_pass@localhost:3306/diprochil"
SHADOW_DATABASE_URL="mysql://diprochil_user:diprochil_pass@localhost:3306/diprochil_shadow"
# Genera un JWT_SECRET fuerte con:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="your_very_strong_and_random_secret"
# Credenciales iniciales del administrador
ADMIN_EMAIL="admin@diprochil.cl"
ADMIN_PASSWORD="YourSecurePassword123!"
ADMIN_NAME="Administrador"
5. Ejecutar migraciones de Prisma
cd apps/api
npx prisma migrate dev
npx prisma generate
6. Poblar la base de datos
npm run seed
Esto creará el usuario administrador utilizando las credenciales definidas en el archivo .env.

🎯 Uso
Iniciar el servidor backend
cd apps/api
npm run dev
El servidor estará disponible en http://localhost:3000.

Abrir el frontend
Para acceder a la interfaz web, abre el archivo web/index.html en tu navegador, o utiliza un servidor estático:

# Opción 1: Usando Python
cd web
python -m http.server 8080

# Opción 2: Usando Node.js (npx http-server)
npx http-server web -p 8080

# Opción 3: Usando VS Code Live Server
# Haz clic derecho en index.html > "Open with Live Server"
Luego, dirígete a http://localhost:8080.

Credenciales de acceso predeterminadas
Email: admin@diprochil.cl
Contraseña: (la configurada en .env)
📁 Estructura del Proyecto
diprochil/
├── apps/
│   └── api/                      # API Backend
│       ├── src/
│       │   ├── server.ts         # Punto de entrada
│       │   ├── seed.ts           # Script de poblamiento
│       │   ├── lib/              # Utilidades (cliente Prisma)
│       │   ├── middlewares/      # Autenticación, roles, errores
│       │   ├── types/            # Definiciones de tipos TypeScript
│       │   └── modules/          # Módulos de la aplicación
│       │       ├── auth/         # Autenticación e inicio de sesión
│       │       ├── users/        # Gestión de usuarios
│       │       ├── clients/      # Gestión de clientes
│       │       ├── vehicles/     # Gestión de vehículos
│       │       ├── orders/       # Gestión de pedidos
│       │       ├── routes/       # Gestión de rutas
│       │       ├── incidents/    # Gestión de incidentes
│       │       └── exports/      # Exportación de reportes
│       ├── prisma/
│       │   ├── schema.prisma     # Esquema de base de datos
│       │   └── migrations/       # Migraciones
│       ├── .env                  # Variables de entorno (no comprometer)
│       ├── .env.example          # Ejemplo de variables de entorno
│       ├── tsconfig.json         # Configuración de TypeScript
│       └── package.json
├── web/                          # Frontend
│   ├── index.html               # Página de inicio de sesión
│   ├── dashboard.html           # Panel principal
│   ├── js/                      # Scripts de JavaScript
│   │   ├── config.js            # Configuración de la aplicación
│   │   ├── api.js               # Cliente HTTP
│   │   ├── auth.js              # Lógica de autenticación
│   │   └── [modules].js         # Lógica para cada módulo
│   └── css/                     # Estilos
│       ├── reset.css
│       ├── variables.css
│       ├── layout.css
│       ├── components.css
│       └── responsive.css
├── compose.yaml                 # Docker Compose (MySQL)
├── .gitignore
└── README.md
🔗 Puntos de Extensión de la API
Autenticación
POST /auth/login: Inicia sesión como usuario.
GET /auth/me: Obtiene la información del usuario actual (requiere token).
Usuarios (requiere rol ADMIN)
GET /users: Lista todos los usuarios.
GET /users/:id: Obtiene un usuario por su ID.
POST /users: Crea un nuevo usuario.
PATCH /users/:id: Actualiza la información de un usuario.
DELETE /users/:id: Elimina un usuario.
Clientes
GET /clients: Lista todos los clientes.
GET /clients/:id: Obtiene un cliente por su ID.
POST /clients: Crea un nuevo cliente.
PATCH /clients/:id: Actualiza la información de un cliente.
POST /clients/import: Importa clientes desde un archivo Excel.
Vehículos
GET /vehicles: Lista todos los vehículos.
GET /vehicles/:id: Obtiene un vehículo por su ID.
POST /vehicles: Crea un nuevo vehículo.
PATCH /vehicles/:id: Actualiza la información de un vehículo.
Pedidos
GET /orders: Lista todos los pedidos.
GET /orders/:id: Obtiene un pedido por su ID.
POST /orders: Crea un nuevo pedido.
PATCH /orders/:id: Actualiza la información de un pedido.
Rutas
GET /routes: Lista todas las rutas.
GET /routes/:id: Obtiene una ruta por su ID.
POST /routes: Crea una nueva ruta.
POST /routes/:id/stops: Añade una parada a la ruta.
PATCH /routes/:id/stops/:stopId: Actualiza una parada.
DELETE /routes/:id/stops/:stopId: Elimina una parada.
POST /routes/optimize: Optimiza la ruta.
POST /routes/import: Importa rutas desde un archivo Excel.
Incidentes
GET /incidents: Lista todos los incidentes.
POST /incidents: Crea un nuevo incidente.
Exportación
GET /exports/routes: Exporta rutas a un archivo Excel.
GET /exports/clients: Exporta clientes a un archivo Excel.
👥 Roles y Permisos
Rol	Permisos
ADMIN	Acceso completo a todo el sistema
PLANNER	Crear y editar rutas, clientes, vehículos y pedidos
SUPERVISOR	Ver y gestionar rutas, así como reportar incidentes
DRIVER	Ver rutas asignadas, actualizar el estado de paradas y reportar incidentes
🛠️ Desarrollo
Scripts Disponibles
# Backend
cd apps/api
npm run dev          # Ejecutar en modo desarrollo
npm run build        # Compilar TypeScript
npm start            # Ejecutar la versión compilada
npm run seed         # Poblar la base de datos

# Prisma
npx prisma studio    # Abrir Prisma Studio (interfaz gráfica de la base de datos)
npx prisma migrate dev --name migration_name  # Crear migración
npx prisma generate  # Generar el cliente de Prisma
Ejecutar Pruebas (próximamente)
npm test
Convenciones de Código
TypeScript: Modo estricto habilitado
Linting: ESLint (próximamente)
Formateo: Prettier (próximamente)
Commits: Convenciones de commits
🔒 Seguridad
Las contraseñas se cifran utilizando bcrypt (10 rondas)
Autenticación basada en JWT con expiración
Control de acceso basado en roles (RBAC)
Validación de entrada con Zod
Encabezados de seguridad configurados con Helmet
CORS habilitado
IMPORTANTE:

No comprometas el archivo .env
Utiliza un JWT_SECRET robusto en producción
Cambia las credenciales predeterminadas
📝 Licencia
Este proyecto es privado y pertenece a DIPROCHIL.

👨‍💻 Autor
Felipe Hernández - Proyecto de Tesis 2025

🐛 Reporte de Errores
Si encuentras algún error, por favor abre un issue en el repositorio.

Nota: Este README está diseñado para un entorno de desarrollo local. Para obtener instrucciones sobre el despliegue en producción, consulta la documentación correspondiente (próximamente).