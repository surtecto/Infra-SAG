// Interfaz: mapa, pestañas por red, fichas, formularios y cuenta.
import { REDES, CLASES, ESTADOS_INT, ROLES, puede, camposIntervencion, COLOR_SIN_DATO } from './catalogo.js';
import { APP } from './config.js';
import * as D from './datos.js';
const { est } = D;

const ui = {
  red: localStorage.getItem('red') || 'agua',
  vista: 'resumen', selId: null, intId: null,
  ocultos: new Set(), soloFaltantes: false, filtroInt: 'activas',
  borrador: null, refs: new Set(JSON.parse(localStorage.getItem('refs') || '["manzanas"]')),
  modo: null, pos: null, clicElemento: null,
  parcOn: localStorage.getItem('parc') === '1', parcModo: localStorage.getItem('parcModo') || 'borde', parcSel: null,
};
if (!REDES[ui.red]) ui.red = 'agua';

// ---------- utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const hoy = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const fecha = (s) => s ? String(s).slice(0, 10).split('-').reverse().join('/') : '';
const fechaHora = (s) => s ? new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '';
const tieneDato = (v) => v !== undefined && v !== null && v !== '';
const r6 = (n) => Math.round(n * 1e6) / 1e6;

function largo(g) {
  if (!g || g.type !== 'LineString') return 0;
  let m = 0; const R = 6371008.8, rad = Math.PI / 180, c = g.coordinates;
  for (let i = 1; i < c.length; i++) {
    const dLat = (c[i][1] - c[i - 1][1]) * rad, dLon = (c[i][0] - c[i - 1][0]) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(c[i - 1][1] * rad) * Math.cos(c[i][1] * rad) * Math.sin(dLon / 2) ** 2;
    m += 2 * R * Math.asin(Math.sqrt(a));
  }
  return m;
}
function centro(g) {
  if (g.type === 'Point') return g.coordinates;
  const c = g.coordinates; return c[Math.floor(c.length / 2)];
}
const tipoDe = (e) => REDES[e.red]?.tipos[e.tipo];
const completo = (e) => (tipoDe(e)?.clave || []).every((k) => tieneDato(e.props?.[k]));
function colorDe(e) {
  const t = tipoDe(e); if (!t) return COLOR_SIN_DATO;
  if (t.colorPor) return t.colorPor.valores[e.props?.[t.colorPor.campo]] || COLOR_SIN_DATO;
  return t.color || REDES[e.red].color;
}
function nombreDe(e) {
  const t = tipoDe(e), p = e.props || {};
  const det = p.nombre || p.calle || p.codigo || (tieneDato(p.numero) ? `N.º ${p.numero}` : '') || p.domicilio || '';
  return det ? `${t?.nombre || e.tipo}: ${det}` : (t?.nombre || e.tipo);
}
const tituloInt = (i) => i.datos?.titulo || i.datos?.subtipo || CLASES[i.clase]?.nombre || 'Intervención';
const rol = () => est.perfil?.rol || 'visualizador';

function aviso(texto, opc = {}) {
  const d = document.createElement('div');
  d.className = 'aviso' + (opc.error ? ' error' : '');
  d.innerHTML = `<span>${h(texto)}</span>`;
  if (opc.boton) { const b = document.createElement('button'); b.textContent = opc.boton; b.onclick = () => { d.remove(); opc.accion(); }; d.append(b); }
  $('#avisos').append(d);
  if (!opc.fijo) setTimeout(() => d.remove(), opc.error ? 7000 : 3500);
}

// ---------- mapa ----------
const mapa = L.map('mapa', { preferCanvas: true, renderer: L.canvas({ tolerance: 10, padding: 0.4 }), maxZoom: 21, zoomSnap: 0.5 })
  .setView(JSON.parse(localStorage.getItem('vista') || 'null')?.c || APP.centro, JSON.parse(localStorage.getItem('vista') || 'null')?.z || APP.zoom);
mapa.attributionControl.setPrefix(false);
mapa.createPane('ref').style.zIndex = 350;
mapa.on('moveend', () => localStorage.setItem('vista', JSON.stringify({ c: [mapa.getCenter().lat, mapa.getCenter().lng], z: mapa.getZoom() })));
if (mapa.pm) mapa.pm.setLang('es');

const FONDOS = {
  'Calles (OpenStreetMap)': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 21, crossOrigin: 'anonymous', attribution: '© OpenStreetMap' }),
  'Satélite (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 21, crossOrigin: 'anonymous', attribution: 'Esri, Maxar, Earthstar Geographics' }),
  'Argenmap (IGN)': L.tileLayer('https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png', { maxNativeZoom: 18, maxZoom: 21, attribution: 'Instituto Geográfico Nacional' }),
  'Sin fondo': L.layerGroup(),
};
(FONDOS[localStorage.getItem('fondo')] || FONDOS['Calles (OpenStreetMap)']).addTo(mapa);
L.control.layers(FONDOS, null, { position: 'topright' }).addTo(mapa);
mapa.on('baselayerchange', (e) => localStorage.setItem('fondo', e.name));
L.control.scale({ imperial: false }).addTo(mapa);

const capaRef = L.layerGroup().addTo(mapa);
const capaRed = L.layerGroup().addTo(mapa);
const capaSel = L.layerGroup().addTo(mapa);
const capaInt = L.layerGroup().addTo(mapa);
const capaYo = L.layerGroup().addTo(mapa);
const capaParc = L.layerGroup().addTo(mapa);
const capaParcSel = L.layerGroup().addTo(mapa);
const aLatLng = (c) => [c[1], c[0]];

let referencia = null;
const REFS = {
  manzanas: { nombre: 'Manzanas', estilo: { color: '#9AA5AE', weight: 1, fillColor: '#FFFFFF', fillOpacity: 0.35 } },
  cursos_agua: { nombre: 'Cursos de agua', estilo: { color: '#4FA3D9', weight: 2 } },
  cotas: { nombre: 'Puntos acotados (cota IGN)' },
};
async function pintarRef() {
  capaRef.clearLayers();
  if (!ui.refs.size) return;
  if (!referencia) { try { referencia = await (await fetch('datos/referencia.json')).json(); } catch { return; } }
  const lienzo = L.svg({ pane: 'ref' });
  for (const k of ui.refs) {
    if (!referencia[k]) continue;
    if (k === 'cotas') {
      L.geoJSON(referencia[k], { pointToLayer: (f, ll) => L.circleMarker(ll, { pane: 'ref', renderer: lienzo, radius: 3, color: '#33414D', weight: 1, fillColor: '#fff', fillOpacity: 1, interactive: false })
        .bindTooltip(String(f.properties.cota || ''), { permanent: true, direction: 'right', className: 'cota', offset: [4, 0], pane: 'ref' }) }).addTo(capaRef);
    } else L.geoJSON(referencia[k], { pane: 'ref', renderer: lienzo, interactive: false, style: REFS[k].estilo }).addTo(capaRef);
  }
}

