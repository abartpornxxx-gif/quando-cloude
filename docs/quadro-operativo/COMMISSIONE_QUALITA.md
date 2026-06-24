# Commissione Qualità e Criteri di Approvazione (COMMISSIONE_QUALITA.md)

La Commissione di Qualità si riunisce per esaminare ciascun blocco di modifiche prima dell'invio. Lo sviluppo dell'onboarding viene valutato in base ai criteri indicati di seguito.

## 1. Criteri di Valutazione (Punteggio da 1 a 5)

*   **Utilità per l'Utente (Product Architect)**:
    L'onboarding fornisce indicazioni operative concrete basate sul reale flusso di CreCas? O si limita a nozioni generiche?
*   **Bellezza e Idratazione (UX/UI Designer)**:
    L'onboarding si inserisce fluidamente nella dashboard senza causare hydration error o salti di layout visibili?
*   **Qualità e Chiarezza dei Testi (Communication Designer)**:
    Il tono di voce è incoraggiante, umano, breve ed esprime bene le nuove abitudini da creare per ciascun ruolo?
*   **Integrità Tecnica e Riuso (Frontend & Backend Agent)**:
    Il codice è strutturato come singolo componente riutilizzabile e persistito tramite localStorage senza inutili query al DB?
*   **Stabilità e Test (QA Agent)**:
    Il typecheck e la build passano senza avvertimenti? Non ci sono regressioni nelle dashboard esistenti?
*   **Sicurezza (Security Agent)**:
    Nessun dato riservato a un ruolo viene esposto ad altri ruoli durante la fase di spiegazione o onboarding?
*   **Mobile Responsive (Mobile UX Agent)**:
    Il componente è utilizzabile su schermi da 360px, 390px e 430px con elementi touch confortevoli e zero overflow?
*   **Analisi dei Difetti (Critical Reviewer)**:
    Il revisore deve individuare attivamente i dettagli che non convincono e richiederne l'immediata correzione.

## 2. Soglia di Approvazione e Regola dei Cicli
*   **Soglia**: Per l'approvazione finale, ogni singola voce deve ricevere un punteggio pari a **5/5**.
*   **Cicli**: Sono consentiti al massimo **due cicli** di revisione autonoma da parte del team di agenti. Se dopo il secondo ciclo rimangono voci inferiori a 5/5, lo sviluppo deve fermarsi per richiedere l'intervento dell'utente umano, onde evitare loop infiniti di correzione.
