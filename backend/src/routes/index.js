const express = require('express');
const crypto = require('crypto');
const { pool, testDatabaseConnection } = require('../config/db');

const router = express.Router();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function normalizePlanName(nombre = '') {
  return nombre.trim().toLowerCase();
}

function splitPlanFeatures(descripcion = '') {
  return descripcion
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function joinPlanFeatures(features = []) {
  return [...new Set(features.map(item => item.trim()).filter(Boolean))].join('\n');
}

async function compactDuplicatePlans() {
  const [plans] = await pool.query(
    `SELECT id, nombre, precio, descripcion, duracion_meses, activo
     FROM planes
     ORDER BY id ASC`
  );

  const groupedPlans = new Map();

  for (const plan of plans) {
    const key = normalizePlanName(plan.nombre);

    if (!groupedPlans.has(key)) {
      groupedPlans.set(key, []);
    }

    groupedPlans.get(key).push(plan);
  }

  for (const [, duplicatedPlans] of groupedPlans) {
    if (duplicatedPlans.length <= 1) continue;

    const primaryPlan = duplicatedPlans[0];
    const duplicateIds = duplicatedPlans.slice(1).map(plan => plan.id);
    const mergedFeatures = joinPlanFeatures(
      duplicatedPlans.flatMap(plan => splitPlanFeatures(plan.descripcion || ''))
    );

    await pool.query(
      `UPDATE planes
       SET descripcion = ?, activo = ?
       WHERE id = ?`,
      [
        mergedFeatures || primaryPlan.descripcion || null,
        duplicatedPlans.some(plan => Boolean(plan.activo)),
        primaryPlan.id
      ]
    );

    if (duplicateIds.length > 0) {
      await pool.query(
        `UPDATE usuarios
         SET plan_id = ?
         WHERE plan_id IN (${duplicateIds.map(() => '?').join(', ')})`,
        [primaryPlan.id, ...duplicateIds]
      );

      await pool.query(
        `DELETE FROM planes
         WHERE id IN (${duplicateIds.map(() => '?').join(', ')})`,
        duplicateIds
      );
    }
  }
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
        plan: plans[0].nombre,
        rol: 'cliente'
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
      `SELECT u.id, u.nombre_completo, u.email, u.rol, p.nombre AS plan
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
        plan: user.plan,
        rol: user.rol
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

router.get('/planes', async (req, res) => {
  try {
    await compactDuplicatePlans();

    const [planes] = await pool.query(
      `SELECT
         id,
         nombre,
         precio,
         descripcion,
         duracion_meses
       FROM planes
       WHERE activo = TRUE
       ORDER BY precio ASC`
    );

    return res.json({
      ok: true,
      planes
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los planes',
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

router.get('/admin/dashboard/:usuarioId', async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'El administrador es obligatorio'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, nombre_completo, email, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El usuario no existe'
      });
    }

    if (admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para entrar al panel administrador'
      });
    }

    const [[usuariosCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'cliente'"
    );

    const [[reservasActivasCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM reservas WHERE estado = 'activa'"
    );

    const [[horariosCount]] = await pool.query(
      'SELECT COUNT(*) AS total FROM horarios'
    );

    const [[mensajesPendientesCount]] = await pool.query(
      'SELECT COUNT(*) AS total FROM mensajes_contacto WHERE atendido = FALSE'
    );

    const [ultimasReservas] = await pool.query(
      `SELECT
         r.id,
         u.nombre_completo AS usuario,
         h.clase_nombre,
         h.dia_semana,
         r.estado
       FROM reservas r
       INNER JOIN usuarios u ON u.id = r.usuario_id
       INNER JOIN horarios h ON h.id = r.horario_id
       ORDER BY r.fecha_reserva DESC
       LIMIT 5`
    );

    const [mensajesRecientes] = await pool.query(
      `SELECT id, nombre, email, mensaje, atendido
       FROM mensajes_contacto
       ORDER BY fecha_envio DESC
       LIMIT 5`
    );

    return res.json({
      ok: true,
      admin: {
        id: admins[0].id,
        nombre: admins[0].nombre_completo,
        email: admins[0].email,
        rol: admins[0].rol
      },
      resumen: {
        usuarios: usuariosCount.total,
        reservasActivas: reservasActivasCount.total,
        horarios: horariosCount.total,
        mensajesPendientes: mensajesPendientesCount.total
      },
      ultimasReservas,
      mensajesRecientes
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el panel administrador',
      error: error.message
    });
  }
});

router.get('/admin/horarios/:usuarioId', async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'El administrador es obligatorio'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para gestionar horarios'
      });
    }

    const [horarios] = await pool.query(
      `SELECT
         h.id,
         h.clase_nombre,
         h.dia_semana,
         TIME_FORMAT(h.hora_inicio, '%H:%i') AS hora_inicio,
         TIME_FORMAT(h.hora_fin, '%H:%i') AS hora_fin,
         h.nivel,
         h.cupos,
         h.entrenador_id,
         e.nombre AS entrenador
       FROM horarios h
       LEFT JOIN entrenadores e ON e.id = h.entrenador_id
       ORDER BY
         FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'),
         h.hora_inicio`
    );

    const [entrenadores] = await pool.query(
      `SELECT id, nombre, especialidad
       FROM entrenadores
       ORDER BY nombre ASC`
    );

    return res.json({
      ok: true,
      horarios,
      entrenadores
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los horarios del panel admin',
      error: error.message
    });
  }
});

router.post('/admin/horarios', async (req, res) => {
  try {
    const {
      usuarioId,
      claseNombre,
      diaSemana,
      horaInicio,
      horaFin,
      nivel,
      entrenadorId,
      cupos
    } = req.body;

    if (!usuarioId || !claseNombre || !diaSemana || !horaInicio || !horaFin || !cupos) {
      return res.status(400).json({
        ok: false,
        message: 'Completa todos los campos obligatorios del horario'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para crear horarios'
      });
    }

    const normalizedClase = claseNombre.trim();
    const normalizedDia = diaSemana.trim();
    const normalizedNivel = (nivel || 'Todos').trim();
    const normalizedCupos = Number(cupos);
    const normalizedEntrenadorId = entrenadorId ? Number(entrenadorId) : null;

    if (Number.isNaN(normalizedCupos) || normalizedCupos <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'Los cupos deben ser un numero mayor a cero'
      });
    }

    if (normalizedEntrenadorId) {
      const [trainers] = await pool.query(
        'SELECT id FROM entrenadores WHERE id = ? LIMIT 1',
        [normalizedEntrenadorId]
      );

      if (trainers.length === 0) {
        return res.status(400).json({
          ok: false,
          message: 'El entrenador seleccionado no existe'
        });
      }
    }

    await pool.query(
      `INSERT INTO horarios (
        clase_nombre,
        dia_semana,
        hora_inicio,
        hora_fin,
        nivel,
        entrenador_id,
        cupos
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedClase,
        normalizedDia,
        horaInicio,
        horaFin,
        normalizedNivel,
        normalizedEntrenadorId,
        normalizedCupos
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'Horario creado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo crear el horario',
      error: error.message
    });
  }
});