function visibles() {
  return D.elementosDe(ui.red).filter((e) => !ui.ocultos.has(e.tipo) && !(ui.soloFaltantes && completo(e)));
}
function pintarRed() {
  capaRed.clearLayers();
  const els = visibles().sort((a, b) => (a.geom.type === 'Point') - (b.geom.type === 'Point'));
  for (const e of els) {
    const c = colorDe(e);
    const capa = e.geom.type === 'Point'
      ? L.circleMarker(aLatLng(e.geom.coordinates), { radius: 7, color: '#fff', weight: 2, fillColor: c, fillOpacity: 1 })
      : L.polyline(e.geom.coordinates.map(aLatLng), { color: c, weight: 3.5, opacity: 0.92 });
    capa.on('click', (ev) => {
      if (ui.modo) return;
      L.DomEvent.stopPropagation(ev);
      ui.clicElemento = { id: e.id, pt: [r6(ev.latlng.lng), r6(ev.latlng.lat)] };
      abrirElemento(e.id);
    });
    capa.addTo(capaRed);
  }
  pintarSel();
}
function pintarSel() {
  capaSel.clearLayers();
  const e = ui.selId && est.elementos.get(ui.selId);
  if (!e || e.deleted || e.red !== ui.red) return;
  (e.geom.type === 'Point'
    ? L.circleMarker(aLatLng(e.geom.coordinates), { radius: 13, color: '#FFD400', weight: 4, fill: false, interactive: false })
    : L.polyline(e.geom.coordinates.map(aLatLng), { color: '#FFD400', weight: 10, opacity: 0.6, interactive: false })).addTo(capaSel);
}
function intsFiltradas() {
  return D.intervencionesDe(ui.red)
    .filter((i) => ui.filtroInt === 'todas' || i.estado === 'abierta' || i.estado === 'en_curso')
    .sort((a, b) => String(b.datos?.fecha || '').localeCompare(String(a.datos?.fecha || '')) || String(b.updated_at).localeCompare(String(a.updated_at)));
}
function pintarInt() {
  capaInt.clearLayers();
  for (const i of intsFiltradas()) {
    if (!i.geom) continue;
    L.marker(aLatLng(i.geom.coordinates), {
      icon: L.divIcon({ className: '', html: `<div class="rombo-mapa" style="--c:${ESTADOS_INT[i.estado]?.color || '#888'}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }),
      title: tituloInt(i),
    }).on('click', (ev) => { if (ui.modo) return; L.DomEvent.stopPropagation(ev); abrirIntervencion(i.id); }).addTo(capaInt);
  }
}

// ---------- parcelas (capa de consulta) ----------
// Se dibujan solo las que caen dentro de la vista y a partir de cierto zoom, para que el celular no se trabe.
// Usan el mismo lienzo que la red y quedan siempre por debajo de ella.
const ZOOM_PARC = 16;
const SERV = { si: '#3E9B8F', no: '#E08E2B' };
const parcDib = new Map();
let parcIdx = null, parcVer = 0, parcTimer = null;
const poligonos = (g) => g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
function parcIndice() {
  if (parcIdx && parcIdx.v === parcVer) return parcIdx.l;
  const l = [];
  for (const p of est.parcelas.values()) {
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
    for (const poly of poligonos(p.geom)) for (const [x, y] of poly[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    l.push({ p, x0, y0, x1, y1 });
  }
  parcIdx = { v: parcVer, l }; return l;
}
function estiloParc(p) {
  const b = { color: '#6B5E4B', weight: 1, opacity: 0.85, fill: true, fillColor: '#FFFFFF', fillOpacity: 0.03, pmIgnore: true };
  if (ui.parcModo === 'agua' || ui.parcModo === 'cloaca') return { ...b, fillColor: (ui.parcModo === 'agua' ? p.agua : p.cloaca) ? SERV.si : SERV.no, fillOpacity: 0.4 };
  return b;
}
const latlngsParc = (g) => L.GeoJSON.coordsToLatLngs(g.coordinates, g.type === 'Polygon' ? 1 : 2);
function pintarParc() {
  if (!ui.parcOn || mapa.getZoom() < ZOOM_PARC || !est.parcelas.size) { capaParc.clearLayers(); parcDib.clear(); return; }
  const b = mapa.getBounds().pad(0.15), w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth();
  const dentro = new Set();
  for (const r of parcIndice()) {
    if (r.x1 < w || r.x0 > e || r.y1 < s || r.y0 > n) continue;
    dentro.add(r.p.id); if (dentro.size >= 9000) break;
  }
  for (const [id, capa] of parcDib) if (!dentro.has(id)) { capaParc.removeLayer(capa); parcDib.delete(id); }
  for (const id of dentro) {
    if (parcDib.has(id)) continue;
    const p = est.parcelas.get(id);
    const capa = L.polygon(latlngsParc(p.geom), estiloParc(p));
    capa.on('click', (ev) => { if (ui.modo) return; L.DomEvent.stopPropagation(ev); abrirParcela(id); });
    capa.addTo(capaParc); capa.bringToBack(); parcDib.set(id, capa);
  }
}
function repintarParc() { parcVer++; capaParc.clearLayers(); parcDib.clear(); pintarParc(); pintarParcSel(); }
function pintarParcSel() {
  capaParcSel.clearLayers();
  const p = ui.parcSel && est.parcelas.get(ui.parcSel);
  if (p && ui.vista === 'parcela') L.polygon(latlngsParc(p.geom), { color: '#FFD400', weight: 4, fill: false, interactive: false, pmIgnore: true }).addTo(capaParcSel);
}
mapa.on('moveend', () => { clearTimeout(parcTimer); parcTimer = setTimeout(pintarParc, 120); });
function distPuntoSeg(q, a, b, kx, ky) {
  const ax = (a[0] - q[0]) * kx, ay = (a[1] - q[1]) * ky, bx = (b[0] - q[0]) * kx, by = (b[1] - q[1]) * ky;
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
// Distancia desde los vértices de la parcela hasta el tramo más cercano de una red (en metros).
function distRed(p, red) {
  const pts = poligonos(p.geom).flatMap((poly) => poly[0]);
  const kx = 111320 * Math.cos(pts[0][1] * Math.PI / 180), ky = 110574;
  let mejor = null;
  for (const e of D.elementosDe(red)) {
    if (e.geom.type !== 'LineString') continue;
    const c = e.geom.coordinates;
    for (let i = 1; i < c.length; i++) for (const q of pts) {
      const d = distPuntoSeg(q, c[i - 1], c[i], kx, ky);
      if (!mejor || d < mejor.m) mejor = { m: d, e };
    }
  }
  return mejor;
}
const domicilioParc = (p) => [p.calle, p.nro && p.nro !== '0' ? p.nro : ''].filter(Boolean).join(' ');
function irParcela(id) {
  const r = parcIndice().find((x) => x.p.id === id); if (!r) return;
  if (!ui.parcOn) { ui.parcOn = true; localStorage.setItem('parc', '1'); }
  mapa.fitBounds([[r.y0, r.x0], [r.y1, r.x1]], { maxZoom: 19, padding: [60, 60] });
  pintarParc(); abrirParcela(id);
}
function buscarParcela(texto) {
  const q = texto.trim().toLowerCase(), cont = $('#resultadosParcela'); if (!cont) return;
  if (q.length < 3) { cont.innerHTML = ''; return; }
  const dig = q.replace(/\D/g, ''), res = [];
  for (const p of est.parcelas.values()) {
    if ((dig.length >= 3 && (p.partida || '').includes(dig)) || (p.cca || '').toLowerCase().includes(q) || `${p.calle || ''} ${p.nro || ''}`.toLowerCase().includes(q)) { res.push(p); if (res.length >= 8) break; }
  }
  cont.innerHTML = res.map((p, i) => `<button data-i="${i}">${h(domicilioParc(p) || 'Sin domicilio')} <small>Partida ${h(p.partida || '—')}</small></button>`).join('') || '<p class="nota">Sin coincidencias.</p>';
  cont.querySelectorAll('button').forEach((bt) => { bt.onclick = () => irParcela(res[bt.dataset.i].id); });
}
function encuadrar(geoms) {
  const pts = geoms.flatMap((g) => g.type === 'Point' ? [g.coordinates] : g.coordinates).map(aLatLng);
  if (!pts.length) return;
  mapa.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 18 });
}
mapa.on('click', (ev) => {
  if (ui.modo === 'punto') return ui.alPunto?.({ type: 'Point', coordinates: [r6(ev.latlng.lng), r6(ev.latlng.lat)] });
  if (!ui.modo && (ui.vista === 'elemento' || ui.vista === 'intervencion' || ui.vista === 'parcela')) { ui.selId = null; ui.parcSel = null; ir('resumen'); pintarSel(); pintarParcSel(); }
});

// GPS
const CtlGps = L.Control.extend({
  options: { position: 'topleft' },
  onAdd() {
    const d = L.DomUtil.create('div', 'leaflet-bar ctl-gps');
    const a = L.DomUtil.create('a', '', d); a.href = '#'; a.title = 'Mostrar mi ubicación'; a.setAttribute('role', 'button'); a.textContent = '◎';
    L.DomEvent.on(a, 'click', (ev) => { L.DomEvent.stop(ev); alternarGps(a); });
    return d;
  },
});
new CtlGps().addTo(mapa);
let gpsActivo = false, gpsCentrado = false;
function alternarGps(a) {
  gpsActivo = !gpsActivo; a.classList.toggle('activo', gpsActivo);
  if (!gpsActivo) { mapa.stopLocate(); capaYo.clearLayers(); ui.pos = null; return; }
  gpsCentrado = false;
  mapa.locate({ watch: true, enableHighAccuracy: true, setView: false });
}
mapa.on('locationfound', (ev) => {
  ui.pos = { geom: { type: 'Point', coordinates: [r6(ev.latlng.lng), r6(ev.latlng.lat)] }, precision: ev.accuracy };
  capaYo.clearLayers();
  L.circle(ev.latlng, { radius: ev.accuracy, color: '#1A73E8', weight: 1, fillOpacity: 0.1, interactive: false }).addTo(capaYo);
  L.marker(ev.latlng, { icon: L.divIcon({ className: '', html: '<div class="yo"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false }).addTo(capaYo);
  if (!gpsCentrado) { gpsCentrado = true; mapa.setView(ev.latlng, Math.max(mapa.getZoom(), 17)); }
});
mapa.on('locationerror', () => aviso('No se pudo obtener la ubicación. Revisá que el GPS esté activo y que la app tenga permiso.', { error: true }));

// ---------- modos de dibujo ----------
let tmp = null;
function barra(texto, botones) {
  const b = $('#barraEdicion'); b.hidden = false; b.innerHTML = `<p>${h(texto)}</p>`;
  for (const x of botones) { const bt = document.createElement('button'); bt.className = 'btn' + (x.pri ? ' pri' : ''); bt.textContent = x.t; bt.onclick = x.f; b.append(bt); }
  document.body.classList.add('editando', 'panel-min'); etiquetaPanel();
  setTimeout(() => mapa.invalidateSize(), 250);
}
function terminarModo() {
  ui.modo = null; ui.alPunto = null;
  try { mapa.pm.disableDraw(); } catch { /* sin dibujo activo */ }
  mapa.off('pm:create');
  if (tmp) { tmp.remove(); tmp = null; }
  $('#barraEdicion').hidden = true;
  document.body.classList.remove('editando', 'panel-min'); etiquetaPanel();
  setTimeout(() => mapa.invalidateSize(), 250);
}
function pedirPunto(texto, listo) {
  ui.modo = 'punto';
  ui.alPunto = (g) => { terminarModo(); listo(g); };
  barra(texto, [
    { t: 'Usar mi ubicación', f: () => {
      if (ui.pos) return ui.alPunto(ui.pos.geom);
      if (!navigator.geolocation) return aviso('Este equipo no informa su ubicación.', { error: true });
      navigator.geolocation.getCurrentPosition((p) => ui.alPunto?.({ type: 'Point', coordinates: [r6(p.coords.longitude), r6(p.coords.latitude)] }),
        () => aviso('No se pudo obtener la ubicación.', { error: true }), { enableHighAccuracy: true, timeout: 15000 });
    } },
    { t: 'Cancelar', f: () => { terminarModo(); pintarPanel(); } },
  ]);
}
function pedirLinea(listo) {
  ui.modo = 'linea';
  const c = REDES[ui.red].color;
  mapa.pm.enableDraw('Line', { snappable: true, snapDistance: 18, templineStyle: { color: c, weight: 4 }, hintlineStyle: { color: c, dashArray: '5 6' } });
  mapa.once('pm:create', (ev) => {
    const g = ev.layer.toGeoJSON().geometry; ev.layer.remove();
    g.coordinates = g.coordinates.map((p) => [r6(p[0]), r6(p[1])]);
    terminarModo(); listo(g);
  });
  barra('Marcá cada vértice sobre el mapa. Para terminar, tocá de nuevo el último punto.', [{ t: 'Cancelar', f: () => { terminarModo(); pintarPanel(); } }]);
}
function editarTrazado(e) {
  ui.modo = 'trazado';
  if (e.geom.type === 'Point') tmp = L.marker(aLatLng(e.geom.coordinates), { draggable: true }).addTo(mapa);
  else { tmp = L.polyline(e.geom.coordinates.map(aLatLng), { renderer: L.svg(), color: '#FFD400', weight: 5 }).addTo(mapa); tmp.pm.enable({ snappable: true, snapDistance: 18 }); }
  barra(e.geom.type === 'Point' ? 'Arrastrá el marcador a la posición correcta.' : 'Arrastrá los vértices. Tocá un punto intermedio para agregar uno; botón derecho o toque largo para quitarlo.', [
    { t: 'Guardar trazado', pri: true, f: async () => {
      const g = tmp.toGeoJSON().geometry;
      g.coordinates = g.type === 'Point' ? g.coordinates.map(r6) : g.coordinates.map((p) => [r6(p[0]), r6(p[1])]);
      terminarModo();
      await D.guardarElemento({ ...e, geom: g });
      aviso('Trazado guardado');
    } },
    { t: 'Cancelar', f: () => { terminarModo(); pintarPanel(); } },
  ]);
}

// ---------- panel ----------
function ir(vista) { ui.vista = vista; pintarPanel(); $('#panel').scrollTop = 0; }
function abrirElemento(id) { ui.selId = id; ui.intId = null; ui.parcSel = null; pintarParcSel(); document.body.classList.remove('panel-min'); etiquetaPanel(); ir('elemento'); pintarSel(); }
function abrirParcela(id) { ui.parcSel = id; ui.selId = null; ui.intId = null; document.body.classList.remove('panel-min'); etiquetaPanel(); pintarSel(); ir('parcela'); pintarParcSel(); }
function abrirIntervencion(id) { ui.intId = id; document.body.classList.remove('panel-min'); etiquetaPanel(); ir('intervencion'); }
function etiquetaPanel() { $('#btnPanel').textContent = document.body.classList.contains('panel-min') ? 'Mostrar panel' : 'Ampliar mapa'; }

function pintarPestanas() {
  $('#pestanas').innerHTML = Object.entries(REDES).map(([k, r]) => {
    const n = D.intervencionesDe(k).filter((i) => i.estado === 'abierta').length;
    return `<button class="pestana" role="tab" aria-selected="${k === ui.red}" data-acc="red" data-red="${k}" style="--c:${r.color}">${h(r.nombre)}${n ? `<span class="cuenta-int" title="Intervenciones abiertas">${n}</span>` : ''}</button>`;
  }).join('');
}
function pintarEstado() {
  const b = $('#btnSync'); let cls = '', t = 'Al día';
  if (est.modo === 'local') { cls = 'pend'; t = 'Demostración'; }
  else if (!est.enLinea) { cls = 'sin'; t = est.pendientes ? `Sin señal, ${est.pendientes} por enviar` : 'Sin señal'; }
  else if (est.sincronizando) { cls = 'girando'; t = 'Sincronizando'; }
  else if (est.rechazados.length) { cls = 'error'; t = `${est.rechazados.length} sin aceptar`; }
  else if (est.pendientes) { cls = 'pend'; t = `${est.pendientes} por enviar`; }
  else if (est.errorSync) { cls = 'error'; t = 'Sin servidor'; }
  b.className = 'chip ' + cls; b.innerHTML = `<i></i>${h(t)}`;
  $('#btnCuenta').textContent = (est.perfil?.nombre || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const VISTAS = {
  resumen() {
    const red = REDES[ui.red], els = D.elementosDe(ui.red), editor = puede.editarRed(rol());
    const km = els.reduce((s, e) => s + largo(e.geom), 0) / 1000;
    const porTipo = {}; for (const e of els) (porTipo[e.tipo] ||= []).push(e);
    const capas = Object.entries(red.tipos).map(([k, t]) => {
      const lista = porTipo[k] || [];
      let ley = '';
      if (t.colorPor && lista.length) {
        const g = {}; for (const e of lista) { const v = e.props?.[t.colorPor.campo]; const key = t.colorPor.valores[v] ? v : 'Sin dato'; (g[key] ||= { n: 0, m: 0 }); g[key].n++; g[key].m += largo(e.geom); }
        ley = `<div class="leyenda">${Object.entries(g).sort((a, b) => b[1].m - a[1].m).map(([v, d]) =>
          `<div><span class="simb linea" style="--c:${t.colorPor.valores[v] || COLOR_SIN_DATO}"></span>${h(v)}<b>${nf.format(d.m / 1000)} km</b></div>`).join('')}</div>`;
      }
      return `<div class="capa">
        <input class="ver" type="checkbox" ${ui.ocultos.has(k) ? '' : 'checked'} data-cambio="verTipo" data-tipo="${k}" aria-label="Mostrar ${h(t.plural)}">
        <span class="nom"><span class="simb ${t.geom === 'linea' ? 'linea' : 'punto'}" style="--c:${t.color || red.color}"></span>${h(t.plural)}</span>
        <span class="cant">${lista.length}</span>
        ${editor ? `<button class="btn mini" data-acc="agregar" data-tipo="${k}">Agregar</button>` : '<span></span>'}
      </div>${ley}`;
    }).join('');
    const avances = Object.entries(red.tipos).filter(([k]) => porTipo[k]?.length).map(([k, t]) => {
      const n = porTipo[k].length, ok = porTipo[k].filter(completo).length;
      const et = t.clave.map((c) => t.campos.find((x) => x.k === c)?.n.toLowerCase()).join(', ');
      return `<div class="avance"><div class="rot"><span>${h(t.plural)} con ${h(et)}</span><b>${ok} de ${n}</b></div><div class="pista"><i style="width:${n ? (ok / n) * 100 : 0}%"></i></div></div>`;
    }).join('');
    const ints = intsFiltradas(), clases = puede.clases(rol());
    return `
      <div class="cab"><h1>${h(red.nombre)}</h1><p>${nf.format(km)} km de red y ${els.length} elementos cargados</p></div>
      ${est.modo === 'local' ? '<div class="banda-demo">Modo demostración: los cambios quedan solo en este equipo.</div>' : ''}
      ${!est.elementos.size && puede.administrar(rol()) ? '<div class="sec"><p class="vacio">Todavía no hay redes cargadas. Importá las capas convertidas desde el SIG municipal.</p><p style="margin:10px 0 0"><button class="btn pri" data-acc="cuenta">Ir a importar las capas</button></p></div>' : ''}
      <div class="sec"><input class="buscar" id="buscar" type="search" placeholder="Buscar calle o camino" autocomplete="off"><div class="resultados" id="resultados"></div></div>
      <div class="sec"><h2>Elementos de la red <button class="btn mini" data-acc="encuadrar">Ver toda la red</button></h2>${capas}</div>
      <div class="sec"><h2>Relevamiento</h2>
        <p class="nota" style="margin-top:0">Cuánto de la red ya tiene cargados los datos técnicos básicos.</p>${avances || '<p class="vacio">Todavía no hay elementos en esta red.</p>'}
        <label class="interruptor"><input type="checkbox" data-cambio="soloFaltantes" ${ui.soloFaltantes ? 'checked' : ''}> Mostrar en el mapa solo lo que falta relevar</label>
      </div>
      <div class="sec"><h2>Intervenciones
          <span class="segm"><button data-acc="filtroInt" data-v="activas" aria-pressed="${ui.filtroInt === 'activas'}">Activas</button><button data-acc="filtroInt" data-v="todas" aria-pressed="${ui.filtroInt === 'todas'}">Todas</button></span></h2>
        ${clases.length ? `<button class="btn pri" data-acc="nuevaInt">Registrar ${clases.length === 2 ? 'falla o inspección' : 'intervención'}</button>` : ''}
        <div class="lista-int">${ints.slice(0, 40).map(tarjetaInt).join('') || `<p class="vacio">${ui.filtroInt === 'activas' ? 'No hay fallas ni trabajos abiertos en esta red.' : 'Todavía no se registró ninguna intervención.'}</p>`}</div>
        ${ints.length > 40 ? `<p class="nota">Se muestran las 40 más recientes de ${ints.length}.</p>` : ''}
      </div>
      <div class="sec"><h2>Parcelas${est.parcelas.size ? ` <small class="nota">${est.parcelas.size.toLocaleString('es-AR')}</small>` : ''}</h2>
        ${est.parcelas.size ? `<label class="interruptor"><input type="checkbox" data-cambio="verParc" ${ui.parcOn ? 'checked' : ''}> Mostrar parcelas en el mapa</label>
          <div class="campo"><label for="parcModo">Colorear según</label><select id="parcModo" data-cambio="parcModo">
            ${[['borde', 'Solo el borde'], ['agua', 'Agua corriente'], ['cloaca', 'Cloaca']].map(([k, n]) => `<option value="${k}" ${ui.parcModo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          ${ui.parcModo !== 'borde' ? (() => { let si = 0; for (const p of est.parcelas.values()) if (ui.parcModo === 'agua' ? p.agua : p.cloaca) si++;
            return `<div class="leyenda"><div><span class="simb punto" style="--c:${SERV.si}"></span>Con servicio según el SIG<b>${si.toLocaleString('es-AR')}</b></div><div><span class="simb punto" style="--c:${SERV.no}"></span>Sin servicio<b>${(est.parcelas.size - si).toLocaleString('es-AR')}</b></div></div>`; })() : ''}
          <input class="buscar" id="buscarParcela" type="search" placeholder="Buscar por partida, nomenclatura o calle" autocomplete="off" style="margin-top:10px"><div class="resultados" id="resultadosParcela"></div>
          <p class="nota">Se dibujan desde el nivel de zoom ${ZOOM_PARC}: acercá el mapa. Tocá una parcela para ver su ficha.</p>`
        : `<p class="vacio">Todavía no hay parcelas cargadas.${puede.administrar(rol()) ? '</p><p style="margin:10px 0 0"><button class="btn" data-acc="cuenta">Ir a importar las parcelas</button>' : ' Las carga un administrador.'}</p>`}
      </div>
      <div class="sec"><h2>Referencias</h2>
        ${Object.entries(REFS).map(([k, r]) => `<label class="interruptor" style="margin-top:4px"><input type="checkbox" data-cambio="ref" data-k="${k}" ${ui.refs.has(k) ? 'checked' : ''}> ${h(r.nombre)}</label>`).join('')}
      </div>
      <div class="sec"><h2>Exportar</h2><div class="fila-btn">
        <button class="btn" data-acc="exportarRed">Red en GeoJSON</button>
        <button class="btn" data-acc="exportarInt">Intervenciones en CSV</button></div>
        <p class="nota">El GeoJSON se abre directamente en QGIS.</p></div>`;
  },

  parcela() {
    const p = est.parcelas.get(ui.parcSel);
    if (!p) return `<div class="cab"><button class="volver" data-acc="volver">‹ Volver a la red</button><h1>Parcela no disponible</h1><p>Todavía no se descargó o fue dada de baja.</p></div>`;
    const serv = (red, nombre, tiene) => {
      const d = distRed(p, red);
      const cerca = d ? `${nf.format(d.m)} m${d.e.props?.calle ? ` (${h(d.e.props.calle)})` : ''}` : '<span class="sd">Sin datos de esa red</span>';
      const alerta = tiene && d && d.m > 40 ? `<br><span class="falta">Figura con ${nombre} pero la red cargada más cercana está a ${nf.format(d.m)} m: conviene revisarlo.</span>` : '';
      return `<tr><th>${nombre[0].toUpperCase() + nombre.slice(1)}</th><td>${tiene ? 'Sí' : 'No'} <span class="sd">(según el SIG)</span></td></tr>
        <tr><th>Red más cercana</th><td>${cerca}${alerta}</td></tr>`;
    };
    return `
      <div class="cab"><button class="volver" data-acc="volver">‹ Volver a la red</button><h1>${h(domicilioParc(p) || 'Parcela sin domicilio')}</h1><p>Partida ${h(p.partida || 'sin dato')}</p></div>
      <div class="sec"><table class="ficha">
        <tr><th>Nomenclatura</th><td style="word-break:break-all">${h(p.cca || 'Sin dato')}</td></tr>
        <tr><th>Tipo</th><td>${h(p.tipo || 'Sin dato')}</td></tr>
        <tr><th>Superficie</th><td>${tieneDato(p.sup) ? `${nf.format(p.sup)} m²` : 'Sin dato'}</td></tr>
        <tr><th>Zona del COU</th><td>${h(p.zona || 'Sin dato')}</td></tr>
        ${serv('agua', 'agua corriente', p.agua)}${serv('cloaca', 'cloaca', p.cloaca)}</table>
        <p class="nota">Datos del SIG municipal (parcelas 2024). La distancia se mide desde los límites de la parcela hasta los tramos cargados en la app, así que depende de qué tan completo esté el trazado.</p></div>`;
  },

  elemento() {
    const e = est.elementos.get(ui.selId);
    if (!e || e.deleted) return `<div class="cab"><button class="volver" data-acc="volver">‹ Volver a la red</button><h1>Elemento no disponible</h1><p>Fue eliminado o todavía no se sincronizó.</p></div>`;
    const t = tipoDe(e), p = e.props || {}, editor = puede.editarRed(rol());
    const filas = (t?.campos || []).map((c) => {
      const v = p[c.k];
      const val = tieneDato(v) ? h(c.t === 'fecha' ? fecha(v) : c.t === 'num' && !/anio|numer|codigo|id_sig/.test(c.k) ? nf.format(v) : v) + (c.u ? ` ${h(c.u)}` : '')
        : (t.clave.includes(c.k) ? '<span class="falta">Falta relevar</span>' : '<span class="sd">Sin dato</span>');
      return `<tr><th>${h(c.n)}</th><td>${val}</td></tr>`;
    }).join('');
    const ints = D.intervencionesDeElemento(e.id).sort((a, b) => String(b.datos?.fecha).localeCompare(String(a.datos?.fecha)));
    return `
      <div class="cab"><button class="volver" data-acc="volver">‹ Volver a la red</button><h1>${h(nombreDe(e))}</h1>
        <p>${e.geom.type === 'LineString' ? `${nf.format(largo(e.geom))} m medidos sobre el mapa` : `${e.geom.coordinates[1].toFixed(6)}, ${e.geom.coordinates[0].toFixed(6)}`}</p></div>
      ${editor ? `<div class="sec"><div class="fila-btn">
        <button class="btn pri" data-acc="editarDatos">Editar datos</button>
        <button class="btn" data-acc="editarTrazado">${e.geom.type === 'Point' ? 'Mover' : 'Editar trazado'}</button>
        <button class="btn peligro" data-acc="borrarElemento">Eliminar</button></div></div>` : ''}
      <div class="sec"><table class="ficha">${filas}</table>
        <p class="nota">${p.fuente ? `Origen: ${h(p.fuente)}. ` : ''}${e.updated_nombre ? `Última modificación: ${h(e.updated_nombre)}, ${fechaHora(e.updated_at)}.` : ''}</p></div>
      <div class="sec"><h2>Historial de este elemento</h2>
        ${puede.clases(rol()).length ? '<button class="btn pri" data-acc="nuevaIntElemento">Registrar falla, inspección o trabajo</button>' : ''}
        <div class="lista-int">${ints.map(tarjetaInt).join('') || '<p class="vacio">Sin fallas ni trabajos registrados.</p>'}</div></div>`;
  },

  formElemento() {
    const b = ui.borrador, t = REDES[b.red].tipos[b.tipo];
    return `
      <div class="cab"><h1>${b.nuevo ? `Agregar: ${h(t.nombre.toLowerCase())}` : 'Editar datos'}</h1><p>${b.nuevo ? 'Completá lo que sepas ahora; el resto se puede cargar después.' : h(nombreDe(b))}</p></div>
      <div class="sec"><form id="form" data-form="elemento" novalidate>
        <div id="errForm"></div>
        ${t.campos.map((c) => campoHtml(c, b.props?.[c.k])).join('')}
        <div class="pie-form"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-acc="cancelarForm">Cancelar</button></div>
      </form></div>`;
  },

  intervencion() {
    const i = est.intervenciones.get(ui.intId);
    if (!i || i.deleted) return `<div class="cab"><button class="volver" data-acc="volver">‹ Volver a la red</button><h1>Intervención no disponible</h1></div>`;
    const d = i.datos || {}, e = i.elemento_id && est.elementos.get(i.elemento_id);
    const edita = puede.editarInt(est.perfil || {}, i);
    const filas = camposIntervencion(i.red, i.clase).filter((c) => c.k !== 'titulo' && tieneDato(d[c.k])).map((c) =>
      `<tr><th>${h(c.n)}</th><td>${h(c.t === 'fecha' ? fecha(d[c.k]) : c.t === 'num' ? nf.format(d[c.k]) : d[c.k])}${c.u && c.u !== '$' ? ` ${h(c.u)}` : ''}</td></tr>`).join('');
    setTimeout(() => cargarFotos(i.fotos || []), 0);
    return `
      <div class="cab"><button class="volver" data-acc="${e ? 'verElementoInt' : 'volver'}">‹ ${e ? h(nombreDe(e)) : 'Volver a la red'}</button>
        <h1>${h(tituloInt(i))}</h1>
        <p><span class="sello" style="--c:${ESTADOS_INT[i.estado]?.color}">${h(ESTADOS_INT[i.estado]?.nombre || i.estado)}</span> ${h(CLASES[i.clase]?.nombre || i.clase)}</p></div>
      ${edita ? `<div class="sec"><div class="fila-btn">
        ${i.estado === 'abierta' ? '<button class="btn pri" data-acc="estadoInt" data-v="en_curso">Pasar a en curso</button>' : ''}
        ${i.estado === 'abierta' || i.estado === 'en_curso' ? `<button class="btn ${i.estado === 'en_curso' ? 'pri' : ''}" data-acc="estadoInt" data-v="resuelta">Marcar resuelta</button>` : ''}
        <button class="btn" data-acc="editarInt">Editar</button>
        ${puede.borrarInt(rol()) ? '<button class="btn peligro" data-acc="borrarInt">Eliminar</button>' : ''}</div></div>` : ''}
      <div class="sec"><table class="ficha">${filas}</table>
        ${i.geom ? '<p style="margin:10px 0 0"><button class="btn mini" data-acc="irInt">Ver en el mapa</button></p>' : '<p class="nota">Sin ubicación marcada.</p>'}
        <p class="nota">${i.updated_nombre ? `Última modificación: ${h(i.updated_nombre)}, ${fechaHora(i.updated_at)}.` : ''}</p></div>
      ${(i.fotos || []).length ? '<div class="sec"><h2>Fotos</h2><div class="fotos" id="fotos"></div></div>' : ''}`;
  },

  formIntervencion() {
    const b = ui.borrador, clases = b.nuevo ? puede.clases(rol()) : [b.clase];
    const e = b.elemento_id && est.elementos.get(b.elemento_id);
    setTimeout(() => cargarFotos(b.fotos || []), 0);
    return `
      <div class="cab"><h1>${b.nuevo ? 'Registrar' : 'Editar'} ${h(CLASES[b.clase].nombre.toLowerCase())}</h1><p>${e ? h(nombreDe(e)) : h(REDES[b.red].nombre)}</p></div>
      <div class="sec"><form id="form" data-form="intervencion" novalidate>
        <div id="errForm"></div>
        ${b.nuevo && clases.length > 1 ? `<div class="campo"><label for="f_clase">Qué se registra</label><select id="f_clase" name="clase" data-cambio="claseInt">${clases.map((c) => `<option value="${c}" ${c === b.clase ? 'selected' : ''}>${h(CLASES[c].nombre)}</option>`).join('')}</select></div>` : ''}
        ${camposIntervencion(b.red, b.clase).map((c) => campoHtml(c, b.datos?.[c.k])).join('')}
        <div class="campo"><label for="f_estado">Estado</label><select id="f_estado" name="estado">${Object.entries(ESTADOS_INT).map(([k, v]) => `<option value="${k}" ${k === b.estado ? 'selected' : ''}>${h(v.nombre)}</option>`).join('')}</select></div>
        <div class="campo"><label>Ubicación</label>
          <div class="fila-btn" style="align-items:center"><span>${b.geom ? `${b.geom.coordinates[1].toFixed(5)}, ${b.geom.coordinates[0].toFixed(5)}` : 'Sin marcar'}</span>
          <button class="btn mini" type="button" data-acc="ubicarInt">${b.geom ? 'Cambiar' : 'Marcar en el mapa'}</button></div></div>
        <div class="campo"><label for="f_fotos">Fotos</label><input id="f_fotos" type="file" accept="image/*" multiple data-cambio="fotos"><div class="fotos" id="fotos"></div></div>
        <div class="pie-form"><button class="btn pri" type="submit">Guardar</button><button class="btn" type="button" data-acc="cancelarForm">Cancelar</button></div>
      </form></div>`;
  },

  cuenta() {
    const p = est.perfil || {}, nube = est.modo === 'nube';
    if (nube && puede.administrar(rol())) setTimeout(cargarUsuarios, 0);
    return `
      <div class="cab"><button class="volver" data-acc="volver">‹ Volver a la red</button><h1>${h(p.nombre || 'Cuenta')}</h1><p>${h(ROLES[p.rol]?.nombre || p.rol)}. ${h(ROLES[p.rol]?.desc || '')}</p></div>
      ${nube ? `<div class="sec"><h2>Sincronización</h2>
          <table class="ficha">
            <tr><th>Conexión</th><td>${est.enLinea ? 'Con señal' : 'Sin señal'}</td></tr>
            <tr><th>Cambios por enviar</th><td>${est.pendientes}</td></tr>
            ${est.parcelas.size ? `<tr><th>Parcelas en este equipo</th><td>${est.parcelas.size.toLocaleString('es-AR')}</td></tr>` : ''}
            <tr><th>Última sincronización</th><td>${est.ultimaSync ? fechaHora(est.ultimaSync) : 'Nunca'}</td></tr>
            ${est.errorSync ? `<tr><th>Último error</th><td>${h(est.errorSync)}</td></tr>` : ''}
          </table>
          ${est.rechazados.length ? `<div class="aviso-form" style="margin-top:10px">El servidor no aceptó ${est.rechazados.length} cambio(s), normalmente porque el perfil no tiene permiso para hacerlos.<br><small>${h(est.rechazados[0].error)}</small>
            <div style="margin-top:8px"><button class="btn mini" data-acc="descartar">Descartar esos cambios</button></div></div>` : ''}
          <div class="fila-btn" style="margin-top:10px"><button class="btn pri" data-acc="sync" ${est.enLinea ? '' : 'disabled'}>Sincronizar ahora</button><button class="btn" data-acc="salir">Cerrar sesión</button></div>
          <p class="nota">Antes de salir a una zona sin señal, recorré en el mapa el sector donde vas a trabajar: el fondo que se haya visto queda guardado en el equipo. Las redes se ven siempre.</p></div>`
      : `<div class="sec"><h2>Probar los perfiles</h2>
          <div class="campo"><label for="rolDemo">Ver la app como</label><select id="rolDemo" data-cambio="rolDemo">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${k === p.rol ? 'selected' : ''}>${h(r.nombre)}</option>`).join('')}</select></div>
          <p class="nota">${h(ROLES[p.rol]?.desc || '')}</p>
          <p class="nota">En modo demostración no hay claves ni datos compartidos. Para tener usuarios reales hay que conectar la base (ver LEEME).</p>
          <p style="margin:10px 0 0"><button class="btn peligro" data-acc="reiniciarDemo">Borrar todo lo cargado en este equipo</button></p></div>`}
      ${nube && puede.administrar(rol()) ? `<div class="sec"><h2>Usuarios</h2><div class="usuarios" id="usuarios"><p class="vacio">Cargando…</p></div>
          <p class="nota">Las cuentas nuevas quedan "sin habilitar" hasta que se les asigna un perfil acá.</p></div>` : ''}
      ${puede.administrar(rol()) ? `<div class="sec"><h2>Capas del SIG</h2><p class="nota" style="margin-top:0">Carga las redes convertidas desde el SIG municipal: elegí el archivo <strong>base.json</strong> de la carpeta datos_sig. No modifica lo que ya esté cargado.</p>
          <p style="margin:10px 0 0"><label class="btn" style="display:inline-flex;align-items:center">Elegir base.json<input type="file" accept=".json,application/json" data-cambio="importar" hidden></label> <span id="progImp" class="nota"></span></p>
          <p class="nota">Parcelas: elegí <strong>parcelas.json</strong> (misma carpeta). Primero hay que ejecutar <strong>03_parcelas.sql</strong> en Supabase. Se puede repetir para actualizar la capa.</p>
          <p style="margin:6px 0 0"><label class="btn" style="display:inline-flex;align-items:center">Elegir parcelas.json<input type="file" accept=".json,application/json" data-cambio="importarParc" hidden></label> <span id="progParc" class="nota"></span></p></div>` : ''}
      <div class="sec"><h2>Aplicación</h2><p class="nota" style="margin-top:0">${h(APP.nombre)} ${h(APP.version)}, ${h(APP.municipio)}.</p>
        <div class="fila-btn" style="margin-top:8px">${instalador ? '<button class="btn" data-acc="instalar">Instalar en este equipo</button>' : ''}<button class="btn" data-acc="buscarVersion">Buscar actualización</button></div></div>`;
  },
};

function tarjetaInt(i) {
  return `<button class="int" data-acc="abrirInt" data-id="${i.id}"><span class="rombo" style="--c:${ESTADOS_INT[i.estado]?.color}"></span>
    <span><strong>${h(tituloInt(i))}</strong><span>${h(CLASES[i.clase]?.nombre || '')}, ${h((ESTADOS_INT[i.estado]?.nombre || '').toLowerCase())}${i.datos?.fecha ? `, ${fecha(i.datos.fecha)}` : ''}</span></span></button>`;
}
function campoHtml(c, v) {
  const id = `f_${c.k}`, val = tieneDato(v) ? h(v) : '';
  let ctl;
  if (c.t === 'lista') {
    const ops = c.op.includes(v) || !tieneDato(v) ? c.op : [v, ...c.op];
    ctl = `<select id="${id}" name="${c.k}"><option value="">Sin dato</option>${ops.map((o) => `<option ${o === v ? 'selected' : ''}>${h(o)}</option>`).join('')}</select>`;
  } else if (c.t === 'largo') ctl = `<textarea id="${id}" name="${c.k}">${val}</textarea>`;
  else if (c.t === 'fecha') ctl = `<input id="${id}" name="${c.k}" type="date" value="${val}">`;
  else if (c.t === 'num') ctl = `<input id="${id}" name="${c.k}" type="text" inputmode="decimal" value="${val}" autocomplete="off">`;
  else ctl = `<input id="${id}" name="${c.k}" type="text" value="${val}" autocomplete="off">`;
  if (c.u) ctl = `<div class="con-u">${ctl}<span>${h(c.u)}</span></div>`;
  return `<div class="campo"><label for="${id}">${h(c.n)}${c.req ? ' <span class="req">(obligatorio)</span>' : ''}</label>${ctl}</div>`;
}
function leerCampos(form, campos, base, estricto) {
  const o = { ...base }, errores = [];
  for (const c of campos) {
    const el = form.elements[c.k]; if (!el) continue;
    const crudo = el.value.trim();
    if (!crudo) { delete o[c.k]; if (c.req && estricto) errores.push(`Falta completar "${c.n}".`); continue; }
    if (c.t === 'num') {
      const n = Number(crudo.replace(/\./g, crudo.includes(',') ? '' : '.').replace(',', '.'));
      if (Number.isNaN(n)) { if (estricto) errores.push(`"${c.n}" tiene que ser un número.`); continue; }
      o[c.k] = n;
    } else o[c.k] = crudo;
  }
  return { o, errores };
}
function pintarPanel() {
  $('#panel').innerHTML = VISTAS[ui.vista]();
}
async function cargarFotos(paths) {
  const cont = $('#fotos'); if (!cont) return;
  cont.innerHTML = paths.map((p) => `<img data-path="${h(p)}" alt="Foto de la intervención" data-acc="verFoto">`).join('');
  for (const img of cont.querySelectorAll('img')) { const u = await D.urlFoto(img.dataset.path); if (u) img.src = u; else img.alt = 'Foto no disponible sin señal'; }
}
async function cargarUsuarios() {
  const cont = $('#usuarios'); if (!cont) return;
  try {
    const us = await D.listarPerfiles();
    cont.innerHTML = us.map((u) => `<div class="usuario"><div><strong>${h(u.nombre || u.email)}</strong><small>${h(u.email)}</small></div>
      <select data-cambio="rolUsuario" data-id="${u.id}" ${u.id === est.perfil.id ? 'disabled' : ''} aria-label="Perfil de ${h(u.nombre || u.email)}">
        <option value="pendiente" ${u.rol === 'pendiente' ? 'selected' : ''}>Sin habilitar</option>
        ${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${k === u.rol ? 'selected' : ''}>${h(r.nombre)}</option>`).join('')}</select></div>`).join('');
  } catch (e) { cont.innerHTML = `<p class="vacio">No se pudo cargar la lista: ${h(e.message)}</p>`; }
}
function comprimir(archivo) {
  return new Promise((ok, err) => {
    const img = new Image(), url = URL.createObjectURL(archivo);
    img.onload = () => {
      const f = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => b ? ok(b) : err(new Error('No se pudo procesar la imagen')), 'image/jpeg', 0.8);
    };
    img.onerror = () => err(new Error('El archivo no es una imagen válida'));
    img.src = url;
  });
}
function capturarInt() {
  const f = $('#form'), b = ui.borrador; if (!f || !b) return;
  b.datos = leerCampos(f, camposIntervencion(b.red, b.clase), b.datos, false).o;
  b.estado = f.elements.estado.value;
}
function descargar(nombre, texto, tipo) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function repintarTodo() { pintarPestanas(); pintarEstado(); pintarRed(); pintarInt(); if (!ui.vista.startsWith('form')) pintarPanel(); }

// ---------- acciones ----------
const ACC = {
  red(d) { if (ui.modo) terminarModo(); ui.red = d.red; localStorage.setItem('red', d.red); document.body.dataset.red = d.red; ui.selId = null; ui.parcSel = null; pintarParcSel(); ui.ocultos.clear(); ui.vista = 'resumen'; repintarTodo(); $('#panel').scrollTop = 0; },
  volver() { ui.selId = null; ui.parcSel = null; pintarSel(); pintarParcSel(); ir('resumen'); },
  cuenta() { document.body.classList.remove('panel-min'); etiquetaPanel(); ir('cuenta'); },
  encuadrar() { encuadrar(visibles().map((e) => e.geom)); },
  filtroInt(d) { ui.filtroInt = d.v; pintarInt(); pintarPanel(); },
  abrirInt(d) { abrirIntervencion(d.id); },
  verElementoInt() { abrirElemento(est.intervenciones.get(ui.intId).elemento_id); },
  irInt() { const i = est.intervenciones.get(ui.intId); mapa.setView(aLatLng(i.geom.coordinates), Math.max(mapa.getZoom(), 17)); },
  agregar(d) {
    const t = REDES[ui.red].tipos[d.tipo];
    const listo = (geom) => { ui.borrador = { nuevo: true, id: D.uuid(), red: ui.red, tipo: d.tipo, geom, props: { fecha_relevamiento: hoy() } }; ir('formElemento'); };
    if (t.geom === 'linea') pedirLinea(listo); else pedirPunto(`Tocá el mapa donde está: ${t.nombre.toLowerCase()}.`, listo);
  },
  editarDatos() { const e = est.elementos.get(ui.selId); ui.borrador = structuredClone(e); ir('formElemento'); },
  editarTrazado() { editarTrazado(est.elementos.get(ui.selId)); },
  async borrarElemento() {
    const e = est.elementos.get(ui.selId);
    if (!confirm(`¿Eliminar "${nombreDe(e)}" de la red? Las intervenciones registradas se conservan.`)) return;
    await D.borrarElemento(e); ui.selId = null; ir('resumen'); aviso('Elemento eliminado');
  },
  cancelarForm() { const b = ui.borrador; ui.borrador = null; ir(b?.nuevo ? (b.elemento_id ? 'elemento' : 'resumen') : (b?.clase ? 'intervencion' : 'elemento')); },
  nuevaInt() { nuevaInt(null); },
  nuevaIntElemento() { nuevaInt(est.elementos.get(ui.selId)); },
  editarInt() { ui.borrador = structuredClone(est.intervenciones.get(ui.intId)); ir('formIntervencion'); },
  async estadoInt(d) {
    const i = est.intervenciones.get(ui.intId), datos = { ...i.datos };
    if (d.v === 'resuelta' && !datos.fecha_cierre) datos.fecha_cierre = hoy();
    await D.guardarIntervencion({ ...i, estado: d.v, datos }); aviso(d.v === 'resuelta' ? 'Marcada como resuelta' : 'Pasó a en curso');
  },
  async borrarInt() {
    const i = est.intervenciones.get(ui.intId);
    if (!confirm(`¿Eliminar "${tituloInt(i)}"?`)) return;
    await D.borrarIntervencion(i); ir(i.elemento_id ? 'elemento' : 'resumen'); aviso('Intervención eliminada');
  },
  ubicarInt() { capturarInt(); pedirPunto('Tocá el mapa en el lugar de la intervención.', (g) => { ui.borrador.geom = g; ir('formIntervencion'); }); },
  verFoto(d, el) { if (!el.src) return; const v = document.createElement('div'); v.className = 'visor'; v.innerHTML = `<img src="${el.src}" alt="">`; v.onclick = () => v.remove(); document.body.append(v); },
  exportarRed() {
    const fc = { type: 'FeatureCollection', name: `${ui.red}_${hoy()}`, features: D.elementosDe(ui.red).map((e) => ({ type: 'Feature', id: e.id, geometry: e.geom,
      properties: { tipo: e.tipo, ...e.props, longitud_medida_m: e.geom.type === 'LineString' ? Math.round(largo(e.geom) * 10) / 10 : undefined, modificado: e.updated_at } })) };
    descargar(`${ui.red}_${hoy()}.geojson`, JSON.stringify(fc), 'application/geo+json');
  },
  exportarInt() {
    const cols = ['clase', 'estado', 'titulo', 'subtipo', 'descripcion', 'prioridad', 'fecha', 'fecha_cierre', 'responsable', 'materiales', 'costo', 'expediente', 'avance', 'resultado', 'origen', 'reclamante'];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = D.intervencionesDe(ui.red).map((i) => [...cols.map((c) => q(c === 'clase' ? CLASES[i.clase]?.nombre : c === 'estado' ? ESTADOS_INT[i.estado]?.nombre : i.datos?.[c])),
      q(i.elemento_id && est.elementos.get(i.elemento_id) ? nombreDe(est.elementos.get(i.elemento_id)) : ''), q(i.geom?.coordinates[1]), q(i.geom?.coordinates[0])].join(';'));
    descargar(`intervenciones_${ui.red}_${hoy()}.csv`, '﻿' + [...cols, 'elemento', 'latitud', 'longitud'].join(';') + '\n' + filas.join('\n'), 'text/csv');
  },
  sync() { D.sincronizar(); },
  async salir() { if (est.pendientes && !confirm(`Hay ${est.pendientes} cambio(s) sin enviar. Quedan guardados en este equipo y se envían cuando vuelvas a ingresar. ¿Cerrar sesión?`)) return; await D.salir(); },
  async descartar() { await D.descartarRechazados(); aviso('Cambios descartados'); },
  async reiniciarDemo() { if (!confirm('Se borra todo lo cargado en este equipo (redes e intervenciones). ¿Continuar?')) return; await D.reiniciarDemo(); aviso('Datos de este equipo borrados'); },
  async instalar() { if (!instalador) return; instalador.prompt(); await instalador.userChoice; instalador = null; pintarPanel(); },
  async buscarVersion() { const r = await navigator.serviceWorker?.getRegistration(); if (!r) return aviso('Este navegador no permite actualizar en segundo plano.'); await r.update(); aviso('Listo. Si hay una versión nueva, aparece el aviso para actualizar.'); },
};
function nuevaInt(e) {
  const clases = puede.clases(rol());
  ui.borrador = { nuevo: true, id: D.uuid(), red: ui.red, elemento_id: e?.id || null, clase: clases[0], estado: 'abierta',
    geom: e ? { type: 'Point', coordinates: e.geom.type === 'Point' ? e.geom.coordinates : (ui.clicElemento?.id === e.id ? ui.clicElemento.pt : centro(e.geom)) } : (ui.pos?.geom || null),
    datos: { fecha: hoy(), prioridad: 'Media' }, fotos: [] };
  ir('formIntervencion');
}
const CAMBIO = {
  verTipo(el) { el.checked ? ui.ocultos.delete(el.dataset.tipo) : ui.ocultos.add(el.dataset.tipo); pintarRed(); },
  soloFaltantes(el) { ui.soloFaltantes = el.checked; pintarRed(); },
  ref(el) { el.checked ? ui.refs.add(el.dataset.k) : ui.refs.delete(el.dataset.k); localStorage.setItem('refs', JSON.stringify([...ui.refs])); pintarRef(); },
  claseInt(el) { capturarInt(); ui.borrador.clase = el.value; pintarPanel(); },
  async fotos(el) {
    capturarInt();
    for (const a of el.files) { try { ui.borrador.fotos.push(await D.agregarFoto(ui.borrador.id, await comprimir(a))); } catch (e) { aviso(e.message, { error: true }); } }
    el.value = ''; cargarFotos(ui.borrador.fotos);
  },
  async importar(el) {
    const archivo = el.files[0]; if (!archivo) return;
    const s = $('#progImp');
    try {
      const j = JSON.parse(await archivo.text());
      if (!confirm(`Se van a cargar ${j.elementos?.length ?? 0} elementos${est.modo === 'nube' ? ' en la base compartida' : ' en este equipo'}. ¿Continuar?`)) return;
      if (s) s.textContent = 'Importando…';
      const n = await D.importarBase(j, (a, b) => { const x = $('#progImp'); if (x) x.textContent = `${a} de ${b}`; });
      aviso(`${n} elementos procesados`); encuadrar(visibles().map((e) => e.geom));
    } catch (e) { aviso(`No se pudo importar: ${e.message}`, { error: true }); if (s) s.textContent = ''; }
    el.value = '';
  },
  verParc(el) { ui.parcOn = el.checked; localStorage.setItem('parc', el.checked ? '1' : '0'); pintarParc(); if (el.checked && mapa.getZoom() < ZOOM_PARC) aviso(`Acercá el mapa (nivel ${ZOOM_PARC} o más) para ver las parcelas.`); },
  parcModo(el) { ui.parcModo = el.value; localStorage.setItem('parcModo', el.value); for (const [id, c] of parcDib) c.setStyle(estiloParc(est.parcelas.get(id))); pintarPanel(); },
  async importarParc(el) {
    const archivo = el.files[0]; if (!archivo) return;
    const s = $('#progParc');
    try {
      const j = JSON.parse(await archivo.text());
      if (!confirm(`Se van a cargar ${j.parcelas?.length ?? 0} parcelas${est.modo === 'nube' ? ' en la base compartida' : ' en este equipo'}. ¿Continuar?`)) return;
      if (s) s.textContent = 'Importando…';
      const n = await D.importarParcelas(j, (a, b) => { const x = $('#progParc'); if (x) x.textContent = `${a} de ${b}`; });
      ui.parcOn = true; localStorage.setItem('parc', '1');
      aviso(`${n} parcelas cargadas. Acercá el mapa para verlas.`);
    } catch (e) { aviso(`No se pudo importar: ${e.message}`, { error: true }); if (s) s.textContent = ''; }
    el.value = '';
  },
  rolDemo(el) { D.cambiarPerfilDemo(el.value); },
  async rolUsuario(el) { try { await D.cambiarRol(el.dataset.id, el.value); aviso('Perfil actualizado'); } catch (e) { aviso(e.message, { error: true }); cargarUsuarios(); } },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-acc]'); if (!el) return;
  ACC[el.dataset.acc]?.(el.dataset, el);
});
document.addEventListener('change', (ev) => { const el = ev.target.closest('[data-cambio]'); if (el) CAMBIO[el.dataset.cambio]?.(el); });
document.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target, b = ui.borrador;
  const mostrar = (errs) => { $('#errForm').innerHTML = `<div class="aviso-form">${errs.map(h).join('<br>')}</div>`; $('#panel').scrollTop = 0; };
  if (f.dataset.form === 'elemento') {
    const t = REDES[b.red].tipos[b.tipo], { o, errores } = leerCampos(f, t.campos, b.props, true);
    if (errores.length) return mostrar(errores);
    const { nuevo, ...fila } = b;
    await D.guardarElemento({ ...fila, props: o });
    ui.borrador = null; ui.selId = fila.id; ir('elemento'); pintarSel(); aviso(nuevo ? 'Elemento agregado' : 'Datos guardados');
  } else if (f.dataset.form === 'intervencion') {
    const { o, errores } = leerCampos(f, camposIntervencion(b.red, b.clase), b.datos, true);
    if (errores.length) return mostrar(errores);
    const estado = f.elements.estado.value;
    if ((estado === 'resuelta' || estado === 'cerrada') && !o.fecha_cierre) o.fecha_cierre = hoy();
    const { nuevo, ...fila } = b;
    await D.guardarIntervencion({ ...fila, datos: o, estado });
    ui.borrador = null; ui.intId = fila.id; ir('intervencion'); aviso(nuevo ? 'Registro guardado' : 'Cambios guardados');
  } else if (f.dataset.form === 'acceso') accesoEnviar(f);
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'buscarParcela') return buscarParcela(ev.target.value);
  if (ev.target.id !== 'buscar') return;
  const q = ev.target.value.trim().toLowerCase(), cont = $('#resultados');
  if (q.length < 2) { cont.innerHTML = ''; return; }
  const g = new Map();
  for (const e of D.elementosDe(ui.red)) {
    const n = e.props?.nombre || e.props?.calle; if (!n || !n.toLowerCase().includes(q)) continue;
    (g.get(n) || g.set(n, []).get(n)).push(e);
  }
  const res = [...g.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 8);
  cont.innerHTML = res.map(([n, l], i) => `<button data-i="${i}">${h(n)} <small>${l.length} tramo${l.length > 1 ? 's' : ''}</small></button>`).join('') || '<p class="nota">Sin coincidencias en esta red.</p>';
  cont.querySelectorAll('button').forEach((bt) => { bt.onclick = () => encuadrar(res[bt.dataset.i][1].map((e) => e.geom)); });
});
$('#btnPanel').onclick = () => { document.body.classList.toggle('panel-min'); etiquetaPanel(); setTimeout(() => mapa.invalidateSize(), 250); };

