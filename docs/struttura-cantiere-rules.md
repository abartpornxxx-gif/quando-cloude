# Struttura Cantiere — Regole Tecniche

> Riferimento per l'implementazione della struttura fisica dei cantieri in QUADRO.

---

## Definizioni

**Cantiere**: la commessa fisica dove si svolgono i lavori. Una commessa = un cantiere.

**Nodo struttura** (`CantiereStrutturaNodo`): un'unità fisica del cantiere. Ogni nodo ha:
- un tipo (scala, appartamento, box, ecc.)
- un nome
- un parent opzionale (gerarchia)
- un ordinamento

**Albero struttura**: l'insieme dei nodi di una commessa, organizzati gerarchicamente.

---

## Tipi di Nodo (`TipoNodoStruttura`)

| Tipo | Uso tipico | Può avere figli? |
|------|-----------|-----------------|
| SCALA | Blocco scale di un edificio | Sì (appartamenti) |
| APPARTAMENTO | Singola unità abitativa | No (foglia) |
| BOX | Box auto o cantina | No (foglia) |
| ESTERNO | Area esterna, giardino, parcheggio | Sì (elementi specifici) |
| AREA_COMUNE | Androne, corridoi, vano scala | No |
| LOCALE_TECNICO | Centrale termica, vano contatori | No |
| QUADRO_ELETTRICO | Quadro generale o secondario | No |
| GARAGE | Garage collettivo | Sì (posti auto) |
| CORTILE | Cortile interno | No |
| COPERTURA | Tetto, terrazza condominiale | No |
| ALTRO | Zona generica non classificabile | Sì |

---

## Regole Gerarchiche

### Valide

```
Commessa
├── Scala A (SCALA)
│   ├── Appartamento A1 (APPARTAMENTO)
│   ├── Appartamento A2 (APPARTAMENTO)
│   └── Appartamento A3 (APPARTAMENTO)
├── Scala B (SCALA)
│   └── Appartamento B1 (APPARTAMENTO)
├── Box (BOX)  ← senza parent = al livello radice
├── Esterno (ESTERNO)
│   ├── Cancello
│   └── Illuminazione esterna
└── Area comune (AREA_COMUNE)
    ├── Androne
    ├── Vano contatori (LOCALE_TECNICO)
    └── Quadro generale (QUADRO_ELETTRICO)
```

### Non Valide

```
❌ APPARTAMENTO come parent di SCALA (gerarchia invertita)
❌ Nodo con parentId che appartiene a un'altra commessa
❌ Più di 3 livelli di profondità (non supportato in UI, sconsigliato)
❌ Nome vuoto
```

---

## Come Collegare Rapportini

Ogni `Rapportino` ha `strutturaNodoId` nullable.

```
Rapportino → strutturaNodoId → CantiereStrutturaNodo → commessaId → Commessa
```

Regola: il nodo DEVE appartenere alla stessa commessa della giornata del rapportino.

Il validator `validaAzioneAI` verifica questa FK logic prima di qualsiasi save AI.

---

## Come Collegare Conteggi

Ogni `ConteggioCantiereRiga` ha `strutturaNodoId` nullable.

```
ConteggioCantiereRiga → strutturaNodoId → CantiereStrutturaNodo
ConteggioCantiereRiga → conteggioId → ConteggioCantiere → commessaId → Commessa
```

Regola: il nodo DEVE appartenere alla stessa commessa del conteggio.

---

## Come Collegare Promemoria

Ogni `Promemoria` ha `strutturaNodoId` nullable.

```
Promemoria → strutturaNodoId → CantiereStrutturaNodo
Promemoria → commessaId → Commessa
```

Regola: se `strutturaNodoId` è presente, il suo `commessaId` deve coincidere con `Promemoria.commessaId`.

---

## Come l'AI Interpreta le Zone

Frasi accettate e relativa mappatura:

| Frase operaio | Interpretazione AI |
|---------------|-------------------|
| "scala A appartamento 3" | `tipo=SCALA nome=A` → `tipo=APPARTAMENTO nome=A3 o 3` |
| "nei box" | tutti i nodi `tipo=BOX` della commessa |
| "all'esterno" | nodo `tipo=ESTERNO` |
| "vano contatori" | `tipo=LOCALE_TECNICO` con nome simile |
| "A2 finito" | `tipo=APPARTAMENTO` con nome contenente A2 |
| "quadro generale" | `tipo=QUADRO_ELETTRICO` |
| "androne" | `tipo=AREA_COMUNE` con nome simile |

L'AI confronta il testo con i nomi dei nodi usando match fuzzy (toLowerCase + includes).
Se ambiguo → restituisce tutte le opzioni e chiede conferma.

---

## Gestione Zone Ambigue

Se l'AI trova 0 corrispondenze:
```json
{ "valid": false, "reason": "Zona non trovata", "suggerimento": "Seleziona manualmente la zona o crea una nuova zona." }
```

Se l'AI trova 2+ corrispondenze:
```json
{ "valid": false, "reason": "Zona ambigua", "suggerimento": "Intendevi Appartamento A2 (Scala A) o Appartamento B2 (Scala B)?" }
```

---

## Permessi per Ruolo

| Azione | Impresa | Ufficio | Operaio | Magazziniere | Cliente |
|--------|---------|---------|---------|--------------|---------|
| Crea struttura | ✅ | ✅ (se ha accesso) | ❌ | ❌ | ❌ |
| Modifica nodo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Disattiva nodo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Seleziona zona in rapportino | — | — | ✅ | — | — |
| Propone nuova zona | — | — | ✅ (richiede approvazione) | ❌ | ❌ |
| Vede struttura completa | ✅ | ✅ | ✅ (solo attive) | lettura | ❌ |
| Vede struttura in riepilogo | — | — | — | — | ✅ (approvati) |
