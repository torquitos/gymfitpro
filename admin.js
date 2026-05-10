const API_BASE_URL = 'http://localhost:3000/api';
let adminSession = null;
let adminPlanes = [];

function splitPlanFeaturesText(descripcion = '') {
  return descripcion
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createFeatureInputRow(valor = '') {
  return `
    <div class="admin-feature-row">
      <input type="text" class="admin-feature-input" value="${escapeHtml(valor)}" placeholder="Caracteristica del plan" />
      <button type="button" class="btn-admin-danger btn-admin-feature-remove" onclick="this.parentElement.remove()">
        Quitar
      </button>
    </div>`;
}

function renderFeatureRows(containerId, features = []) {
  const contenedor = document.getElementById(containerId);

  if (!contenedor) return;

  const safeFeatures = features.length ? features : [''];
  contenedor.innerHTML = safeFeatures.map(createFeatureInputRow).join('');
}

function obtenerCaracteristicasDesde(containerId) {
  const contenedor = document.getElementById(containerId);

  if (!contenedor) return [];

  return Array.from(contenedor.querySelectorAll('.admin-feature-input'))
    .map(input => input.value.trim())
    .filter(Boolean);
}

function agregarCaracteristicaNuevoPlan() {
  const contenedor = document.getElementById('nuevo-plan-caracteristicas');

  if (!contenedor) return;

  contenedor.insertAdjacentHTML('beforeend', createFeatureInputRow(''));
}

function agregarCaracteristicaExistente(planId) {
  const contenedor = document.getElementById(`plan-caracteristicas-${planId}`);

  if (!contenedor) return;

  contenedor.insertAdjacentHTML('beforeend', createFeatureInputRow(''));
}

function mostrarAlertaAdmin(tipo, mensaje) {
  const alerta = document.getElementById('admin-alerta');

  if (!alerta) return;

  alerta.className = `admin-alerta ${tipo}`;
  alerta.textContent = mensaje;
}

function cerrarSesionAdmin() {
  localStorage.removeItem('gymfitpro_sesion');
  window.location.href = 'Index.html';
}

function renderizarBienvenida(admin) {
  const contenedor = document.getElementById('admin-bienvenida');

  contenedor.innerHTML = `
    <div>
      <div class="perfil-mini-label">Administrador conectado</div>
      <h2>${admin.nombre}</h2>
      <p>${admin.email}</p>
    </div>
    <div class="admin-role-pill">${admin.rol}</div>`;
}

function renderizarResumen(resumen) {
  const contenedor = document.getElementById('admin-resumen');

  contenedor.innerHTML = `
    <article class="admin-stat-card">
      <div class="perfil-mini-label">Clientes</div>
      <div class="perfil-stat-value">${resumen.usuarios}</div>
      <p>Usuarios registrados en el sistema.</p>
    </article>
    <article class="admin-stat-card">
      <div class="perfil-mini-label">Reservas activas</div>
      <div class="perfil-stat-value">${resumen.reservasActivas}</div>
      <p>Clases actualmente apartadas.</p>
    </article>
    <article class="admin-stat-card">
      <div class="perfil-mini-label">Horarios</div>
      <div class="perfil-stat-value">${resumen.horarios}</div>
      <p>Clases publicadas en la agenda.</p>
    </article>
    <article class="admin-stat-card">
      <div class="perfil-mini-label">Mensajes pendientes</div>
      <div class="perfil-stat-value">${resumen.mensajesPendientes}</div>
      <p>Contactos que aun no han sido atendidos.</p>
    </article>`;
}

function renderizarReservasAdmin(reservas) {
  const contenedor = document.getElementById('admin-reservas');

  if (!reservas.length) {
    contenedor.innerHTML = `
      <div class="admin-empty-state">
        <h3>Aun no hay reservas</h3>
        <p>Cuando los usuarios aparten clases, apareceran aqui.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = reservas.map(reserva => `
    <div class="admin-list-item">
      <h3>${reserva.usuario}</h3>
      <p><strong>Clase:</strong> ${reserva.clase_nombre}</p>
      <p><strong>Dia:</strong> ${reserva.dia_semana}</p>
      <span class="admin-status ${reserva.estado}">${reserva.estado}</span>
    </div>
  `).join('');
}

function renderizarMensajesAdmin(mensajes) {
  const contenedor = document.getElementById('admin-mensajes');

  if (!mensajes.length) {
    contenedor.innerHTML = `
      <div class="admin-empty-state">
        <h3>No hay mensajes recientes</h3>
        <p>Los nuevos contactos del sitio se mostraran aqui.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = mensajes.map(mensaje => `
    <div class="admin-list-item">
      <h3>${mensaje.nombre}</h3>
      <p><strong>Correo:</strong> ${mensaje.email}</p>
      <p>${mensaje.mensaje}</p>
      <span class="admin-status ${mensaje.atendido ? 'atendida' : 'pendiente'}">
        ${mensaje.atendido ? 'Atendida' : 'Pendiente'}
      </span>
    </div>
  `).join('');
}

function renderizarEntrenadoresSelect(entrenadores) {
  const select = document.getElementById('horario-entrenador');

  if (!select) return;

  select.innerHTML = `
    <option value="">Selecciona un entrenador</option>
    ${entrenadores.map(entrenador => `
      <option value="${entrenador.id}">
        ${entrenador.nombre} - ${entrenador.especialidad}
      </option>
    `).join('')}`;
}

function renderizarHorariosAdmin(horarios) {
  const contenedor = document.getElementById('admin-horarios-lista');

  if (!contenedor) return;

  if (!horarios.length) {
    contenedor.innerHTML = `
      <div class="admin-empty-state">
        <h3>Aun no hay horarios</h3>
        <p>Crea el primero desde el formulario para verlo aqui.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = horarios.map(horario => `
    <div class="admin-list-item">
      <h3>${horario.clase_nombre}</h3>
      <p><strong>Dia:</strong> ${horario.dia_semana}</p>
      <p><strong>Hora:</strong> ${horario.hora_inicio} - ${horario.hora_fin}</p>
      <p><strong>Nivel:</strong> ${horario.nivel || 'Todos'}</p>
      <p><strong>Entrenador:</strong> ${horario.entrenador || 'Por asignar'}</p>
      <p><strong>Cupos:</strong> ${horario.cupos}</p>
      <button class="btn-admin-danger" onclick="eliminarHorarioAdmin(${horario.id})">
        Eliminar horario
      </button>
    </div>
  `).join('');
}

function renderizarUsuariosAdmin(usuarios, planes) {
  const contenedor = document.getElementById('admin-usuarios-lista');

  if (!contenedor) return;

  if (!usuarios.length) {
    contenedor.innerHTML = `
      <div class="admin-empty-state">
        <h3>No hay usuarios registrados</h3>
        <p>Las nuevas cuentas del sistema apareceran aqui.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = usuarios.map(usuario => `
    <div class="admin-list-item">
      <h3>${usuario.nombre_completo}</h3>
      <p><strong>Correo:</strong> ${usuario.email}</p>
      <p><strong>Rol:</strong> ${usuario.rol}</p>
      <p><strong>Plan actual:</strong> ${usuario.plan_nombre || 'Sin plan'}</p>
      ${usuario.rol === 'cliente' ? `
        <div class="admin-inline-editor">
          <select id="plan-usuario-${usuario.id}">
            ${planes.map(plan => `
              <option value="${plan.id}" ${Number(usuario.plan_id) === Number(plan.id) ? 'selected' : ''}>
                ${plan.nombre}
              </option>
            `).join('')}
          </select>
          <button class="btn-primary btn-admin-inline" onclick="actualizarPlanUsuario(${usuario.id})">
            Guardar plan
          </button>
        </div>
      ` : `
        <div class="admin-role-pill">Admin</div>
      `}
    </div>
  `).join('');
}

function renderizarEntrenadoresAdmin(entrenadores) {
  const contenedor = document.getElementById('admin-entrenadores-lista');

  if (!contenedor) return;

  if (!entrenadores.length) {
    contenedor.innerHTML = `
      <div class="admin-empty-state">
        <h3>No hay entrenadores registrados</h3>
        <p>Cuando existan entrenadores, podras editarlos aqui.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = entrenadores.map(entrenador => `
    <div class="admin-list-item">
      <div class="admin-form">
        <input type="text" id="trainer-nombre-${entrenador.id}" value="${entrenador.nombre}" placeholder="Nombre" />
        <input type="text" id="trainer-especialidad-${entrenador.id}" value="${entrenador.especialidad}" placeholder="Especialidad" />
        <div class="admin-form-row">
          <input type="number" id="trainer-experiencia-${entrenador.id}" value="${entrenador.experiencia_anios}" min="0" placeholder="Años de experiencia" />
          <input type="text" id="trainer-horario-${entrenador.id}" value="${entrenador.horario_base || ''}" placeholder="Horario base" />
        </div>
        <textarea id="trainer-descripcion-${entrenador.id}" class="admin-textarea" rows="3" placeholder="Descripcion">${entrenador.descripcion || ''}</textarea>
        <div class="admin-inline-editor">
          <button class="btn-primary" onclick="actualizarEntrenador(${entrenador.id})">
            Guardar cambios
          </button>
          <button class="btn-admin-danger btn-admin-inline" onclick="eliminarEntrenador(${entrenador.id})">
            Eliminar entrenador
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderizarPlanesAdmin(planes) {
  const contenedor = document.getElementById('admin-planes-lista');

  if (!contenedor) return;

  if (!planes.length) {
    contenedor.innerHTML = `
      <div class="admin-empty-state">
        <h3>No hay planes registrados</h3>
        <p>Crea el primero desde el formulario para verlo aqui.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = planes.map(plan => `
    <div class="admin-list-item">
      <div class="admin-form">
        <input type="text" id="plan-nombre-${plan.id}" value="${plan.nombre}" placeholder="Nombre del plan" />
        <div class="admin-form-row">
          <input type="number" id="plan-precio-${plan.id}" value="${plan.precio}" min="1" placeholder="Precio" />
          <input type="number" id="plan-duracion-${plan.id}" value="${plan.duracion_meses}" min="1" placeholder="Duracion" />
        </div>
        <div class="admin-features-block">
          <div class="admin-features-header">
            <strong>Caracteristicas del plan</strong>
            <button type="button" class="btn-admin-secondary" onclick="agregarCaracteristicaExistente(${plan.id})">
              Agregar caracteristica
            </button>
          </div>
          <div id="plan-caracteristicas-${plan.id}" class="admin-features-list"></div>
        </div>
        <label class="admin-checkbox">
          <input type="checkbox" id="plan-activo-${plan.id}" ${plan.activo ? 'checked' : ''} />
          Plan activo
        </label>
        <p><strong>Usuarios asignados:</strong> ${plan.usuarios_asignados}</p>
        <div class="admin-inline-editor">
          <button class="btn-primary" onclick="actualizarPlanAdmin(${plan.id})">
            Guardar cambios
          </button>
          <button class="btn-admin-danger btn-admin-inline" onclick="eliminarPlanAdmin(${plan.id})">
            ${Number(plan.usuarios_asignados) > 0 ? 'Desactivar o eliminar' : 'Eliminar plan'}
          </button>
        </div>
      </div>
    </div>
  `).join('');

  planes.forEach(plan => {
    renderFeatureRows(`plan-caracteristicas-${plan.id}`, splitPlanFeaturesText(plan.descripcion || ''));
  });
}

async function cargarHorariosAdmin() {
  if (!adminSession || !adminSession.id) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/horarios/${adminSession.id}`);
    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudieron cargar los horarios.');
      return;
    }

    renderizarEntrenadoresSelect(data.entrenadores || []);
    renderizarHorariosAdmin(data.horarios || []);
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor para cargar horarios.');
  }
}

async function cargarUsuariosAdmin() {
  if (!adminSession || !adminSession.id) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/usuarios/${adminSession.id}`);
    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudieron cargar los usuarios.');
      return;
    }

    adminPlanes = data.planes || [];
    renderizarUsuariosAdmin(data.usuarios || [], adminPlanes);
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor para cargar usuarios.');
  }
}

async function cargarEntrenadoresAdmin() {
  if (!adminSession || !adminSession.id) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/entrenadores/${adminSession.id}`);
    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudieron cargar los entrenadores.');
      return;
    }

    renderizarEntrenadoresAdmin(data.entrenadores || []);
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor para cargar entrenadores.');
  }
}