// ---------- acceso (solo con base compartida) ----------
let modoAcceso = 'ingresar';
function pintarAcceso(msj) {
  const a = $('#acceso');
  if (est.modo === 'local' || (est.perfil && est.perfil.rol !== 'pendiente')) { a.hidden = true; return; }
  a.hidden = false;
  if (est.perfil?.rol === 'pendiente') {
    a.innerHTML = `<div class="caja"><h1>Cuenta sin habilitar</h1><p>${h(est.perfil.email)} ya está registrada. Falta que un administrador del área le asigne un perfil de acceso.</p>
      <div class="fila-btn"><button class="btn pri" data-acc="revisarAcceso">Volver a comprobar</button><button class="btn" data-acc="salir">Cerrar sesión</button></div></div>`;
    return;
  }
  const reg = modoAcceso === 'registrar';
  a.innerHTML = `<form class="caja" data-form="acceso" novalidate>
    <h1>Infra MUNISAG</h1><p>Redes de agua, cloaca, calles y caminos de ${h(APP.municipio)}.</p>
    ${msj ? `<div class="aviso-form">${h(msj)}</div>` : ''}
    ${reg ? '<div class="campo"><label for="a_nombre">Nombre y apellido</label><input id="a_nombre" name="nombre" autocomplete="name" required></div>' : ''}
    <div class="campo"><label for="a_email">Correo</label><input id="a_email" name="email" type="email" autocomplete="username" required></div>
    <div class="campo"><label for="a_clave">Clave</label><input id="a_clave" name="clave" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required minlength="6"></div>
    <button class="btn pri" type="submit">${reg ? 'Crear cuenta' : 'Ingresar'}</button>
    <button class="cambio" type="button" data-acc="cambiarAcceso">${reg ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}</button></form>`;
}
ACC.cambiarAcceso = () => { modoAcceso = modoAcceso === 'registrar' ? 'ingresar' : 'registrar'; pintarAcceso(); };
ACC.revisarAcceso = () => location.reload();
async function accesoEnviar(f) {
  const bt = f.querySelector('[type=submit]'); bt.disabled = true;
  try {
    if (!f.elements.email.value || !f.elements.clave.value) throw new Error('Completá el correo y la clave.');
    if (modoAcceso === 'registrar') {
      const r = await D.registrar(f.elements.email.value.trim(), f.elements.clave.value, f.elements.nombre.value.trim());
      if (r === 'confirmar') { modoAcceso = 'ingresar'; return pintarAcceso('Cuenta creada. Abrí el correo de confirmación y después ingresá.'); }
    } else await D.ingresar(f.elements.email.value.trim(), f.elements.clave.value);
    pintarAcceso(); repintarTodo();
  } catch (e) { pintarAcceso(e.message); }
}

