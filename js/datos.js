// Datos de la app: memoria + almacén local + sincronización con Supabase.
// Regla general: todo cambio se guarda primero en el equipo y queda "pendiente";
// cuando hay señal y sesión se envía al servidor y se traen los cambios de los demás.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import * as db from './db.js';

export const est = {
  modo: SUPABASE_URL && SUPABASE_ANON_KEY ? 'nube' : 'local',
  elementos: new Map(),
  intervenciones: new Map(),
  parcelas: new Map(),   // capa de consulta, la carga el administrador
  perfil: null,          // { id, nombre, email, rol }
  enLinea: navigator.onLine,
  pendientes: 0,
  rechazados: [],        // [{ k, tabla, id, error }]
  sincronizando: false,
  ultimaSync: null,
  errorSync: null,
};
const MAPA = { elementos: est.elementos, intervenciones: est.intervenciones };
let sb = null;
const oyentes = new Set();
export const alCambiar = (f) => oyentes.add(f);
const avisar = (que, det) => oyentes.forEach((f) => { try { f(que, det); } catch (e) { console.error(e); } });

export const uuid = () => crypto.randomUUID ? crypto.randomUUID()
  : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

// ---------- arranque ----------
export async function iniciar() {
  await db.abrir();
  for (const t of ['elementos', 'intervenciones']) for (const f of await db.todos(t)) MAPA[t].set(f.id, f);
  await contarPendientes();
  est.ultimaSync = await db.meta('ultima_sync') || null;
  db.todos('parcelas').then((l) => { for (const f of l) est.parcelas.set(f.id, f); if (l.length) avisar('parcelas'); }).catch(() => {});

  window.addEventListener('online', () => { est.enLinea = true; avisar('conexion'); sincronizar(); });
  window.addEventListener('offline', () => { est.enLinea = false; avisar('conexion'); });

  if (est.modo === 'local') {
    est.perfil = await db.meta('perfil_demo') || { id: 'demo', nombre: 'Demostración', email: '', rol: 'admin' };
    return;
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await sb.auth.getSession();
  if (data?.session) {
    est.perfil = await db.meta('perfil') || null;
    if (est.perfil && est.perfil.id !== data.session.user.id) est.perfil = null;
    refrescarPerfil(data.session.user).then(() => sincronizar());
  }
  sb.auth.onAuthStateChange((ev) => {
    if (ev === 'SIGNED_OUT') { est.perfil = null; db.meta('perfil', null); avisar('sesion'); }
  });
  setInterval(() => { if (document.visibilityState === 'visible') sincronizar(); }, 60000);
}

// ---------- sesión y perfiles ----------
async function refrescarPerfil(user) {
  if (!est.enLinea) return;
  const { data, error } = await sb.from('perfiles').select('*').eq('id', user.id).maybeSingle();
  if (error) { if (!est.perfil) est.errorSync = error.message; return; }
  est.perfil = data ? { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol }
    : { id: user.id, nombre: user.email, email: user.email, rol: 'pendiente' };
  await db.meta('perfil', est.perfil);
  avisar('sesion');
}

export async function ingresar(email, clave) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: clave });
  if (error) throw new Error(traducir(error.message));
  await refrescarPerfil(data.user);
  sincronizar();
}
export async function registrar(email, clave, nombre) {
  const { data, error } = await sb.auth.signUp({ email, password: clave, options: { data: { nombre } } });
  if (error) throw new Error(traducir(error.message));
  if (!data.session) return 'confirmar';
  await refrescarPerfil(data.user);
  return 'ok';
}
export async function salir() {
  if (est.modo === 'local') return;
  await sb.auth.signOut();
}
export async function cambiarPerfilDemo(rol) {
  est.perfil = { id: 'demo', nombre: 'Demostración', email: '', rol };
  await db.meta('perfil_demo', est.perfil);
  avisar('sesion');
}
export async function listarPerfiles() {
  const { data, error } = await sb.from('perfiles').select('*').order('nombre');
  if (error) throw new Error(error.message);
  return data;
}
export async function cambiarRol(id, rol) {
  const { error } = await sb.from('perfiles').update({ rol }).eq('id', id);
  if (error) throw new Error(error.message);
}
function traducir(m) {
  if (/Invalid login/i.test(m)) return 'El correo o la clave no coinciden.';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene una cuenta. Ingresá con tu clave.';
  if (/at least 6/i.test(m)) return 'La clave necesita al menos 6 caracteres.';
  if (/Email not confirmed/i.test(m)) return 'Falta confirmar el correo: abrí el mensaje que te enviamos.';
  if (/fetch/i.test(m)) return 'No hay conexión con el servidor. Probá de nuevo cuando tengas señal.';
  return m;
}

