// Almacén local-first: todo vive en memoria + IndexedDB del dispositivo.
// En modo nube, cada cambio entra a una cola y se sube a Supabase (tabla gym_records);
// los cambios de otros dispositivos se descargan por updated_at. Último cambio gana por registro.

export const KINDS = ['profiles', 'exercises', 'preferences', 'routines', 'days', 'routineExercises',
  'sessions', 'workoutExercises', 'sets', 'measurements', 'photos', 'exerciseMedia', 'memberships'];
const TABLE = 'gym_records';
const BUCKET = 'gym-photos';

function openDB(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('records', { keyPath: 'key' });
      db.createObjectStore('meta');
      db.createObjectStore('blobs');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const done = (tx) => new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
const request = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
// iOS cierra a veces la conexión con IndexedDB mientras la app está en segundo plano o el teléfono bloqueado
// («Connection to Indexed Database server lost»). No es un problema de los datos: se reabre la base y se reintenta.
const connectionLost = (error) => ['InvalidStateError', 'UnknownError', 'TransactionInactiveError'].includes(error?.name)
  || /connection|closing|closed/i.test(String(error?.message ?? ''));

export const newId = () => crypto.randomUUID().toUpperCase();

class Store {
  constructor() {
    this.maps = Object.fromEntries(KINDS.map((k) => [k, new Map()]));
    this.listeners = new Set();
    this.version = 0;
    this.dirty = new Map();
    this.outbox = new Set();
    this.sync = { state: 'idle', pending: 0, error: null, lastSync: null };
    this.batchDepth = 0;
    this.urlCache = new Map();
    this.indexes = new Map();
    this.revision = 0;
  }

  async open({ mode, client = null, user = null }) {
    this.mode = mode; this.client = client; this.user = user;
    this.dbName = mode === 'cloud' ? `gymef-${user.id}` : 'gymef-local';
    this.db = null;
    this.closed = false;
    const rows = await this.idb((db) => request(db.transaction('records').objectStore('records').getAll()));
    for (const map of Object.values(this.maps)) map.clear();
    for (const row of rows) if (!row.deleted && this.maps[row.kind]) this.maps[row.kind].set(row.id, row.data);
    const [outbox, lastPulled] = await this.idb((db) => {
      const meta = db.transaction('meta').objectStore('meta');
      return Promise.all([request(meta.get('outbox')), request(meta.get('lastPulled'))]);
    });
    this.outbox = new Set(outbox ?? []);
    this.lastPulled = lastPulled ?? null;
    this.notify();
    if (!this.watching) {
      this.watching = true;
      // Al salir de la app se guarda lo pendiente; al volver se reintenta lo que no se pudo guardar.
      document.addEventListener('visibilitychange', () => this.persist().catch(() => {}));
    }
    if (mode === 'cloud') {
      if (!this.listening) {
        this.listening = true;
        window.addEventListener('online', () => this.syncNow());
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.syncNow(); });
      }
      this.timer = setInterval(() => this.syncNow(), 60000);
      await this.syncNow();
    }
  }

  close() { this.closed = true; clearInterval(this.timer); clearTimeout(this.retryTimer); this.db?.close(); this.db = null; }

  /** Conexión con IndexedDB; si iOS la cerró, abre otra. */
  database() {
    if (this.db) return Promise.resolve(this.db);
    this.opening ??= openDB(this.dbName).then((db) => {
      db.onclose = () => { if (this.db === db) this.db = null; };
      db.onversionchange = () => db.close();
      this.db = db;
      return db;
    }).finally(() => { this.opening = null; });
    return this.opening;
  }
  /** Ejecuta `work(db)`; si la conexión se perdió (app en segundo plano), la reabre y reintenta una vez. */
  async idb(work) {
    try { return await work(await this.database()); } catch (error) {
      if (!connectionLost(error) || this.closed) throw error;
      try { this.db?.close(); } catch {}
      this.db = null;
      return work(await this.database());
    }
  }

  // ---------- Lectura ----------
  all(kind) { return [...this.maps[kind].values()]; }
  get(kind, id) { return id ? this.maps[kind].get(id) ?? null : null; }
  /** Registros agrupados por un campo; se recalcula tras cualquier escritura (también dentro de batch). */
  by(kind, field, value) {
    const name = `${kind}.${field}`;
    let cached = this.indexes.get(name);
    if (!cached || cached.revision !== this.revision) {
      const map = new Map();
      for (const r of this.maps[kind].values()) {
        if (!map.has(r[field])) map.set(r[field], []);
        map.get(r[field]).push(r);
      }
      cached = { revision: this.revision, map };
      this.indexes.set(name, cached);
    }
    return cached.map.get(value) ?? [];
  }
  isEmpty() { return this.maps.profiles.size === 0; }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() {
    this.revision += 1;
    if (this.batchDepth) { this.pendingNotify = true; return; }
    this.version += 1;
    for (const fn of this.listeners) fn(this.version);
  }

  // ---------- Escritura ----------
  put(kind, record) {
    const data = { ...record, _u: Date.now() };
    this.maps[kind].set(data.id, data);
    this.stage(kind, data.id, data, false);
    return data;
  }
  update(kind, id, changes) {
    const current = this.get(kind, id);
    if (!current) throw new Error('El elemento ya no existe.');
    return this.put(kind, { ...current, ...changes });
  }
  remove(kind, id) {
    if (!this.maps[kind].delete(id)) return;
    this.stage(kind, id, { id, _u: Date.now() }, true);
  }
  /** Agrupa varias escrituras: una sola notificación y un solo guardado. */
  batch(fn) {
    this.batchDepth += 1;
    try { return fn(); } finally {
      this.batchDepth -= 1;
      if (!this.batchDepth && this.pendingNotify) { this.pendingNotify = false; this.notify(); }
    }
  }
  stage(kind, id, data, deleted) {
    const key = `${kind}/${id}`;
    this.dirty.set(key, { key, kind, id, data, deleted });
    if (this.mode === 'cloud') this.outbox.add(key);
    this.sync.pending = this.outbox.size;
    this.notify();
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist().catch(() => {}), 0);
  }
  async persist() {
    if (!this.dirty.size || this.closed) return;
    const entries = [...this.dirty.values()];
    this.dirty.clear();
    try {
      await this.idb((db) => {
        const tx = db.transaction(['records', 'meta'], 'readwrite');
        for (const e of entries) tx.objectStore('records').put(e);
        tx.objectStore('meta').put([...this.outbox], 'outbox');
        return done(tx);
      });
    } catch (error) {
      // No se pierde nada: lo que no se guardó vuelve a la cola (salvo que ya haya un cambio más nuevo) y se reintenta.
      for (const e of entries) if (!this.dirty.has(e.key)) this.dirty.set(e.key, e);
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this.persist().catch(() => {}), 3000);
      console.warn('No se pudo guardar en este dispositivo; se reintentará.', error);
      throw error;
    }
    if (this.mode === 'cloud') { clearTimeout(this.pushTimer); this.pushTimer = setTimeout(() => this.syncNow(), 800); }
  }

  // ---------- Sincronización ----------
  setSync(changes) { this.sync = { ...this.sync, ...changes, pending: this.outbox.size }; this.notify(); }

  async syncNow() {
    if (this.mode !== 'cloud' || this.syncing || this.closed) return;
    if (!navigator.onLine) { this.setSync({ state: 'offline' }); return; }
    this.syncing = true;
    this.setSync({ state: 'syncing', error: null });
    try {
      await this.persist();
      await this.push();
      await this.pull();
      this.setSync({ state: 'idle', lastSync: Date.now() });
    } catch (error) {
      this.setSync({ state: navigator.onLine ? 'error' : 'offline', error: error.message ?? String(error) });
    } finally { this.syncing = false; }
  }

  async push() {
    const keys = [...this.outbox];
    for (let i = 0; i < keys.length; i += 400) {
      const chunk = keys.slice(i, i + 400);
      // Lo que existe se envía desde memoria (siempre la versión más nueva, aunque aún no esté guardada aquí);
      // lo borrado, con su marca guardada en el dispositivo.
      const stored = await this.idb((db) => {
        const records = db.transaction('records').objectStore('records');
        return Promise.all(chunk.map((key) => (this.maps[key.split('/')[0]]?.has(key.split('/')[1]) ? null : request(records.get(key)))));
      });
      const rows = chunk.map((key, j) => {
        const [kind, id] = key.split('/');
        const local = this.maps[kind]?.get(id);
        return local ? { key, kind, id, data: local, deleted: false } : stored[j];
      }).filter(Boolean);
      if (rows.length) {
        const { error } = await this.client.from(TABLE).upsert(rows.map((r) => ({
          user_id: this.user.id, kind: r.kind, id: r.id, data: r.data, deleted: r.deleted,
        })), { onConflict: 'user_id,kind,id' });
        if (error) throw error;
      }
      // Solo se retiran de la cola si no cambiaron mientras se enviaban.
      const sent = new Map(rows.map((r) => [r.key, r.data._u]));
      for (const key of chunk) {
        const [kind, id] = key.split('/');
        const local = this.maps[kind]?.get(id);
        if (!local || local._u === sent.get(key) || !sent.has(key)) this.outbox.delete(key);
      }
    }
    await this.idb((db) => {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put([...this.outbox], 'outbox');
      return done(tx);
    });
  }

  async pull() {
    // Margen de 2 min para no perder filas confirmadas con marcas de tiempo cercanas.
    const since = this.lastPulled ? new Date(new Date(this.lastPulled).getTime() - 120000).toISOString() : '1970-01-01T00:00:00Z';
    let newest = this.lastPulled;
    let changed = false;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.client.from(TABLE).select('kind,id,data,deleted,updated_at')
        .gt('updated_at', since).order('updated_at', { ascending: true }).range(from, from + 999);
      if (error) throw error;
      const apply = [];
      for (const row of data) {
        if (!this.maps[row.kind]) continue;
        const key = `${row.kind}/${row.id}`;
        const local = this.maps[row.kind].get(row.id);
        if (this.outbox.has(key) && (local?._u ?? Infinity) >= (row.data?._u ?? 0)) continue;
        if (row.deleted) { if (this.maps[row.kind].delete(row.id)) changed = true; }
        else if (!local || local._u !== row.data._u) { this.maps[row.kind].set(row.id, row.data); changed = true; }
        apply.push({ key, kind: row.kind, id: row.id, data: row.data, deleted: row.deleted });
        if (!newest || row.updated_at > newest) newest = row.updated_at;
      }
      await this.idb((db) => {
        const tx = db.transaction('records', 'readwrite');
        for (const r of apply) tx.objectStore('records').put(r);
        return done(tx);
      });
      if (data.length < 1000) break;
    }
    // Una cuenta vacía también cuenta como descargada.
    newest ??= '1970-01-01T00:00:00.000Z';
    if (newest !== this.lastPulled) {
      this.lastPulled = newest;
      await this.idb((db) => {
        const tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').put(newest, 'lastPulled');
        return done(tx);
      });
    }
    if (changed) this.notify();
  }

  // ---------- Archivos (fotos de progreso y medios de ejercicios) ----------
  // En la nube viven en el bucket privado de la cuenta; en este dispositivo se guarda una copia en IndexedDB
  // la primera vez que se ven, para mostrarlos sin conexión. `name` es la ruta dentro de la carpeta de la cuenta.
  async saveBlob(id, blob, { name = `${id}.jpg`, contentType = 'image/jpeg' } = {}) {
    if (this.mode === 'cloud') {
      const { error } = await this.client.storage.from(BUCKET).upload(`${this.user.id}/${name}`, blob, { contentType, upsert: true });
      if (error) throw error;
    }
    await this.putBlob(id, blob);
  }
  putBlob(id, blob) {
    return this.idb((db) => {
      const tx = db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').put(blob, id);
      return done(tx);
    });
  }
  async blobURL(id, { name = `${id}.jpg` } = {}) {
    if (this.urlCache.has(id)) return this.urlCache.get(id);
    let blob = await this.idb((db) => request(db.transaction('blobs').objectStore('blobs').get(id)));
    if (!blob && this.mode === 'cloud') {
      const { data, error } = await this.client.storage.from(BUCKET).download(`${this.user.id}/${name}`);
      if (error) throw error;
      blob = data;
      // La copia local es solo para ver sin conexión: si falla, la imagen se muestra igual.
      await this.putBlob(id, blob).catch(() => {});
    }
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    this.urlCache.set(id, url);
    return url;
  }
  async deleteBlob(id, { name = `${id}.jpg` } = {}) {
    this.urlCache.delete(id);
    if (this.mode === 'cloud') {
      const { error } = await this.client.storage.from(BUCKET).remove([`${this.user.id}/${name}`]);
      if (error) throw error;
    }
    await this.idb((db) => {
      const tx = db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').delete(id);
      return done(tx);
    });
  }
}

export const store = new Store();
