// Almacén local-first: todo vive en memoria + IndexedDB del dispositivo.
// En modo nube, cada cambio entra a una cola y se sube a Supabase (tabla gym_records);
// los cambios de otros dispositivos se descargan por updated_at. Último cambio gana por registro.

export const KINDS = ['profiles', 'exercises', 'preferences', 'routines', 'days', 'routineExercises',
  'sessions', 'workoutExercises', 'sets', 'measurements', 'photos'];
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
    this.db = await openDB(mode === 'cloud' ? `gymef-${user.id}` : 'gymef-local');
    const rows = await request(this.db.transaction('records').objectStore('records').getAll());
    for (const map of Object.values(this.maps)) map.clear();
    for (const row of rows) if (!row.deleted && this.maps[row.kind]) this.maps[row.kind].set(row.id, row.data);
    const meta = this.db.transaction('meta').objectStore('meta');
    this.outbox = new Set((await request(meta.get('outbox'))) ?? []);
    this.lastPulled = (await request(meta.get('lastPulled'))) ?? null;
    this.closed = false;
    this.notify();
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

  close() { this.closed = true; clearInterval(this.timer); this.db?.close(); }

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
    this.saveTimer = setTimeout(() => this.persist(), 0);
  }
  async persist() {
    if (!this.dirty.size) return;
    const entries = [...this.dirty.values()];
    this.dirty.clear();
    const tx = this.db.transaction(['records', 'meta'], 'readwrite');
    for (const e of entries) tx.objectStore('records').put(e);
    tx.objectStore('meta').put([...this.outbox], 'outbox');
    await done(tx);
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
      const records = this.db.transaction('records').objectStore('records');
      const rows = (await Promise.all(chunk.map((key) => request(records.get(key))))).filter(Boolean);
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
    const tx = this.db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put([...this.outbox], 'outbox');
    await done(tx);
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
      const tx = this.db.transaction('records', 'readwrite');
      for (const row of data) {
        if (!this.maps[row.kind]) continue;
        const key = `${row.kind}/${row.id}`;
        const local = this.maps[row.kind].get(row.id);
        if (this.outbox.has(key) && (local?._u ?? Infinity) >= (row.data?._u ?? 0)) continue;
        if (row.deleted) { if (this.maps[row.kind].delete(row.id)) changed = true; }
        else if (!local || local._u !== row.data._u) { this.maps[row.kind].set(row.id, row.data); changed = true; }
        tx.objectStore('records').put({ key, kind: row.kind, id: row.id, data: row.data, deleted: row.deleted });
        if (!newest || row.updated_at > newest) newest = row.updated_at;
      }
      await done(tx);
      if (data.length < 1000) break;
    }
    // Una cuenta vacía también cuenta como descargada.
    newest ??= '1970-01-01T00:00:00.000Z';
    if (newest !== this.lastPulled) {
      this.lastPulled = newest;
      const tx = this.db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put(newest, 'lastPulled');
      await done(tx);
    }
    if (changed) this.notify();
  }

  // ---------- Fotos ----------
  async saveBlob(id, blob) {
    if (this.mode === 'cloud') {
      const { error } = await this.client.storage.from(BUCKET).upload(`${this.user.id}/${id}.jpg`, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
    } else {
      const tx = this.db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').put(blob, id);
      await done(tx);
    }
  }
  async blobURL(id) {
    if (this.urlCache.has(id)) return this.urlCache.get(id);
    let url = null;
    if (this.mode === 'cloud') {
      const { data, error } = await this.client.storage.from(BUCKET).createSignedUrl(`${this.user.id}/${id}.jpg`, 3600);
      if (error) throw error;
      url = data.signedUrl;
    } else {
      const blob = await request(this.db.transaction('blobs').objectStore('blobs').get(id));
      url = blob ? URL.createObjectURL(blob) : null;
    }
    this.urlCache.set(id, url);
    return url;
  }
  async deleteBlob(id) {
    this.urlCache.delete(id);
    if (this.mode === 'cloud') {
      const { error } = await this.client.storage.from(BUCKET).remove([`${this.user.id}/${id}.jpg`]);
      if (error) throw error;
    } else {
      const tx = this.db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').delete(id);
      await done(tx);
    }
  }
}

export const store = new Store();
