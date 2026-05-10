const API_BASE_URL = 'http://localhost:3000/api';

function splitPlanFeaturesText(descripcion = '') {
  return descripcion
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatearPrecioCOP(precio) {
  return new Intl.NumberFormat('es-CO').format(Number(precio) || 0);
}

function mostrarModal(tipo) {
  const overlay = document.getElementById('modal-overlay');
  const contenido = document.getElementById('modal-contenido');
  overlay.classList.remove('hidden');

  if (tipo === 'login') {
    contenido.innerHTML = `
      <div class="modal-layout">
        <div class="modal-intro">
          <span class="modal-badge">Acceso cliente</span>
          <h3>Bienvenido de vuelta</h3>
          <p class="subtitulo">Ingresa a tu cuenta GymFitPro y retoma tu rutina sin perder el ritmo.</p>
          <div class="modal-benefits">
            <div class="modal-benefit">
              <strong>Reserva rapido</strong>
              <span>Consulta horarios y aparta tus clases desde tu panel.</span>
            </div>
            <div class="modal-benefit">
              <strong>Todo en un lugar</strong>
              <span>Plan, sesiones y reservas activas siempre a la mano.</span>
            </div>
          </div>
        </div>
        <div class="modal-form-panel">
          <div id="alerta-login" class="alerta"></div>
          <div class="modal-form">
            <label class="modal-field">
              <span>Correo electronico</span>
              <input type="email" id="login-email" placeholder="tuusuario@email.com" required />
            </label>
            <label class="modal-field">
              <span>Contrasena</span>
              <input type="password" id="login-pass" placeholder="Ingresa tu contrasena" required />
            </label>
            <button class="btn-primary modal-submit" onclick="iniciarSesion()">Iniciar sesion</button>
          </div>
          <div class="modal-switch">
            No tienes cuenta? <a onclick="mostrarModal('registro')">Registrate gratis</a>
          </div>
        </div>
      </div>`;
  } else {
    contenido.innerHTML = `
      <div class="modal-layout">
        <div class="modal-intro">
          <span class="modal-badge">Nuevo usuario</span>
          <h3>Crea tu cuenta</h3>
          <p class="subtitulo">Unete a GymFitPro y empieza a gestionar tu plan, tus clases y tu progreso desde la plataforma.</p>
          <div class="modal-benefits">
            <div class="modal-benefit">
              <strong>Elige tu membresia</strong>
              <span>Selecciona el plan que mejor se adapte a tus objetivos.</span>
            </div>
            <div class="modal-benefit">
              <strong>Reserva desde hoy</strong>
              <span>Accede a clases, horarios y seguimiento desde tu perfil.</span>
            </div>
          </div>
        </div>
        <div class="modal-form-panel">
          <div id="alerta-registro" class="alerta"></div>
          <div class="modal-form">
            <label class="modal-field">
              <span>Nombre completo</span>
              <input type="text" id="reg-nombre" placeholder="Escribe tu nombre" required />
            </label>
            <label class="modal-field">
              <span>Correo electronico</span>
              <input type="email" id="reg-email" placeholder="tuusuario@email.com" required />
            </label>
            <label class="modal-field">
              <span>Contrasena</span>
              <input type="password" id="reg-pass" placeholder="Minimo 6 caracteres" required />
            </label>
            <label class="modal-field">
              <span>Plan</span>
              <select id="reg-plan">
                <option value="">Cargando planes...</option>
              </select>
            </label>
            <button class="btn-primary modal-submit" onclick="registrarse()">Crear cuenta</button>
          </div>
          <div class="modal-switch">
            Ya tienes cuenta? <a onclick="mostrarModal('login')">Inicia sesion</a>
          </div>
        </div>
      </div>`;
    cargarPlanes();
  }
}

function cerrarModal(event) {
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
});

function mostrarAlerta(elemento, tipo, mensaje) {
  elemento.className = `alerta ${tipo}`;
  elemento.textContent = mensaje;
}

function obtenerClaseNivel(nivel) {
  const normalizedLevel = (nivel || '').toLowerCase();

  if (normalizedLevel.includes('intermedio')) return 'spinning';
  if (normalizedLevel.includes('avanzado')) return 'boxeo';
  if (normalizedLevel.includes('todos')) return 'funcional';
  return 'yoga';
}

