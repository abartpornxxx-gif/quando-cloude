/**
 * QUADRO — Notifiche Push (Web Push API)
 *
 * PER ATTIVARE:
 *   1. npm install web-push
 *   2. Genera le chiavi VAPID (una volta sola):
 *        node -e "const wp=require('web-push'); console.log(JSON.stringify(wp.generateVAPIDKeys()))"
 *   3. Aggiungi in .env.local:
 *        NEXT_PUBLIC_VAPID_PUBLIC_KEY=<valore publicKey>
 *        VAPID_PRIVATE_KEY=<valore privateKey>
 *        VAPID_SUBJECT=mailto:info@crecasimpianti.it
 *   4. Decommentare il blocco import e la logica in ogni funzione
 *   5. Il service worker in /public/sw.js gestisce già la ricezione delle push
 *
 * NOTA: le subscription push vengono salvate nella tabella `push_subscriptions`
 * quando l'utente consente le notifiche nel browser (via profilo operaio).
 */

import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

function vapidConfigured() {
  return !!(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_SUBJECT)
}

type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
}

async function inviaPushAOperaio(operaioId: string, payload: PushPayload): Promise<void> {
  if (!vapidConfigured()) {
    console.warn('[push] VAPID non configurato — push non inviata a operaio', operaioId)
    return
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const subs = await prisma.$queryRaw<{subscription: any}[]>`
    SELECT subscription FROM push_subscriptions WHERE operaio_id = ${operaioId}::uuid
  `

  await Promise.allSettled(
    subs.map(s => {
      const subObj = typeof s.subscription === 'string' ? JSON.parse(s.subscription) : s.subscription
      return webpush.sendNotification(subObj as any, JSON.stringify(payload))
    })
  )
}

async function inviaPushAEmail(email: string, payload: PushPayload): Promise<void> {
  if (!vapidConfigured()) return

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const subs = await prisma.$queryRaw<{subscription: any}[]>`
    SELECT ps.subscription FROM push_subscriptions ps
    JOIN operai o ON o.id = ps.operaio_id WHERE o.email = ${email}
  `

  await Promise.allSettled(
    subs.map(s => {
      const subObj = typeof s.subscription === 'string' ? JSON.parse(s.subscription) : s.subscription
      return webpush.sendNotification(subObj as any, JSON.stringify(payload))
    })
  )
}

// ─── Funzioni specifiche ──────────────────────────────────────────────────────

export async function pushRapportinoDaCompilare(operaioId: string, giornataId: string): Promise<void> {
  await inviaPushAOperaio(operaioId, {
    title: 'QUADRO — Rapportino da compilare',
    body: 'La tua giornata è terminata. Compila il rapportino ora.',
    url: `/operaio/giornata/${giornataId}/rapportino`,
  })
}

export async function pushNuovoPianoGiornata(operaioId: string, commessaNome: string): Promise<void> {
  await inviaPushAOperaio(operaioId, {
    title: 'QUADRO — Nuova assegnazione',
    body: `Hai una nuova pianificazione per: ${commessaNome}`,
    url: '/operaio/domani',
  })
}

export async function pushNuovoMessaggioOperaio(operaioId: string, giornataId: string, mittente: string): Promise<void> {
  await inviaPushAOperaio(operaioId, {
    title: `QUADRO — Messaggio da ${mittente}`,
    body: 'Hai un nuovo messaggio nella chat di cantiere.',
    url: `/operaio/giornata/${giornataId}/chat`,
  })
}

export async function pushRichiestaOffertaImpresa(email: string, clienteNome: string, offertaTitolo: string): Promise<void> {
  await inviaPushAEmail(email, {
    title: 'QUADRO — Nuova richiesta cliente',
    body: `${clienteNome} è interessato a: ${offertaTitolo}`,
    url: '/impresa/richieste-offerte',
  })
}

export async function pushLavoroCompletato(email: string, commessaNome: string): Promise<void> {
  await inviaPushAEmail(email, {
    title: 'QUADRO — Lavoro completato',
    body: `Il cantiere "${commessaNome}" è stato completato.`,
    url: '/cliente/lavori',
  })
}

export async function pushDocumentoDisponibile(email: string, tipo: string): Promise<void> {
  await inviaPushAEmail(email, {
    title: 'QUADRO — Nuovo documento',
    body: `È disponibile un nuovo documento: ${tipo}`,
    url: '/cliente/documenti',
  })
}

export async function pushFatturaInScadenza(email: string, numero: string, giorni: number): Promise<void> {
  await inviaPushAEmail(email, {
    title: 'QUADRO — Fattura in scadenza',
    body: `La fattura n. ${numero} scade tra ${giorni} giorni.`,
    url: '/cliente/pagamenti',
  })
}

export async function pushNuovoAppuntamento(
  operaioId: string,
  titolo: string,
  dataOraFormatted: string,
  luogo: string
): Promise<void> {
  const cleanTitolo = titolo.replace(/^TEST_AI_FULL_QUADRO:\s*/, '')
  await inviaPushAOperaio(operaioId, {
    title: '📅 Nuovo Appuntamento Assegnato',
    body: `Appuntamento "${cleanTitolo}" alle ore ${dataOraFormatted} presso ${luogo}.`,
    url: '/operaio/dashboard',
  })
}

// ─── Salva subscription dal browser ──────────────────────────────────────────

export async function salvaSubscription(operaioId: string, subscription: object): Promise<void> {
  const endpoint = (subscription as Record<string, unknown>).endpoint as string
  await prisma.$executeRaw`
    INSERT INTO push_subscriptions (operaio_id, endpoint, subscription)
    VALUES (${operaioId}::uuid, ${endpoint}, ${JSON.stringify(subscription)}::jsonb)
    ON CONFLICT (operaio_id, endpoint) DO UPDATE SET subscription = EXCLUDED.subscription
  `
}
