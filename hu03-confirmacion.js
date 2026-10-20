"use strict";
// HU-03: consulta de citas por RUT y confirmación, solo para prototipo local.
(() => {
  const KEY = 'luma_reservas_demo_v1';
  const $ = id => document.getElementById(id);
  const leer = () => { try { const r = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; } };
  const normalizarRut = valor => String(valor || '').replace(/[.\-\s]/g, '').toUpperCase();
  function rutValido(valor) {
    const rut = normalizarRut(valor);
    if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
    const cuerpo = rut.slice(0, -1); let suma = 0, factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * factor; factor = factor === 7 ? 2 : factor + 1; }
    const dv = 11 - (suma % 11); return (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv)) === rut.slice(-1);
  }
  const error = $('buscar-error'), detalle = $('detalle-confirmacion'), mensaje = $('confirmar-mensaje');
  const boton = $('boton-confirmar'), lista = $('lista-citas');
  let codigoActual = null, rutActual = null;
  function mostrarError(texto) { error.textContent = texto; error.hidden = false; }
  function ocultarDetalle() { codigoActual = null; detalle.hidden = true; mensaje.hidden = true; }
  function pintar(reserva) {
    $('cita-codigo').textContent = reserva.id;
    $('cita-paciente').textContent = reserva.nombre;
    $('cita-medico').textContent = reserva.medicoNombre;
    $('cita-especialidad').textContent = reserva.especialidad;
    $('cita-sucursal').textContent = reserva.sucursal;
    $('cita-fecha').textContent = `${reserva.fecha} a las ${reserva.hora}`;
    $('cita-estado').textContent = reserva.estado;
    $('cita-estado').classList.toggle('confirmada', reserva.estado === 'Confirmada');
    boton.hidden = reserva.estado !== 'Pendiente de confirmación';
    detalle.hidden = false;
    if (reserva.estado === 'Confirmada' || reserva.estado === 'Cancelada') {
      mensaje.textContent = reserva.estado === 'Confirmada' ? 'Esta cita ya está confirmada.' : 'Esta cita está cancelada y no puede confirmarse.';
      mensaje.hidden = false;
    } else mensaje.hidden = true;
  }
  function listar() {
    lista.replaceChildren(); ocultarDetalle();
    const citas = leer().filter(r => normalizarRut(r.rut) === rutActual)
      .sort((a,b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
    lista.hidden = !citas.length;
    if (!citas.length) return mostrarError('No hay citas registradas para ese RUT en este navegador.');
    const titulo = document.createElement('h3'); titulo.textContent = `Citas encontradas: ${citas.length}`; lista.append(titulo);
    citas.forEach(r => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'boton-cita';
      b.textContent = `${r.fecha} · ${r.hora} · ${r.medicoNombre} · ${r.sucursal} · ${r.estado}`;
      b.addEventListener('click', () => { codigoActual = r.id; const actual = leer().find(x => x.id === r.id && normalizarRut(x.rut) === rutActual); if (actual) pintar(actual); detalle.scrollIntoView({behavior:'smooth',block:'nearest'}); });
      lista.append(b);
    });
  }
  $('form-buscar-reserva').addEventListener('submit', e => {
    e.preventDefault(); error.hidden = true; ocultarDetalle(); lista.hidden = true;
    const rut = $('buscar-rut').value;
    if (!rutValido(rut)) return mostrarError('Ingresa un RUT válido con dígito verificador.');
    rutActual = normalizarRut(rut); listar();
  });
  boton.addEventListener('click', () => {
    if (!codigoActual || !rutActual) return;
    const reservas = leer();
    const i = reservas.findIndex(r => r.id === codigoActual && normalizarRut(r.rut) === rutActual);
    if (i < 0) { ocultarDetalle(); return mostrarError('La reserva ya no está disponible.'); }
    if (reservas[i].estado !== 'Pendiente de confirmación') { pintar(reservas[i]); return; }
    reservas[i].estado = 'Confirmada'; reservas[i].confirmadaEn = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(reservas)); }
    catch { return mostrarError('No se pudo guardar la confirmación.'); }
    const id = reservas[i].id;
    listar(); codigoActual = id; pintar(reservas[i]);
    mensaje.textContent = '¡Asistencia confirmada! Tu cita quedó registrada como confirmada.';
    mensaje.hidden = false;
  });
  const comprobante = $('comprobante');
  if (comprobante) {
    const ir = document.createElement('button'); ir.type = 'button'; ir.className = 'boton-secundario'; ir.textContent = 'Consultar mis citas (HU-03) →';
    ir.addEventListener('click', () => { $('hu03').scrollIntoView({behavior:'smooth'}); $('buscar-rut').focus({preventScroll:true}); });
    comprobante.append(ir);
  }
})();
