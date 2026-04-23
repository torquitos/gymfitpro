const express = require('express');
const crypto = require('crypto');
const { pool, testDatabaseConnection } = require('../config/db');

const router = express.Router();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

router.get('/health', async (req, res) => {
  try {
    await testDatabaseConnection();

    res.json({
      ok: true,
      message: 'Backend y base de datos listos para trabajar'
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'No se pudo conectar a la base de datos',
      error: error.message
    });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const { nombre, email, password, plan } = req.body;

    if (!nombre || !email || !password || !plan) {
      return res.status(400).json({
        ok: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'La contrasena debe tener minimo 6 caracteres'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPlan = plan.trim();
    const normalizedName = nombre.trim();

    const [existingUsers] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Ese correo ya esta registrado'
      });
    }

    const [plans] = await pool.query(
      'SELECT id, nombre FROM planes WHERE nombre = ? LIMIT 1',
      [normalizedPlan]
    );

    if (plans.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'El plan seleccionado no existe'
      });
    }

    const passwordHash = hashPassword(password);

    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, plan_id)
       VALUES (?, ?, ?, ?)`,
      [normalizedName, normalizedEmail, passwordHash, plans[0].id]
    );

    return res.status(201).json({
      ok: true,
      message: 'Usuario registrado correctamente',
      user: {
        id: result.insertId,
        nombre: normalizedName,
        email: normalizedEmail,
        plan: plans[0].nombre
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo registrar el usuario',
      error: error.message
    });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Email y contrasena son obligatorios'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = hashPassword(password);

    const [users] = await pool.query(
      `SELECT u.id, u.nombre_completo, u.email, p.nombre AS plan
       FROM usuarios u
       LEFT JOIN planes p ON p.id = u.plan_id
       WHERE u.email = ? AND u.password_hash = ?
       LIMIT 1`,
      [normalizedEmail, passwordHash]
    );

    if (users.length === 0) {
      return res.status(401).json({
        ok: false,
        message: 'Correo o contrasena incorrectos'
      });
    }

    const user = users[0];

    return res.json({
      ok: true,
      message: 'Inicio de sesion exitoso',
      user: {
        id: user.id,
        nombre: user.nombre_completo,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo iniciar sesion',
      error: error.message
    });
  }
});

router.post('/contacto', async (req, res) => {
  try {
    const { nombre, email, mensaje } = req.body;

    if (!nombre || !email || !mensaje) {
      return res.status(400).json({
        ok: false,
        message: 'Todos los campos del formulario son obligatorios'
      });
    }

    const normalizedName = nombre.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMessage = mensaje.trim();

    if (!normalizedMessage) {
      return res.status(400).json({
        ok: false,
        message: 'El mensaje no puede estar vacio'
      });
    }

    await pool.query(
      `INSERT INTO mensajes_contacto (nombre, email, mensaje)
       VALUES (?, ?, ?)`,
      [normalizedName, normalizedEmail, normalizedMessage]
    );

    return res.status(201).json({
      ok: true,
      message: 'Mensaje enviado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo enviar el mensaje',
      error: error.message
    });
  }
});

router.get('/horarios', async (req, res) => {
  try {
    const [horarios] = await pool.query(
      `SELECT
         h.id,
         h.clase_nombre,
         h.dia_semana,
         TIME_FORMAT(h.hora_inicio, '%h:%i %p') AS hora_inicio,
         TIME_FORMAT(h.hora_fin, '%h:%i %p') AS hora_fin,
         h.nivel,
         h.cupos,
         e.nombre AS entrenador
       FROM horarios h
       LEFT JOIN entrenadores e ON e.id = h.entrenador_id
       ORDER BY
         FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'),
         h.hora_inicio`
    );

    return res.json({
      ok: true,
      horarios
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los horarios',
      error: error.message
    });
  }
});

router.post('/reservas', async (req, res) => {
  try {
    const { usuarioId, horarioId } = req.body;

    if (!usuarioId || !horarioId) {
      return res.status(400).json({
        ok: false,
        message: 'Usuario y horario son obligatorios'
      });
    }

    const [users] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El usuario no existe'
      });
    }

    const [horarios] = await pool.query(
      'SELECT id, cupos FROM horarios WHERE id = ? LIMIT 1',
      [horarioId]
    );

    if (horarios.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'La clase seleccionada no existe'
      });
    }

    const [existingReservations] = await pool.query(
      `SELECT id FROM reservas
       WHERE usuario_id = ? AND horario_id = ? AND estado = 'activa'
       LIMIT 1`,
      [usuarioId, horarioId]
    );

    if (existingReservations.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Ya tienes una reserva activa para esta clase'
      });
    }

    const [activeReservations] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM reservas
       WHERE horario_id = ? AND estado = 'activa'`,
      [horarioId]
    );

    if (activeReservations[0].total >= horarios[0].cupos) {
      return res.status(409).json({
        ok: false,
        message: 'No hay cupos disponibles para esta clase'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO reservas (usuario_id, horario_id, estado)
       VALUES (?, ?, 'activa')`,
      [usuarioId, horarioId]
    );

    return res.status(201).json({
      ok: true,
      message: 'Reserva creada correctamente',
      reservaId: result.insertId
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo crear la reserva',
      error: error.message
    });
  }
});

router.get('/reservas/:usuarioId', async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'El usuario es obligatorio'
      });
    }

    const [reservas] = await pool.query(
      `SELECT
         r.id,
         r.estado,
         h.clase_nombre,
         h.dia_semana,
         TIME_FORMAT(h.hora_inicio, '%h:%i %p') AS hora_inicio,
         TIME_FORMAT(h.hora_fin, '%h:%i %p') AS hora_fin,
         h.nivel,
         e.nombre AS entrenador
       FROM reservas r
       INNER JOIN horarios h ON h.id = r.horario_id
       LEFT JOIN entrenadores e ON e.id = h.entrenador_id
       WHERE r.usuario_id = ?
       ORDER BY r.fecha_reserva DESC`,
      [usuarioId]
    );

    return res.json({
      ok: true,
      reservas
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar las reservas',
      error: error.message
    });
  }
});

router.patch('/reservas/:reservaId/cancelar', async (req, res) => {
  try {
    const reservaId = Number(req.params.reservaId);

    if (!reservaId) {
      return res.status(400).json({
        ok: false,
        message: 'La reserva es obligatoria'
      });
    }

    const [reservas] = await pool.query(
      'SELECT id, estado FROM reservas WHERE id = ? LIMIT 1',
      [reservaId]
    );

    if (reservas.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'La reserva no existe'
      });
    }

    if (reservas[0].estado === 'cancelada') {
      return res.status(409).json({
        ok: false,
        message: 'Esta reserva ya fue cancelada'
      });
    }

    await pool.query(
      `UPDATE reservas
       SET estado = 'cancelada'
       WHERE id = ?`,
      [reservaId]
    );

    return res.json({
      ok: true,
      message: 'Reserva cancelada correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo cancelar la reserva',
      error: error.message
    });
  }
});

router.get('/modules', (req, res) => {
  res.json({
    projectModules: [
      'usuarios',
      'planes',
      'entrenadores',
      'horarios',
      'reservas',
      'contacto'
    ]
  });
});

module.exports = router;