router.delete('/admin/horarios/:horarioId', async (req, res) => {
  try {
    const horarioId = Number(req.params.horarioId);
    const { usuarioId } = req.body;

    if (!horarioId || !usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'El administrador y el horario son obligatorios'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para eliminar horarios'
      });
    }

    const [horarios] = await pool.query(
      'SELECT id FROM horarios WHERE id = ? LIMIT 1',
      [horarioId]
    );

    if (horarios.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El horario no existe'
      });
    }

    await pool.query(
      'DELETE FROM reservas WHERE horario_id = ?',
      [horarioId]
    );

    await pool.query(
      'DELETE FROM horarios WHERE id = ?',
      [horarioId]
    );

    return res.json({
      ok: true,
      message: 'Horario eliminado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo eliminar el horario',
      error: error.message
    });
  }
});

router.get('/admin/usuarios/:usuarioId', async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'El administrador es obligatorio'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para ver usuarios'
      });
    }

    await compactDuplicatePlans();

    const [usuarios] = await pool.query(
      `SELECT
         u.id,
         u.nombre_completo,
         u.email,
         u.rol,
         u.telefono,
         p.id AS plan_id,
         p.nombre AS plan_nombre
       FROM usuarios u
       LEFT JOIN planes p ON p.id = u.plan_id
       ORDER BY u.fecha_registro DESC`
    );

    const [planes] = await pool.query(
      `SELECT id, nombre, precio
       FROM planes
       WHERE activo = TRUE
       ORDER BY precio ASC`
    );

    return res.json({
      ok: true,
      usuarios,
      planes
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los usuarios',
      error: error.message
    });
  }
});

router.patch('/admin/usuarios/:targetUserId/plan', async (req, res) => {
  try {
    const targetUserId = Number(req.params.targetUserId);
    const { usuarioId, planId } = req.body;

    if (!targetUserId || !usuarioId || !planId) {
      return res.status(400).json({
        ok: false,
        message: 'Administrador, usuario y plan son obligatorios'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para cambiar planes'
      });
    }

    const [users] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ? LIMIT 1',
      [targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El usuario no existe'
      });
    }

    const [planes] = await pool.query(
      'SELECT id FROM planes WHERE id = ? LIMIT 1',
      [planId]
    );

    if (planes.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El plan seleccionado no existe'
      });
    }

    await pool.query(
      'UPDATE usuarios SET plan_id = ? WHERE id = ?',
      [planId, targetUserId]
    );

    return res.json({
      ok: true,
      message: 'Plan del usuario actualizado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo actualizar el plan del usuario',
      error: error.message
    });
  }
});

