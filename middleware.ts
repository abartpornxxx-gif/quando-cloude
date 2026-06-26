// Middleware Next.js — riesporta il proxy di autenticazione.
// Senza questo file, le protezioni in auth-middleware.ts NON vengono mai eseguite.
export { proxy as middleware, config } from './auth-middleware'
