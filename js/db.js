// Almacén local (IndexedDB): permite trabajar sin señal y guarda lo que falta sincronizar.
const NOMBRE = 'infra-munisag';
const VERSION = 1;
let _db;

export function abrir() {
  return new Promise((ok, err) => {
    const r = indexedDB.open(NOMBRE, VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('elementos', { keyPath: 'id' });
      d.createObjectStore('intervenciones', { keyPath: 'id' });
      d.createObjectStore('pendientes', { keyPath: 'k' });
      d.createObjectStore('fotos', { keyPath: 'path' });
      d.createObjectStore('meta', { keyPath: 'k' });
    };
    r.onsuccess = () => { _db = r.result; ok(_db); };
    r.onerror = () => err(r.error);
  });
}

function tx(almacen, modo, fn) {
  return new Promise((ok, err) => {
    const t = _db.transaction(almacen, modo);
    const s = t.objectStore(almacen);
    let res;
    const r = fn(s);
    if (r) r.onsuccess = () => { res = r.result; };
    t.oncomplete = () => ok(res);
    t.onerror = () => err(t.error);
    t.onabort = () => err(t.error);
  });
}

export const todos = (almacen) => tx(almacen, 'readonly', (s) => s.getAll());
export const leer = (almacen, k) => tx(almacen, 'readonly', (s) => s.get(k));
export const guardar = (almacen, v) => tx(almacen, 'readwrite', (s) => s.put(v));
export const quitar = (almacen, k) => tx(almacen, 'readwrite', (s) => s.delete(k));
export const vaciar = (almacen) => tx(almacen, 'readwrite', (s) => s.clear());
export const guardarVarios = (almacen, filas) => tx(almacen, 'readwrite', (s) => { for (const f of filas) s.put(f); });

export async function meta(k, v) {
  if (v === undefined) return (await leer('meta', k))?.v;
  return guardar('meta', { k, v });
}
