'use client'

// Coda offline per giornate lavorative non ancora sincronizzate.
// Usa IndexedDB tramite una API Promise-based minimale.

const DB_NAME = 'quadro-offline'
const STORE = 'giornate-pending'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'localId', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface GiornataOffline {
  localId?: number
  commessaId: string
  operaioId: string
  data: string
  mezzoId: string | null
  lavoroSvolto: string
  note: string
  oreOrdinarie: number
  oreStraordinarie: number
  materiali: Array<{ materialeId?: string; descrizione: string; quantita: number; prezzoUnitario: number }>
  checklist: Array<{ templateId: string; risposta: boolean }>
  fotoBase64: Array<{ name: string; type: string; data: string }>
  queuedAt: string
}

export async function enqueue(item: Omit<GiornataOffline, 'localId' | 'queuedAt'>): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add({ ...item, queuedAt: new Date().toISOString() })
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export async function dequeue(localId: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(localId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getPending(): Promise<GiornataOffline[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as GiornataOffline[])
    req.onerror = () => reject(req.error)
  })
}

export async function countPending(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function base64ToFile(b64: string, name: string, type: string): File {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return new File([bytes], name, { type })
}
