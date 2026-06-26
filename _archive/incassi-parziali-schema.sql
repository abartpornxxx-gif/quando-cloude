-- Migrazione: incassi parziali fatture attive
-- Eseguire su Supabase Dashboard → SQL Editor

ALTER TYPE "StatoFatturaAttiva" ADD VALUE IF NOT EXISTS 'parzialmente_incassata';