async function cargarPlanesAdmin() {
  if (!adminSession || !adminSession.id) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/planes/${adminSession.id}`);
    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudieron cargar los planes.');
      return;
    }

    renderizarPlanesAdmin(data.planes || []);
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor para cargar planes.');
  }
}

async function crearHorarioAdmin(event) {
  event.preventDefault();

  if (!adminSession || !adminSession.id) return;

  const claseNombre = document.getElementById('horario-clase').value.trim();
  const diaSemana = document.getElementById('horario-dia').value;
  const horaInicio = document.getElementById('horario-inicio').value;
  const horaFin = document.getElementById('horario-fin').value;
  const nivel = document.getElementById('horario-nivel').value.trim();
  const cupos = document.getElementById('horario-cupos').value;
  const entrenadorId = document.getElementById('horario-entrenador').value;

  if (!claseNombre || !diaSemana || !horaInicio || !horaFin || !cupos) {
    mostrarAlertaAdmin('error', 'Completa los campos obligatorios del nuevo horario.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/horarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id,
        claseNombre,
        diaSemana,
        horaInicio,
        horaFin,
        nivel: nivel || 'Todos',
        entrenadorId: entrenadorId || null,
        cupos
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo crear el horario.');
      return;
    }

    mostrarAlertaAdmin('exito', 'Horario creado correctamente.');
    event.target.reset();
    cargarPanelAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function eliminarHorarioAdmin(horarioId) {
  if (!adminSession || !adminSession.id) return;

  const confirmar = window.confirm('¿Seguro que quieres eliminar este horario? También se borrarán sus reservas asociadas.');

  if (!confirmar) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/horarios/${horarioId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo eliminar el horario.');
      return;
    }

    mostrarAlertaAdmin('exito', 'Horario eliminado correctamente.');
    cargarPanelAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function actualizarPlanUsuario(targetUserId) {
  if (!adminSession || !adminSession.id) return;

  const select = document.getElementById(`plan-usuario-${targetUserId}`);
  const planId = select ? select.value : '';

  if (!planId) {
    mostrarAlertaAdmin('error', 'Selecciona un plan valido.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/usuarios/${targetUserId}/plan`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id,
        planId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo actualizar el plan.');
      return;
    }

    mostrarAlertaAdmin('exito', 'Plan del usuario actualizado correctamente.');
    cargarUsuariosAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function actualizarEntrenador(entrenadorId) {
  if (!adminSession || !adminSession.id) return;

  const nombre = document.getElementById(`trainer-nombre-${entrenadorId}`).value.trim();
  const especialidad = document.getElementById(`trainer-especialidad-${entrenadorId}`).value.trim();
  const experienciaAnios = document.getElementById(`trainer-experiencia-${entrenadorId}`).value;
  const horarioBase = document.getElementById(`trainer-horario-${entrenadorId}`).value.trim();
  const descripcion = document.getElementById(`trainer-descripcion-${entrenadorId}`).value.trim();

  if (!nombre || !especialidad) {
    mostrarAlertaAdmin('error', 'Nombre y especialidad son obligatorios.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/entrenadores/${entrenadorId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id,
        nombre,
        especialidad,
        experienciaAnios,
        descripcion,
        horarioBase
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo actualizar el entrenador.');
      return;
    }

    mostrarAlertaAdmin('exito', 'Entrenador actualizado correctamente.');
    cargarEntrenadoresAdmin();
    cargarHorariosAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function crearEntrenadorAdmin(event) {
  event.preventDefault();

  if (!adminSession || !adminSession.id) return;

  const nombre = document.getElementById('nuevo-entrenador-nombre').value.trim();
  const especialidad = document.getElementById('nuevo-entrenador-especialidad').value.trim();
  const experienciaAnios = document.getElementById('nuevo-entrenador-experiencia').value;
  const horarioBase = document.getElementById('nuevo-entrenador-horario').value.trim();
  const descripcion = document.getElementById('nuevo-entrenador-descripcion').value.trim();

  if (!nombre || !especialidad) {
    mostrarAlertaAdmin('error', 'Nombre y especialidad son obligatorios para crear un entrenador.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/entrenadores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id,
        nombre,
        especialidad,
        experienciaAnios,
        descripcion,
        horarioBase
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo crear el entrenador.');
      return;
    }

    mostrarAlertaAdmin('exito', 'Entrenador creado correctamente.');
    event.target.reset();
    cargarEntrenadoresAdmin();
    cargarHorariosAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function eliminarEntrenador(entrenadorId) {
  if (!adminSession || !adminSession.id) return;

  const confirmar = window.confirm('¿Seguro que quieres eliminar este entrenador? Los horarios asociados quedarán sin entrenador asignado.');

  if (!confirmar) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/entrenadores/${entrenadorId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo eliminar el entrenador.');
      return;
    }

    mostrarAlertaAdmin('exito', 'Entrenador eliminado correctamente.');
    cargarEntrenadoresAdmin();
    cargarHorariosAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function crearPlanAdmin(event) {
  event.preventDefault();

  if (!adminSession || !adminSession.id) return;

  const nombre = document.getElementById('nuevo-plan-nombre').value.trim();
  const precio = document.getElementById('nuevo-plan-precio').value;
  const duracionMeses = document.getElementById('nuevo-plan-duracion').value;
  const descripcion = obtenerCaracteristicasDesde('nuevo-plan-caracteristicas').join('\n');

  if (!nombre || !precio || !duracionMeses) {
    mostrarAlertaAdmin('error', 'Completa los campos obligatorios del plan.');
    return;
  }

  if (!descripcion) {
    mostrarAlertaAdmin('error', 'Agrega al menos una caracteristica al plan.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/planes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id,
        nombre,
        precio,
        descripcion,
        duracionMeses
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo crear el plan.');
      return;
    }

    mostrarAlertaAdmin('exito', 'Plan creado correctamente.');
    event.target.reset();
    renderFeatureRows('nuevo-plan-caracteristicas', ['']);
    cargarPlanesAdmin();
    cargarUsuariosAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function actualizarPlanAdmin(planId) {
  if (!adminSession || !adminSession.id) return;

  const nombre = document.getElementById(`plan-nombre-${planId}`).value.trim();
  const precio = document.getElementById(`plan-precio-${planId}`).value;
  const duracionMeses = document.getElementById(`plan-duracion-${planId}`).value;
  const descripcion = obtenerCaracteristicasDesde(`plan-caracteristicas-${planId}`).join('\n');
  const activo = document.getElementById(`plan-activo-${planId}`).checked;

  if (!nombre || !precio || !duracionMeses) {
    mostrarAlertaAdmin('error', 'Completa los campos obligatorios del plan.');
    return;
  }

  if (!descripcion) {
    mostrarAlertaAdmin('error', 'Agrega al menos una caracteristica al plan.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/planes/${planId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id,
        nombre,
        precio,
        descripcion,
        duracionMeses,
        activo
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo actualizar el plan.');
      return;
    }

    mostrarAlertaAdmin('exito', 'Plan actualizado correctamente.');
    cargarPlanesAdmin();
    cargarUsuariosAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function eliminarPlanAdmin(planId) {
  if (!adminSession || !adminSession.id) return;

  const confirmar = window.confirm('¿Seguro que quieres eliminar este plan? Si tiene usuarios asignados, se desactivará en lugar de borrarse.');

  if (!confirmar) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/planes/${planId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: adminSession.id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo eliminar el plan.');
      return;
    }

    mostrarAlertaAdmin('exito', data.message || 'Plan procesado correctamente.');
    cargarPlanesAdmin();
    cargarUsuariosAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
  }
}

async function cargarPanelAdmin() {
  const sesion = JSON.parse(localStorage.getItem('gymfitpro_sesion') || 'null');
  adminSession = sesion;

  if (!sesion || !sesion.id) {
    mostrarAlertaAdmin('error', 'Debes iniciar sesion como administrador para entrar aqui.');
    document.getElementById('admin-resumen').innerHTML = '';
    return;
  }

  if (sesion.rol !== 'admin') {
    mostrarAlertaAdmin('error', 'Tu cuenta actual no tiene permisos de administrador.');
    document.getElementById('admin-resumen').innerHTML = '';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/${sesion.id}`);
    const data = await response.json();

    if (!response.ok) {
      mostrarAlertaAdmin('error', data.message || 'No se pudo cargar el panel.');
      document.getElementById('admin-resumen').innerHTML = '';
      return;
    }

    mostrarAlertaAdmin('exito', 'Panel administrador cargado correctamente.');
    renderizarBienvenida(data.admin);
    renderizarResumen(data.resumen);
    renderizarReservasAdmin(data.ultimasReservas || []);
    renderizarMensajesAdmin(data.mensajesRecientes || []);
    cargarHorariosAdmin();
    cargarUsuariosAdmin();
    cargarEntrenadoresAdmin();
    cargarPlanesAdmin();
  } catch (error) {
    mostrarAlertaAdmin('error', 'No se pudo conectar con el servidor.');
    document.getElementById('admin-resumen').innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-horario-form');
  const formEntrenador = document.getElementById('admin-entrenador-form');
  const formPlan = document.getElementById('admin-plan-form');

  if (form) {
    form.addEventListener('submit', crearHorarioAdmin);
  }

  if (formEntrenador) {
    formEntrenador.addEventListener('submit', crearEntrenadorAdmin);
  }

  if (formPlan) {
    formPlan.addEventListener('submit', crearPlanAdmin);
  }

  renderFeatureRows('nuevo-plan-caracteristicas', ['']);

  cargarPanelAdmin();
});
