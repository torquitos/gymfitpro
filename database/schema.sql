CREATE DATABASE IF NOT EXISTS gymfitpro_db;
USE gymfitpro_db;

CREATE TABLE IF NOT EXISTS planes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  descripcion TEXT,
  duracion_meses INT NOT NULL DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(30),
  rol ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
  plan_id INT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES planes(id)
);

CREATE TABLE IF NOT EXISTS entrenadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  especialidad VARCHAR(120) NOT NULL,
  experiencia_anios INT NOT NULL DEFAULT 0,
  descripcion TEXT,
  horario_base VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clase_nombre VARCHAR(100) NOT NULL,
  dia_semana VARCHAR(20) NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  nivel VARCHAR(50),
  entrenador_id INT,
  cupos INT NOT NULL DEFAULT 20,
  FOREIGN KEY (entrenador_id) REFERENCES entrenadores(id)
);

CREATE TABLE IF NOT EXISTS reservas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  horario_id INT NOT NULL,
  fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('activa', 'cancelada', 'asistio') NOT NULL DEFAULT 'activa',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (horario_id) REFERENCES horarios(id)
);

CREATE TABLE IF NOT EXISTS mensajes_contacto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL,
  mensaje TEXT NOT NULL,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atendido BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO planes (nombre, precio, descripcion, duracion_meses)
SELECT 'Basico', 49900, 'Acceso a sala de pesas de lunes a viernes', 1
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'Basico');

INSERT INTO planes (nombre, precio, descripcion, duracion_meses)
SELECT 'Pro', 79900, 'Incluye clases grupales y una sesion con coach', 1
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'Pro');

INSERT INTO planes (nombre, precio, descripcion, duracion_meses)
SELECT 'Elite', 119900, 'Incluye coach personalizado, nutricion y zona humeda', 1
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'Elite');

INSERT INTO usuarios (nombre_completo, email, password_hash, rol, plan_id)
SELECT 'Administrador GymFitPro', 'admin@gymfitpro.co',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  (SELECT id FROM planes WHERE nombre = 'Elite' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'admin@gymfitpro.co'
);

INSERT INTO entrenadores (nombre, especialidad, experiencia_anios, descripcion, horario_base)
SELECT 'Laura Mejia', 'Yoga', 8, 'Especialista en yoga y mindfulness', 'Lunes, Miercoles y Viernes'
WHERE NOT EXISTS (SELECT 1 FROM entrenadores WHERE nombre = 'Laura Mejia');

INSERT INTO entrenadores (nombre, especialidad, experiencia_anios, descripcion, horario_base)
SELECT 'Carlos Rios', 'Spinning', 6, 'Coach de cardio y spinning', 'Martes, Jueves y Sabado'
WHERE NOT EXISTS (SELECT 1 FROM entrenadores WHERE nombre = 'Carlos Rios');

INSERT INTO entrenadores (nombre, especialidad, experiencia_anios, descripcion, horario_base)
SELECT 'Andres Perez', 'Boxeo', 10, 'Entrenador de boxeo y fuerza', 'Miercoles y Viernes'
WHERE NOT EXISTS (SELECT 1 FROM entrenadores WHERE nombre = 'Andres Perez');

INSERT INTO entrenadores (nombre, especialidad, experiencia_anios, descripcion, horario_base)
SELECT 'Maria Garcia', 'Funcional', 5, 'Coach funcional y asesora en nutricion', 'Lunes a Viernes'
WHERE NOT EXISTS (SELECT 1 FROM entrenadores WHERE nombre = 'Maria Garcia');

INSERT INTO horarios (clase_nombre, dia_semana, hora_inicio, hora_fin, nivel, entrenador_id, cupos)
SELECT 'Yoga', 'Lunes', '07:00:00', '08:00:00', 'Todos',
  (SELECT id FROM entrenadores WHERE nombre = 'Laura Mejia' LIMIT 1),
  20
WHERE NOT EXISTS (
  SELECT 1 FROM horarios WHERE clase_nombre = 'Yoga' AND dia_semana = 'Lunes' AND hora_inicio = '07:00:00'
);

INSERT INTO horarios (clase_nombre, dia_semana, hora_inicio, hora_fin, nivel, entrenador_id, cupos)
SELECT 'Spinning', 'Martes', '06:30:00', '07:30:00', 'Intermedio',
  (SELECT id FROM entrenadores WHERE nombre = 'Carlos Rios' LIMIT 1),
  18
WHERE NOT EXISTS (
  SELECT 1 FROM horarios WHERE clase_nombre = 'Spinning' AND dia_semana = 'Martes' AND hora_inicio = '06:30:00'
);

INSERT INTO horarios (clase_nombre, dia_semana, hora_inicio, hora_fin, nivel, entrenador_id, cupos)
SELECT 'Boxeo', 'Miercoles', '17:00:00', '18:00:00', 'Avanzado',
  (SELECT id FROM entrenadores WHERE nombre = 'Andres Perez' LIMIT 1),
  15
WHERE NOT EXISTS (
  SELECT 1 FROM horarios WHERE clase_nombre = 'Boxeo' AND dia_semana = 'Miercoles' AND hora_inicio = '17:00:00'
);

INSERT INTO horarios (clase_nombre, dia_semana, hora_inicio, hora_fin, nivel, entrenador_id, cupos)
SELECT 'Funcional', 'Jueves', '18:00:00', '19:00:00', 'Todos',
  (SELECT id FROM entrenadores WHERE nombre = 'Maria Garcia' LIMIT 1),
  25
WHERE NOT EXISTS (
  SELECT 1 FROM horarios WHERE clase_nombre = 'Funcional' AND dia_semana = 'Jueves' AND hora_inicio = '18:00:00'
);
