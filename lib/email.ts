// ORDINE 4 — Struttura invio email (pronta da attivare con Resend)
//
// Per attivare l'email:
//   1. Vai su https://resend.com → crea account → ottieni API key
//   2. npm install resend
//   3. Aggiungi in .env.local:
//        RESEND_API_KEY=re_xxxx
//        EMAIL_FROM=noreply@tuaimpresa.it   (deve essere un dominio verificato su Resend)
//   4. Decommentare il blocco "ATTIVARE" qui sotto

export async function inviaEmailRapportino(
  emailOperaio: string,
  nomeOperaio: string,
  commessaNome: string,
  giornataId: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY non configurata — email rapportino non inviata')
    return
  }

  // TODO — ATTIVARE quando Resend è installato:
  //
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  //
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailOperaio,
  //   subject: `QUADRO — Compila il rapportino: ${commessaNome}`,
  //   html: `
  //     <p>Ciao ${nomeOperaio},</p>
  //     <p>La tua giornata lavorativa è terminata. Compila il rapportino per chiudere la giornata.</p>
  //     <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/operaio/giornata/${giornataId}/rapportino">
  //       Vai al rapportino →
  //     </a></p>
  //     <p>QUADRO — Gestionale cantieri</p>
  //   `,
  // })
}

export async function inviaEmailRapportinoPendentImpresa(
  emailImpresa: string,
  rapportiniMancanti: { nomeOperaio: string; commessa: string; data: string }[],
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  // TODO — ATTIVARE con Resend:
  //
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // const lista = rapportiniMancanti.map(r => `• ${r.nomeOperaio} — ${r.commessa} (${r.data})`).join('<br>')
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM ?? 'noreply@quadro.app',
  //   to: emailImpresa,
  //   subject: `QUADRO — ${rapportiniMancanti.length} rapportino/i mancante/i`,
  //   html: `<p>I seguenti rapportini non sono ancora stati compilati:</p><p>${lista}</p>`,
  // })
}
