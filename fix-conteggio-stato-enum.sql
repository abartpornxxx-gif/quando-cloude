-- Fix: rinomina stato_conteggio -> "StatoConteggio" per matching con Prisma
-- Root cause: Prisma v7 con @prisma/adapter-pg cerca il tipo PostgreSQL "public.StatoConteggio"
-- (PascalCase, con quotes), ma la migration originale aveva creato stato_conteggio (snake_case).
-- Il risultato era: PRISMA CREATE ERROR: type "public.StatoConteggio" does not exist
-- APPLICATO SU PRODUZIONE il 2026-06-30 via sessione pooler porta 5432.

-- Se mai si ripristina da zero:
ALTER TYPE stato_conteggio RENAME TO "StatoConteggio";