// ---------- instalación y actualización ----------
let instalador = null;
window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); instalador = ev; if (ui.vista === 'cuenta') pintarPanel(); });
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((r) => setInterval(() => r.update(), 3600000)).catch((e) => console.warn('sw', e));
  let avisado = false;
  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data?.tipo === 'actualizada' && !avisado) { avisado = true; aviso('Hay una versión nueva de la app.', { fijo: true, boton: 'Actualizar', accion: () => location.reload() }); }
  });
}

// ---------- arranque ----------
D.alCambiar((que) => {
  if (que === 'datos') repintarTodo();
  else if (que === 'parcelas') { repintarParc(); if (ui.vista === 'resumen' || ui.vista === 'cuenta' || ui.vista === 'parcela') pintarPanel(); }
  else if (que === 'sesion') { pintarAcceso(); repintarTodo(); }
  else { pintarEstado(); if (ui.vista === 'cuenta') pintarPanel(); }
});
document.body.dataset.red = ui.red;
etiquetaPanel();
D.iniciar().then(() => { pintarAcceso(); repintarTodo(); pintarRef(); })
  .catch((e) => { console.error(e); aviso(`No se pudo iniciar: ${e.message}`, { error: true, fijo: true }); });
window.__app = { ui, est, mapa, D, pintarParc };
