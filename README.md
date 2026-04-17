# GymFitPro

Proyecto de grado en construccion para un gimnasio con:

- frontend web
- backend con Node.js y Express
- base de datos MySQL

## Estructura

```text
Proyecto de gymfitpro/
|-- frontend/
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   `-- routes/
|-- database/
|-- Index.html
|-- Styles.css
`-- app.js
```

## Que significa cada carpeta

- `frontend/`: aqui ira la parte visual de la aplicacion.
- `backend/`: aqui ira la logica del servidor y las rutas de la API.
- `database/`: aqui guardaremos el script SQL para crear las tablas.

## Estado actual

- Tu primera version visual sigue en `Index.html`, `Styles.css` y `app.js`.
- Ya dejamos lista la base del backend para empezar a conectar todo de forma real.

## Orden recomendado de aprendizaje

1. Entender la estructura general del proyecto.
2. Aprender como Express recibe peticiones.
3. Aprender como el backend se conecta a MySQL.
4. Crear las tablas principales.
5. Conectar registro y login con la base de datos.
6. Conectar formularios y reservas.

## Siguiente paso

El siguiente paso recomendado es instalar Node.js y luego ejecutar el backend para probar la ruta:

`GET /api/health`

Despues conectaremos el registro de usuarios a MySQL.
