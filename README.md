# GymFitPro

Sistema web para la gestion de un gimnasio, desarrollado como proyecto de grado.  
Incluye sitio publico, autenticacion de usuarios, reservas de clases, panel de usuario y panel de administracion.

## Descripcion

GymFitPro busca centralizar procesos comunes de un gimnasio en una sola plataforma:

- registro e inicio de sesion de clientes
- visualizacion de planes, horarios y entrenadores
- reservas y cancelacion de clases
- envio de mensajes de contacto
- administracion de usuarios, horarios, entrenadores y planes

El proyecto esta construido con una arquitectura sencilla de tres capas:

- frontend en `HTML`, `CSS` y `JavaScript`
- backend en `Node.js` con `Express`
- base de datos relacional en `MySQL`

## Modulos principales

- Sitio publico con informacion del gimnasio
- Registro e inicio de sesion
- Gestion de planes desde base de datos
- Horarios dinamicos conectados al backend
- Reservas de clases por usuario
- Panel de usuario con perfil y reservas
- Panel de administracion con gestion de:
  - horarios
  - entrenadores
  - planes
  - usuarios

## Tecnologias utilizadas

### Frontend

- HTML5
- CSS3
- JavaScript ES6+
- Fetch API

### Backend

- Node.js
- Express
- mysql2
- cors
- dotenv

### Base de datos

- MySQL 8

## Estructura del proyecto

```text
Proyecto de gymfitpro/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── .env
├── database/
│   └── schema.sql
├── frontend/
├── admin.html
├── admin.js
├── app.js
├── Index.html
├── Styles.css
└── README.md
```

## Modelo de datos

La base de datos principal se compone de estas tablas:

- `planes`
- `usuarios`
- `entrenadores`
- `horarios`
- `reservas`
- `mensajes_contacto`

Relaciones principales:

- un usuario puede tener un plan
- un horario puede tener un entrenador asignado
- una reserva relaciona un usuario con un horario

## API del proyecto

La API se expone en:

```text
http://localhost:3000/api
```

Rutas principales disponibles:

- autenticacion de usuarios
- consulta de horarios
- consulta de planes
- reservas y cancelacion de reservas
- contacto
- panel administrativo

Nota:
La documentacion tecnica detallada de endpoints puede mantenerse dentro del backend o migrarse luego a Swagger si el proyecto lo requiere.

## Requisitos

- Node.js LTS
- MySQL 8 o superior
- Visual Studio Code
- Live Server o un navegador para abrir el frontend

## Instalacion y ejecucion

### 1. Clonar el repositorio

```bash
git clone https://github.com/torquitos/gymfitpro.git
cd gymfitpro
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` dentro de `backend/` con este contenido:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=gymfitpro_db
```

### 4. Crear la base de datos

Ejecuta el archivo:

```text
database/schema.sql
```

Ese script crea:

- la base de datos `gymfitpro_db`
- las tablas principales
- datos iniciales de planes, entrenadores, horarios y un usuario administrador de prueba

### 5. Iniciar el backend

Desde la carpeta `backend/`:

```bash
npm run dev
```

o en produccion:

```bash
npm start
```

### 6. Verificar la API

Abre en el navegador:

```text
http://localhost:3000/api/health
```

Si todo esta bien, el backend respondera correctamente.

### 7. Abrir el frontend

Abre `Index.html` con Live Server o desde tu navegador.

Para el panel administrador:

```text
admin.html
```

## Acceso administrador de prueba

El proyecto incluye un administrador de prueba creado por `schema.sql`:

- correo: `admin@gymfitpro.co`
- contrasena: `admin123`

## Estado actual del proyecto

El sistema ya cuenta con una base funcional completa para demostracion academica:

- autenticacion real con base de datos
- reservas funcionales
- cancelacion de reservas
- panel de usuario
- panel de administracion
- gestion de horarios, entrenadores y planes

## Mejoras futuras

- documentacion formal de la API con Swagger
- panel de entrenador
- reportes y estadisticas
- notificaciones por correo
- despliegue en hosting
- mejoras de seguridad y control de sesiones

## Repositorio

Codigo fuente:

[https://github.com/torquitos/gymfitpro](https://github.com/torquitos/gymfitpro)

## Autor

- Walter Ramirez
- Proyecto de grado
- SENA

