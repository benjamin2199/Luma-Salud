"use strict";
const {sucursales,profesionales}=window.LUMA_DATOS;
const $=id=>document.getElementById(id);
const especialidad=$("especialidad"), profesional=$("profesional"), sucursal=$("sucursal"), fecha=$("fecha"), error=$("error"), resultado=$("resultado");
const fechaLocal=(date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const hoy=fechaLocal(new Date());
fecha.min=hoy;
fecha.value=hoy;
const agregarOpcion=(select,valor,texto)=>select.add(new Option(texto,valor));
[...new Set(profesionales.map(p=>p.especialidad))].sort().forEach(e=>agregarOpcion(especialidad,e,e));
sucursales.forEach(s=>agregarOpcion(sucursal,s,s));
especialidad.addEventListener("change",()=>{
  profesional.replaceChildren(new Option(especialidad.value?"Selecciona un profesional":"Primero selecciona una especialidad",""));
  profesional.disabled=!especialidad.value;
  profesionales.filter(p=>p.especialidad===especialidad.value).forEach(p=>agregarOpcion(profesional,p.id,p.nombre));
  limpiarResultados();
});
[profesional,sucursal,fecha].forEach(el=>el.addEventListener("change",limpiarResultados));
function limpiarResultados(){error.hidden=true;$("subtitulo-resultados").textContent="Selecciona tus preferencias para comenzar.";resultado.innerHTML='<div class="vacio"><div class="vacio-icono">▦</div><h3>Consulta pendiente</h3><p>Presiona «Consultar horarios» para ver la disponibilidad.</p></div>';}

function ocupado(id,dia,hora,sucursalNombre){
  const clave=`${id}|${dia}|${hora}|${sucursalNombre}`;
  let suma=0;
  for(let i=0;i<clave.length;i++)suma=(suma*31+clave.charCodeAt(i))%1000003;
  return suma%5===0 || suma%7===0;
}
$("formulario").addEventListener("submit",event=>{
  event.preventDefault();error.hidden=true;
  const medico=profesionales.find(p=>p.id===profesional.value);
  const fechaElegida=fecha.value;
  const dia=fechaElegida?new Date(`${fechaElegida}T12:00:00`):null;
  if(!especialidad.value||!medico||!sucursal.value||!dia||Number.isNaN(dia.getTime()))return mostrarError("Completa todos los campos antes de consultar.");
  if(fechaElegida<hoy)return mostrarError("Selecciona una fecha de hoy en adelante.");
  if(!medico.sucursales.includes(sucursal.value))return mostrarError("Este profesional no atiende en la sucursal seleccionada. Prueba con otra sucursal.");
  $("subtitulo-resultados").textContent="Resultado de tu consulta";
  resultado.replaceChildren();
  const resumen=document.createElement("div");resumen.className="resumen";
  resumen.textContent=`${medico.nombre} · ${medico.especialidad} · ${sucursal.value} · ${dia.toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}`;
  resultado.append(resumen);
  if([0,6].includes(dia.getDay())){const aviso=document.createElement("p");aviso.className="sin-horarios";aviso.textContent="No hay atención programada los fines de semana. Selecciona un día hábil.";resultado.append(aviso);return;}
  const leyenda=document.createElement("div");leyenda.className="leyenda";leyenda.innerHTML='<span><span class="punto"></span>Disponible</span><span><span class="punto ocupado"></span>Ocupado</span>';resultado.append(leyenda);
  const contenedor=document.createElement("div");contenedor.className="horarios";
  let disponibles=0;
  medico.horarios.forEach(hora=>{
    const estaOcupado=ocupado(medico.id,fechaElegida,hora,sucursal.value) || window.LUMA_RESERVAS.existe(medico.id,fechaElegida,hora,sucursal.value);
    if(!estaOcupado)disponibles++;
    const casilla=document.createElement(estaOcupado?"div":"button");casilla.className=`horario${estaOcupado?" ocupado":""}`;
    if(!estaOcupado){casilla.type="button";casilla.addEventListener("click",()=>window.LUMA_RESERVAS.abrir(medico,fechaElegida,hora,sucursal.value));}
    casilla.textContent=hora;casilla.setAttribute("aria-label",`${hora}: ${estaOcupado?"ocupado":"disponible"}`);
    contenedor.append(casilla);
  });
  resultado.append(contenedor);
  const contador=document.createElement("p");contador.className="contador";contador.textContent=`${disponibles} horario(s) disponible(s) de ${medico.horarios.length}. Selecciona un horario verde para reservar (HU-02).`;resultado.append(contador);
});
function mostrarError(mensaje){error.textContent=mensaje;error.hidden=false;$("subtitulo-resultados").textContent="Corrige los filtros para continuar.";}
