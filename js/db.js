/* Rolo — local storage (IndexedDB). Everything lives on this device. */
'use strict';

const DB = (() => {
  const NAME = 'rolo';
  const VER = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('contacts')) db.createObjectStore('contacts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      Promise.resolve(fn(s)).then((v) => { out = v; });
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }
  const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  return {
    async allContacts() { return tx('contacts', 'readonly', (s) => reqP(s.getAll())); },
    async putContact(c) { return tx('contacts', 'readwrite', (s) => { s.put(c); }); },
    async putContacts(list) { return tx('contacts', 'readwrite', (s) => { list.forEach((c) => s.put(c)); }); },
    async deleteContact(id) { return tx('contacts', 'readwrite', (s) => { s.delete(id); }); },
    async clearContacts() { return tx('contacts', 'readwrite', (s) => { s.clear(); }); },
    async getMeta(key) { return tx('meta', 'readonly', (s) => reqP(s.get(key))); },
    async setMeta(key, val) { return tx('meta', 'readwrite', (s) => { s.put(val, key); }); }
  };
})();
