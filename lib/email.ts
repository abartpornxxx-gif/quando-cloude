/**
 * QUADRO — Invio email transazionali (Resend)
 *
 * PER ATTIVARE:
 *   1. Vai su https://resend.com → crea account gratuito → ottieni API key
 *   2. npm install resend
 *   3. Aggiungi in .env.local:
 *        RESEND_API_KEY=re_xxxx
 *        EMAIL_FROM=noreply@tuaimpresa.it   (dominio verificato su Resend)
 *        NEXT_PUBLIC_APP_URL=https://tuaimpresa.it  (oppure http://localhost:3000 in dev)
 *   4. Decommentare i blocchi "TODO ATTIVARE" in ogni funzione
 */

function resendConfigured() {
  return !!process.env.RESEND_API_KEY
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

// ─── Operaio ──────────────────────────────────────────────────────────────────

export async function inviaEmailRapportino(
  emailOperaio: string,
  nomeOperaio: string,
  commessaNome: string,
  giornataId: string,
): Promise<void> {
  if (!resendConfigured()) {
    console.warn('[email] RESEND_API_KEY non configurata — email rapportino non inviata')
    return
  }
  // TODO ATTIVARE — decommentare dopo npm install resend:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailOperaio,
  //   subject: `QUADRO — Compila il rapportino: ${commessaNome}`,
  //   html: `
  //     <p>Ciao ${nomeOperaio},</p>
  //     <p>La tua giornata è terminata. Compila il rapportino per chiudere la giornata.</p>
  //     <p><a href="${appUrl()}/operaio/giornata/${giornataId}/rapportino">Vai al rapportino →</a></p>
  //     <p style="color:#666;font-size:12px">QUADRO — Gestionale cantieri</p>
  //   `,
  // })
}

export async function inviaEmailNuovoPiano(
  emailOperaio: string,
  nomeOperaio: string,
  commessaNome: string,
  data: string,
): Promise<void> {
  if (!resendConfigured()) return
  // TODO ATTIVARE:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailOperaio,
  //   subject: `QUADRO — Nuova assegnazione: ${commessaNome}`,
  //   html: `
  //     <p>Ciao ${nomeOperaio},</p>
  //     <p>Hai una nuova pianificazione per <strong>${commessaNome}</strong> in data <strong>${data}</strong>.</p>
  //     <p><a href="${appUrl()}/operaio/domani">Vedi dettaglio →</a></p>
  //   `,
  // })
}

// ─── Impresa ──────────────────────────────────────────────────────────────────

export async function inviaEmailRapportinoPendentImpresa(
  emailImpresa: string,
  rapportiniMancanti: { nomeOperaio: string; commessa: string; data: string }[],
): Promise<void> {
  if (!resendConfigured()) return
  // TODO ATTIVARE:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // const lista = rapportiniMancanti.map(r => `<li>${r.nomeOperaio} — ${r.commessa} (${r.data})</li>`).join('')
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailImpresa,
  //   subject: `QUADRO — ${rapportiniMancanti.length} rapportino/i mancante/i`,
  //   html: `<p>I seguenti rapportini non sono ancora stati compilati:</p><ul>${lista}</ul>
  //          <p><a href="${appUrl()}/impresa/notifiche">Vai alle notifiche →</a></p>`,
  // })
}

export async function inviaEmailNuovaRichiestaOfferta(
  emailImpresa: string,
  clienteNome: string,
  offertaTitolo: string,
  richiestaId: string,
): Promise<void> {
  if (!resendConfigured()) return
  // TODO ATTIVARE:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailImpresa,
  //   subject: `QUADRO — Nuova richiesta da ${clienteNome}`,
  //   html: `
  //     <p><strong>${clienteNome}</strong> è interessato a: <em>${offertaTitolo}</em></p>
  //     <p><a href="${appUrl()}/impresa/richieste-offerte/${richiestaId}">Vedi richiesta →</a></p>
  //   `,
  // })
}

export async function inviaEmailScadenzaFatturaImpresa(
  emailImpresa: string,
  numero: string,
  cliente: string,
  importoEuro: string,
  scadenza: string,
): Promise<void> {
  if (!resendConfigured()) return
  // TODO ATTIVARE:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailImpresa,
  //   subject: `QUADRO — Fattura ${numero} in scadenza il ${scadenza}`,
  //   html: `
  //     <p>La fattura <strong>n. ${numero}</strong> a carico di <strong>${cliente}</strong>
  //     (${importoEuro}) scade il <strong>${scadenza}</strong>.</p>
  //     <p><a href="${appUrl()}/impresa/fatture">Vai alle fatture →</a></p>
  //   `,
  // })
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export async function inviaEmailLavoroCompletato(
  emailCliente: string,
  nomeCliente: string,
  commessaNome: string,
): Promise<void> {
  if (!resendConfigured()) return
  // TODO ATTIVARE:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailCliente,
  //   subject: `QUADRO — I lavori su "${commessaNome}" sono completati`,
  //   html: `
  //     <p>Gentile ${nomeCliente},</p>
  //     <p>I lavori relativi a <strong>${commessaNome}</strong> sono stati completati.</p>
  //     <p><a href="${appUrl()}/cliente/lavori">Visualizza il tuo cantiere →</a></p>
  //   `,
  // })
}

export async function inviaEmailNuovoDocumento(
  emailCliente: string,
  nomeCliente: string,
  tipoDocumento: string,
): Promise<void> {
  if (!resendConfigured()) return
  // TODO ATTIVARE:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailCliente,
  //   subject: `QUADRO — Nuovo documento disponibile: ${tipoDocumento}`,
  //   html: `
  //     <p>Gentile ${nomeCliente},</p>
  //     <p>È disponibile un nuovo documento nel tuo portale: <strong>${tipoDocumento}</strong>.</p>
  //     <p><a href="${appUrl()}/cliente/documenti">Vai ai documenti →</a></p>
  //   `,
  // })
}

export async function inviaEmailFatturaInScadenzaCliente(
  emailCliente: string,
  nomeCliente: string,
  numero: string,
  importoEuro: string,
  scadenza: string,
  iban: string,
): Promise<void> {
  if (!resendConfigured()) return
  // TODO ATTIVARE:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailCliente,
  //   subject: `QUADRO — Fattura ${numero} in scadenza il ${scadenza}`,
  //   html: `
  //     <p>Gentile ${nomeCliente},</p>
  //     <p>La fattura <strong>n. ${numero}</strong> di <strong>${importoEuro}</strong>
  //     è in scadenza il <strong>${scadenza}</strong>.</p>
  //     <p>Pagamento tramite bonifico bancario: <code>${iban}</code></p>
  //     <p><a href="${appUrl()}/cliente/pagamenti">Vedi i tuoi pagamenti →</a></p>
  //   `,
  // })
}

// ─── Accessi utente ───────────────────────────────────────────────────────────

export async function inviaEmailInvito(
  email: string,
  nome: string,
  ruolo: string,
  password: string,
): Promise<void> {
  if (!resendConfigured()) {
    console.warn('[email] RESEND_API_KEY non configurata — email invito non inviata')
    return
  }
  // TODO ATTIVARE — decommentare dopo npm install resend:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: email,
  //   subject: 'QUADRO — Il tuo accesso è pronto',
  //   html: `
  //     <p>Ciao ${nome},</p>
  //     <p>Il tuo account QUADRO è stato creato con ruolo <strong>${ruolo}</strong>.</p>
  //     <p>Accedi su: <a href="${appUrl()}/login">${appUrl()}/login</a></p>
  //     <p>Email: <strong>${email}</strong><br>
  //     Password temporanea: <strong>${password}</strong> — cambiala al primo accesso.</p>
  //     <p style="color:#666;font-size:12px">QUADRO — Gestionale cantieri</p>
  //   `,
  // })
}

export async function inviaEmailAppuntamento(
  emailCliente: string,
  nomeCliente: string,
  commessaNome: string,
  data: string,
  ora: string,
): Promise<void> {
  if (!resendConfigured()) return
  // TODO ATTIVARE:
  //
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailCliente,
  //   subject: `QUADRO — Appuntamento confermato: ${commessaNome}`,
  //   html: `
  //     <p>Gentile ${nomeCliente},</p>
  //     <p>Confermiamo l'appuntamento per <strong>${commessaNome}</strong>
  //     il giorno <strong>${data}</strong> alle <strong>${ora}</strong>.</p>
  //     <p><a href="${appUrl()}/cliente/lavori">Vai al tuo portale →</a></p>
  //   `,
  // })
}
