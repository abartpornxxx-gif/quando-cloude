# QUADRO — Regole Operative AI

> Fonte di verità per la logica di controllo e comando dell'AI in QUADRO.
> Ogni nuova logica AI deve essere coerente con questo file. Aggiornarlo a ogni estensione.

---

## 1. Principio Generale

```
AI capisce → AI prepara → AI controlla → Utente conferma → QUADRO esegue
```

L'AI in QUADRO **propone, non esegue**. Ogni azione che modifica dati critici (commesse, rapportini, fatture, struttura cantiere) deve passare per la conferma esplicita dell'utente.

---

## 2. Regola Anti-Errore

L'AI principale **non salva mai dati critici senza validazione**.

Il flusso obbligatorio è:

1. AI interpreta il testo dell'utente
2. AI prepara una bozza strutturata (JSON)
3. Il `QuadroActionValidator` verifica coerenza (ruolo, commessa, zona, dati minimi)
4. Se valido → UI mostra la bozza all'utente per conferma
5. Solo dopo conferma esplicita → server action salva il dato

**Mai**: AI → save diretto senza validazione e conferma.

---

## 3. AI Principale — Compiti

- Interpreta testo in linguaggio naturale (italiano, voce trascritta, appunti informali)
- Propone azioni strutturate: crea promemoria, collega commessa/cliente/zona, aggiorna stato
- Collega entità esistenti: clienti, commesse, zone cantiere, operai
- Prepara bozze JSON conformi agli schema del DB
- Interpreta riferimenti impliciti: "la scala A", "il box 3", "l'appartamento di Rossi"
- Segnala ambiguità invece di scegliere arbitrariamente

---

## 4. AI di Controllo (QuadroActionValidator)

File: `lib/ai/quadro-action-validator.ts`

Verifica ogni azione proposta dall'AI principale:

| Controllo | Cosa verifica |
|-----------|---------------|
| Ruolo | Il ruolo corrente può fare questa azione? |
| Commessa | La commessaId esiste ed è accessibile al ruolo? |
| Zona | La strutturaNodoId appartiene davvero a quella commessa? |
| Dati minimi | Tutti i campi obbligatori sono presenti e validi? |
| Coerenza | I dati sono logicamente consistenti? |

Risposta del validator:

```typescript
{
  valid: boolean
  reason?: string          // Perché è bloccato
  campoDaCorreggere?: string  // Quale campo manca/è errato
  suggerimento?: string    // Cosa mostrare all'utente
}
```

---

## 5. Regole per Struttura Cantiere

- Ogni lavoro DEVE essere collegato a una zona cantiere quando possibile
- Se la zona non è specificata dall'operaio → campo nullable, non bloccare il flusso
- Se l'utente scrive "Scala A appartamento 3" → AI cerca corrispondenza in `CantiereStrutturaNodo`
- Se la zona non esiste → AI propone creazione nuova zona, ma solo con conferma Impresa/Ufficio
- Operaio può selezionare zona esistente; non può creare/modificare struttura approvata
- Zone inattive (`attivo: false`) non mostrate all'operaio

---

## 6. Regole per Rapportini

- Ogni rapportino può avere una zona cantiere associata (`strutturaNodoId`)
- La zona è opzionale: non blocca l'invio del rapportino se assente
- Il campo `strutturaNodoId` si popola nella UI prima dell'invio, non via AI automatica
- L'AI può suggerire la zona dal testo del `lavoroEseguito` ma l'operaio conferma
- Le ultime zone usate dall'operaio su quella commessa devono essere mostrate per prime

---

## 7. Regole per Promemoria

- I promemoria possono essere collegati a commessa + zona cantiere
- Se un promemoria riguarda una zona specifica → `strutturaNodoId` popolato
- Promemoria scaduti → generano follow-up automatici (via AI contestuale)
- L'AI può pre-compilare `strutturaNodoId` dai promemoria recenti sulla stessa commessa

---

## 8. Regole per Conteggio Finale

- Il conteggio finale DEVE poter filtrare le righe per zona cantiere
- Scala / Appartamento / Box / Esterno devono essere distinguibili
- `ConteggioCantiereRiga.strutturaNodoId` collega ogni voce alla zona
- Riepilogo per zona: raggruppare righe per nodo root (scala, box, esterno)
- Riepilogo totale: somma di tutte le righe indipendentemente dalla zona

---

## 9. Regole Permessi per Ruolo

| Ruolo | Struttura Cantiere | Rapportino | Conteggio |
|-------|-------------------|------------|-----------|
| Impresa | Crea, modifica, disattiva, quick-build | Vede tutte le zone | Vede + filtra per zona |
| Ufficio | Crea/modifica (se ha accesso commessa) | Vede tutte le zone | Vede + filtra per zona |
| Operaio | Seleziona zona; può proporre nuova | Compila con zona | Compila zone righe |
| Magazziniere | Solo lettura zone se collegate a richiesta | — | — |
| Cliente | Solo riepiloghi approvati | — | — |
| Admin | Gestione tecnica | — | — |

---

## 10. Regole Aggiornamento File

- Ogni nuova logica AI importante deve essere aggiunta a questo file
- Ogni implementazione AI deve essere coerente con questo file
- Quando si modifica il validator → aggiornare la tabella al §4
- Quando si aggiunge un nuovo tipo di azione → aggiungerla al §3
