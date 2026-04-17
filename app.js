const API_BASE_URL = 'http://localhost:3000/api';

function mostrarModal(tipo) {
  const overlay = document.getElementById('modal-overlay');
  const contenido = document.getElementById('modal-contenido');
  overlay.classList.remove('hidden');

  if (tipo === 'login') {
    contenido.innerHTML = `
      <h3>Bienvenido de vuelta</h3>
      <p class="subtitulo">Ingresa a tu cuenta GymFitPro</p>
      <div id="alerta-login" class="alerta"></div>
      <div class="modal-form">
        <input type="email" id="login-email" placeholder="Correo electronico" required />
        <input type="password" id="login-pass" placeholder="Contrasena" required />
        <button class="btn-primary" onclick="iniciarSesion()">Iniciar sesion</button>
      </div>
      <div class="modal-switch">
        ¿No tienes cuenta? <a onclick="mostrarModal('registro')">Registrate gratis</a>
      </div>`;
  } else {
    contenido.innerHTML = `
      <h3>Crea tu cuenta</h3>
      <p class="subtitulo">Unete a la familia GymFitPro</p>
      <div id="alerta-registro" class="alerta"></div>
      <div class="modal-form">
        <input type="text" id="reg-nombre" placeholder="Nombre completo" required />
        <input type="email" id="reg-email" placeholder="Correo electronico" required />
        <input type="password" id="reg-pass" placeholder="Contrasena (min. 6 caracteres)" required />
        <select id="reg-plan">
          <option value="">Selecciona tu plan</option>
          <option value="Basico">Basico - $49.900/mes</option>
          <option value="Pro">Pro - $79.900/mes</option>
          <option value="Elite">Elite - $119.900/mes</option>
        </select>
        <button class="btn-primary" onclick="registrarse()">Crear cuenta</button>
      </div>
      <div class="modal-switch">
        ¿Ya tienes cuenta? <a onclick="mostrarModal('login')">Inicia sesion</a>
      </div>`;
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
      <div class="servicio-card">
        <h4>Inicia sesion para ver tus reservas</h4>
        <p>Aqui apareceran las clases apartadas con tu cuenta.</p>
      </div>`;
    return;
  }

  if (!reservas.length) {
    contenedor.innerHTML = `
      <div class="servicio-card">
        <h4>Aun no tienes reservas</h4>
        <p>Cuando reserves una clase desde la tabla de horarios, aparecera aqui.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = reservas.map(reserva => `
    <div class="servicio-card">
      <h4>${reserva.clase_nombre}</h4>
      <p><strong>Dia:</strong> ${reserva.dia_semana}</p>
      <p><strong>Hora:</strong> ${reserva.hora_inicio} - ${reserva.hora_fin}</p>
      <p><strong>Entrenador:</strong> ${reserva.entrenador || 'Por asignar'}</p>
      <p><strong>Nivel:</strong> ${reserva.nivel || 'Todos'}</p>
      <p><strong>Estado:</strong> ${reserva.estado}</p>
    </div>
  `).join('');
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
    renderizarReservas([], false);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reservas/${sesion.id}`);
    const data = await response.json();

    if (!response.ok) {
      renderizarReservas([], true);
      return;
    }

    renderizarReservas(data.reservas || [], true);
  } catch (error) {
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
      plan: data.user.plan
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
      plan: data.user.plan
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
  cargarHorarios();
  cargarMisReservas();
});