function renderizarHorarios(horarios) {
  const tbody = document.getElementById('horarios-body');

  if (!tbody) return;

  if (!horarios.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:24px">
          Aun no hay clases cargadas en la base de datos.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = horarios.map(horario => `
    <tr>
      <td><span class="tag-clase ${obtenerClaseNivel(horario.nivel)}">${horario.clase_nombre}</span></td>
      <td>${horario.dia_semana}</td>
      <td>${horario.hora_inicio} - ${horario.hora_fin}</td>
      <td>${horario.entrenador || 'Por asignar'}</td>
      <td>${horario.nivel || 'Todos'}</td>
      <td>
        <button class="btn-plan" style="padding:8px 12px;font-size:12px" onclick="reservarClase(${horario.id})">
          Reservar
        </button>
      </td>
    </tr>
  `).join('');
}

function renderizarReservas(reservas, loggedIn) {
  const contenedor = document.getElementById('reservas-lista');

  if (!contenedor) return;

  if (!loggedIn) {
    contenedor.innerHTML = `
      <div class="reserva-card reserva-empty">
        <h4>Inicia sesion para ver tus reservas</h4>
        <p>Cuando ingreses a tu cuenta, aqui aparecera tu agenda personal de clases.</p>
      </div>`;
    return;
  }

  if (!reservas.length) {
    contenedor.innerHTML = `
      <div class="reserva-card reserva-empty">
        <h4>Aun no tienes reservas</h4>
        <p>Reserva una clase desde horarios y aqui veras tu proxima agenda de entrenamiento.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = reservas.map(reserva => `
    <div class="reserva-card ${reserva.estado === 'activa' ? 'reserva-card-active' : ''}">
      <div class="reserva-card-top">
        <span class="reserva-badge">${reserva.estado === 'activa' ? 'Reserva activa' : 'Reserva cerrada'}</span>
        <span class="reserva-level">${reserva.nivel || 'Todos'}</span>
      </div>
      <h4>${reserva.clase_nombre}</h4>
      <div class="reserva-meta-grid">
        <div class="reserva-meta-item">
          <span>Dia</span>
          <strong>${reserva.dia_semana}</strong>
        </div>
        <div class="reserva-meta-item">
          <span>Hora</span>
          <strong>${reserva.hora_inicio} - ${reserva.hora_fin}</strong>
        </div>
        <div class="reserva-meta-item reserva-meta-item-full">
          <span>Entrenador</span>
          <strong>${reserva.entrenador || 'Por asignar'}</strong>
        </div>
      </div>
      ${reserva.estado === 'activa' ? `
        <button class="btn-cancelar-reserva" onclick="cancelarReserva(${reserva.id})">
          Cancelar reserva
        </button>
      ` : ''}
    </div>
  `).join('');
}

function renderizarPerfilUsuario(sesion, reservas = []) {
  const contenedor = document.getElementById('perfil-usuario');

  if (!contenedor) return;

  if (!sesion || !sesion.id) {
    contenedor.innerHTML = `
      <div class="perfil-card perfil-empty">
        <h3>Inicia sesion para ver tu perfil</h3>
        <p>Cuando entres con tu cuenta, aqui aparecera tu resumen, tu plan y tu actividad reciente.</p>
      </div>`;
    return;
  }

  const reservasActivas = reservas.filter(reserva => reserva.estado === 'activa').length;

  contenedor.innerHTML = `
    <div class="perfil-card perfil-card-main">
      <div class="perfil-card-main-top">
        <div>
          <div class="perfil-mini-label">Cliente GymFitPro</div>
          <div class="perfil-main-name">${sesion.nombre}</div>
          <div class="perfil-email">${sesion.email}</div>
        </div>
        <div class="perfil-avatar">${sesion.nombre.charAt(0).toUpperCase()}</div>
      </div>
      <div class="perfil-plan-row">
        <span class="perfil-plan-badge">Plan ${sesion.plan}</span>
        <span class="perfil-chip">Cuenta activa</span>
      </div>
      <p class="perfil-summary">Tu espacio personal para consultar reservas, mantener tu plan al dia y organizar mejor tu entrenamiento semanal.</p>
    </div>
    <div class="perfil-card">
      <div class="perfil-mini-label">Reservas activas</div>
      <div class="perfil-stat-value">${reservasActivas}</div>
      <div class="perfil-stat-text">Clases apartadas con tu cuenta en este momento.</div>
    </div>
    <div class="perfil-card">
      <div class="perfil-mini-label">Estado de cuenta</div>
      <div class="perfil-stat-value">Activa</div>
      <div class="perfil-stat-text">Tu membresia esta disponible para seguir reservando clases.</div>
    </div>`;
}

function renderizarPlanes(planes) {
  const contenedor = document.getElementById('planes-grid');

  if (!contenedor) return;

  if (!planes.length) {
    contenedor.innerHTML = `
      <div class="plan-card">
        <h3>Sin planes activos</h3>
        <div class="precio">$0<span>/mes</span></div>
        <ul>
          <li>Por ahora no hay membresias publicadas</li>
        </ul>
        <button class="btn-plan" onclick="mostrarModal('registro')">Solicitar informacion</button>
      </div>`;
    return;
  }

  const sortedPlans = [...planes].sort((a, b) => Number(a.precio) - Number(b.precio));
  const featuredPlanId = sortedPlans[1]?.id || sortedPlans[0].id;

  contenedor.innerHTML = planes.map(plan => {
    const features = splitPlanFeaturesText(plan.descripcion || '');
    const isFeatured = plan.id === featuredPlanId;

    return `
      <div class="plan-card ${isFeatured ? 'featured' : ''}">
        ${isFeatured ? '<div class="popular-tag">Mas popular</div>' : ''}
        <h3>${plan.nombre}</h3>
        <div class="precio">$${formatearPrecioCOP(plan.precio)}<span>/mes</span></div>
        <ul>
          ${features.map(feature => `<li>${feature}</li>`).join('') || '<li>Plan disponible para ti</li>'}
        </ul>
        <button class="btn-plan" onclick="mostrarModal('registro')">Elegir plan</button>
      </div>`;
  }).join('');
}

function actualizarOpcionesPlanes(planes) {
  const select = document.getElementById('reg-plan');

  if (!select) return;

  select.innerHTML = `
    <option value="">Selecciona tu plan</option>
    ${planes.map(plan => `
      <option value="${plan.nombre}">${plan.nombre} - $${formatearPrecioCOP(plan.precio)}/mes</option>
    `).join('')}`;
}

async function cargarPlanes() {
  try {
    const response = await fetch(`${API_BASE_URL}/planes`);
    const data = await response.json();

    if (!response.ok) {
      renderizarPlanes([]);
      return;
    }

    renderizarPlanes(data.planes || []);
    actualizarOpcionesPlanes(data.planes || []);
  } catch (error) {
    renderizarPlanes([]);
  }
}

async function cargarHorarios() {
  try {
    const response = await fetch(`${API_BASE_URL}/horarios`);
    const data = await response.json();

    if (!response.ok) {
      renderizarHorarios([]);
      return;
    }

    renderizarHorarios(data.horarios || []);
  } catch (error) {
    renderizarHorarios([]);
  }
}

async function cargarMisReservas() {
  const sesion = JSON.parse(localStorage.getItem('gymfitpro_sesion') || 'null');

  if (!sesion || !sesion.id) {
    renderizarPerfilUsuario(null, []);
    renderizarReservas([], false);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reservas/${sesion.id}`);
    const data = await response.json();

    if (!response.ok) {
      renderizarPerfilUsuario(sesion, []);
      renderizarReservas([], true);
      return;
    }

    renderizarPerfilUsuario(sesion, data.reservas || []);
    renderizarReservas(data.reservas || [], true);
  } catch (error) {
    renderizarPerfilUsuario(sesion, []);
    renderizarReservas([], true);
  }
}

