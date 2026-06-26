# CLAUDE.md — Contesto di progetto: QUADRO

> Questo file è il "cervello di contesto" del progetto. L'agente di coding (Claude Code, Kimi Code) lo legge per restare allineato in ogni fase. Va tenuto nella cartella principale del progetto. **Non cancellarlo e aggiornalo quando cambiano le decisioni.**

## REGOLA DI COORDINAMENTO MULTI-STRUMENTO
Su questo progetto lavorano a turno due strumenti: Claude Code e Antigravity.
Per evitare conflitti valgono SEMPRE queste regole, senza eccezioni:
1. Si lavora SOLO sul branch main. Vietato creare o usare altri branch.
2. All'AVVIO di ogni sessione, prima di toccare qualsiasi file, eseguire:
   - git branch --show-current  (deve rispondere "main"; se no, fermarsi e avvisare l'utente)
   - git pull
3. Prima di FERMARSI o passare la mano all'altro strumento, eseguire SEMPRE:
   - git add -A
   - git commit -m "messaggio chiaro in italiano"
   - git push
4. Mai lasciare lavoro non committato e non pushato a fine sessione.
5. Una sola area di lavoro alla volta, test (tsc + build) prima di ogni commit.

## FILE INTOCCABILI — NON ELIMINARE MAI
Questi file sono critici per il funzionamento del sito. Cancellarli rompe tutto.

| File | Perché è intoccabile |
|------|----------------------|
| `middleware.ts` | Dice a Next.js di usare `proxy.ts` come middleware di autenticazione. Senza, ogni pagina crasha con errore server e il sito è inaccessibile. NON eliminarlo MAI, anche se sembra ridondante. |
| `proxy.ts` | Contiene la logica di autenticazione e routing per ruolo. Richiamato da `middleware.ts`. |
| `prisma/schema.prisma` | Schema del database. Modificare senza migrare rompe il DB in produzione. |

### Regola sul `postinstall` in package.json
**NON aggiungere `prisma db push` al postinstall.** È pericoloso in produzione perché:
- Viene eseguito ad ogni deploy su Vercel
- Può droppare colonne o tabelle se lo schema è cambiato
- Può bloccare l'intera build se la connessione DB fallisce

Per applicare migrazioni SQL: eseguirle manualmente dalla dashboard Supabase → SQL Editor.

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

## Regole di design, codice e processo (NON negoziabili)

### A — Design system visivo

**Identità visiva per ruolo** (usare SEMPRE questi colori, mai mescolarli):
- Impresa → `slate-900` (header) + `blue-600` (accent/CTA)
- Operaio → `emerald-900` (header) + `emerald-600` (CTA)
- Magazziniere → `amber-800` (header) + `amber-600` (CTA)
- Cliente → `violet-700` (header) + `violet-600` (CTA)
- Ufficio → `teal-700` (header) + `teal-600` (CTA)

**Card standard** — invariabile: `rounded-2xl border border-gray-200 bg-white shadow-sm`
**KPI numeri** — usare sempre `<StatCard>` da `components/ui/StatCard.tsx`
**Badge di stato** — usare sempre `<Badge>` da `components/ui/Badge.tsx`
**Spaziatura sezioni** — `space-y-8` tra aree principali, `space-y-3` tra item di lista
**Titolo pagina** — sempre `text-2xl font-bold text-gray-900`
**Label sezione** — sempre `text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3`
**Bottone primario** — `bg-[accent]-600 hover:bg-[accent]-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm`
**Bottone secondario** — `bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium`
**Niente CSS inline**, niente classi Tailwind inventate al volo. Se manca un pattern → aggiungere componente in `components/ui/`.

### B — Struttura del codice

- **Server Component di default.** `'use client'` solo se strettamente necessario (form interattivi, polling, stato UI locale).
- **Server Actions** in `actions.ts` nella stessa cartella della pagina che le usa.
- **Componenti riutilizzabili** in `components/ui/` se usati da 2+ aree diverse; in `components/` se specifici di un'area.
- **Niente logica di business nei componenti.** Query Prisma e calcoli vanno in Server Components o `lib/`.
- **Pattern pagina**: `requireRuolo()` → query dati → render. Sempre in questo ordine, niente deviazioni.
- **Se un blocco visivo si ripete 2+ volte** in pagine diverse → estrarre componente prima di continuare.

### C — Processo di sviluppo

- **Prima di iniziare**: definire in 2 righe cosa si fa e cosa NON si fa in questa sessione.
- **Prima di ogni commit**: `npx tsc --noEmit` + `npm run build` — zero errori, sempre.
- **Un commit per ogni feature funzionante**, non alla fine della sessione.
- **L'utente valida ogni area** visivamente prima di passare alla successiva.
- **Niente gold-plating**: non aggiungere funzionalità non richieste, non "migliorare" codice che funziona.
- **Se una pagina viene toccata**, deve rispettare le regole A e B. Non lasciare pagine "vecchio stile".

---

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

- Fase corrente: **Post-Fase 12: incassi parziali fatture attive completati (commit 80ebdfb). DB richiede migrazione SQL (incassi-parziali-schema.sql).**

### Decisioni architetturali recenti
- **Countdown**: visibile SOLO all'impresa (in `/impresa/giornate`). L'operaio vede solo stato generico e pulsante bloccato/attivo.
- **Blocco temporale**: il server enforza il tempo minimo (non solo il client). Operaio non può chiudere sessione in anticipo.
- **Rapportino**: obbligatorio. Se mancante: banner rosso persistente nel layout operaio + avviso impresa. Include sezione reso materiale.
- **Push notification**: struttura pronta in `lib/push.ts` + `public/sw.js`. Attivare con `npm install web-push` + VAPID keys in `.env.local`.
- **Email**: struttura pronta in `lib/email.ts`. Attivare con `npm install resend` + `RESEND_API_KEY` in `.env.local`.
- **Enum DB**: `user_role` (lowercase) esiste per `profiles.role` (legacy); `"UserRole"` (PascalCase) è stato creato per `chat_messaggi.ruolo` (richiesto da Prisma); `"StatoOrdine"` e `"TipoMovimento"` aggiunti per Fase 4.
- **Fase 4 — modelli**: `OrdineFornitore` (ordini a fornitori), `OrdineRiga` (righe ordine), `MovimentoMagazzino` (carico/scarico/reso). Giacenza calcolata on-the-fly dai movimenti (no campo denormalizzato). Quando ordine→consegnato: carico automatico + incremento `costiMateriali` commessa. Magazziniere che evade richiesta: scarico automatico se materiale collegato al listino. Rapportino: sezione reso crea movimenti tipo=reso.
- **Fase 5 — modelli**: `FatturaAttiva` + `FatturaAttivaRiga` (fatture emesse), `FatturaPassiva` (fatture ricevute), `DichiarazioneConformita` (DiCo DM 37/2008). Enums: `StatoFatturaAttiva`, `StatoFatturaPassiva`. Importi in centesimi. `aliquotaIva` come Int (22=22%). Incasso/pagamento registrati manualmente (solo bonifico). Fattura incassata propaga su `commessa.fatturato`. Export XML SdI genera FatturaPA v1.2 (NO invio diretto — file da passare a intermediario accreditato). DiCo: PDF via browser print (`/impresa/dico/[id]/stampa`, CSS `@media print` nasconde nav). Variabili impresa in `.env.local`: `IMPRESA_RAGIONE_SOCIALE`, `IMPRESA_PARTITA_IVA`, `IMPRESA_INDIRIZZO`, `IMPRESA_CAP`, `IMPRESA_CITTA`, `IMPRESA_PROVINCIA`.

- **Fase 6 — Portale Cliente**: `requireCliente()` in `lib/auth.ts` linka user via `clienti.email`. RLS SELECT-only su 9 tabelle (clienti, commesse, giornate, giornata_foto, rapportini, fatture_attive, fattura_attiva_righe, dichiarazioni_conformita, preventivi) con policy `auth.jwt() ->> 'email' = email` o sub-select via JOIN. Route: `/cliente/lavori` (lista commesse + barra avanzamento), `/cliente/lavori/[id]` (diario + foto), `/cliente/pagamenti` (fatture + IBAN bonifico), `/cliente/documenti` (lista DiCo + fatture), `/cliente/documenti/fattura/[id]` e `/cliente/documenti/dico/[id]` (view print-friendly protect per ruolo cliente). `IMPRESA_IBAN` in `.env.local` per mostrare coordinate bonifico. Sicurezza: `commessa.clienteId !== cliente.id → notFound()` e `dico.commessa.clienteId !== cliente.id → notFound()` su ogni pagina.

- **Fase 7 — Catalogo offerte aggiuntive**: modelli `OffertaCatalogo` + `RichiestaOfferta`. Enum: `StatoRichiestaOfferta` (nuova/vista/in_preventivo/chiusa). Storage bucket `foto-catalogo` (pubblico, max 5 MB). Impresa: CRUD offerte su `/impresa/catalogo` con upload foto via browser client Supabase, toggle attiva/nascosta, ordine visualizzazione. Vetrina cliente su `/cliente/servizi` (solo offerte attive): card con foto + descrizione + "A partire da". Pulsante "Mi interessa" apre modal con nota libera e selezione commessa opzionale → crea `RichiestaOfferta`. Gestione impresa su `/impresa/richieste-offerte` (lista con badge "nuove") e `/impresa/richieste-offerte/[id]` (dettaglio + "Crea preventivo" crea preventivo con nota pre-compilata e redirect a `/impresa/preventivi/[id]`). Dashboard impresa: 5° KPI "Richieste offerte" con contatore nuove. RLS: impresa gestisce tutto, cliente vede solo offerte attive e proprie richieste.

- **Fase 8 — Notifiche in-app e potenziamento chat**: `lib/notifiche.ts` centrale con funzioni `alertImpresa/Operaio/Magazziniere/Cliente()` + `listaNotifiche*()` calcolate dallo stato DB (no tabella notifiche separata). `components/NotificheBell.tsx` (campanellino con badge rosso) nei layout di tutti i ruoli. Pagine: `/impresa/notifiche`, `/operaio/notifiche`, `/magazziniere/notifiche`, `/cliente/notifiche`. Chat magazziniere: `/magazziniere/chat/[giornataId]` con link da RichiestaDettaglio. Rilevamento presenza: solo stato `giornata.fase` dal DB (NON GPS) — TODO LEGALE art. 4 L. 300/1970 ben visibile. Push: `lib/push.ts` con 7 funzioni stub (attivare con `npm install web-push` + VAPID in `.env.local`). Email: `lib/email.ts` con 9 funzioni stub (attivare con `npm install resend` + `RESEND_API_KEY` in `.env.local`).

- **Fase 9 — Design system globale**: `components/ui/PageHeader.tsx` (header pagina con back link + titolo + badge + azione) e `components/ui/EmptyState.tsx` (stato vuoto con icona + testo + CTA) come nuovi componenti fondazione. Redesign sistematico: tutti i layout (slate-900 impresa, emerald-900 operaio, amber-800 magazziniere, violet-700 cliente), dashboard impresa con ring charts SVG + BudgetBar, dashboard di tutti i ruoli con StatCard + Badge. Liste impresa aggiornate (commesse, preventivi, clienti, operai, materiali, fatture, ordini, giornate): da TABLE a card-list con divide-y, PageHeader, EmptyState, Badge coerenti. Dettaglio commessa: mini-stats finanziarie in grid 3 col (preventivato/costi/margine%). Operaio: InizioGiornata con card emerald-900 per il piano impresa + attrezzatura buttons più grandi; FlussoGiornata con step progress bar dots + phase card a gradiente (colore cambia per fase) + pulsante azione full-width py-5 shadow-lg + griglia foto 4 col + chat row con freccia. Cliente: lavori con zoom foto al hover + Badge + empty state; pagamenti con card amber per totale da pagare + Badge per stati. Regola: tutte le list pages usano rounded-2xl border bg-white shadow-sm; input: rounded-xl border; pulsante primario: rounded-xl bg-blue-600 px-4 py-2.5.

- **Fase 10 — Bug fix + nuove funzioni**: Archiviazione commesse (no delete, FK safe) con pagina `/impresa/commesse/archiviate` + ripristino. Chat modernizzata con bolle per ruolo (operaio/impresa/magazziniere), scorciatoie messaggi rapidi, separatori per data. Centro notifiche impresa: messaggi recenti con avatar+mittente visibile. Rapportino operaio: nuova sezione "Pianifica domani" (cosaFareDomani, urgenza 1-5, stimaOre). Pagina `/impresa/pianificazione/domani` aggrega suggerimenti da rapportini e permette conferma con stima impresa. Promemoria interattivi operai: `SuggerimentoCantiere` configurabili da impresa (`/impresa/checklist`), spuntabili in `FlussoGiornata` fase "fine". Logo QUADRO → link dashboard in tutti i layout. Schema DB: nuovi campi `archiviata` (commesse), `cosaFareDomani/urgenzaDomani/stimaOreDomani` (rapportini), `stimaImpresaOre/confermata` (pianificazioni). Nuove tabelle: `suggerimenti_cantiere`, `suggerimenti_spunte`. Script SQL in `fase10-schema.sql`.
- **Stress Test (post Fase 10)**: Guard FK su TUTTI i delete — eliminaCliente, eliminaOperaio, eliminaFornitore, eliminaMateriale, eliminaAttrezzatura, eliminaMezzo, eliminaPreventivo, eliminaPianificazione, eliminaOfferta: contano i record figli PRIMA di tentare il delete e lanciano un errore leggibile se esistono. `DeleteButton` aggiornato con try-catch che mostra alert() invece di crashare su error boundary. `SuggerimentoSpunta` ora ha FK relation esplicita verso `Giornata` in schema.prisma. `annullaGiornata` pulisce le spunte orfane prima di eliminare la giornata. Migrazione SQL in `stress-test-fix.sql` (aggiunge FK su `suggerimenti_spunte.giornata_id`). Fix nav: rimosso prefix `/impresa/archiviate` (errato, il prefisso corretto è già `/impresa/commesse`).

- **Fase 11 — Checklist adempimenti di cantiere**: Nuovi modelli Prisma: `TipoLavoro`, `AdempimentoModello`, `AdempimentoCommessa`; campo `tipoLavoroId` su `Commessa`. Migrazione SQL in `adempimenti-schema.sql`. CRUD tipi lavoro in `/impresa/tipi-lavoro/` (lista, nuovo, [id] con gestione voci). `CommessaForm` aggiornato con dropdown tipo lavoro. `salvaCommessa`: auto-applica checklist dal modello al momento della creazione. Dettaglio commessa: sezione `AdempimentiSection` (componente Client) con barra progresso, spunta interattiva (toggle checkbox + tracciamento chi/quando), pulsante "Applica checklist" (idempotente, aggiunge solo voci mancanti), aggiunta voci custom, eliminazione voci. Lista commesse: badge `X/Y adem.` per ciascuna. Dashboard: widget "Adempimenti in sospeso" (visibile solo se esistono). Nav impresa: "Tipi lavoro" in macro-categoria Cantieri. Collegamento DiCo e Foto via campo `collegamento` (badge colorati). Disclaimer D.Lgs. 81/2008 in tutte le pagine tipi lavoro.

- **Fase 12 — Creazione accessi utente**: `lib/supabase/admin.ts` con `getAdminClient()` (usa `SUPABASE_SERVICE_ROLE_KEY`, mai esposta al client). `app/impresa/accessi/actions.ts` con 3 server action: `verificaAccesso(email)` → controlla `profiles.email`; `creaAccesso({email, password, ruolo, nome})` → chiama `admin.auth.admin.createUser()` con `email_confirm: true` e ruolo in `user_metadata`; `reimpostaPassword({email, nuovaPassword})` → chiama `admin.auth.admin.updateUserById()`. `components/ui/GestioneAccesso.tsx` — componente Client per mostrare stato accesso (Accesso attivo / Crea accesso / No email). Aggiunto in: `/impresa/operai/[id]`, `/impresa/clienti/[id]`, `/impresa/magazzinieri/[id]`. CRUD magazzinieri: `/impresa/magazzinieri/` (lista), `/impresa/magazzinieri/nuovo`, `/impresa/magazzinieri/[id]` (con GestioneAccesso). Nav impresa: "Magazzinieri" aggiunto in Persone. Migrazione SQL in `fase12-schema.sql`: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'magazziniere'` (critico per il trigger `handle_new_user`). `.env.example` aggiornato. `SUPABASE_SERVICE_ROLE_KEY`: trovare in Supabase Dashboard → Project Settings → API → service_role (secret). TODO_RESEND: commento nel codice dove inserire l'invio email invito.

- **Incassi parziali (post Fase 12)**: `StatoFatturaAttiva` ora include `parzialmente_incassata`. `registraIncasso` accumula per delta: ogni bonifico incrementa `commessa.fatturato` solo del nuovo importo ricevuto, aggiorna `importoIncassato` progressivamente. Form mostra residuo e blocca importi oltre soglia. Badge/LABEL aggiornati ovunque: `/impresa/fatture`, `/ufficio/fatture`, scadenzario, saldi-pendenti, dashboard, notifiche. Migrazione DB in `incassi-parziali-schema.sql` (da eseguire su Supabase). Guard: fattura `parzialmente_incassata` non eliminabile; fattura `incassata` respinge ulteriori incassi.

- Aggiorna questa riga a fine di ogni fase.
