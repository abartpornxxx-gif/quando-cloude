-- Aggiunge lo stato parzialmente_pagata all'enum delle fatture passive
ALTER TYPE "StatoFatturaPassiva" ADD VALUE IF NOT EXISTS 'parzialmente_pagata';
