# GymFit<span>Pro</span> 🏋️

> Sistema web fullstack para la gestión integral de gimnasios.  
> Proyecto de Grado — Tecnología en Desarrollo de Software · Armenia, Quindío · 2025

---

## 📌 ¿Qué es GymFitPro?

GymFitPro es una aplicación web completa que permite a un gimnasio gestionar todos sus procesos desde una sola plataforma: membresías, horarios de clases, entrenadores, reservas de usuarios y mensajes de contacto.

El sistema está dividido en tres capas bien separadas: un **frontend** visual y responsivo, un **backend** con API REST en Node.js, y una **base de datos** MySQL relacional.

---

## ✅ Funcionalidades actuales

| Módulo | Estado |
|---|---|
| Página principal (Hero, Planes, Servicios) | ✅ Listo |
| Tabla de horarios dinámica | ✅ Listo |
| Sección de entrenadores | ✅ Listo |
| Formulario de contacto | ✅ Listo |
| Registro de usuarios | ✅ Listo |
| Inicio y cierre de sesión | ✅ Listo |
| Sistema de reservas de clases | ✅ Listo |
| Sección "Mis Reservas" por usuario | ✅ Listo |
| API REST (auth, horarios, reservas, contacto) | ✅ Listo |
| Base de datos MySQL con 5 tablas | ✅ Listo |
| Panel de administración | 🔧 En desarrollo |
| Diseño responsivo móvil | ✅ Listo |

---

## 🛠️ Tecnologías utilizadas

**Frontend**
- HTML5, CSS3, JavaScript (ES6+)
- Variables CSS, CSS Grid, Flexbox
- Fetch API para comunicación con el backend

**Backend**
- Node.js + Express.js
- mysql2 (conexión a MySQL)
- bcryptjs (hasheo de contraseñas)
- cors + dotenv

**Base de datos**
- MySQL 8.x
- Esquema relacional con 5 tablas y llaves foráneas

---

## 📁 Estructura del proyecto

```
Proyecto de gymfitpro/
│
├── frontend/
│   ├── Index.html         ← Página principal del sitio
│   ├── Styles.css         ← Estilos globales y responsivos
│   ├── app.js             ← Lógica del cliente (fetch, modales, sesión)
│   ├── admin.html         ← Panel de administración (en desarrollo)
│   └── admin.js           ← Lógica del panel admin (en desarrollo)
│
├── backend/
│   ├── src/
│   │   └── routes/        ← Rutas de la API (auth, horarios, reservas, contacto)
│   ├── .env               ← Variables de entorno (NO subir a GitHub)
│   ├── index.js           ← Punto de entrada del servidor
│   └── package.json       ← Dependencias del backend
│
├── database/
│   └── schema.sql         ← Script SQL para crear todas las tablas
│
├── .gitignore
└── README.md
```

---

## 🗄️ Base de datos — Tablas principales

```
usuarios            → id, nombre, email, password, plan, fecha_registro
entrenadores        → id, nombre, especialidad, experiencia_anos, activo
horarios            → id, clase_nombre, dia_semana, hora_inicio, hora_fin, entrenador_id, nivel
reservas            → id, usuario_id, horario_id, fecha_reserva, estado
contacto_mensajes   → id, nombre, email, mensaje, fecha_envio
```

**Relaciones:**
- `horarios.entrenador_id` → `entrenadores.id`
- `reservas.usuario_id` → `usuarios.id`
- `reservas.horario_id` → `horarios.id`

---

## 🌐 API REST — Endpoints

Base URL: `http://localhost:3000/api`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Registrar nuevo usuario |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `GET` | `/api/horarios` | Obtener todos los horarios con entrenador |
| `GET` | `/api/reservas/:usuarioId` | Reservas de un usuario específico |
| `POST` | `/api/reservas` | Crear una nueva reserva |
| `POST` | `/api/contacto` | Guardar mensaje del formulario |

### Ejemplo — Registro exitoso

**Request:**
```json
POST /api/auth/register
{
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "password": "123456",
  "plan": "Pro"
}
```

**Response:**
```json
{
  "message": "Usuario registrado correctamente",
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "plan": "Pro"
  }
}
```

---

## ⚙️ Instalación y ejecución local

### 1. Requisitos previos
- [Node.js](https://nodejs.org/) (versión LTS)
- MySQL 8.x instalado y corriendo
- Git

### 2. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Proyecto-de-gymfitpro
```

### 3. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 4. Configurar variables de entorno

Crea el archivo `backend/.env` con este contenido:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=gymfitpro
PORT=3000
```

### 5. Crear la base de datos

Abre MySQL y ejecuta:

```bash
mysql -u root -p < database/schema.sql
```

Esto crea la base de datos `gymfitpro` con todas las tablas automáticamente.

### 6. Iniciar el servidor

```bash
cd backend
npm start
```

Verifica que funcione abriendo en el navegador:
```
http://localhost:3000/api/health
```
Debe responder: `{ "status": "OK" }`

### 7. Abrir el frontend

Abre `frontend/Index.html` con **Live Server** desde VS Code, o directamente desde el navegador.

---

## 🔐 Seguridad

- Las contraseñas **nunca se guardan en texto plano**. Se usa `bcryptjs` para hashearlas antes de almacenarlas en MySQL.
- Las variables sensibles (usuario y contraseña de la BD) se guardan en `.env` y ese archivo está en `.gitignore` para no subirse a GitHub.
- La sesión del usuario se guarda en `localStorage` del navegador con los datos básicos (id, nombre, plan).

---

## 🗺️ Hoja de ruta — Próximas versiones

| Versión | Funcionalidad |
|---|---|
| v1.0 | Frontend completo + API REST + Auth + Reservas ← **aquí estamos** |
| v1.1 | Panel admin con CRUD completo de horarios, entrenadores y usuarios |
| v1.2 | Envío de correo de confirmación al reservar (Nodemailer) |
| v1.3 | Dashboard con estadísticas de asistencia y reservas por mes |
| v2.0 | Integración con pasarela de pagos (Wompi / MercadoPago) |
| v2.1 | App móvil complementaria (PWA o React Native) |

---

## 👥 Equipo

| Rol | Nombre |
|---|---|
| Desarrollador fullstack | Walter ramirez |
| Institución | Sena |


---

## 📄 Licencia

Este proyecto fue desarrollado como **trabajo de grado** académico.  
Todos los derechos reservados © 2025 GymFitPro · Armenia, Quindío, Colombia.