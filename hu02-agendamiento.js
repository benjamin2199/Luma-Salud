"use strict";
// HU-02: reservas ficticias locales. No usar para datos clínicos reales.
(() => {
  const KEY = 'luma_reservas_demo_v1';
  const leer = () => {try {const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
  const guardar = (items) => localStorage.setItem(KEY,JSON.stringify(items));
  const clave = (r) => `${r.medicoId}|${r.fecha}|${r.hora}|${r.sucursal}`;
  const existe = (medicoId,fecha,hora,sucursal) => leer().some(r=>clave(r)===`${medicoId}|${fecha}|${hora}|${sucursal}` && r.estado!=='Cancelada');
  const form = document.getElementById('form-reserva');
  const panel = document.getElementById('panel-reserva');
  const aviso = document.getElementById('reserva-error');
  const comprobante = document.getElementById('comprobante');
  let seleccion = null;
  function abrir(medico,fecha,hora,sucursal) {
    seleccion={medicoId:medico.id,medicoNombre:medico.nombre,especialidad:medico.especialidad,fecha,hora,sucursal};
    document.getElementById('detalle-reserva').textContent=`${medico.nombre} · ${medico.especialidad} · ${sucursal} · ${fecha} · ${hora}`;
    aviso.hidden=true;comprobante.hidden=true;panel.hidden=false;
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  const rutValido = rut => {
    const limpio=rut.replace(/[.\-\s]/g,'').toUpperCase();
    if(!/^\d{7,8}[0-9K]$/.test(limpio))return false;
    const cuerpo=limpio.slice(0,-1);let suma=0,m=2;
    for(let i=cuerpo.length-1;i>=0;i--){suma+=Number(cuerpo[i])*m;m=m===7?2:m+1}
    const dig=11-(suma%11);return (dig===11?'0':dig===10?'K':String(dig))===limpio.at(-1);
  };
  form.addEventListener('submit', e=>{
    e.preventDefault();aviso.hidden=true;
    if(!seleccion)return;
    const nombre=document.getElementById('paciente-nombre').value.trim();
    const rut=document.getElementById('paciente-rut').value.trim();
    const correo=document.getElementById('paciente-correo').value.trim();
    const telefono=document.getElementById('paciente-telefono').value.trim();
    if(nombre.length<3 || !rutValido(rut) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || telefono.replace(/\D/g,'').length<9){
      aviso.textContent='Revisa los datos: nombre (mínimo 3 caracteres), RUT válido, correo y teléfono (mínimo 9 dígitos).';aviso.hidden=false;return;
    }
    if(existe(seleccion.medicoId,seleccion.fecha,seleccion.hora,seleccion.sucursal)){
      aviso.textContent='Esta hora ya fue reservada. Vuelve a consultar la disponibilidad.';aviso.hidden=false;return;
    }
    const id='LS-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
    const reserva={...seleccion,id,nombre,rut,correo,telefono,estado:'Pendiente de confirmación',creada:new Date().toISOString()};
    const reservas=leer();reservas.push(reserva);
    try {guardar(reservas)} catch {aviso.textContent='No se pudo guardar la reserva en este navegador.';aviso.hidden=false;return}
    form.reset();panel.hidden=true;comprobante.hidden=false;
    document.getElementById('comprobante-id').textContent=id;
    document.getElementById('comprobante-detalle').textContent=`${nombre} · ${reserva.medicoNombre} · ${reserva.sucursal} · ${reserva.fecha} a las ${reserva.hora}`;
    comprobante.scrollIntoView({behavior:'smooth',block:'start'});
    document.getElementById('formulario').requestSubmit();
  });
  document.getElementById('cerrar-reserva').addEventListener('click',()=>{panel.hidden=true;seleccion=null});
  window.LUMA_RESERVAS={abrir,existe,leer};
})();
