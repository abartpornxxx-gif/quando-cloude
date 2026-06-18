-- Stress test fix: aggiunge FK mancante tra suggerimenti_spunte e giornate
-- Se già esiste, il comando fallisce senza danni (usare IF NOT EXISTS dove possibile)

-- Aggiunge FK constraint su giornata_id in suggerimenti_spunte
-- (solo se non esiste già)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'suggerimenti_spunte_giornata_id_fkey'
    AND table_name = 'suggerimenti_spunte'
  ) THEN
    ALTER TABLE suggerimenti_spunte
      ADD CONSTRAINT suggerimenti_spunte_giornata_id_fkey
      FOREIGN KEY (giornata_id) REFERENCES giornate(id) ON DELETE CASCADE;
  END IF;
END $$;
