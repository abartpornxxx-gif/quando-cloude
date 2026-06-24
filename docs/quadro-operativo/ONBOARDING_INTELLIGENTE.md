# Specifica dell'Onboarding Intelligente (ONBOARDING_INTELLIGENTE.md)

L'obiettivo dell'onboarding intelligente è accompagnare ciascun utente al primo accesso in un'area di QUADRO, spiegandone il valore operativo e guidandolo alle prime azioni.

## 1. Obiettivi per Ruolo

### A. Impresa
*   **Valore Spiegato**: QUADRO permette il controllo totale di preventivi, commesse, pianificazione squadre, costi di manodopera e materiali, e monitoraggio dei margini.
*   **Messaggio**: *“QUADRO non è solo un archivio: è il centro operativo dell'impresa.”*
*   **Prime Azioni Consigliate**:
    1.  Verifica o inserisci un nuovo Cliente.
    2.  Compila un Preventivo per un lavoro.
    3.  Converti il preventivo accettato in Commessa.
    4.  Assegna gli operai e pianifica i mezzi.
    5.  Controlla l'avanzamento dei rapportini di cantiere.
    6.  Monitora margini e saldi pendenti in tempo reale.

### B. Ufficio
*   **Valore Spiegato**: Centralizzazione delle scadenze e dei pagamenti, senza dover inseguire le informazioni.
*   **Messaggio**: *“L'ufficio non deve inseguire le informazioni: QUADRO le raccoglie e le collega al cantiere giusto.”*
*   **Prime Azioni Consigliate**:
    1.  Controlla la lista dei Preventivi aperti.
    2.  Verifica le Commesse attive.
    3.  Esamina i Saldi Pendenti per recuperare i crediti.
    4.  Registra gli Incassi e i pagamenti parziali.
    5.  Controlla le scadenze passive verso i fornitori.
    6.  Usa i riepiloghi di commessa per far quadrare i conti.

### C. Operaio
*   **Valore Spiegato**: Guida per la giornata di lavoro in cantiere. Dice dove andare, cosa portare e cosa registrare.
*   **Messaggio**: *“QUADRO ti evita chiamate inutili: ti dice dove andare, cosa portare e cosa registrare.”*
*   **Prime Azioni Consigliate**:
    1.  Controlla il cantiere assegnato nella tua dashboard.
    2.  Apri Google Maps con l'indirizzo esatto per raggiungere il cantiere.
    3.  Leggi le istruzioni e controlla le attrezzature da portare.
    4.  Fai click su "Inizia giornata" per registrare l'orario.
    5.  Avanza le fasi durante la giornata e scatta foto dei lavori.
    6.  A fine giornata, compila il rapportino e richiedi materiali.

### D. Magazziniere
*   **Valore Spiegato**: Tracciabilità delle richieste di materiali degli operai, inventario e resi.
*   **Messaggio**: *“Il magazzino diventa tracciabile: ogni richiesta resta collegata a operaio, cantiere e materiale.”*
*   **Prime Azioni Consigliate**:
    1.  Verifica le richieste di materiale in sospeso.
    2.  Prendi in carico una richiesta.
    3.  Prepara i materiali e consegnali alle squadre.
    4.  Segna la richiesta come "Consegnata".
    5.  Verifica i resi di cantiere registrati dagli operai.
    6.  Controlla l'inventario delle giacenze.

### E. Cliente
*   **Valore Spiegato**: Portale di trasparenza sui lavori, i preventivi, le manutenzioni e i pagamenti effettuati.
*   **Messaggio**: *“Il cliente non deve chiedere sempre aggiornamenti: QUADRO mostra ciò che serve in modo ordinato.”*
*   **Prime Azioni Consigliate**:
    1.  Controlla lo stato dei lavori in corso nei tuoi cantieri.
    2.  Verifica i documenti e i certificati di conformità (DiCo) caricati.
    3.  Controlla gli interventi di manutenzione programmata.
    4.  Valuta e accetta le nuove proposte di intervento.
    5.  Controlla lo storico dei tuoi pagamenti e delle fatture.

---

## 2. Comportamento Tecnico ed Esperienza Utente

*   **Persistenza**: Utilizzo di `localStorage` per salvare l'avvenuta presa visione del tutorial. Questo evita chiamate inutili al database e protegge le performance.
*   **Evitare Hydration Errors**: Poiché `localStorage` è disponibile solo sul browser client, il rendering iniziale deve evitare discrepanze con il server-side HTML. Il componente client userà un effetto `useEffect` per caricare lo stato dal browser solo dopo il mount, visualizzando il tutorial solo se necessario.
*   **Disattivazione**: Possibilità di cliccare su "Ho capito" per chiudere momentaneamente o "Non mostrare più" per registrare la persistenza in `localStorage`.
*   **Visualizzazione**: Posizionato in cima alle dashboard dei rispettivi ruoli, progettato con design responsive, ombre morbide, bordi arrotondati grandi e richiami di colore adatti a ciascun tema.
