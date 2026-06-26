-- ============================================================
-- QUADRO — Fase 1: Fix enum types (PascalCase richiesto da Prisma)
--
-- Il problema: fase1-schema.sql ha creato i tipi con nomi snake_case
-- (stato_preventivo, stato_mezzo, ...) ma Prisma 7 li cerca con nomi
-- PascalCase esatti (StatoPreventivo, StatoMezzo, ...).
--
-- Questo script:
--   1. Crea i tipi PascalCase mancanti (sicuro se già esistono)
--   2. Migra le colonne esistenti al tipo corretto
--   3. Rimuove i tipi snake_case ormai inutilizzati
--
-- Supabase Dashboard > SQL Editor > New query > Incolla e "Run"
-- ============================================================

-- ─── 1. Crea i tipi PascalCase (no-op se già esistono) ───────

DO $$ BEGIN
  CREATE TYPE "StatoMezzo" AS ENUM ('disponibile', 'in_uso', 'in_manutenzione', 'fuori_servizio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatoAttrezzatura" AS ENUM ('disponibile', 'in_uso', 'in_manutenzione', 'fuori_servizio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatoPreventivo" AS ENUM ('bozza', 'inviato', 'accettato', 'rifiutato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StatoCommessa" AS ENUM ('aperta', 'chiusa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Migra le colonne al tipo PascalCase ───────────────────
-- Rimuove il DEFAULT prima (altrimenti il cast fallisce),
-- cambia il tipo con USING per convertire i valori esistenti,
-- poi ripristina il DEFAULT con il tipo nuovo.

-- mezzi.stato
ALTER TABLE public.mezzi
  ALTER COLUMN stato DROP DEFAULT,
  ALTER COLUMN stato TYPE "StatoMezzo"
    USING stato::text::"StatoMezzo",
  ALTER COLUMN stato SET DEFAULT 'disponibile'::"StatoMezzo";

-- attrezzature.stato
ALTER TABLE public.attrezzature
  ALTER COLUMN stato DROP DEFAULT,
  ALTER COLUMN stato TYPE "StatoAttrezzatura"
    USING stato::text::"StatoAttrezzatura",
  ALTER COLUMN stato SET DEFAULT 'disponibile'::"StatoAttrezzatura";

-- preventivi.stato
ALTER TABLE public.preventivi
  ALTER COLUMN stato DROP DEFAULT,
  ALTER COLUMN stato TYPE "StatoPreventivo"
    USING stato::text::"StatoPreventivo",
  ALTER COLUMN stato SET DEFAULT 'bozza'::"StatoPreventivo";

-- commesse.stato
ALTER TABLE public.commesse
  ALTER COLUMN stato DROP DEFAULT,
  ALTER COLUMN stato TYPE "StatoCommessa"
    USING stato::text::"StatoCommessa",
  ALTER COLUMN stato SET DEFAULT 'aperta'::"StatoCommessa";

-- ─── 3. Rimuovi i tipi snake_case (ora orfani) ───────────────

DROP TYPE IF EXISTS stato_mezzo;
DROP TYPE IF EXISTS stato_attrezzatura;
DROP TYPE IF EXISTS stato_preventivo;
DROP TYPE IF EXISTS stato_commessa;

-- ============================================================
-- Fine script fix enum
-- Dopo l'esecuzione, riavvia il server (npm run dev) e riprova.
-- ============================================================