// ---------- lectura ----------
export const elementosDe = (red) => [...est.elementos.values()].filter((e) => e.red === red && !e.deleted);
export const intervencionesDe = (red) => [...est.intervenciones.values()].filter((i) => i.red === red && !i.deleted);
export const intervencionesDeElemento = (id) => [...est.intervenciones.values()].filter((i) => i.elemento_id === id && !i.deleted);

// ---------- escritura ----------
async function guardarFila(tabla, fila) {
  fila.updated_at = new Date().toISOString();
  if (!fila.created_by && est.perfil) fila.created_by = est.perfil.id;
  fila.updated_by = est.perfil?.id || null;
  fila.updated_nombre = est.perfil?.nombre || null;
  MAPA[tabla].set(fila.id, fila);
  await db.guardar(tabla, fila);
  if (est.modo === 'nube') {
    await db.guardar('pendientes', { k: `${tabla}:${fila.id}`, tabla, id: fila.id });
    await contarPendientes();
    sincronizar();
  }
  avisar('datos', { tabla, id: fila.id });
  return fila;
}
export const guardarElemento = (e) => guardarFila('elementos', { deleted: false, props: {}, ...e });
export const guardarIntervencion = (i) => guardarFila('intervenciones', { deleted: false, datos: {}, fotos: [], estado: 'abierta', ...i });
export const borrarElemento = (e) => guardarFila('elementos', { ...e, deleted: true });
export const borrarIntervencion = (i) => guardarFila('intervenciones', { ...i, deleted: true });

// ---------- fotos ----------
export async function agregarFoto(intId, blob) {
  const path = `${intId}/${uuid()}.jpg`;
  await db.guardar('fotos', { path, blob, subida: est.modo === 'local' });
  return path;
}
export async function urlFoto(path) {
  let f = await db.leer('fotos', path);
  if (!f && sb && est.enLinea) {
    const { data } = await sb.storage.from('fotos').download(path);
    if (data) { f = { path, blob: data, subida: true }; await db.guardar('fotos', f); }
  }
  return f ? URL.createObjectURL(f.blob) : null;
}

// ---------- sincronización ----------
async function contarPendientes() {
  const p = await db.todos('pendientes');
  est.rechazados = p.filter((x) => x.error);
  est.pendientes = p.length - est.rechazados.length;
}
const COLS = {
  elementos: ['id', 'red', 'tipo', 'geom', 'props', 'deleted'],
  intervenciones: ['id', 'red', 'elemento_id', 'clase', 'estado', 'geom', 'datos', 'fotos', 'deleted'],
};
const paraServidor = (tabla, f) => Object.fromEntries(COLS[tabla].map((c) => [c, f[c] ?? null]));
const esDeRed = (error) => !error.code && /fetch|network|load failed/i.test(error.message || '');

let enCurso = null;
export function sincronizar() {
  if (est.modo !== 'nube' || !est.enLinea || !est.perfil || est.perfil.rol === 'pendiente') return Promise.resolve();
  if (enCurso) return enCurso;
  est.sincronizando = true; avisar('sync');
  enCurso = (async () => {
    try {
      await enviar();
      const cambios = await traer();
      try { if (await traerParcelas()) avisar('parcelas'); } catch (e) { if (esDeRed(e)) throw e; console.warn('parcelas', e); }
      est.errorSync = null;
      est.ultimaSync = new Date().toISOString();
      await db.meta('ultima_sync', est.ultimaSync);
      if (cambios) avisar('datos', {});
    } catch (e) {
      est.errorSync = esDeRed(e) ? 'Sin conexión con el servidor' : (e.message || String(e));
      console.warn('sync', e);
    } finally {
      await contarPendientes();
      est.sincronizando = false; enCurso = null; avisar('sync');
    }
  })();
  return enCurso;
}

