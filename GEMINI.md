# QUADRO — Visione e Linee Guida Operative

## 1. Visione di Prodotto
QUADRO è un gestionale operativo per CreCas Impianti S.r.l., studiato per automatizzare la gestione quotidiana di commesse, clienti, fornitori, operai, fatture attive e passive, scadenze, saldi pendenti, rapportini, giornate lavorative e magazzino.
*   **Obiettivo principale**: Fornire uno strumento solido e premium per uso interno di CreCas.
*   **Cosa NON costruire ora**: Strutture multi-tenant per SaaS commerciale o pacchetti di terze parti non strettamente richiesti.
*   **Tono visivo**: Premium, reattivo, mobile-first e scattante.

## 2. Regole Ferree di Sicurezza
Per preservare l'integrità del database e del deploy di produzione di CreCas, sono assolutamente vietati:
*   `git push` o `vercel deploy --prod`
*   `supabase db push`, `prisma db push`, o migrazioni dirette sul database remoto.
*   Modifiche arbitrarie a chiavi API, policy RLS, ruoli o storage policy di Supabase.

Tutti gli sviluppi devono avvenire in locale, sul branch dedicato ed essere validati tramite test locali.

## 3. Workflow di Sviluppo
Il processo di modifica segue rigidamente questi passaggi:
1.  **Pianificazione e Ricerca**: Identificazione dei file, logica delle modifiche e redazione del piano di implementazione.
2.  **Modifica Locale**: Scrittura del codice, creazione di componenti riutilizzabili e puliti, responsive ed accessibili.
3.  **QA (Quality Assurance)**: Esecuzione di typecheck (`npx tsc --noEmit`), build di produzione (`npm run build`) e unit test (`npx vitest run`).
4.  **Valutazione e Report**: Relazione della Commissione Qualità e commit locale del lavoro.