async function registrarse() {
  const nombre = document.getElementById('reg-nombre').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const plan = document.getElementById('reg-plan').value;
  const alerta = document.getElementById('alerta-registro');

  if (!nombre || !email || !pass || !plan) {
    mostrarAlerta(alerta, 'error', 'Por favor completa todos los campos.');
    return;
  }

  if (pass.length < 6) {
    mostrarAlerta(alerta, 'error', 'La contrasena debe tener al menos 6 caracteres.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre,
        email,
        password: pass,
        plan
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlerta(alerta, 'error', data.message || 'No se pudo crear la cuenta.');
      return;
    }

    localStorage.setItem('gymfitpro_sesion', JSON.stringify({
      id: data.user.id,
      nombre: data.user.nombre,
      email: data.user.email,
      plan: data.user.plan,
      rol: data.user.rol
    }));

    mostrarAlerta(alerta, 'exito', `Bienvenido, ${data.user.nombre}. Tu cuenta fue creada.`);

    setTimeout(() => {
      document.getElementById('modal-overlay').classList.add('hidden');
      actualizarNavbar();
      cargarMisReservas();
    }, 1500);
  } catch (error) {
    mostrarAlerta(alerta, 'error', 'No se pudo conectar con el servidor.');
  }
}

async function iniciarSesion() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const alerta = document.getElementById('alerta-login');

  if (!email || !pass) {
    mostrarAlerta(alerta, 'error', 'Completa todos los campos.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password: pass
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlerta(alerta, 'error', data.message || 'No se pudo iniciar sesion.');
      return;
    }

    localStorage.setItem('gymfitpro_sesion', JSON.stringify({
      id: data.user.id,
      nombre: data.user.nombre,
      email: data.user.email,
      plan: data.user.plan,
      rol: data.user.rol
    }));

    mostrarAlerta(alerta, 'exito', `Hola de nuevo, ${data.user.nombre}.`);

    setTimeout(() => {
      document.getElementById('modal-overlay').classList.add('hidden');
      actualizarNavbar();
      cargarMisReservas();
    }, 1200);
  } catch (error) {
    mostrarAlerta(alerta, 'error', 'No se pudo conectar con el servidor.');
  }
}

