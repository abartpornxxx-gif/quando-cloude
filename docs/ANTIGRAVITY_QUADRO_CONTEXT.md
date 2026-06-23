# QUADRO — Contesto Operativo Antigravity
> Creato il 2026-06-23. Questo file è la memoria tecnica locale per Antigravity su QUADRO.

---

## 1. Visione Prodotto

QUADRO è una piattaforma gestionale operativa per imprese tecniche, nata verticale per
**CreCas Impianti S.r.l.** (impianti elettrici, fotovoltaico, manutenzioni, videosorveglianza,
automazioni, allarmi, cantieri). Obiettivo futuro: modularità multi-settore e vendita SaaS.

**Non è ancora vendibile. È in consolidamento progressivo.**

---

## 2. Stack Tecnico Reale

| Layer | Tecnologia |
|---|---|
| Framework | Next.js 16.2.9 (non 14 — versione più recente usata) |
| React | 19.2.4 |
| Linguaggio | TypeScript 5 |
| ORM | Prisma 7.8 con `prisma-client` (nuovo adapter, non `prisma-client-js`) |
| DB | Supabase PostgreSQL |
| Auth | Supabase Auth + user_metadata.role |
| CSS | Tailwind CSS 4 |
| Output Prisma | `app/generated/prisma/` (non il default `node_modules/@prisma/client`) |
| Deploy | Vercel (vercel.json presente) |
| Test | Vitest 4.1.8 (configurato ma test non scritti) |
| PWA | manifest.json + sw.js presenti (offline HTML base, nessun SW funzionale reale) |
| Email | Resend — stub sicuro con guard `RESEND_API_KEY`, tutto commentato |
| Push | Web Push — stub sicuro con guard VAPID, tutto commentato |

---

## 3. Ruoli Utente

| Ruolo | Area | Note |
|---|---|---|
| `impresa` | `/impresa/*` | Pieno controllo, tutte le funzioni |
| `ufficio` | `/ufficio/*` | Finanza, preventivi, ordini, clienti, pianificazione |
| `operaio` | `/operaio/*` | Giornate, rapportini, chat, calendario |
| `magazziniere` | `/magazziniere/*` | Richieste materiale, magazzino |
| `cliente` | `/cliente/*` | Portale cliente: lavori, pagamenti, documenti, manutenzioni |

**Auth**: il ruolo è in `user.user_metadata.role` (Supabase). La lookup al DB del record
corrispondente (Operaio, Cliente, etc.) avviene in `lib/auth.ts`.

---

## 4. Struttura Moduli — Stato Reale

### ✅ COMPLETO / CONSOLIDATO

#### Manutenzioni Programmate
- Modello: `ManutenzioneProgrammata`, `PropostaIntervento`
- Stati proposta: Inviata, VistaDalCliente, Accettata, RifiutataCliente, ConfermataManuale, CommessaCreata, Annullata
- UI impresa completa (crea, gestisce proposte)
- Portale cliente: risposta proposta
- Notifiche cliente/impresa collegate
- Creazione commessa da proposta accettata/confermata
- Comando "Segna intervento eseguito" → aggiorna `dataUltimoIntervento` e `dataProssimoIntervento`
- Guard: blocca creazione proposta se già attiva, blocca update manutenzione prima chiusura reale
- **Commit chiave**: 92dbd06, 2a97e54, ba4701c, 7518f33, 921c167

#### Pianificazione
- Modello: `Pianificazione` con unique `[commessaId, operaioId, data]`
- **Conflict detection implementata** (commit f7e3a71): stesso operaio + stesso giorno + cantiere diverso → errore
- `sostituisciOperaio` con conflict check
- SubNav stabile, vista settimana, board, giorno, domani
- Revalidate `/impresa/pianificazione` + `/impresa/calendario`
- **Commit chiave**: dfda517, f7e3a71

#### Mezzi — Scadenze
- Scadenza bollo, revisione, assicurazione (campi `@db.Date`)
- Badge per tipo scadenza, calcolo UTC corretto
- Notifiche impresa entro 30 giorni
- **Commit chiave**: 185b998

