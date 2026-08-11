/**
 * Module 11 — Browser IndexedDB wrapper for local-first field worker capture
 * DB Name: SahayakFieldDB
 * Store Name: field_records (keyPath: client_id)
 */

const DB_NAME = 'SahayakFieldDB'
const DB_VERSION = 1
const STORE_NAME = 'field_records'

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'client_id' })
        store.createIndex('synced', 'synced', { unique: false })
      }
    }

    request.onsuccess = (event) => resolve(event.target.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

export async function saveFieldRecord(record) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(record)

    request.onsuccess = () => resolve(record)
    request.onerror = (event) => reject(event.target.error)
  })
}

export async function getAllFieldRecords() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = (event) => reject(event.target.error)
  })
}

export async function getUnsyncedFieldRecords() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = request.result || []
      resolve(all.filter(r => r.synced === false))
    }
    request.onerror = (event) => reject(event.target.error)
  })
}

export async function markRecordSynced(clientId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(clientId)

    getReq.onsuccess = () => {
      const record = getReq.result
      if (record) {
        record.synced = true
        record.synced_at = new Date().toISOString()
        const putReq = store.put(record)
        putReq.onsuccess = () => resolve(record)
        putReq.onerror = (e) => reject(e.target.error)
      } else {
        resolve(null)
      }
    }
    getReq.onerror = (e) => reject(e.target.error)
  })
}