async function enviar() {
  for (const f of (await db.todos('fotos')).filter((x) => !x.subida)) {
    const { error } = await sb.storage.from('fotos').upload(f.path, f.blob, { contentType: 'image/jpeg', upsert: true });
    if (error && esDeRed(error)) throw error;
    if (!error) await db.guardar('fotos', { ...f, subida: true });
  }
  const pend = (await db.todos('pendientes')).filter((p) => !p.error);
  for (const tabla of ['elementos', 'intervenciones']) {
    const items = pend.filter((p) => p.tabla === tabla && MAPA[tabla].has(p.id));
    for (let i = 0; i < items.length; i += 100) {
      const lote = items.slice(i, i + 100).map((p) => ({ p, fila: MAPA[tabla].get(p.id), marca: MAPA[tabla].get(p.id).updated_at }));
      const { data, error } = await sb.from(tabla).upsert(lote.map((l) => paraServidor(tabla, l.fila))).select();
      if (!error) { for (const s of data) await confirmar(tabla, s, lote.find((l) => l.fila.id === s.id)); continue; }
      if (esDeRed(error)) throw error;
      for (const l of lote) {   // el lote falló: se prueba fila por fila para aislar la rechazada
        const r = await sb.from(tabla).upsert(paraServidor(tabla, l.fila)).select();
        if (!r.error && r.data?.[0]) await confirmar(tabla, r.data[0], l);
        else if (r.error && esDeRed(r.error)) throw r.error;
        else await db.guardar('pendientes', { ...l.p, error: r.error?.message || 'El servidor no aceptó el cambio (permiso insuficiente).' });
      }
    }
  }
}
async function confirmar(tabla, servidor, l) {
  if (!l) return;
  const actual = MAPA[tabla].get(servidor.id);
  if (actual && actual.updated_at !== l.marca) return;   // se volvió a editar mientras se enviaba: sigue pendiente
  await aplicar(tabla, servidor);
  await db.quitar('pendientes', l.p.k);
}
async function aplicar(tabla, f) {
  if (f.deleted) { MAPA[tabla].delete(f.id); await db.quitar(tabla, f.id); }
  else { MAPA[tabla].set(f.id, f); await db.guardar(tabla, f); }
}

async function traer() {
  let cambios = 0;
  const pend = new Set((await db.todos('pendientes')).map((p) => p.k));
  for (const tabla of ['elementos', 'intervenciones']) {
    // Paginado por (updated_at, id): no saltea filas aunque muchas compartan la misma marca de tiempo.
    let desde = await db.meta(`cursor_${tabla}`) || { ts: '1970-01-01T00:00:00+00:00', id: '00000000-0000-0000-0000-000000000000' };
    for (;;) {
      const { data, error } = await sb.from(tabla).select('*')
        .or(`updated_at.gt."${desde.ts}",and(updated_at.eq."${desde.ts}",id.gt."${desde.id}")`)
        .order('updated_at').order('id').limit(1000);
      if (error) throw error;
      if (!data.length) break;
      const guardar = [];
      for (const f of data) {
        if (pend.has(`${tabla}:${f.id}`)) continue;
        if (f.deleted) { MAPA[tabla].delete(f.id); await db.quitar(tabla, f.id); } else { MAPA[tabla].set(f.id, f); guardar.push(f); }
        cambios++;
      }
      await db.guardarVarios(tabla, guardar);
      desde = { ts: data[data.length - 1].updated_at, id: data[data.length - 1].id };
      await db.meta(`cursor_${tabla}`, desde);
      if (data.length < 1000) break;
    }
  }
  return cambios;
}

// Parcelas: capa de consulta. Se descarga una vez por equipo (unos 6 MB) y después solo llegan los cambios.
async function traerParcelas() {
  let cambios = 0;
  let desde = await db.meta('cursor_parcelas') || { ts: '1970-01-01T00:00:00+00:00', id: '00000000-0000-0000-0000-000000000000' };
  for (;;) {
    const { data, error } = await sb.from('parcelas').select('*')
      .or(`updated_at.gt."${desde.ts}",and(updated_at.eq."${desde.ts}",id.gt."${desde.id}")`)
      .order('updated_at').order('id').limit(1000);
    if (error) throw error;
    if (!data.length) break;
    const guardar = [];
    for (const f of data) {
      if (f.deleted) { est.parcelas.delete(f.id); await db.quitar('parcelas', f.id); } else { est.parcelas.set(f.id, f); guardar.push(f); }
    }
    await db.guardarVarios('parcelas', guardar);
    cambios += data.length;
    desde = { ts: data[data.length - 1].updated_at, id: data[data.length - 1].id };
    await db.meta('cursor_parcelas', desde);
    if (data.length < 1000) break;
  }
  return cambios;
}

