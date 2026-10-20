"use strict";
// HU-04: modificación y cancelación de citas. Solo demo local con datos ficticios.
(() => {
  const KEY = 'luma_reservas_demo_v1';
  const $ = id => document.getElementById(id);
  const normalizar = valor => String(valor || '').replace(/[.\-\s]/g, '').toUpperCase();
  function rutValido(valor) {
    const rut = normalizar(valor);
    if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
    let suma = 0, factor = 2;
    for (let i = rut.length - 2; i >= 0; i--) {
      suma += Number(rut[i]) * factor;
      factor = factor === 7 ? 2 : factor + 1;
    }
    const dig = 11 - suma % 11;
    return (dig === 11 ? '0' : dig === 10 ? 'K' : String(dig)) === rut.at(-1);
  }
  function leer() {
    try {
      const datos = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch { return []; }
  }
  const hoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const error = $('hu04-error'), exito = $('hu04-exito');
  let rutActual = '', idActual = '';
  function mostrarError(m) { error.textContent = m; error.hidden = false; exito.hidden = true; }
  function limpiarAvisos() { error.hidden = true; exito.hidden = true; }
  function mostrarExito(m) { exito.textContent = m; exito.hidden = false; error.hidden = true; }
  function citaActual() { return leer().find(r => r.id === idActual && normalizar(r.rut) === rutActual); }
  function cerrar() { $('hu04-editor').hidden = true; idActual = ''; }
  function lista() {
    cerrar();
    const cont = $('hu04-lista');
    cont.replaceChildren();
    const citas = leer().filter(r => normalizar(r.rut) === rutActual)
      .sort((a,b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
    if (!citas.length) { mostrarError('No se encontraron citas para ese RUT en este navegador.'); return; }
    const h = document.createElement('h3'); h.textContent = `Citas encontradas: ${citas.length}`; cont.append(h);
    citas.forEach(r => {
      const card = document.createElement('article'); card.className = 'tarjeta-hu04';
      const p = document.createElement('p');
      p.textContent = `${r.fecha} · ${r.hora} · ${r.medicoNombre} · ${r.sucursal} · ${r.estado}`;
      if (r.estado === 'Cancelada') p.className = 'estado-cancelada';
      card.append(p);
      if (r.estado !== 'Cancelada') {
        const acciones = document.createElement('div'); acciones.className = 'acciones';
        const modificar = document.createElement('button');
        modificar.type = 'button'; modificar.className = 'boton-secundario'; modificar.textContent = 'Modificar cita';
        modificar.addEventListener('click', () => editar(r.id));
        const cancelar = document.createElement('button');
        cancelar.type = 'button'; cancelar.className = 'boton-peligro'; cancelar.textContent = 'Cancelar cita';
        cancelar.addEventListener('click', () => cancelarCita(r.id));
        acciones.append(modificar,cancelar); card.append(acciones);
      }
      cont.append(card);
    });
  }
  function editar(id) {
    limpiarAvisos(); idActual = id;
    const r = citaActual(); if (!r || r.estado === 'Cancelada') return mostrarError('La cita ya no se puede modificar.');
    $('hu04-detalle').textContent = `${r.nombre} · ${r.medicoNombre} · ${r.especialidad} · ${r.sucursal} · ${r.fecha} a las ${r.hora} · ${r.estado}`;
    $('hu04-fecha').min = hoy(); $('hu04-fecha').value = r.fecha < hoy() ? hoy() : r.fecha;
    $('hu04-editor').hidden = false;
    actualizarHoras();
    $('hu04-editor').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function actualizarHoras() {
    const r = citaActual(), select = $('hu04-hora'), fecha = $('hu04-fecha').value;
    select.replaceChildren(new Option('Selecciona un horario', ''));
    if (!r || !fecha) return;
    const dia = new Date(`${fecha}T12:00:00`);
    if (fecha < hoy() || [0,6].includes(dia.getDay())) {
      $('hu04-disponibilidad').textContent = 'Selecciona una fecha futura de lunes a viernes.';
      return;
    }
    const medico = window.LUMA_DATOS.profesionales.find(m => m.id === r.medicoId);
    if (!medico) return mostrarError('No se encontró el profesional de esta cita.');
    const ocupadas = leer();
    const disponibles = medico.horarios.filter(hora =>
      (r.fecha === fecha && r.hora === hora) ||
      !ocupadas.some(x => x.id !== r.id && x.estado !== 'Cancelada' && x.medicoId === r.medicoId && x.fecha === fecha && x.hora === hora && x.sucursal === r.sucursal)
    );
    disponibles.forEach(h => select.add(new Option(h, h)));
    if (disponibles.includes(r.hora) && fecha === r.fecha) select.value = r.hora;
    $('hu04-disponibilidad').textContent = `${disponibles.length} horario(s) disponible(s) en esta fecha.`;
  }
  function cancelarCita(id) {
    limpiarAvisos();
    const items = leer(), i = items.findIndex(r => r.id === id && normalizar(r.rut) === rutActual);
    if (i < 0 || items[i].estado === 'Cancelada') return mostrarError('La cita ya está cancelada o no existe.');
    if (!window.confirm(`¿Cancelar la cita de ${items[i].fecha} a las ${items[i].hora}?`)) return;
    items[i].estado = 'Cancelada'; items[i].canceladaEn = new Date().toISOString();
    try { localStorage.setItem(KEY,JSON.stringify(items)); }
    catch { return mostrarError('No se pudo guardar la cancelación.'); }
    lista(); mostrarExito('Cita cancelada. Su horario queda liberado para nuevas reservas.');
    actualizarHU01();
  }
  function actualizarHU01() {
    const form = $('formulario');
    if (form && $('profesional').value && $('sucursal').value && $('fecha').value) form.requestSubmit();
  }
  $('hu04-busqueda').addEventListener('submit', e => {
    e.preventDefault(); limpiarAvisos(); $('hu04-lista').replaceChildren(); cerrar();
    const rut = $('hu04-rut').value;
    if (!rutValido(rut)) return mostrarError('Ingresa un RUT válido con dígito verificador.');
    rutActual = normalizar(rut); lista();
  });
  $('hu04-fecha').addEventListener('change', actualizarHoras);
  $('hu04-cerrar').addEventListener('click', cerrar);
  $('hu04-form').addEventListener('submit', e => {
    e.preventDefault(); limpiarAvisos();
    const items = leer(), i = items.findIndex(r => r.id === idActual && normalizar(r.rut) === rutActual);
    if (i < 0 || items[i].estado === 'Cancelada') return mostrarError('La cita ya no está disponible.');
    const r = items[i], fecha = $('hu04-fecha').value, hora = $('hu04-hora').value;
    const dia = new Date(`${fecha}T12:00:00`);
    if (!fecha || fecha < hoy() || !hora || [0,6].includes(dia.getDay())) return mostrarError('Selecciona una fecha y horario válidos.');
    const medico = window.LUMA_DATOS.profesionales.find(m => m.id === r.medicoId);
    if (!medico || !medico.horarios.includes(hora)) return mostrarError('El horario seleccionado no corresponde al médico.');
    if (items.some(x => x.id !== r.id && x.estado !== 'Cancelada' && x.medicoId === r.medicoId && x.fecha === fecha && x.hora === hora && x.sucursal === r.sucursal))
      return mostrarError('Este horario acaba de ser reservado. Selecciona otro.');
    if (fecha === r.fecha && hora === r.hora) return mostrarError('Selecciona una fecha u hora diferente a la actual.');
    r.fecha = fecha; r.hora = hora; r.estado = 'Pendiente de confirmación';
    r.modificadaEn = new Date().toISOString(); delete r.confirmadaEn;
    try { localStorage.setItem(KEY, JSON.stringify(items)); }
    catch { return mostrarError('No se pudo guardar la modificación.'); }
    lista(); mostrarExito('Cita modificada correctamente. Debes confirmar nuevamente la asistencia en HU-03.');
    actualizarHU01();
  });
})();
