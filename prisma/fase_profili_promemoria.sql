-- Aggiunta campi a operai
ALTER TABLE operai ADD COLUMN IF NOT EXISTS avatar_mascotte VARCHAR(255);
ALTER TABLE operai ADD COLUMN IF NOT EXISTS descrizione TEXT;
ALTER TABLE operai ADD COLUMN IF NOT EXISTS frase_divertente TEXT;
ALTER TABLE operai ADD COLUMN IF NOT EXISTS hobbies TEXT;

-- Creazione tabella promemoria
CREATE TABLE IF NOT EXISTS promemoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo VARCHAR(255) NOT NULL,
  descrizione TEXT,
  luogo VARCHAR(255),
  data_ora TIMESTAMPTZ NOT NULL,
  tipo VARCHAR(50) DEFAULT 'intervento',
  stato VARCHAR(50) DEFAULT 'attivo',
  assegnato_a_operaio_id UUID REFERENCES operai(id) ON DELETE CASCADE,
  per_impresa BOOLEAN DEFAULT false,
  importante BOOLEAN DEFAULT false,
  creato_da VARCHAR(255),
  completato_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Creazione tabella impresa_profilo
CREATE TABLE IF NOT EXISTS impresa_profilo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_impresa VARCHAR(255) DEFAULT 'CreCas Impianti S.r.l.',
  settore VARCHAR(255) DEFAULT 'Termoidraulica ed Elettrica',
  descrizione TEXT DEFAULT 'Da anni leader nel settore dell''impiantistica civile ed industriale, garantendo qualità, sicurezza ed efficienza energetica.',
  telefono VARCHAR(255) DEFAULT '+39 06 1234567',
  email VARCHAR(255) DEFAULT 'info@crecasimpianti.it',
  sito_web VARCHAR(255) DEFAULT 'www.crecasimpianti.it',
  indirizzo VARCHAR(255) DEFAULT 'Via Roma, 10 - 00100 Roma (RM)',
  mascotte_avatar VARCHAR(255) DEFAULT 'leone',
  colore_primario VARCHAR(255) DEFAULT '#0f766e',
  stile_card VARCHAR(255) DEFAULT 'Classico',
  mostra_nome BOOLEAN DEFAULT true,
  mostra_settore BOOLEAN DEFAULT true,
  mostra_indirizzo BOOLEAN DEFAULT true,
  mostra_telefono BOOLEAN DEFAULT true,
  mostra_email BOOLEAN DEFAULT true,
  mostra_sito_web BOOLEAN DEFAULT true,
  mostra_servizi BOOLEAN DEFAULT true,
  mostra_certificazioni BOOLEAN DEFAULT true,
  mostra_descrizione BOOLEAN DEFAULT true,
  mostra_valori BOOLEAN DEFAULT true,
  mostra_mascotte BOOLEAN DEFAULT true,
  motto_team VARCHAR(255) DEFAULT 'Costruiamo oggi, per un domani migliore.',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Inserimento record di default per impresa_profilo se non esiste
INSERT INTO impresa_profilo (nome_impresa)
SELECT 'CreCas Impianti S.r.l.'
WHERE NOT EXISTS (SELECT 1 FROM impresa_profilo);