export async function descartarRechazados() {
  for (const r of est.rechazados) {
    await db.quitar('pendientes', r.k);
    const { data } = await sb.from(r.tabla).select('*').eq('id', r.id).maybeSingle();
    if (data) await aplicar(r.tabla, data); else { MAPA[r.tabla].delete(r.id); await db.quitar(r.tabla, r.id); }
  }
  await contarPendientes();
  avisar('datos', {}); avisar('sync');
}

// Carga inicial de las capas convertidas desde el SIG (archivo datos_sig/base.json, que NO se publica en la web).
// No pisa elementos que ya existan: se puede repetir sin riesgo.
export async function importarBase(j, progreso) {
  if (!Array.isArray(j?.elementos)) throw new Error('El archivo no tiene el formato esperado (base.json).');
  const filas = j.elementos.filter((e) => e.id && e.red && e.tipo && e.geom)
    .map((e) => ({ id: e.id, red: e.red, tipo: e.tipo, geom: e.geom, props: e.props || {}, deleted: false }));
  if (est.modo === 'local') {
    const ahora = new Date().toISOString();
    const nuevas = filas.filter((f) => !est.elementos.has(f.id)).map((f) => ({ ...f, updated_at: ahora }));
    await db.guardarVarios('elementos', nuevas);
    for (const f of nuevas) est.elementos.set(f.id, f);
    avisar('datos', {});
    return filas.length;
  }
  for (let i = 0; i < filas.length; i += 400) {
    const { error } = await sb.from('elementos').upsert(filas.slice(i, i + 400), { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    progreso?.(Math.min(i + 400, filas.length), filas.length);
  }
  await sincronizar();
  return filas.length;
}

// Carga de la capa de parcelas (archivo datos_sig/parcelas.json, que NO se publica en la web). Se puede repetir:
// actualiza las parcelas que ya existen.
export async function importarParcelas(j, progreso) {
  if (!Array.isArray(j?.parcelas)) throw new Error('El archivo no tiene el formato esperado (parcelas.json).');
  const filas = j.parcelas.filter((p) => p.id && p.geom).map((p) => ({
    id: p.id, cca: p.cca ?? null, partida: p.partida ?? null, tipo: p.tipo ?? null, sup: p.sup ?? null, zona: p.zona ?? null,
    calle: p.calle ?? null, nro: p.nro ?? null, agua: !!p.agua, cloaca: !!p.cloaca, geom: p.geom, deleted: false }));
  if (est.modo === 'local') {
    const ahora = new Date().toISOString();
    const todas = filas.map((f) => ({ ...f, updated_at: ahora }));
    await db.guardarVarios('parcelas', todas);
    for (const f of todas) est.parcelas.set(f.id, f);
    avisar('parcelas');
    return filas.length;
  }
  for (let i = 0; i < filas.length; i += 250) {
    const { error } = await sb.from('parcelas').upsert(filas.slice(i, i + 250), { onConflict: 'id' });
    if (error) throw new Error(/relation .*parcelas|schema cache|Could not find the table/i.test(error.message)
      ? 'Falta crear la tabla de parcelas: ejecutá el archivo 03_parcelas.sql en Supabase (ver LEEME).' : error.message);
    progreso?.(Math.min(i + 250, filas.length), filas.length);
  }
  await sincronizar();
  return filas.length;
}

// Solo modo demostración: borra lo cargado en este equipo.
export async function reiniciarDemo() {
  for (const t of ['elementos', 'intervenciones', 'fotos', 'pendientes', 'parcelas']) await db.vaciar(t);
  est.elementos.clear(); est.intervenciones.clear(); est.parcelas.clear();
  avisar('datos', {});
}
