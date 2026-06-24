# Ruoli e Regole della Squadra di Agenti (AGENTS.md)

Per portare a termine lo sviluppo dell'onboarding intelligente in modo pulito e sicuro, stabiliamo il perimetro operativo e le responsabilità di ciascun ruolo all'interno del nostro team di agenti simulati.

## 1. Master Orchestrator (Orchestratore Capo)
*   **Perimetro**: Supervisione totale dell'architettura e della pianificazione.
*   **Compiti**: Coordina gli agenti, convalida l'onboarding e garantisce che non vengano alterate le policy RLS o lo schema del database.

## 2. Product Architect (Architetto di Prodotto)
*   **Perimetro**: Utilità e focus operativo.
*   **Compiti**: Garantisce che ogni scheda di onboarding spieghi esattamente le abitudini operative e le prime azioni necessarie per quel ruolo specifico, evitando spiegazioni puramente teoriche o noiose.

## 3. UX/UI Designer
*   **Perimetro**: Interfaccia visiva ed estetica.
*   **Compiti**: Cura il design del modal e della card di onboarding. Si assicura che il look & feel sia premium, con transizioni pulite e coerente con lo stile di QUADRO.

## 4. Communication Designer
*   **Perimetro**: Micro-copy e tono di voce.
*   **Compiti**: Redige testi comprensibili, amichevoli, non-tecnici ed orientati all'azione quotidiana.

## 5. Frontend Agent
*   **Perimetro**: Implementazione del codice React/TypeScript client-side.
*   **Compiti**: Scrive il componente client `OnboardingGuida.tsx`, gestisce lo stato locale con `localStorage` e previene conflitti di idratazione (hydration errors).

## 6. Backend/Prisma Agent
*   **Perimetro**: Conservazione dei dati e integrità del backend.
*   **Compiti**: Assicura che le preferenze di visualizzazione non sporchino il database o richiedano query remote superflue.

## 7. QA Agent (Assicurazione Qualità)
*   **Perimetro**: Robustezza e stabilità.
*   **Compiti**: Valuta il comportamento dell'interfaccia a diverse risoluzioni mobile (360px, 390px, 430px) e verifica il corretto superamento della build di produzione.

## 8. Security Agent
*   **Perimetro**: Privacy e barriere d'accesso.
*   **Compiti**: Garantisce che l'onboarding di un ruolo non possa mostrare informazioni riservate relative ad altri ruoli o esporre chiavi e dati sensibili.

## 9. Mobile UX Agent
*   **Perimetro**: Usabilità su smartphone.
*   **Compiti**: Si assicura che i testi siano leggibili su schermi piccoli e che i pulsanti siano comodi da toccare con una sola mano.

## 10. Critical Reviewer (Revisore Critico)
*   **Perimetro**: Revisione critica costruttiva.
*   **Compiti**: Sottopone a scrutinio severo ogni bozza visiva e testuale, richiedendo correzioni prima della presentazione finale.

## 11. Final Commission (Commissione di Qualità)
*   **Compiti**: Valuta ciascun aspetto da 1 a 5. Se tutti i parametri sono 5/5, il lavoro viene dichiarato completato. In caso contrario, si procede a un ciclo di fix locale (massimo 2 cicli).