#### Finanza Operativa
- Stato commessa: `aperta` → `finita` → `chiusa` (guard: chiusura bloccata se non saldata)
- `registraIncasso` idempotente
- Saldi pendenti ufficio con totale residuo
- Notifiche ufficio calcolate da stato DB (non tabella separata)
- Dashboard ufficio con totale residuo, link WhatsApp/mail
- Fatture filtrate per cliente/commessa (`?commessaId=`, `?clienteId=`)
- **Commit chiave**: 281cc50, 64836eb, 599b0d3, 1e8a65b, fe5b97a, e34462d, 8159953

#### Notifiche Impresa
- Sistema `NotificaLetta` (tabella DB) + `listaNotificheImpresa(userId)` con flag `letta`
- Pagina impresa: sezione "già lette", bottone "Segna tutte lette" con server action
- Campanellino con count reale (`alertImpresa()`)
- Tipi: rapportino, fattura, offerta, materiale, mezzo, manutenzione, proposta_accettata

#### Preventivi
- Modello: `Preventivo` con stati `bozza | inviato | accettato | rifiutato`
- `trasformaInCommessa`: blocca se stato ≠ accettato
- `eliminaPreventivo`: blocca se commessa collegata
- Badge stati in lista e dettaglio
- Mancante: stato `scaduto` (non è nell'enum DB)

#### Area Ufficio
- Routes: /ufficio/dashboard, /ufficio/saldi-pendenti, /ufficio/notifiche, /ufficio/fatture,
  /ufficio/preventivi, /ufficio/ordini, /ufficio/pianificazione, /ufficio/clienti,
  /ufficio/fornitori, /ufficio/operai
- Notifiche ufficio: calcolate da commesse `finita` con saldo pendente (non tracciabili lette/non lette by design — sono stati persistenti)
- Campanellino mostra count reale, si azzera quando commesse vengono saldate

### 🔶 FUNZIONALE ma Parziale

#### Commesse
- CRUD completo, stati aperta/finita/chiusa
- Assegnazione operai, giornate, fatture, DiCo, pianificazioni, adempimenti
- Materiali commessa
- Archivio commesse (`archiviata: boolean`)
- Manca: link "richieste materiale" dalla commessa

#### App Operaio
- Giornata con flusso temporale (FaseGiornata: inizio, mattina, pausa, pomeriggio, fine, completata)
- Wizard giornata, rapportino form, chat, foto
- Calendario operaio, vista domani
- **Problemi noti**:
  - PWA: manifest presente, sw.js presente ma offline reale non verificato
  - Push: stub non attivo (VAPID non configurato)
  - Firma rapportino: assente

#### Portale Cliente
- Routes: /cliente/dashboard, /cliente/lavori, /cliente/documenti, /cliente/pagamenti,
  /cliente/manutenzioni, /cliente/notifiche, /cliente/servizi
- DiCo visualizzabili e stampabili
- Proposte intervento: risposta cliente funzionale
- Notifiche cliente con flag letta
- **Problemi noti**:
  - Pagamento online: assente
  - RLS cliente verificata parzialmente

#### Magazzino
- Modelli: `MovimentoMagazzino` (carico/scarico/reso), `OrdineFornitore`, `RichiestaMateriale`
- Routes: /impresa/magazzino, /impresa/magazzino/reso, /impresa/materiali
- Richieste magazziniere funzionali
- **Rischio**: giacenza ricalcolata su tutti i movimenti — potenziale performance issue con dataset grande

#### Giornate / Rapportini
- Modello completo con ore, materiali, foto, checklist, suggerimenti
- Rapportino con pianificazione giorno successivo
- **Assente**: firma digitale rapportino

### ⚠️ PARZIALE / DA VERIFICARE

#### Email
- Tutte le funzioni sono stub sicuri: guard `RESEND_API_KEY` check, corpo commentato
- Non invia email reali se env non configurata
- **Dipendenze mancanti**: `resend` non installato (commentato in .env.example)

#### Push Notifications
- Stub sicuro con guard VAPID
- `salvaSubscription` funzionale (usa `$executeRaw` su tabella `push_subscriptions`)
- **Problema**: tabella `push_subscriptions` NON è nello schema Prisma — usata solo via raw SQL
- **Dipendenze mancanti**: `web-push` non installato

#### Scadenzario
- Route `/impresa/scadenzario` presente
- Contenuto da verificare

#### DiCo (Dichiarazione di Conformità)
- Route `/impresa/dico` con stampa
- Modello completo
- Funzionale per uso interno

### 🔴 DA FARE / RISCHIO

#### RLS Multi-tenant
- RLS cliente presente su varie tabelle
- RLS completa per ruoli interni (impresa/ufficio/operaio/magazziniere) probabilmente non consolidata
- Per uso interno mono-impresa: rischio accettabile
- Per SaaS multi-tenant: **bloccante**

#### PWA / Offline
- Service worker (`sw.js`) presente ma sembra solo intercettare e servire `offline.html`
- Nessun caching delle route Next.js
- Offline reale per operaio: **non funzionale**

#### Test
- vitest.config.ts presente, test non scritti
- `lib/__tests__/` esiste come directory (da verificare contenuto)

---

## 5. Regole Operative

1. Non riscrivere da zero
2. Non refactor enormi
3. Non cambiare UX già approvate senza motivo
4. Non modificare schema DB se non necessario
5. Non toccare Supabase in modo distruttivo
6. Non creare fatturazione fiscale completa (SDI, IVA avanzata, note credito)
7. Non costruire AI ora
8. Non costruire multi-tenant completo ora
9. Non fare restyling generale
10. Se bug piccoli e sicuri nel perimetro → correggili
11. Se bug grandi o rischiosi → segnala nel report

---

## 6. Cosa NON Toccare

- Schema Prisma senza necessità esplicita
- Tabelle Supabase (RLS, funzioni DB) senza test locale
- Flusso auth Supabase
- Logica manutenzioni (consolidata, delicata)
- Logica finanza operativa (consolidata)
- `registraIncasso` (idempotente, testato)
- Guard chiusura commessa (testata)

---

## 7. Variabili Ambiente Necessarie

### Obbligatorie
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
IMPRESA_RAGIONE_SOCIALE=
IMPRESA_PARTITA_IVA=
IMPRESA_INDIRIZZO=
IMPRESA_CAP=
IMPRESA_CITTA=
IMPRESA_PROVINCIA=
IMPRESA_IBAN=
```

### Opzionali (feature gated)
```
RESEND_API_KEY=           # Email (Resend) — dipendenza NON installata
EMAIL_FROM=               # Email mittente
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # Push notifications
VAPID_PRIVATE_KEY=             # Push notifications
VAPID_SUBJECT=                 # Push notifications
```

---

## 8. Rischi Noti

### Bloccanti per uso interno
- Nessuno al momento (uso CreCas mono-impresa)

### Importanti
- Push e email non attive (stub, richiedono installazione dipendenze + configurazione env)
- PWA offline non reale
- Firma rapportino mancante
- Giacenza magazzino: calcolo lineare su tutti i movimenti (performance risk)
- Stato preventivo `scaduto` mancante nell'enum (solo 4 stati: bozza/inviato/accettato/rifiutato)

### Futuri / Per Vendita SaaS
- RLS multi-tenant non consolidata
- Nessuna separazione dati per impresa (tutto in un DB condiviso senza tenant_id)
- Pagamento online cliente assente
- Versioning preventivi assente

---

## 9. Commit Chiave di Riferimento

| Hash | Descrizione |
|---|---|
| f7e3a71 | Conflict detection doppia assegnazione operaio in pianificazione |
| e34462d | Fix idempotenza incassi e revalidate ufficio |
| 8159953 | QA visivo area ufficio e finanza |
| fe5b97a | Saldi pendenti e notifiche ufficio |
| 281cc50 | Scadenzario UTC, guard chiusura commessa, link fatture filtrate |
| dfda517 | Vista settimana e SubNav pianificazione |
| 185b998 | QA mezzi: badge per tipo, UTC, counter corretto |
| 921c167 | Manutenzioni QA: guard stati, blocco proposta doppia |
| 7518f33 | Segna intervento eseguito, aggiornamento scadenza automatico |
| ba4701c | Crea commessa da proposta accettata/confermata |
| 92dbd06 | Fondamenta PropostaIntervento (schema, SQL, RLS) |

---

## 10. Prossimi Blocchi Consigliati (Priorità)

1. **Test minimi automatici** — registraIncasso, guard chiusura, conflict detection
2. **Stato preventivo `scaduto`** — aggiungere all'enum + blocco conversione
3. **Firma rapportino** — campo firma digitale semplice (canvas o upload)
4. **RLS interna consolidata** — impresa/ufficio/operaio non possono vedere dati altrui
5. **SW offline reale** — caching route operaio per uso senza connessione cantiere
