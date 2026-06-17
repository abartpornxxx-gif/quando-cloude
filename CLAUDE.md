# CLAUDE.md — Contesto di progetto: QUADRO

> Questo file è il "cervello di contesto" del progetto. L'agente di coding (Claude Code, Kimi Code) lo legge per restare allineato in ogni fase. Va tenuto nella cartella principale del progetto. **Non cancellarlo e aggiornalo quando cambiano le decisioni.**

## Cos'è QUADRO

QUADRO è un gestionale per un'**impresa di installazione impianti elettrici** in Italia (DM 37/2008). Ha **tre accessi distinti**:

- **IMPRESA** — titolare/amministrazione: preventivi, commesse, margini, soldi, documenti, pianificazione, dashboard completa.

- **OPERAI** — app di cantiere guidata: ore, materiale, mezzo, foto di fine giornata, checklist; adattata alle competenze del singolo.

- **CLIENTE FINALE** — portale: avanzamento lavori, stato pagamenti, documenti, catalogo offerte aggiuntive.

## La logica centrale (regole di prodotto, non negoziabili)

1. **Tutto ruota attorno alla COMMESSA** (il cantiere). Ogni ora, foto, materiale, mezzo si "attacca" a una commessa.

2. **Il dato si inserisce una volta sola** e si propaga: ore → costo manodopera della commessa; materiale → magazzino + costo; fattura → portale cliente.

3. **Margine reale in tempo reale**: budget previsto (dal preventivo) vs consuntivo (somma dei costi reali attaccati alla commessa).

4. **L'uomo resta al comando**: qualsiasi automazione/AI **propone**, ma le decisioni le **conferma l'impresa**.

## Stack tecnico (deciso — non cambiarlo senza chiedere)

- **Framework**: Next.js 16 (App Router) + TypeScript. Nota: usa `proxy.ts` invece di `middleware.ts` (convenzione Next.js 16).

- **UI**: Tailwind CSS v4. Componenti semplici, mobile-first (gli operai usano il telefono).

- **Database + Auth + Storage file**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage per le foto).

- **ORM**: Prisma (schema in `prisma/schema.prisma`). Per Fase 0 non usato direttamente; entra in gioco dalla Fase 1.

- **Deploy**: Vercel (web). L'app operai e il portale cliente sono **PWA installabili** (un solo codice, niente app store per ora; il mobile nativo è una fase futura).

- **AI (fasi avanzate)**: chiamate a un modello via API (Claude/Kimi/OpenAI). La chiave sta in variabile d'ambiente, mai nel codice.

## Architettura e convenzioni

- Un unico progetto Next.js con aree per ruolo: `/impresa/`, `/operaio/`, `/cliente/`.

- **Autorizzazione per ruolo (RBAC)**: ogni utente vede SOLO i propri dati. Il cliente vede solo le sue commesse e i suoi importi; l'operaio solo le commesse assegnate. Applica i controlli sia lato server sia con le Row Level Security policy di Supabase.

- Il ruolo è salvato in `user_metadata` di Supabase Auth (letto in `proxy.ts` senza query DB aggiuntive) e nella tabella `profiles` (creata dal trigger SQL in `supabase-setup.sql`).

- **Testi dell'interfaccia in italiano.** Nomi di variabili/funzioni in inglese.

- **Segreti in `.env.local`** (mai committare). Usa `.env.example` con i nomi delle variabili.

- **Soldi**: salva gli importi in centesimi (interi), formatta in euro solo nella UI.

- **Date**: salva in ISO, mostra in formato italiano.

## Metodo di lavoro (importante)

- **Si lavora UNA FASE alla volta.** Non iniziare la fase successiva finché l'utente non conferma che quella attuale funziona.

- Alla fine di ogni fase: **fermati**, riassumi cosa hai fatto, spiega in 3 righe **come l'utente può provarlo**, e attendi.

- **Scrivi test** per la logica importante (calcolo margini, permessi, preventivo→commessa).

- **Commit frequenti** con messaggi chiari in italiano (es. "Fase 1: anagrafiche clienti e commesse").

- Se una richiesta è ambigua, **fai una domanda sola e precisa** prima di procedere.

- Non inventare dati, chiavi o servizi. Se manca una chiave/segreto, dillo e spiega come ottenerla.

- Mantieni il codice **semplice e leggibile**: chi lo usa non è uno sviluppatore esperto.

## Vincoli normativi italiani (tienine conto nel modello dati e nei testi)

- **DM 37/2008** e norma **CEI 64-8**: la Dichiarazione di Conformità (DiCo) e le checklist vi fanno riferimento.

- **Fattura elettronica SdI**: NON costruire l'invio da zero; predisponi l'esportazione dati/XML e l'aggancio a un intermediario accreditato.

- **Pagamenti online**: usa un provider conforme PSD2/SCA (es. Stripe), mai gestire i dati carta direttamente.

- **GDPR** + **art. 4 L. 300/1970**: le funzioni di presenza/geolocalizzazione degli operai vanno dietro consenso/informativa e vanno tenute disattivate finché l'utente non le abilita esplicitamente. Segnalalo nel codice con un TODO ben visibile.

## Stato del progetto

- Fase corrente: **Redesign ORDINI 1-6 completato — in attesa di validazione. Fase 4 (magazzino/ordini standard) non ancora iniziata.**

- Aggiorna questa riga a fine di ogni fase.
