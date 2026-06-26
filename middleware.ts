// Middleware Next.js — riesporta il proxy di autenticazione.
// Senza questo file, le protezioni in proxy.ts NON vengono mai eseguite.
export { proxy as middleware, config } from './proxy'
