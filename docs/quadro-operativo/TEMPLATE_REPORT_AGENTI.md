# Modello Report Agenti (TEMPLATE_REPORT_AGENTI.md)

Questo documento costituisce il template per il resoconto finale dell'onboarding intelligente.

---

## 1. Dati di Esecuzione
*   **Branch**: `antigravity/onboarding-intelligente-quadro`
*   **Hash del Commit**: `[Commit Hash]`
*   **Autore**: Google Antigravity (Simulated Agent Team)

## 2. File Interessati
*   **File Creati**:
    *   `docs/quadro-operativo/AGENTS.md`
    *   `docs/quadro-operativo/ONBOARDING_INTELLIGENTE.md`
    *   `docs/quadro-operativo/TEMPLATE_REPORT_AGENTI.md`
    *   `docs/quadro-operativo/COMMISSIONE_QUALITA.md`
    *   `components/onboarding/OnboardingGuida.tsx`
*   **File Modificati**:
    *   `app/impresa/dashboard/page.tsx`
    *   `app/ufficio/dashboard/page.tsx`
    *   `app/operaio/dashboard/page.tsx`
    *   `app/magazziniere/dashboard/page.tsx`
    *   `app/cliente/dashboard/page.tsx`

## 3. Scelte Tecniche e Dettagli UX
*   **Risoluzione Hydration Mismatch**: Spiegazione di come è stato implementato `useEffect` per sincronizzare client e server senza hydration error.
*   **LocalStorage Key Mappings**: Lista delle chiavi utilizzate per ciascun ruolo.
*   **Design system**: Dettagli su font, spaziatura, ombre e abbinamento cromatico.

## 4. Attività di Controllo Qualità (QA)
*   **Esito Typecheck (`npx tsc --noEmit`)**: [Passato/Fallito]
*   **Esito Build (`npm run build`)**: [Passato/Fallito]
*   **Test Mobile**: Verifica a risoluzioni 360px, 390px, 430px per assicurare l'assenza di overflow orizzontali.

## 5. Valutazione della Commissione Qualità
*(Vedi COMMISSIONE_QUALITA.md per i dettagli)*
*   **Tabella dei Voti**:
    *   Product Architect: [Voto 1-5]
    *   UX/UI Designer: [Voto 1-5]
    *   Communication Designer: [Voto 1-5]
    *   Frontend Agent: [Voto 1-5]
    *   Backend/Prisma Agent: [Voto 1-5]
    *   QA Agent: [Voto 1-5]
    *   Security Agent: [Voto 1-5]
    *   Mobile UX Agent: [Voto 1-5]
    *   Critical Reviewer: [Voto 1-5]
*   **Giudizio e Criticità Risolte**: [Dettagli]
*   **Esito Finale**: [Approvato/Rifiutato]