router.get('/admin/entrenadores/:usuarioId', async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'El administrador es obligatorio'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para ver entrenadores'
      });
    }

    const [entrenadores] = await pool.query(
      `SELECT
         id,
         nombre,
         especialidad,
         experiencia_anios,
         descripcion,
         horario_base
       FROM entrenadores
       ORDER BY nombre ASC`
    );

    return res.json({
      ok: true,
      entrenadores
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los entrenadores',
      error: error.message
    });
  }
});

router.post('/admin/entrenadores', async (req, res) => {
  try {
    const {
      usuarioId,
      nombre,
      especialidad,
      experienciaAnios,
      descripcion,
      horarioBase
    } = req.body;

    if (!usuarioId || !nombre || !especialidad) {
      return res.status(400).json({
        ok: false,
        message: 'Nombre, especialidad y administrador son obligatorios'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para crear entrenadores'
      });
    }

    await pool.query(
      `INSERT INTO entrenadores (
        nombre,
        especialidad,
        experiencia_anios,
        descripcion,
        horario_base
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        especialidad.trim(),
        Number(experienciaAnios) || 0,
        (descripcion || '').trim() || null,
        (horarioBase || '').trim() || null
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'Entrenador creado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo crear el entrenador',
      error: error.message
    });
  }
});

router.patch('/admin/entrenadores/:entrenadorId', async (req, res) => {
  try {
    const entrenadorId = Number(req.params.entrenadorId);
    const {
      usuarioId,
      nombre,
      especialidad,
      experienciaAnios,
      descripcion,
      horarioBase
    } = req.body;

    if (!entrenadorId || !usuarioId || !nombre || !especialidad) {
      return res.status(400).json({
        ok: false,
        message: 'Completa los campos obligatorios del entrenador'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para editar entrenadores'
      });
    }

    const [trainers] = await pool.query(
      'SELECT id FROM entrenadores WHERE id = ? LIMIT 1',
      [entrenadorId]
    );

    if (trainers.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El entrenador no existe'
      });
    }

    const normalizedExperience = Number(experienciaAnios) || 0;

    await pool.query(
      `UPDATE entrenadores
       SET nombre = ?, especialidad = ?, experiencia_anios = ?, descripcion = ?, horario_base = ?
       WHERE id = ?`,
      [
        nombre.trim(),
        especialidad.trim(),
        normalizedExperience,
        (descripcion || '').trim() || null,
        (horarioBase || '').trim() || null,
        entrenadorId
      ]
    );

    return res.json({
      ok: true,
      message: 'Entrenador actualizado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo actualizar el entrenador',
      error: error.message
    });
  }
});

router.delete('/admin/entrenadores/:entrenadorId', async (req, res) => {
  try {
    const entrenadorId = Number(req.params.entrenadorId);
    const { usuarioId } = req.body;

    if (!entrenadorId || !usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'Administrador y entrenador son obligatorios'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para eliminar entrenadores'
      });
    }

    const [trainers] = await pool.query(
      'SELECT id FROM entrenadores WHERE id = ? LIMIT 1',
      [entrenadorId]
    );

    if (trainers.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El entrenador no existe'
      });
    }

    await pool.query(
      'UPDATE horarios SET entrenador_id = NULL WHERE entrenador_id = ?',
      [entrenadorId]
    );

    await pool.query(
      'DELETE FROM entrenadores WHERE id = ?',
      [entrenadorId]
    );

    return res.json({
      ok: true,
      message: 'Entrenador eliminado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo eliminar el entrenador',
      error: error.message
    });
  }
});

router.get('/admin/planes/:usuarioId', async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'El administrador es obligatorio'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para ver planes'
      });
    }

    await compactDuplicatePlans();

    const [planes] = await pool.query(
      `SELECT
         p.id,
         p.nombre,
         p.precio,
         p.descripcion,
         p.duracion_meses,
         p.activo,
         COUNT(u.id) AS usuarios_asignados
       FROM planes p
       LEFT JOIN usuarios u ON u.plan_id = p.id
       GROUP BY p.id
       ORDER BY p.precio ASC`
    );

    return res.json({
      ok: true,
      planes
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los planes',
      error: error.message
    });
  }
});

router.post('/admin/planes', async (req, res) => {
  try {
    const {
      usuarioId,
      nombre,
      precio,
      descripcion,
      duracionMeses
    } = req.body;

    if (!usuarioId || !nombre || !precio || !duracionMeses) {
      return res.status(400).json({
        ok: false,
        message: 'Completa los campos obligatorios del plan'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para crear planes'
      });
    }

    const normalizedNombre = nombre.trim();
    const normalizedPrecio = Number(precio);
    const normalizedDuracion = Number(duracionMeses);
    const normalizedDescripcion = joinPlanFeatures(splitPlanFeatures(descripcion || ''));

    if (Number.isNaN(normalizedPrecio) || normalizedPrecio <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'El precio debe ser un numero mayor a cero'
      });
    }

    if (Number.isNaN(normalizedDuracion) || normalizedDuracion <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'La duracion debe ser mayor a cero'
      });
    }

    if (!normalizedDescripcion) {
      return res.status(400).json({
        ok: false,
        message: 'Debes agregar al menos una caracteristica al plan'
      });
    }

    const [existingPlans] = await pool.query(
      'SELECT id, nombre FROM planes',
    );

    const duplicatedPlan = existingPlans.find(plan => normalizePlanName(plan.nombre) === normalizePlanName(normalizedNombre));

    if (duplicatedPlan) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un plan con ese nombre'
      });
    }

    await pool.query(
      `INSERT INTO planes (nombre, precio, descripcion, duracion_meses, activo)
       VALUES (?, ?, ?, ?, TRUE)`,
      [
        normalizedNombre,
        normalizedPrecio,
        normalizedDescripcion || null,
        normalizedDuracion
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'Plan creado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo crear el plan',
      error: error.message
    });
  }
});

router.patch('/admin/planes/:planId', async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const {
      usuarioId,
      nombre,
      precio,
      descripcion,
      duracionMeses,
      activo
    } = req.body;

    if (!planId || !usuarioId || !nombre || !precio || !duracionMeses) {
      return res.status(400).json({
        ok: false,
        message: 'Completa los campos obligatorios del plan'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para editar planes'
      });
    }

    const [plans] = await pool.query(
      'SELECT id FROM planes WHERE id = ? LIMIT 1',
      [planId]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El plan no existe'
      });
    }

    const normalizedNombre = nombre.trim();
    const normalizedPrecio = Number(precio);
    const normalizedDuracion = Number(duracionMeses);
    const normalizedDescripcion = joinPlanFeatures(splitPlanFeatures(descripcion || ''));

    if (Number.isNaN(normalizedPrecio) || normalizedPrecio <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'El precio debe ser un numero mayor a cero'
      });
    }

    if (Number.isNaN(normalizedDuracion) || normalizedDuracion <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'La duracion debe ser mayor a cero'
      });
    }

    if (!normalizedDescripcion) {
      return res.status(400).json({
        ok: false,
        message: 'Debes agregar al menos una caracteristica al plan'
      });
    }

    const [allPlans] = await pool.query(
      'SELECT id, nombre FROM planes WHERE id <> ?',
      [planId]
    );

    const duplicatePlans = allPlans.filter(plan => normalizePlanName(plan.nombre) === normalizePlanName(normalizedNombre));

    if (duplicatePlans.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe otro plan con ese nombre'
      });
    }

    await pool.query(
      `UPDATE planes
       SET nombre = ?, precio = ?, descripcion = ?, duracion_meses = ?, activo = ?
       WHERE id = ?`,
      [
        normalizedNombre,
        normalizedPrecio,
        normalizedDescripcion || null,
        normalizedDuracion,
        activo === false ? false : true,
        planId
      ]
    );

    return res.json({
      ok: true,
      message: 'Plan actualizado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo actualizar el plan',
      error: error.message
    });
  }
});

router.delete('/admin/planes/:planId', async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const { usuarioId } = req.body;

    if (!planId || !usuarioId) {
      return res.status(400).json({
        ok: false,
        message: 'Administrador y plan son obligatorios'
      });
    }

    const [admins] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1',
      [usuarioId]
    );

    if (admins.length === 0 || admins[0].rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para eliminar planes'
      });
    }

    const [plans] = await pool.query(
      'SELECT id FROM planes WHERE id = ? LIMIT 1',
      [planId]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'El plan no existe'
      });
    }

    const [[usersCount]] = await pool.query(
      'SELECT COUNT(*) AS total FROM usuarios WHERE plan_id = ?',
      [planId]
    );

    if (usersCount.total > 0) {
      await pool.query(
        'UPDATE planes SET activo = FALSE WHERE id = ?',
        [planId]
      );

      return res.json({
        ok: true,
        message: 'El plan estaba en uso y fue desactivado en lugar de eliminarse'
      });
    }

    await pool.query(
      'DELETE FROM planes WHERE id = ?',
      [planId]
    );

    return res.json({
      ok: true,
      message: 'Plan eliminado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudo eliminar el plan',
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