function cerrarSesion() {
  localStorage.removeItem('gymfitpro_sesion');
  actualizarNavbar();
  cargarMisReservas();
}

function actualizarNavbar() {
  const sesion = JSON.parse(localStorage.getItem('gymfitpro_sesion') || 'null');
  const navAuth = document.querySelector('.nav-auth');

  if (sesion) {
    navAuth.innerHTML = `
      <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-right:6px">
        Hola, <strong style="color:#fff">${sesion.nombre.split(' ')[0]}</strong>
        <span style="color:var(--rojo);font-size:11px;margin-left:6px">[${sesion.plan}]</span>
      </span>
      ${sesion.rol === 'admin' ? '<a class="btn-login" href="admin.html">Panel admin</a>' : ''}
      <button class="btn-login" onclick="cerrarSesion()">Cerrar sesion</button>`;
  } else {
    navAuth.innerHTML = `
      <button class="btn-login" onclick="mostrarModal('login')">Iniciar sesion</button>
      <button class="btn-registro" onclick="mostrarModal('registro')">Registrate</button>`;
  }
}

async function reservarClase(horarioId) {
  const sesion = JSON.parse(localStorage.getItem('gymfitpro_sesion') || 'null');

  if (!sesion || !sesion.id) {
    alert('Debes iniciar sesion para reservar una clase.');
    mostrarModal('login');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: sesion.id,
        horarioId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'No se pudo crear la reserva.');
      return;
    }

    alert('Reserva realizada correctamente.');
    cargarMisReservas();
  } catch (error) {
    alert('No se pudo conectar con el servidor.');
  }
}

async function cancelarReserva(reservaId) {
  const confirmar = window.confirm('Seguro que quieres cancelar esta reserva?');

  if (!confirmar) return;

  try {
    const response = await fetch(`${API_BASE_URL}/reservas/${reservaId}/cancelar`, {
      method: 'PATCH'
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'No se pudo cancelar la reserva.');
      return;
    }

    alert('Reserva cancelada correctamente.');
    cargarMisReservas();
  } catch (error) {
    alert('No se pudo conectar con el servidor.');
  }
}

async function enviarContacto(e) {
  e.preventDefault();
  const form = e.target;
  const nombre = document.getElementById('contacto-nombre').value.trim();
  const email = document.getElementById('contacto-email').value.trim();
  const mensaje = document.getElementById('contacto-mensaje').value.trim();
  const alerta = document.getElementById('alerta-contacto');

  if (!nombre || !email || !mensaje) {
    mostrarAlerta(alerta, 'error', 'Por favor completa todos los campos del formulario.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/contacto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre,
        email,
        mensaje
      })
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlerta(alerta, 'error', data.message || 'No se pudo enviar el mensaje.');
      return;
    }

    form.innerHTML = `
      <div style="text-align:center;padding:24px 0">
        <div style="font-size:40px;margin-bottom:12px">OK</div>
        <h3 style="margin-bottom:8px">Mensaje enviado</h3>
        <p style="color:#666;font-size:14px">Tu mensaje fue guardado correctamente. Te responderemos pronto.</p>
      </div>`;
  } catch (error) {
    mostrarAlerta(alerta, 'error', 'No se pudo conectar con el servidor.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  actualizarNavbar();
  cargarPlanes();
  cargarHorarios();
  cargarMisReservas();
});
